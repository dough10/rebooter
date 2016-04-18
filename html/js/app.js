(function () {
  'use strict';
  // object to store application data

  var appData = {};

  /**
   * set the opacity of a give element to a give value
   *
   * @param {Element} el = the element to edit opacity of
   * @param {Number} opacity = the value to set opacity to
   */
  function setOpacity(el, opacity) {
    el.style.opacity = opacity;
  }

  /**
   * fade in opacity of a given element
   *
   * @param {HTMLElement} el
   */
  function fadeIn(el) {
    var opacity = 0;
    requestAnimationFrame(function step(timeStamp) {
      opacity += 0.05;
      if (opacity >= 1) {
        var event = new CustomEvent('faded', {
          detail: {
            element: el,
            direction: 'in'
          }
        });
        el.dispatchEvent(event);
        setOpacity(el, 1);
        return;
      }
      setOpacity(el, opacity);
      requestAnimationFrame(step);
    });
  }

  /**
   * sort the history object into appData object
   *
   * @param {array} history
   */
  function sortHistory(history) {
    return new Promise(function (resolve) {
      var obj = {};
      history.forEach(function (entry) {
        if (obj.hasOwnProperty(entry.address)) {
          obj[entry.address].push(entry);
        } else {
          obj[entry.address] = [];
          obj[entry.address].push(entry);
        }
      });
      resolve(obj);
    });
  }

  /**
   * return a array of ping entry times
   *
   * @param {Array} array
   */
  function returnTime(array) {
    var output = [];
    var len = array.length;
    for (var i = 0; i < len; i++) {
      output.push(new Date(array[i].time).toLocaleTimeString());
    }
    return output;
  }

  /**
   * return a array of ping entry data
   *
   * @param {Array} array
   */
  function returnData(array) {
    var output = [];
    var len = array.length;

    var _loop = function (i) {
      output.push(function () {
        if (array[i].data) {
          return array[i].data.time;
        } else {
          return 0;
        }
      }());
    };

    for (var i = 0; i < len; i++) {
      _loop(i);
    }
    return output;
  }

  /**
   * render graphs of the input data
   *
   * @param {Object} data
   */
  function graphData(data) {
    var card = document.querySelector('#card');
    var width = card.offsetWidth - 48;
    for (var key in data) {
      var id = 'el-' + key.replace(/\./g, '');
      var exist = document.querySelector('#' + id);
      if (exist) card.removeChild(exist);
      var div = document.createElement('div');
      var text = document.createElement('h3');
      div.id = id;
      div.style.opacity = 0;
      text.textContent = key;
      div.appendChild(text);
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 200;
      div.appendChild(canvas);
      card.appendChild(div);
      var r = Math.floor(Math.random() * 256);
      var g = Math.floor(Math.random() * 256);
      var b = Math.floor(Math.random() * 256);
      var light = 'rgba(' + r + ',' + g + ',' + b + ', 0.1)';
      var dark = 'rgba(' + r + ',' + g + ',' + b + ', 1)';
      var chartData = {
        labels: returnTime(data[key]),
        datasets: [{
          label: key + " Ping",
          fillColor: light,
          strokeColor: dark,
          data: returnData(data[key])
        }]
      };
      var ctx = canvas.getContext("2d");
      var chart = new Chart(ctx).Line(chartData, {
        animation: false,
        pointDot: false,
        showTooltips: true,
        scaleLabel: "<%=value%> ms",
        scaleFontFamily: "'Roboto', 'Noto', sans-serif",
        scaleFontSize: 10
      });
      fadeIn(div);
    }
  }

  /**
   * output restart history*
   *
   * @param {Array} logs
   */
  function outputRestarts(logs) {
    if (logs.length) {
      var last = document.querySelector('#lastRestart');
      last.textContent = new Date(logs[logs.length - 1].time).toLocaleString();
    }
  }

  /**
   * display a toast message
   */
  function showToast(text) {
    var toast = document.querySelector('#toast');
    toast.classList.remove('hidden');
    toast.textContent = text;
    setTimeout(hideToast, 2000);
  }

  /**
   * hide the toast
   */
  function hideToast() {
    var toast = document.querySelector('#toast');
    toast.classList.add('hidden');
    setTimeout(function () {
      toast.textContent = '';
    }, 250);
  }

  function positionDialog() {
    var dialog = document.querySelector('#reboot-dialog');
    var centerH = Math.floor((window.innerHeight - 80) / 2);
    var centerW = Math.floor((window.innerWidth - 112) / 2);
    var centerDH = Math.floor(dialog.offsetHeight / 2);
    var centerDW = Math.floor(dialog.offsetWidth / 2);
    var top = Math.floor(centerH - centerDH) + 'px';
    var left = Math.floor(centerW - centerDW) + 'px';
    dialog.style.top = top;
    dialog.style.left = left;
  }

  function makeRipple(event) {
    return new Promise(function (resolve) {
      var el = event.target;
      var x = event.x;
      var y = event.y;
      var div = document.createElement('div');
      div.classList.add('ripple-effect');
      var size = el.offsetHeight;
      var halfSize = size / 2;
      //      div.style.height = size + 'px';
      //      div.style.width = size + 'px';
      //      div.style.top = (y - halfSize) + 'px';
      //      div.style.left = (x - halfSize) + 'px';
      div.style.background = event.target.dataset.rippleColor;
      el.appendChild(div);
      setTimeout(function () {
        return el.removeChild(div);
      }, 2000);
      resolve();
    });
  }

  function openDialog() {
    var dialog = document.querySelector('#reboot-dialog');
    if (!dialog.classList.contains('dialog-opened')) dialog.classList.add('dialog-opened');
  }

  function closeDialog() {
    var dialog = document.querySelector('#reboot-dialog');
    if (dialog.classList.contains('dialog-opened')) dialog.classList.remove('dialog-opened');
  }

  // redraw graphs on window reload
  var timer = 0;
  window.onresize = function () {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    timer = setTimeout(function () {
      graphData(appData);
      timer = 0;
    }, 100);
    positionDialog();
  };

  // run the app
  window.onload = function () {
    positionDialog();
    // fade card opacity
    var card = document.querySelector('#card');
    fadeIn(card);
    // socket.io setup
    var socket = io.connect(location.origin);
    socket.on('connect', function () {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('offline')) {
        led.classList.remove('offline');
        led.classList.add('online');
      }
    });
    socket.on('disconnect', function () {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('online')) {
        led.classList.remove('online');
        led.classList.add('offline');
      }
    });
    socket.on('history', function (logs) {
      return sortHistory(logs).then(function (data) {
        appData = data;
        graphData(data);
      });
    });
    socket.on('restarts', function (logs) {
      return outputRestarts(logs);
    });
    socket.on('toast', function (message) {
      return showToast(message);
    });
    // open reboot dialog
    var reboot = document.querySelector('#reboot');
    reboot.addEventListener('click', function (e) {
      return makeRipple(e).then(openDialog);
    });
    // close reboot dialog
    var rebootClose = document.querySelector('#reboot-dialog-close');
    rebootClose.addEventListener('click', function (e) {
      return makeRipple(e).then(closeDialog);
    });
    // close reboot dialog and reboot
    var rebootButton = document.querySelector('#reboot-dialog-reboot');
    rebootButton.addEventListener('click', function (e) {
      socket.emit('force-reboot');
      makeRipple(e).then(closeDialog);
    });
  };
})();
//# sourceMappingURL=app.js.map
