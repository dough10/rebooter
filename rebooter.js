'use strict';
let config = require('./config.json');
let express = require('express');
let app = express();
let server = app.listen(config.port);
let io = require('socket.io')(server);
let Ping = require ("ping-wrapper");
let Data = require('nedb');
Ping.configure();

let history = new Data({
  filename: './data.db',
  autoload: true
});

let restarts = new Data({
  filename: './restarts.db',
  autoload: true
});

// import addresses from json file
let addresses = config.addresses;

// container for ping results
let responses = [];

// one minuite
let oneMin = 60000;
let oneHour = oneMin * 60;

// max ping time response
let maxPing = config.maxPing;


function isValidHost(host) {
  for (let i = 0; i < addresses.length; i++) {
    if (host === addresses[i]) return true;
  }
  return false;
}


/**
 * send data to client
 */
function emit(name, data) {
  io.emit(name, data);
}


/**
 * output to console
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
  });
}


/**
 * reboot the router
 */
function rebootRouter() {
  emit('toast', 'Rebooting router...');
  restarts.insert({
    time: new Date().getTime()
  }, err => pushRestarts(err));
}


/**
 * count failed pings*
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
    if (items[i].data.hasOwnProperty('time') && items[i].data.time > maxPing) {
      highPings++;
      print(items[i].address + ' has ping greater then ' + maxPing);
    }
  }
  // all pings failed
  if (count === total) rebootRouter();
  // half or more of the pings had high ping time
  if (highPings >= Math.floor(addresses.length / 2)) rebootRouter();
  // all pings returned with good time
  if (!count && !highPings) print('all pings successful');
  setTimeout(start, oneHour * config.repeat);
  console.timeEnd('all pings responded in');
  pushHistory();
}

/**
 * update restarts on client
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
  // clear responses array if it contains results
  if (responses.length) responses = [];
  // grab any new addresses from json file
  addresses = require('./config.json').addresses;
  print('running ping on ' + addresses.length + ' addresses');
  console.time('all pings responded in');
  // run ping on each address in the list
  addresses.forEach(address => ping(address).then(response, response));
}


io.on('connection', socket => {
  socket.on('force-reboot', () => rebootRouter());
  pushRestarts();
  pushHistory();
});

app.use(express.static('html', {
  maxAge: 86400000
}));


app.get('/log/:host/:skip/:limit', (req, res) => {
  let host = req.params.host;
  let skip = parseInt(req.param.skip, 10);
  let limit = parseInt(req.param.limit, 10);
  if (!isValidHost(host)) {
    res.send({
      status: 401,
      error: 'invalid host'
    });
    return;
  }
  history.count({
    address: host
  }, (err, count) => {
    console.log(count);
    history.find({
      address: host
    }).sort({
      time: 1
    }).skip(skip).limit(limit).exec((err, logs) => {
      if (err) {
        res.status(500).send({
          status: 500,
          error: err
        });
      } else {
        res.send({
          status: 200,
          history: logs
        })
      }
    });
  });
});



start();
