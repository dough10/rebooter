'use strict';

const config = require(__dirname + '/config.json');
const fs = require('fs');
const httpsOptions = {
  key: fs.readFileSync(config.sslKey),
  cert: fs.readFileSync(config.sslCert),
  requestCert: false,
  rejectUnauthorized: false
};
const express = require('express');
const https = require('https');
const app = express();
const server = https.Server(httpsOptions, app);
const io = require('socket.io')(server);
const Ping = require ("ping-wrapper");
const Data = require('nedb');
const compression = require('compression');
const network = require('network');
const onoff = require('onoff').Gpio;

server.listen(config.port, _ => {
  console.log(new Date().toLocaleString() + ":   Web interface started on port " + config.port);
});


app.disable('x-powered-by');
Ping.configure();
let failedRouterPings = 0;
let hasRebooted = false;

let history = new Data({
  filename: __dirname + '/data/data.db',
  autoload: true
});

let restarts = new Data({
  filename: __dirname + '/data/restarts.db',
  autoload: true
});

// import addresses from json file
let addresses = config.addresses;

// container for ping results
let responses = [];

// one minuite
let oneMin = 60000;
let oneHour = oneMin * 60;


/**
 * check if given addres is valid
 *
 * @param {String} host - ip / url address
 */
function isValidHost(host) {
  for (let i = 0; i < addresses.length; i++) {
    if (host === addresses[i]) return true;
  }
  return false;
}


/**
 * send data to client
 *
 * @param {String} name
 * @param {???} data - any data type can be sent
 */
function emit(name, data) {
  io.emit(name, data);
}


/**
 * output to console
 *
 * @param {string} message - message to display
 */
function print (message) {
  console.log(new Date().toLocaleString() + ':   ' + message);
}


/**
 * preform a ping test to a given url / address
 *
 * @param {String} url - url / ip to ping
 */
function ping(url) {
  return new Promise((resolve, reject) => {
    let _ping = new Ping(url);
    _ping.on('ping', data => {
      resolve({
        address: url,
        data: data
      });
    });
    _ping.on('fail', data => {
      reject({
        address: url,
        data: false
      });
    });
    setTimeout(() => {
      _ping.stop();
    }, 60000);
  });
}


/**
 * reboot the router
 */
function rebootRouter(type) {
  hasRebooted = true;
  emit('toast', 'rebooting router...');
  // set up gpio
  var gpio = onoff(config.relayPin, 'out');
  gpio.write(1, _ => {
    setTimeout(_ => {
      restarts.insert({
        time: new Date().getTime(),
        type: type
      }, err => pushRestarts(err));
      emit('toast', 'powering on router...');
      gpio.write(0, _ => {
        print('router rebooted');
      });
    }, 35000);
  });
}


/**
 * count failed pings
 *
 * @param {Array} items - list of ping results
 */
function countResults(items) {
  let count = 0;
  let total = items.length;
  let highPings = 0;
  for (let i = 0; i < total; i++) {
    if (!items[i].data) {
      count++;
      print('ping failed for ' + items[i].address);
    }
    if (items[i].data.hasOwnProperty('time') && items[i].data.time > config.maxPing) {
      highPings++;
      print(items[i].address + ' has ping greater then ' + config.maxPing);
    }
  }
  // all pings returned with good time
  if (!count && !highPings) {
    hasRebooted = false;
    print('all pings successful');
  }
  if (count) emit('toast', count + ' of ' + addresses.length + ' pings failed with ' + highPings + ' high pings');
  // all pings failed
  if (count === total && !hasRebooted) rebootRouter('automated');
  // half or more of the pings had high ping time
  if (highPings >= Math.floor(addresses.length / 2) && !hasRebooted) rebootRouter('automated');
  console.timeEnd('all pings responded in');
  pushHistory();
}

/**
 * update restarts on client
 *
* @param {Error} err
 */
function pushRestarts(err) {
  if (err) print(err);
  restarts.count({}, (err, count) => {
    restarts.find().sort({time: 1}).skip((() => {
      if (count > 10) {
        return count - 10;
      } else {
        return 0;
      }
    })()).exec((err, logs) => emit('restarts', logs));
  });
}

/**
 * update history on client
 *
 * @param {Error} err
 */
function pushHistory(err) {
  if (err) print(err);
  let expected = config.graphLength * addresses.length;
  history.count({}, (err, count) => {
    let skip = (() => {
      if (count > expected) {
        return count - expected;
      } else {
        return 0;
      }
    })();
    history.find({}).sort({
      time: 1
    }).skip(skip).limit(expected).exec((err, logs) => emit('history', logs));
  });
}

function count(host) {
  return new Promise(resolve => {
    if (!isValidHost(host)) {
      resolve({
        status: 401,
        host: host,
        error: 'invalid host'
      });
      return;
    }
    history.count({
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

function getLogs(host, skip, limit , color) {
  return new Promise(resolve => {
    if (!isValidHost(host)) {
      resolve({
        status: 401,
        error: 'invalid host',
        host: host
      });
      return;
    }
    history.find({
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
        host: host,
        color: color
      })
    });
  });
}



function pingRouter(ip) {
  setTimeout(() => {
    pingRouter(ip);
  }, 30000);
  ping(ip).then(res => {
    if (!res.data.hasOwnProperty('time')) {
      failedRouterPings++;
      if (failedRouterPings > 2) rebootRouter('automated');
      return;
    }
    failedRouterPings = 0;
    emit('router-status', res);
  });
}




/**
 * ping responded
 *
 * @param {object} data - ping response data
 */
function response(data) {
  data.time = new Date().getTime();
  history.insert(data);
  responses.push(data);
  if (responses.length === addresses.length) countResults(responses);
}


/**
 * start the test
 */
function start() {
  // set the timer for next
  setTimeout(start, oneHour * config.repeat);
  // clear responses array if it contains results
  if (responses.length) responses = [];
  // grab any new addresses from json file
  addresses = require(__dirname + '/config.json').addresses;
  print('running ping on ' + addresses.length + ' addresses');
  console.time('all pings responded in');
  // run ping on each address in the list
  addresses.forEach(address => ping(address).then(response, response));
}


io.on('connection', socket => {
  socket.on('force-reboot', () => rebootRouter('manual'));
  socket.on('count', host => count(host).then(count => emit('count', count)));
  socket.on('log', obj => getLogs(obj.host, obj.skip, obj.limit, obj.color).then(log => emit('log', log)));
  pushRestarts();
  pushHistory();
  network.get_gateway_ip((err, ip) => ping(ip).then(res => emit('router-status', res)));
});

app.use(compression());

app.use(express.static(__dirname + '/html', {
  maxAge: 86400000
}));

app.get('/count/:host', (req, res) => {
  let host = req.params.host;
  if (!host) {
    res.status(500).send({
      status: 500,
      host: host,
      error: 'invalid host'
    });
    return;
  }
  count(host).then(count => res.status(count.status).send(count));
});


app.get('/log/:host/:skip/:limit', (req, res) => {
  let host = req.params.host;
  let skip = parseInt(req.param.skip, 10);
  let limit = parseInt(req.param.limit, 10);
  getLogs(host, skip, limit).then(logs => res.status(logs.status).send(logs));
});


// start pinging
start();
network.get_gateway_ip((err, ip) => pingRouter(ip));
