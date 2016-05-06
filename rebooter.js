'use strict';


class Rebooter {

  constructor(config) {
    // early return of "config" is not a Object
    if (typeof config !== 'object') {
      throw new Error('Config must be an Object');
      return;
    }
    this.config = config;
    const _express = require('express');
    const _app = _express();
    const _compression = require('compression');
    const _server = _app.listen(config.port);
    const bcrypt = require('bcrypt');
    const tokenAuth = require('jsonwebtoken');
    const authenticator = require('authenticator');
    this._socket = require('socket.io')(_server);
    this._socket.on('connection', _socket => {
      _socket.on('force-reboot', token => {
        if (!token) return;
        tokenAuth.verify(token, config.hashKey, (err, decoded) =>{
          if (err) return;
          if (!decoded) return;
          this._rebootRouter('manual');
        });
      });
      _socket.on('count', host => this._count(host).then(count => this._emit('count', count)));
      _socket.on('log', obj => this._getLogs(obj.host, obj.skip, obj.limit).then(log => this._emit('log', log)));
      _socket.on('login', login => {
        this._users.findOne({
          username: login.username
        }, (err, user) => {
          if (!user) {
            this._emit('toast', 'login failed');
            return;
          }
          if (!bcrypt.compareSync(login.password, user.password)) {
            this._emit('toast', 'login failed');
            return;
          }
          if (user.twoFactor) {
            _socket.emit('twoFactor');
            return;
          }
          const token = tokenAuth.sign(user, this.config.hashKey, {
            expiresIn: '24h'
          });
          _socket.emit('login', token);
          _socket.emit('toast', 'Successful Login');
        });
      });
      _socket.on('twoFactor', twoFactor => {
        this._users.findOne({
          username: twoFactor.username
        }, (err, user) => {
          if (!user) {
            this._emit('toast', 'login failed');
            return;
          }
          if (!authenticator.verifyToken(user.authKey, twoFactor.code)) {
            this._emit('toast', 'login failed');
            return;
          }
          const token = tokenAuth.sign(user, this.config.hashKey, {
            expiresIn: '24h'
          });
          _socket.emit('login', token);
          _socket.emit('toast', 'Successful Login');
        });
      });
      this._pushRestarts();
      this._pushHistory();
      // one off ping to lessen the delay for router status
      // without could take +30 seconds to get status
      this._network.get_gateway_ip((err, ip) => this._ping(ip).then(res => this._emit('router-status', res)));
    });

    this.PingWrapper = require ("ping-wrapper");
    this.PingWrapper.configure();

    const Data = require('nedb');
    this._history = new Data({
      filename: __dirname + '/data/data.db',
      autoload: true
    });
    this._restarts = new Data({
      filename: __dirname + '/data/restarts.db',
      autoload: true
    });
    this._users = new Data({
      filename: __dirname + '/data/users.db',
      autoload: true
    });

    _app.use(_compression());
    _app.disable('x-powered-by');

    _app.use(_express.static(__dirname + '/html', {
      maxAge: (60000 * 60) * 24
    }));

    _app.get('/count/:host', (req, res) => {
      let host = req.params.host;
      if (!host) {
        res.status(500).send({
          status: 500,
          host: host,
          error: 'invalid host'
        });
        return;
      }
      this._count(host).then(count => res.status(count.status).send(count));
    });


    _app.get('/log/:host/:skip/:limit', (req, res) => {
      let host = req.params.host;
      let skip = parseInt(req.param.skip, 10);
      let limit = parseInt(req.param.limit, 10);
      this._getLogs(host, skip, limit).then(logs => res.status(logs.status).send(logs));
    });

    this._network = require('network');

    this.onoff = require('onoff').Gpio;

    this._hasRebooted = false;
    this._failedRouterPings = 0;

    this._addresses = this.config.addresses;
    this._responses = [];

  }


  /**
   * check if given addres is valid
   *
   * @param {String} host - ip / url address
   */
  _isValidHost(host) {
    for (let i = 0; i < this._addresses.length; i++) {
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
  _emit(name, data) {
    this._socket.emit(name, data);
  }

  /**
   * output to console
   *
   * @param {string} message - message to display
   */
  _print(message) {
    console.log(new Date().toLocaleString() + ':   ' + message);
  }

  /**
   * preform a ping test to a given url / address
   *
   * @param {String} url - url / ip to ping
   */
  _ping(url) {
    return new Promise(resolve => {
      let _ping = new this.PingWrapper(url);
      _ping.on('ping', data => {
        resolve({
          address: url,
          data: data
        });
      });
      _ping.on('fail', data => {
        resolve({
          address: url,
          data: false
        });
      });
      setTimeout(() => {
        _ping.stop();
      }, 15000);
    });
  }

  /**
   * will kill power to the router by triggering a relay
   */
  relayReboot() {
    return new Promise(resolve => {
      const _gpio = this.onoff(this.config.relayPin, 'out');
      _gpio.write(1, _ => {
        setTimeout(_ => {
          this._emit('toast', 'powering on router...');
          _gpio.write(0, _ => {
            this._print('router rebooted');
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
   */
  enterRestartToDB(type) {
    this._restarts.insert({
      time: new Date().getTime(),
      type: type
    }, err => this._pushRestarts(err));
  }


  /**
   * reboot the router
   *
   * @param {String} type - manual or automated
   */
  _rebootRouter(type) {
    this._hasRebooted = true;
    this._emit('toast', 'rebooting router...');
    if (this.fs.existsSync(__dirname + '/ssh.json') && this._lastRouterPing.data.hasOwnProperty('time')) {
      // ssh file exist and last router ping was successful
      // will attempt to reboot with ssh
      const routerLogin = require(__dirname + '/ssh.json');
      routerLogin.host = this._routerIP;
      try {
        const ssh = new this.SSH(routerLogin);
        ssh.on('error', err => {
          this.relayReboot().then(_ => this.enterRestartToDB(type));
          ssh.end();
        });
        ssh.exec(this.config.routerRebootCommand, {
          out: stdout => {
            enterRestartToDB(type);
            this._print('router rebooted');
            this.enterRestartToDB(type);
            ssh.end();
            //console.log(stdout);
          }
        }).start();
      } catch (e) {
        this.relayReboot().then(_ => this.enterRestartToDB(type));
      }
    }
    if (!this._lastRouterPing.data.hasOwnProperty('time')) {
      // must be researt with relay
      this.relayReboot().then(_ => this.enterRestartToDB(type));
    }
  }

  /**
   * count failed pings
   *
   * @param {Array} items - list of ping results
   */
  _countResults(items) {
    let count = 0;
    const total = items.length;
    let highPings = 0;
    for (let i = 0; i < total; i++) {
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
    if (!count && !highPings)
      this._print('all pings successful');
    if (count > 1)
      this._hasRebooted = false;
    if (count)
      this._emit('toast', count + ' of ' + this._addresses.length + ' pings failed with ' + highPings + ' high pings');
    // all pings failed
    if (count === total && !this._hasRebooted)
      this._rebootRouter('automated');
    // half or more of the pings had high ping time
    if (highPings >= Math.floor(this._addresses.length / 2) && !this._hasRebooted)
      this._rebootRouter('automated');
    console.timeEnd('all pings responded in');
    this._pushHistory();
  }

  /**
   * update restarts on client
   *
   * @param {Error} err
   */
  _pushRestarts(err) {
    if (err) this._print(err);
    this._restarts.count({}, (err, count) => {
      this._restarts.find().sort({time: 1}).skip((() => {
        if (count > 10) {
          return count - 10;
        } else {
          return 0;
        }
      })()).exec((err, logs) => this._emit('restarts', logs));
    });
  }

  /**
   * update history on client
   *
   * @param {Error} err
   */
  _pushHistory(err) {
    if (err) this._print(err);
    let expected = this.config.graphLength * this._addresses.length;
    this._history.count({}, (err, count) => {
      const skip = (_ => {
        if (count > expected) {
          return count - expected;
        } else {
          return 0;
        }
      })();
      this._history.find({}).sort({
        time: 1
      }).skip(skip).limit(expected).exec((err, logs) => this._emit('history', logs));
    });
  }

  /**
   * Promise that returns a response object with
   * the number of ping data points for the given host
   *
   * @param {String} host
   */
  _count(host) {
    return new Promise(resolve => {
      if (!this._isValidHost(host)) {
        resolve({
          status: 401,
          host: host,
          error: 'invalid host'
        });
        return;
      }
      this._history.count({
        address: host
      }, (err, count) => {
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
  _getLogs(host, skip, limit) {
    return new Promise(resolve => {
      if (!this._isValidHost(host)) {
        resolve({
          status: 401,
          error: 'invalid host',
          host: host
        });
        return;
      }
      this._history.find({
        address: host
      }).sort({
        time: 1
      }).skip(skip).limit(limit).exec((err, logs) => {
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
        })
      });
    });
  }

  /**
   * ging the given router ip every 30 seconds
   *
   * @param {String} - ip
   */
  _pingRouter(ip) {
    setTimeout(_ => {
      this._pingRouter(ip);
    }, 30000);
    this._ping(ip).then(res => {
      if (!res.data.hasOwnProperty('time')) {
        this._failedRouterPings++;
        if (this._failedRouterPings > 2)
          this._rebootRouter('automated');
        return;
      }
      this._failedRouterPings = 0;
      this._emit('router-status', res);
    });
  }

  /**
   * ping responded
   *
   * @param {object} data - ping response data
   */
  _response(data) {
    data.time = new Date().getTime();
    this._history.insert(data);
    this._responses.push(data);
    if (this._responses.length === this._addresses.length) this._countResults(this._responses);
  }

  /**
   * start the test
   */
  start() {
    const oneMin = 60000;
    const oneHour = oneMin * 60;
    // set the timer for next
    setTimeout(this.start.bind(this), oneHour * this.config.repeat);
    // clear responses array if it contains results
    if (this._responses.length) this._responses = [];
    this._print('running ping on ' + this._addresses.length + ' addresses');
    console.time('all pings responded in');
    // run ping on each address in the list
    this._addresses.forEach(address => this._ping(address).then(this._response.bind(this)));
    this._network.get_gateway_ip((err, ip) => this._pingRouter(ip));
  }

}

const configFile = require(__dirname + '/config.json');
const app = new Rebooter(configFile);
app.start();
