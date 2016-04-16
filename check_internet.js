'strict mode';
var config = require('./config.json');
var express = require('express');
var app = express();
app.use(express.static('html', {maxAge: 86400000}));
var server = app.listen(config.port);
var io = require('socket.io')(server);
var Ping = require ("ping-wrapper");
Ping.configure();

// import addresses from json file
var addresses = config.addresses;

// container for ping results
var responses = [];

// one minuite
var oneMin = 60000;
var oneHour = oneMin * 60;

// max ping time response
var maxPing = config.maPing;

/**
 * attach a reset function to console object
 */
console.reset = function () {
  return process.stdout.write('\033c');
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
    var _ping = new Ping(url);
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
function rebootRouter() {}


/**
 * count failed pings*
 * @param {Array} items - list of ping results
 */
function countBadResults(items) {
  var count = 0;
  var total = items.length;
  var highPings = 0;
  for (var i = 0; i < total; i++) {
    if (!items[i].data) {
      count++;
      print('ping failed for ' + items[i].address);
    }
    if (items[i].data.hasOwnProperty('time') && items[i].data.time > maxPing) {
      highPings++;
      print(items[i].address + ' has ping greater then ' + maxPing);
    }
  }
  // all pings failed & router should be rebooted
  if (count === total) rebootRouter();
  // more then half of the pings has high time
  if (highPings >= addresses.length / 2) rebootRouter();
  // all pings returned with good time
  if (!count && !highPings) print('all pings successful');
  setTimeout(start, oneHour * config.repeat);
  console.timeEnd('all pings responded in');
}


/**
 * ping responded
 *
 * @param {object} data - ping response data
 */
function response(data) {
  responses.push(data);
  if (responses.length === addresses.length) countBadResults(responses);
}


/**
 * start the test
 */
function start() {
  console.reset();
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
  socket.on('thing', data => console.log(data));
});
