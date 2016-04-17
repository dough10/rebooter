'use strict';
let config = require('./config.json');
let express = require('express');
let app = express();
app.use(express.static('html', {maxAge: 86400000}));
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
  restarts.insert({
    time: new Date().getTime()
  });
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
  if (highPings >= addresses.length / 2) rebootRouter();
  // all pings returned with good time
  if (!count && !highPings) print('all pings successful');
  setTimeout(start, oneHour * config.repeat);
  console.timeEnd('all pings responded in');
  pushHistory();
}

/**
 * update history on client
 */
function pushHistory() {
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

start();

io.on('connection', socket => {
  restarts.count({}, (err, count) => {
    restarts.find().sort({time: 1}).skip((() => {
      if (count > 10) {
        return count - 10;
      } else {
        return 0;
      }
    })()).exec((err, logs) => emit('restarts', logs));
  });
  pushHistory();
});
