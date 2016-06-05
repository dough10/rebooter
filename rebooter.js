'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rebooter = function () {
  function Rebooter(config, mongooseConfig) {
    var _this = this;

    _classCallCheck(this, Rebooter);

    // early return of "config" is not a Object
    if (typeof config !== 'object') {
      throw new Error('Config must be an Object');
      return;
    }
    this.config = config;
    this._mongoose = require('mongoose');
    this._mongodb = this._mongoose.connection;
    this._mongodb.on('error', console.error);
    this._mongodb.once('open', function (_) {
      _this._print('Mongoose Connection Open');
      _this._routerIP = false;
      _this.fs = require('fs');
      _this._network = require('network');
      _this.onoff = require('onoff').Gpio;
      _this.SSH = require('simple-ssh');
      var _express = require('express');
      var _app = _express();
      var _compression = require('compression');
      var _server = _app.listen(config.port);
      var bcrypt = require('bcrypt');
      var tokenAuth = require('jsonwebtoken');
      var authenticator = require('authenticator');
      _this._socket = require('socket.io')(_server);
      _this._socket.on('connection', function (_socket) {
        _socket.on('force-reboot', function (token) {
          if (!token) {
            _this._emit('toast', 'login required');
            return;
          }
          tokenAuth.verify(token, config.hashKey, function (err, decoded) {
            if (err) {
              _this._emit('toast', 'invalid token');
              return;
            }
            if (!decoded) {
              _this._emit('toast', 'invalid token');
              return;
            }
            _this._rebootRouter('manual', decoded.username);
          });
        });
        _socket.on('count', function (host) {
          return _this._count(host).then(function (count) {
            return _this._emit('count', count);
          });
        });
        _socket.on('log', function (obj) {
          return _this._getLogs(obj.host, obj.skip, obj.limit).then(function (log) {
            return _this._emit('log', log);
          });
        });
        _socket.on('login', function (login) {
          _this._users.findOne({
            username: login.username
          }, function (err, user) {
            if (!user) {
              _this._emit('toast', 'login failed');
              return;
            }
            if (!bcrypt.compareSync(login.password, user.password)) {
              _this._emit('toast', 'login failed');
              return;
            }
            if (user.twoFactor) {
              _socket.emit('twoFactor');
              return;
            }
            var token = tokenAuth.sign(user, _this.config.hashKey, {
              expiresIn: '24h'
            });
            _socket.emit('login', token);
            _socket.emit('toast', 'Successful Login');
          });
        });
        _socket.on('twoFactor', function (twoFactor) {
          _this._users.findOne({
            username: twoFactor.username
          }, function (err, user) {
            if (!user) {
              _this._emit('toast', 'login failed');
              return;
            }
            if (!authenticator.verifyToken(user.authKey, twoFactor.code)) {
              _this._emit('toast', 'login failed');
              return;
            }
            var token = tokenAuth.sign(user, _this.config.hashKey, {
              expiresIn: '24h'
            });
            _socket.emit('login', token);
            _socket.emit('toast', 'Successful Login');
          });
        });
        _this._pushRestarts();
        _this._pushHistory();
        // one off ping to shorten the delay for router status
        // without could take +30 seconds to get status
        _this._network.get_gateway_ip(function (err, ip) {
          return _this._ping(ip).then(function (res) {
            return _this._emit('router-status', res);
          });
        });
      });

      _this.PingWrapper = require("ping-wrapper");
      _this.PingWrapper.configure();

      var historySchema = _this._mongoose.Schema({
        address: String,
        data: Object,
        time: Number
      });

      _this._history = _this._mongoose.model('logs', historySchema);

      _this._history.insert = function (data, cb) {
        var insert = new _this._history(data);
        insert.save(data, cb);
      };

      var restartsSchema = _this._mongoose.Schema({
        time: Number,
        type: String
      });

      _this._restarts = _this._mongoose.model('restarts', restartsSchema);

      _this._restarts.insert = function (data, cb) {
        var insert = new _this._history(data);
        insert.save(data, cb);
      };

      var usersSchema = _this._mongoose.Schema({
        username: String,
        password: String,
        authKey: String,
        twoFactor: Boolean
      });

      _this._users = _this._mongoose.model('users', usersSchema);

      _app.use(_compression());
      _app.disable('x-powered-by');

      _app.use(_express.static(__dirname + '/html', {
        maxAge: 60000 * 60 * 24
      }));

      _app.get('/count/:host', function (req, res) {
        var host = req.params.host;
        if (!host) {
          res.status(500).send({
            status: 500,
            host: host,
            error: 'invalid host'
          });
          return;
        }
        _this._count(host).then(function (count) {
          return res.status(count.status).send(count);
        });
      });

      _app.get('/log/:host/:skip/:limit', function (req, res) {
        var host = req.params.host;
        var skip = parseInt(req.param.skip, 10);
        var limit = parseInt(req.param.limit, 10);
        _this._getLogs(host, skip, limit).then(function (logs) {
          return res.status(logs.status).send(logs);
        });
      });

      _this._hasRebooted = false;
      _this._failedRouterPings = 0;

      _this._addresses = _this.config.addresses;
      _this._responses = [];
      _this.start();
    });
    this._mongoose.connect('mongodb://' + mongooseConfig.host + ':' + mongooseConfig.port + '/' + mongooseConfig.db);
  }

  /**
   * check if given addres is valid
   *
   * @param {String} host - ip / url address
   */


  _createClass(Rebooter, [{
    key: '_isValidHost',
    value: function _isValidHost(host) {
      for (var i = 0; i < this._addresses.length; i++) {
        if (host === this._addresses[i]) return true;
      }
      return false;
    }

    /**
     * send data to client
     *
     * @param {String} name
     * @param {???} data - any data type can be sent
     */

  }, {
    key: '_emit',
    value: function _emit(name, data) {
      this._socket.emit(name, data);
    }

    /**
     * output to console
     *
     * @param {string} message - message to display
     */

  }, {
    key: '_print',
    value: function _print(message) {
      console.log(new Date().toLocaleString() + ':   ' + message);
    }

    /**
     * preform a ping test to a given url / address
     *
     * @param {String} url - url / ip to ping
     */

  }, {
    key: '_ping',
    value: function _ping(url) {
      var _this2 = this;

      return new Promise(function (resolve) {
        var _ping = new _this2.PingWrapper(url);
        _ping.on('ping', function (data) {
          return resolve({
            address: url,
            data: data
          });
        });
        _ping.on('fail', function (data) {
          return resolve({
            address: url,
            data: false
          });
        });
        setTimeout(function (_) {
          return _ping.stop();
        }, 8000);
      });
    }

    /**
     * will kill power to the router by triggering a relay
     */

  }, {
    key: '_relayReboot',
    value: function _relayReboot() {
      var _this3 = this;

      return new Promise(function (resolve) {
        var _gpio = _this3.onoff(_this3.config.relayPin, 'out');
        _gpio.write(1, function (_) {
          setTimeout(function (_) {
            _this3._emit('toast', 'powering on router...');
            _gpio.write(0, function (_) {
              _this3._print('router rebooted with relay');
              resolve();
            });
          }, 35000);
        });
      });
    }

    /**
     * log time and type of reboot
     *
     * @param {String} type - manual or automated
     * @param {String} user - username of the user the initated the reboot
     */

  }, {
    key: '_enterRestartToDB',
    value: function _enterRestartToDB(type, user) {
      var _this4 = this;

      var obj = {
        time: new Date().getTime(),
        type: type
      };
      if (user) obj.user = user;
      this._restarts.insert(obj, function (err) {
        return _this4._pushRestarts(err);
      });
    }
  }, {
    key: '_canSSH',
    value: function _canSSH() {
      return this.fs.existsSync(__dirname + '/ssh.json') && this._lastRouterPing.data.hasOwnProperty('time');
    }

    /**
     * reboot the router
     *
     * @param {String} type - manual or automated
     * @param {String} user - username of the user the initated the reboot
     */

  }, {
    key: '_rebootRouter',
    value: function _rebootRouter(type, user) {
      var _this5 = this;

      this._hasRebooted = true;
      this._emit('toast', 'rebooting router...');
      if (this._canSSH()) {
        // ssh file exist and last router ping was successful
        // will attempt to reboot with ssh

        var routerLogin = require(__dirname + '/ssh.json');
        if (!routerLogin.hasOwnProperty('host')) routerLogin.host = this._routerIP;
        try {
          (function () {
            console.log(routerLogin);
            var ssh = new _this5.SSH(routerLogin);
            ssh.on('error', function (err) {
              console.log(err);
              _this5._relayReboot().then(function (_) {
                return _this5._enterRestartToDB(type, user);
              });
              ssh.end();
            });
            ssh.exec(_this5.config.routerRebootCommand, {
              err: function (err) {
                var _this6 = this;

                console.log(err);
                this._relayReboot().then(function (_) {
                  return _this6._enterRestartToDB(type, user);
                });
                ssh.end();
              },
              out: function (stdout) {
                this._print('router rebooted with ssh connection');
                this._enterRestartToDB(type, user);
                ssh.end();
                console.log(stdout);
              },
              exit: function (code) {
                console.log(code);
              }
            }).start();
          })();
        } catch (e) {
          console.log(e);
          this._relayReboot().then(function (_) {
            return _this5._enterRestartToDB(type, user);
          });
        }
      } else if (!this._lastRouterPing.data.hasOwnProperty('time')) {
        // must be researt with relay
        this._relayReboot().then(function (_) {
          return _this5._enterRestartToDB(type, user);
        });
      } else {
        this._relayReboot().then(function (_) {
          return _this5._enterRestartToDB(type, user);
        });
      }
    }

    /**
     * count failed pings
     *
     * @param {Array} items - list of ping results
     */

  }, {
    key: '_countResults',
    value: function _countResults(items) {
      var count = 0;
      var total = items.length;
      var highPings = 0;
      for (var i = 0; i < total; i++) {
        if (!items[i].data) {
          count++;
          this._print('ping failed for ' + items[i].address);
        }
        if (items[i].data.hasOwnProperty('time') && items[i].data.time > this.config.maxPing) {
          highPings++;
          this._print(items[i].address + ' has ping greater then ' + this.config.maxPing);
        }
      }
      // all pings returned with good time
      if (!count && !highPings) this._print('all pings successful');
      // as long as even one ping is goood
      if (count > 1) this._hasRebooted = false;
      // notify front end of failed pings
      if (count) this._emit('toast', count + ' of ' + this._addresses.length + ' pings failed with ' + highPings + ' high pings');
      // all pings failed
      if (count === total && !this._hasRebooted) this._rebootRouter('automated');
      // half or more of the pings had high ping time
      if (highPings >= Math.floor(this._addresses.length / 2) && !this._hasRebooted) this._rebootRouter('automated');
      // output total time taken for pings to run to console
      console.timeEnd('all pings responded in');
      // update data on frontend
      this._pushHistory();
    }

    /**
     * update restarts on client
     *
     * @param {Error} err
     */

  }, {
    key: '_pushRestarts',
    value: function _pushRestarts(err) {
      var _this7 = this;

      if (err) this._print(err);
      this._restarts.count({}, function (err, count) {
        _this7._restarts.find().sort({ time: 1 }).skip(function (_) {
          if (count > 10) {
            return count - 10;
          } else {
            return 0;
          }
        }()).exec(function (err, logs) {
          return _this7._emit('restarts', logs);
        });
      });
    }

    /**
     * update history on client
     *
     * @param {Error} err
     */

  }, {
    key: '_pushHistory',
    value: function _pushHistory(err) {
      var _this8 = this;

      if (err) this._print(err);
      var expected = this.config.graphLength * this._addresses.length;
      this._history.count({}, function (err, count) {
        var skip = function (_) {
          if (count > expected) {
            return count - expected;
          } else {
            return 0;
          }
        }();
        _this8._history.find({}).skip(skip).limit(expected).exec(function (err, logs) {
          return _this8._emit('history', logs);
        });
      });
    }

    /**
     * Promise that returns a response object with
     * the number of ping data points for the given host
     *
     * @param {String} host
     */

  }, {
    key: '_count',
    value: function _count(host) {
      var _this9 = this;

      return new Promise(function (resolve) {
        if (!_this9._isValidHost(host)) {
          resolve({
            status: 401,
            host: host,
            error: 'invalid host'
          });
          return;
        }
        _this9._history.count({
          address: host
        }, function (err, count) {
          if (err) {
            resolve({
              status: 500,
              host: host,
              error: err
            });
            return;
          }
          resolve({
            status: 200,
            host: host,
            count: count
          });
        });
      });
    }

    /**
     * Promise that resolves a response object with ping logs
     * from a given host with the provided limit & offset
     *
     * @param {String} host
     * @param {Number} skip - offset
     * @param {Number} limit
     */

  }, {
    key: '_getLogs',
    value: function _getLogs(host, skip, limit) {
      var _this10 = this;

      return new Promise(function (resolve) {
        if (!_this10._isValidHost(host)) {
          resolve({
            status: 401,
            error: 'invalid host',
            host: host
          });
          return;
        }
        _this10._history.find({
          address: host
        }).skip(skip).limit(limit).exec(function (err, logs) {
          if (err) {
            resolve({
              status: 500,
              error: err,
              host: host
            });
            return;
          }
          resolve({
            status: 200,
            history: logs,
            host: host
          });
        });
      });
    }

    /**
     * ging the given router ip every 30 seconds
     *
     * @param {String} - ip
     */

  }, {
    key: '_pingRouter',
    value: function _pingRouter(ip) {
      var _this11 = this;

      if (!this._routerIP) this._routerIP = ip;
      setTimeout(function (_) {
        _this11._pingRouter(ip);
      }, 30000);
      this._ping(ip).then(function (res) {
        if (!res.data.hasOwnProperty('time')) {
          _this11._failedRouterPings++;
          if (_this11._failedRouterPings > 2) _this11._rebootRouter('automated');
          return;
        }
        _this11._lastRouterPing = res;
        _this11._failedRouterPings = 0;
        _this11._emit('router-status', res);
      });
    }

    /**
     * ping responded
     *
     * @param {object} data - ping response data
     */

  }, {
    key: '_response',
    value: function _response(data) {
      data.time = new Date().getTime();
      this._history.insert(data, function (err) {
        if (err) {
          throw new Error(err);
          return;
        }
      });
      this._responses.push(data);
      if (this._responses.length === this._addresses.length) this._countResults(this._responses);
    }

    /**
     * start the test
     */

  }, {
    key: 'start',
    value: function start() {
      var _this12 = this;

      var oneMin = 60000;
      var oneHour = oneMin * 60;
      // set the timer for next
      setTimeout(this.start.bind(this), oneHour * this.config.repeat);
      // clear responses array if it contains results
      if (this._responses.length) this._responses = [];
      this._print('running ping on ' + this._addresses.length + ' addresses');
      console.time('all pings responded in');
      // run ping on each address in the list
      this._addresses.forEach(function (address) {
        return _this12._ping(address).then(_this12._response.bind(_this12));
      });
      this._network.get_gateway_ip(function (err, ip) {
        return _this12._pingRouter(ip);
      });
    }
  }]);

  return Rebooter;
}();

var configFile = require(__dirname + '/config.json');
var mongooseConfig = require(__dirname + '/mongoose.json');
var app = new Rebooter(configFile, mongooseConfig);
//# sourceMappingURL=rebooter.js.map
