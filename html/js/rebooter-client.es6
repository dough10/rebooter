(() => {
  'use strict';
  // object to store application data
  let appData = {};

  /**
   * return readable time sence a given date
   *
   * @param {String} time - date or time the entry was made
   */
  function ago(time){
    if (time) {
      var date = new Date(time);
      var seconds = Math.floor((new Date() - date) / 1000);
      var interval = Math.floor(seconds / 31536000);
      if (interval > 1) {
        return interval + " years ago";
      }
      interval = Math.floor(seconds / 2592000);
      if (interval > 1) {
        return interval + " months ago";
      }
      interval = Math.floor(seconds / 86400);
      if (interval > 1) {
        return interval + " days ago";
      }
      interval = Math.floor(seconds / 3600);
      if (interval > 1) {
        return interval + " hours ago";
      }
      interval = Math.floor(seconds / 60);
      if (interval > 1) {
        return interval + " minutes ago";
      }
      return Math.floor(seconds) + " seconds ago";
    }
  }

  /**
   * set the opacity of a give element to a give value
   *
   * @param {Element} el = the element to edit opacity of
   * @param {Number} opacity = the value to set opacity to
   */
  function setOpacity(el, opacity) {
    el.style.opacity = opacity;
  }

  function setProgress(bar, x) {
    bar.style.transform = 'translateX(' + x + 'px)';
  }

  function startProgress() {
    let wrapper = document.querySelector('.bar-wrapper');
    wrapper.style.display = 'block';
    let total = -Math.abs(wrapper.offsetWidth);
    let bar = document.querySelector('#rebootProgress');
    bar.style.willChange = 'transform';
    let frameDistance = Math.abs((total / 34.5) / 60);
    let progress = total;
    setProgress(bar, progress);
    requestAnimationFrame(function step() {
      progress += frameDistance;
      if (progress >= 0) {
        setProgress(bar, 0);
        wrapper.style.display = 'none';
        bar.style.willChange = 'auto';
        return;
      }
      setProgress(bar, progress);
      requestAnimationFrame(step);
    });
  }

  /**
   * fade in opacity of a given element
   *
   * @param {HTMLElement} el
   */
  function fadeIn(el) {
    let opacity = 0;
    el.style.willChange = 'opacity';
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
        setOpacity(el, 1);
        el.style.willChange = 'auto';
        return;
      }
      setOpacity(el, opacity);
      requestAnimationFrame(step);
    });
  }

  /**
   * fade out opacity of a given element
   *
   * @param {HTMLElement} el
   */
  function fadeOut(el) {
    var opacity = 1;
    el.style.willChange = 'opacity';
    requestAnimationFrame(function step(timeStamp) {
      opacity -= 0.05;
      if (opacity <= 0) {
        var event = new CustomEvent('fade', {
          detail: {
            element: el,
            direction: 'out'
          }
        });
        el.dispatchEvent(event);
        setOpacity(el, 0);
        el.style.willChange = 'auto';
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
   * return a array of blank labels
   *
   * @param {Array} array
   */
  function returnBlankLabel(array) {
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
      output.push('');
    }
    return output;
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

  function highestPing(array) {
    return Math.max.apply(Math, array);
  }

  function lowestPing(array) {
    return Math.min.apply(Math, array);
  }

  function scrollbarWidth() {
    var inner = document.createElement('p');
    inner.style.width = "100%";
    inner.style.height = "200px";

    var outer = document.createElement('div');
    outer.style.position = "absolute";
    outer.style.top = "0px";
    outer.style.left = "0px";

    outer.style.visibility = "hidden";
    outer.style.width = "200px";
    outer.style.height = "150px";
    outer.style.overflow = "hidden";
    outer.appendChild (inner);

    document.body.appendChild (outer);
    var w1 = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    var w2 = inner.offsetWidth;
    if (w1 == w2) w2 = outer.clientWidth;

    document.body.removeChild (outer);

    return (w1 - w2);
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
      let canvasWrapper = document.createElement('div');
      let text = document.createElement('h3');
      div.id = id;
      div.style.opacity = 0;
      text.textContent = key;
      div.appendChild(text);
      let canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 100;
      canvas.style.pointerEvents = 'none';
      canvasWrapper.classList.add('clickable');
      canvasWrapper.dataset.rippleColor = "#673AB7"
      canvasWrapper.appendChild(canvas);
      div.appendChild(canvasWrapper);
      card.appendChild(div);
      let graphData = returnData(data[key]);
      let r = (Math.floor(Math.random() * 256));
      let g = (Math.floor(Math.random() * 256));
      let b = (Math.floor(Math.random() * 256));
      let light = 'rgba(' + r + ',' + g + ',' + b + ', 0.1)';
      let dark = 'rgba(' + r + ',' + g + ',' + b + ', 1)';
      let chartData = {
        labels: returnBlankLabel(data[key]),
        datasets: [
          {
            label: key + " Ping",
            fillColor: light,
            strokeColor: dark,
            data: graphData
          }
        ]
      };
      let ctx = canvas.getContext("2d");
      let chart = new Chart(ctx).Line(chartData, {
        animation: false,
        pointDot: false,
        showTooltips: false,
        scaleLabel: "<%=value%> ms",
        scaleFontFamily: "'Roboto', 'Noto', sans-serif",
        scaleFontSize: 10
      });
      fadeIn(div);
      let loader = document.querySelector('#loader');
      if (loader.style.opacity !== 0) fadeOut(loader);
      canvasWrapper.addEventListener('click', e => {
        // check if a graph is already open
        let exist = document.querySelector('#chartDialog');
        let body = document.querySelector('body');
        if (exist) body.removeChild(exist);
        // create a new dialog
        let dialog = document.createElement('div');
        dialog.id = 'chartDialog';
        dialog.classList.add('dialog');
        // create the text header
        let textHeader = document.createElement('div');
        dialog.appendChild(textHeader);
        let label = document.createElement('h2');
        label.textContent = key;
        textHeader.appendChild(label);
        let highest = document.createElement('div');
        highest.textContent = 'Highest Ping: ' + highestPing(graphData) + ' ms';
        highest.style.marginBottom = '4px';
        textHeader.appendChild(highest);
        let lowest = document.createElement('div');
        lowest.textContent = 'Lowest Ping: ' + lowestPing(graphData) + ' ms';
        lowest.style.marginBottom = '4px';
        textHeader.appendChild(lowest);
        // create the canvas
        let detailedCanvas = document.createElement('canvas');
        detailedCanvas.width = window.innerWidth - (80 + 32 + scrollbarWidth());
        detailedCanvas.height = 250;
        detailedCanvas.style.marginBottom = '16px';
        dialog.appendChild(detailedCanvas);
        let centerH = Math.floor((window.innerHeight - 32) / 2);
        let centerDH = Math.floor(450 / 2);
        dialog.style.top = Math.floor(centerH - centerDH) + 'px';
        dialog.style.left = '0px';
        dialog.addEventListener('click', () => {
          dialog.classList.remove('dialog-opened');
          setTimeout(() => {
            body.removeChild(dialog);
          }, 400);
        });
        // attach dialog to body
        body.appendChild(dialog);
        // render the graph
        let detailedChartData = {
          labels: returnTime(data[key]),
          datasets: [
            {
              label: key + " Ping",
              fillColor: light,
              strokeColor: dark,
              data: graphData
            }
          ]
        };
        let detailedCTX = detailedCanvas.getContext("2d");
        let chart = new Chart(detailedCTX).Line(detailedChartData, {
          animation: false,
          pointDot: false,
          showTooltips: (() => {
            if (window.innerWidth < 400) return false;
            return true;
          })(),
          scaleLabel: "<%=value%> ms",
          scaleFontFamily: "'Roboto', 'Noto', sans-serif",
          scaleFontSize: 10
        });
        // open the dialog
        setTimeout(() => {
          dialog.classList.add('dialog-opened');
        }, 100);
      });
    }
  }

  /**
   * output restart history*
   *
   * @param {Array} logs
   */
  let lastRebootTimer  = 0;
  function outputRestarts(logs) {
    let last = document.querySelector('#lastRestart');
    lastRebootTimer = setTimeout(() => outputRestarts(logs), 1000);
    if (logs.length) {
      last.textContent = ago(logs[logs.length - 1].time);
      return;
    }
    last.textContent = 'never';
  }

  /**
   * display a toast message
   */
  function showToast(text) {
    let toast = document.createElement('div');
    toast.classList.add('toast');
    toast.classList.add('hidden');
    toast.style.willChange = 'opacity';
    toast.textContent = text;
    document.querySelector('body').appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('hidden');
      setTimeout(hideToast, 3000);
    }, 300);
  }

  /**
   * hide the toast
   */
  function hideToast() {
    let toast = document.querySelector('.toast');
    toast.classList.add('hidden');
    setTimeout(function() {
      document.querySelector('body').removeChild(toast);
    }, 350);
  }

  /**
   * position placement of restart dialog
   */
  function positionThings() {
    // reboot dialog
    let dialog = document.querySelector('#reboot-dialog');
    let centerH = Math.floor((window.innerHeight - 32) / 2);
    let centerW = Math.floor((window.innerWidth - 32) / 2);
    let centerDH = Math.floor((dialog.offsetHeight + 24) / 2);
    let centerDW = Math.floor((dialog.offsetWidth + 40) / 2);
    let top = Math.floor(centerH - centerDH) + 'px';
    let left = Math.floor(centerW - centerDW) + 'px';
    dialog.style.top = top;
    dialog.style.left = left;
    // fab
    let fab = document.querySelector('#fab');
    let cardWidth = document.querySelector('#card').offsetWidth;
    fab.style.right = (centerW - (cardWidth / 2)) + 20 + 'px';
    // graph dialog
    let graphDialog = document.querySelector('#chartDialog');
    if (graphDialog) {

    }
  }

  /**
   * attach a ripple to a clicked element
   */
  function makeRipple(event) {
    return new Promise(resolve => {
      let el = event.target;
      let x = event.layerX;
      let y = event.layerY;
      let div = document.createElement('div');
      div.classList.add('ripple-effect');
      div.style.height = el.offsetHeight + 'px';
      div.style.width = el.offsetHeight + 'px';
      let size = div.offsetHeight / 2;
      div.style.top = (y - size) + 'px';
      div.style.left = (x - size) + 'px';
      div.style.background = event.target.dataset.rippleColor;
      el.appendChild(div);
      setTimeout(() => el.removeChild(div), 1500);
      resolve();
    });
  }

  /**
   * open the reboot dialog
   */
  function openRebootDialog() {
    return new Promise(resolve => {
      let dialog = document.querySelector('#reboot-dialog');
      dialog.style.willChange = 'transform';
      if (!dialog.classList.contains('dialog-opened')) dialog.classList.add('dialog-opened');
      setTimeout(() => {
        dialog.style.willChange = 'auto';
      }, 400);
      resolve();
    });
  }

  /**
   * close the reboot dialog
   */
   function closeRebootDialog() {
    return new Promise(resolve => {
      let dialog = document.querySelector('#reboot-dialog');
      dialog.style.willChange = 'transform';
      if (dialog.classList.contains('dialog-opened')) dialog.classList.remove('dialog-opened');
      setTimeout(() => {
        dialog.style.willChange = 'auto';
      }, 400);
      resolve();
    });
  }

  function animateScrollUP() {
    let appWrapper = document.querySelector('.wrapper');
    let pos = appWrapper.scrollTop;
    requestAnimationFrame(function step() {
      pos -= 20;
      if (pos <= 0) {
        appWrapper.scrollTop = 0;
        return;
      }
      appWrapper.scrollTop = pos;
      requestAnimationFrame(step);
    });
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
    positionThings();
  };

  // run the app
  window.onload = () => {
    positionThings();
    // fade card opacity
    let card = document.querySelector('#card');
    let reboot = document.querySelector('#reboot');
    let rebootClose = document.querySelector('#reboot-dialog-close');
    let rebootButton = document.querySelector('#reboot-dialog-reboot');
    let appWrapper = document.querySelector('.wrapper');
    let fab = document.querySelector('#fab');

    fab.addEventListener('click', e => makeRipple(e).then(animateScrollUP));

    let scrollPOS;
    appWrapper.onscroll = e => {
      if (appWrapper.scrollTop < scrollPOS) fab.style.transform = 'translateY(80px)';
      if (appWrapper.scrollTop > scrollPOS) fab.style.transform = 'translateY(0px)';
      if (appWrapper.scrollTop === 0) fab.style.transform = 'translateY(80px)';
      scrollPOS = appWrapper.scrollTop;
    };

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
      let led2 = document.querySelector('#routerStatus');
      if (led.classList.contains('online')) {
        led.classList.remove('online');
        led.classList.add('offline');
      }
      if (led2.classList.contains('online')) {
        led2.classList.remove('online');
        led2.classList.add('offline');
      }
    });
    socket.on('history', logs => sortHistory(logs).then(data => {
      appData = data;
      graphData(data);
    }));
    socket.on('count', count => console.log(count));
    socket.on('log', log => console.log(log));
    socket.on('restarts', logs => {
      if (lastRebootTimer) clearTimeout(lastRebootTimer);
      outputRestarts(logs)
    });
    socket.on('toast', message => {
      if (message === 'rebooting router...') {
        reboot.classList.add('disabled-button')
        startProgress();
      }
      if (message === 'powering on router...') reboot.classList.remove('disabled-button');
      showToast(message);
    });
    socket.on('router-status', status => {
      let led = document.querySelector('#routerStatus');
      if (status.data.hasOwnProperty('time')) {
        if (led.classList.contains('offline')) {
          led.classList.remove('offline');
          led.classList.add('online');
        }
      } else {
        if (led.classList.contains('online')) {
          led.classList.remove('online');
          led.classList.add('offline');
        }
      }
    });
    // open reboot dialog
    reboot.addEventListener('click', e => {
      if (!e.target.classList.contains('disabled-button')) {
        setTimeout(() => {
          reboot.classList.add('disabled-button');
        }, 300);
        makeRipple(e).then(openRebootDialog);
        return;
      }
    });
    // close reboot dialog
    rebootClose.addEventListener('click', e => makeRipple(e).then(closeRebootDialog).then(() => {
      reboot.classList.remove('disabled-button');
    }));
    // close reboot dialog and reboot
    rebootButton.addEventListener('click', e => makeRipple(e).then(closeRebootDialog).then(() => {
      socket.emit('force-reboot');
    }));
  };
})();
