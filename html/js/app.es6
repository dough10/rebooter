(() => {
  'use strict';
  // object to store application data
  let appData = {};

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
    let opacity = 0;
    requestAnimationFrame(function step(timeStamp) {
      opacity += 0.05;
      if (opacity >= 1) {
        let event = new CustomEvent('faded', {
          detail: {
            element: el,
            direction: 'in'
          }
        });
        el.dispatchEvent(event);
        setOpacity(el, 1)
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
    return new Promise(resolve => {
      let obj = {};
      history.forEach(entry => {
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
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
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
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
      output.push((() => {
        if (array[i].data) {
          return array[i].data.time;
        } else {
          return 0;
        }
      })());
    }
    return output;
  }

  /**
   * render graphs of the input data
   *
   * @param {Object} data
   */
  function graphData(data) {
    let card = document.querySelector('#card');
    let width = card.offsetWidth - 48;
    for (let key in data) {
      let id = 'el-' + key.replace(/\./g,'');
      let exist = document.querySelector('#' + id);
      if (exist) card.removeChild(exist);
      let div = document.createElement('div');
      let text = document.createElement('h3');
      div.id = id;
      div.style.opacity = 0;
      text.textContent = key;
      div.appendChild(text);
      let canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 200;
      div.appendChild(canvas);
      card.appendChild(div);
      let r = (Math.floor(Math.random() * 256));
      let g = (Math.floor(Math.random() * 256));
      let b = (Math.floor(Math.random() * 256));
      let light = 'rgba(' + r + ',' + g + ',' + b + ', 0.1)';
      let dark = 'rgba(' + r + ',' + g + ',' + b + ', 1)';
      let chartData = {
        labels: returnTime(data[key]),
        datasets: [
          {
            label: key + " Ping",
            fillColor: light,
            strokeColor: dark,
            data: returnData(data[key])
          }
        ]
      };
      let ctx = canvas.getContext("2d");
      let chart = new Chart(ctx).Line(chartData, {
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
      let last = document.querySelector('#lastRestart');
      last.textContent = new Date(logs[logs.length - 1].time).toLocaleString();
    }
  }

  /**
   * display a toast message
   */
  function showToast(text) {
    let toast = document.querySelector('#toast');
    toast.classList.remove('hidden');
    toast.textContent = text;
    setTimeout(hideToast, 2000);
  }

  /**
   * hide the toast
   */
  function hideToast() {
    let toast = document.querySelector('#toast');
    toast.classList.add('hidden');
    setTimeout(function() {
      toast.textContent = '';
    }, 250);
  }

  function positionDialog() {
    let dialog = document.querySelector('#reboot-dialog');
    let centerH = Math.floor((window.innerHeight - 80) / 2);
    let centerW = Math.floor((window.innerWidth - 112) / 2);
    let centerDH = Math.floor(dialog.offsetHeight / 2);
    let centerDW = Math.floor(dialog.offsetWidth / 2);
    let top = Math.floor(centerH - centerDH) + 'px';
    let left = Math.floor(centerW - centerDW) + 'px';
    dialog.style.top = top;
    dialog.style.left = left;
  }

  function makeRipple(el, event) {
    console.log(event)
    let x = event.offsetX;
    let y = event.offsetY;
    let div = document.createElement('div');
    div.classList.add('ripple-effect');
    let size = el.offsetHeight;
    div.style.height = size;
    div.style.width = size;
    div.style.top = y - (size / 2);
    div.style.left = x - (size / 2);
    div.style.background = 'red';
    el.appendChild(div);
    setTimeout(() => el.removeChild(div), 2000)
  }

  // redraw graphs on window reload
  let timer = 0;
  window.onresize = () => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    timer = setTimeout(() => {
      graphData(appData);
      timer = 0;
    }, 100);
    positionDialog();
  };

  // run the app
  window.onload = () => {
    positionDialog();
    // fade card opacity
    let card = document.querySelector('#card');
    fadeIn(card);
    // socket.io setup
    let socket = io.connect(location.origin);
    socket.on('connect', () => {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('offline')) {
        led.classList.remove('offline');
        led.classList.add('online');
      }
    });
    socket.on('disconnect', () => {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('online')) {
        led.classList.remove('online');
        led.classList.add('offline');
      }
    });
    socket.on('history', logs => sortHistory(logs).then(data => {
      appData = data;
      graphData(data);
    }));
    socket.on('restarts', logs => outputRestarts(logs));
    // open reboot dialog
    let reboot = document.querySelector('#reboot');
    reboot.addEventListener('click', e => {
      makeRipple(reboot, e);
      let dialog = document.querySelector('#reboot-dialog');
      if (!dialog.classList.contains('dialog-opened')) dialog.classList.add('dialog-opened');
    });
    // close reboot dialog
    let rebootClose = document.querySelector('#reboot-dialog-close');
    rebootClose.addEventListener('click', e => {
      let dialog = document.querySelector('#reboot-dialog');
      if (dialog.classList.contains('dialog-opened')) dialog.classList.remove('dialog-opened');
    });
    // close reboot dialog and reboot
    let rebootButton = document.querySelector('#reboot-dialog-reboot');
    rebootButton.addEventListener('click', e => {
      socket.emit('force-reboot');
      showToast('Router rebooting...');
      let dialog = document.querySelector('#reboot-dialog');
      if (dialog.classList.contains('dialog-opened')) dialog.classList.remove('dialog-opened');
    });
  };
})();
