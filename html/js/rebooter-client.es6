(() => {
  'use strict';
  // object to store application data
  let appData = {};

  let socket;

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
      if  (seconds < 10) {
        return 'Just now';
      }
      return Math.floor(seconds) + " seconds ago";
    }
  }

  function startProgress() {
    return new Promise(resolve => {
      const wrapper = document.querySelector('.bar-wrapper');
      const bar = document.querySelector('#rebootProgress');
      const animationEnd = e => {
        fadeOut(wrapper).then(_ => {
          wrapper.style.display = 'none';
          bar.style.transform = 'translateX(-100%)';
          bar.style.willChange = 'initial';
          bar.removeEventListener("transitionend", animationEnd);
          resolve();
        });
      };
      bar.style.willChange = 'transform';
      requestAnimationFrame(_ => {
        wrapper.style.opacity = 0;
        wrapper.style.display = 'block';
        fadeIn(wrapper).then(_ => {
          bar.style.transform = 'translateX(0)';
          bar.addEventListener("transitionend", animationEnd, true);
        });
      });
    });
  }

  /**
   * fade in opacity of a given element
   *
   * @param {HTMLElement} el
   */
  function fadeIn(el) {
    return new Promise(resolve => {
      const animationEnd = _ => {
        el.removeEventListener("transitionend", animationEnd);
        el.classList.remove('animate');
        resolve();
      };
      el.classList.add('animate');
      requestAnimationFrame(_ => {
        el.style.opacity = 1;
      });
      el.addEventListener("transitionend", animationEnd, true);
    });
  }

  /**
   * fade out opacity of a given element
   *
   * @param {HTMLElement} el
   */
  function fadeOut(el) {
    return new Promise(resolve => {
      const animationEnd = _ => {
        el.removeEventListener("transitionend", animationEnd);
        el.classList.remove('animate');
        resolve();
      };
      el.classList.add('animate');
      requestAnimationFrame(_ => {
        el.style.opacity = 0;
      });
      el.addEventListener("transitionend", animationEnd, true);
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
      // check if a dialog already is opened
      const id = 'el-' + key.replace(/\./g,'');
      const exist = document.querySelector('#' + id);
      if (exist) card.removeChild(exist);
      // create the new dialog
      let div = document.createElement('div');
      let text = document.createElement('h3');
      div.id = id;
      div.style.opacity = 0;
      // set header text
      text.textContent = key;
      div.appendChild(text);
      // create canvas
      let canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 100;
      canvas.style.pointerEvents = 'none';
      // create clickable area
      let canvasWrapper = document.createElement('div');
      canvasWrapper.classList.add('clickable');
      canvasWrapper.dataset.rippleColor = "#673AB7"
      canvasWrapper.appendChild(canvas);
      div.appendChild(canvasWrapper);
      // send graph to the DOM
      card.appendChild(div);
      // generate graph data
      let graphData = returnData(data[key]);
      let r = (Math.floor(Math.random() * 256));
      let g = (Math.floor(Math.random() * 256));
      let b = (Math.floor(Math.random() * 256));
      let chartData = {
        labels: returnBlankLabel(data[key]),
        datasets: [
          {
            label: key + " Ping",
            fillColor: 'rgba(' + r + ',' + g + ',' + b + ', 0.1)',
            strokeColor: 'rgba(' + r + ',' + g + ',' + b + ', 1)',
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
      fadeIn(div).then(_ => {
        let loader = document.querySelector('#loader');
        if (loader.style.opacity !== 0) fadeOut(loader);
      });
      canvasWrapper.addEventListener('click', e => {
        let totalDatapoints;
        socket.emit('count', key);
        socket.on('count', count => {
          totalDatapoints = count.count;
        });
        // check if a graph is already open
        let exist = document.querySelector('#chartDialog');
        let body = document.querySelector('body');
        if (exist) body.removeChild(exist);
        // create a new dialog
        let dialog = document.createElement('div');
        dialog.id = 'chartDialog';
        dialog.classList.add('dialog');
        let spaceBetween = document.createElement('div');
        dialog.appendChild(spaceBetween);
        spaceBetween.classList.add('flex');
        spaceBetween.classList.add('space-between');
        // create the text container
        let textHeader = document.createElement('div');
        spaceBetween.appendChild(textHeader);
        let right = document.createElement('div');
        let close = document.createElement('div');
        let closeIcon = document.createElement('i');
        closeIcon.classList.add('material-icons');
        closeIcon.style.color = 'red';
        close.style.color = 'red';
        closeIcon.textContent = 'close';
        close.classList.add('icon-button');
        close.appendChild(closeIcon);
        close.addEventListener('click', e => {
          dialog.classList.remove('dialog-opened');
          setTimeout(() => {
            body.removeChild(dialog);
          }, 400);
        });
        close.PaperRipple = new PaperRipple();
        close.appendChild(close.PaperRipple.$);
        close.PaperRipple.$.classList.add('paper-ripple--round');
        close.PaperRipple.recenters = true;
        close.PaperRipple.center = true;
        close.addEventListener('mousedown', ev => close.PaperRipple.downAction(ev));
        close.addEventListener('mouseup', ev => close.PaperRipple.upAction());
        right.appendChild(close);
        spaceBetween.appendChild(right);
        // header text
        let label = document.createElement('h2');
        label.textContent = key;
        textHeader.appendChild(label);
        // highest ping
        let highest = document.createElement('div');
        highest.textContent = 'Highest Ping: ' + highestPing(graphData) + ' ms';
        highest.classList.add('high-low-text');
        textHeader.appendChild(highest);
        // lowest ping
        let lowest = document.createElement('div');
        lowest.textContent = 'Lowest Ping: ' + lowestPing(graphData) + ' ms';
        lowest.classList.add('high-low-text');
        textHeader.appendChild(lowest);
        // // previous button
//         let previous = document.createElement('i');
//         previous.classList.add('material-icons');
//         previous.textContent = 'keyboard_backspace';
//         previous.classList.add('icon-button');
//         previous.addEventListener('click', e => {
//           socket.emit('count', key);
//         });
//         dialog.appendChild(previous);
        // create the canvas
        const winHeight = window.innerHeight;
        const detailedCanvas = document.createElement('canvas');
        detailedCanvas.width = window.innerWidth - (80 + 32 + scrollbarWidth());
        detailedCanvas.height = (_ => {
          if (winHeight < 450) {
            return 150; 
          } else {
            return 250;
          }
        })();
        detailedCanvas.style.marginBottom = '16px';
        dialog.appendChild(detailedCanvas);
        // attach dialog to body
        body.appendChild(dialog);
        const dialogTotalHeight = (dialog.offsetHeight + 48);
        const centerH = Math.floor((winHeight - 32) / 2);
        const centerDH = Math.floor(dialogTotalHeight / 2);
        dialog.style.top = Math.floor(centerH - centerDH) + 'px';
        dialog.style.left = '0px';
        // render the graph
        chartData.labels = returnTime(data[key]);
        const detailedCTX = detailedCanvas.getContext("2d");
        let chart = new Chart(detailedCTX).Line(chartData, {
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
      requestAnimationFrame(() => {
        last.textContent = ago(logs[logs.length - 1].time);
      });
      return;
    }
    requestAnimationFrame(() => {
      last.textContent = 'never';
    });
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
      console.log(graphDialog);
    }
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
        dialog.style.willChange = 'initial';
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
        dialog.style.willChange = 'initial';
      }, 400);
      resolve();
    });
  }


  function animateScroll() {
    let wrapper = document.querySelector('.wrapper');
    let card = document.querySelector('#card');
    let fromTop = wrapper.scrollTop;
    let margin = 0;
    card.style.willChange = 'transform';
    requestAnimationFrame(function step() {
      margin += 40;
      if (margin >= fromTop) {
        card.style.transform = 'none';
        card.style.willChange = 'initial';
        wrapper.scrollTop = 0;
        return;
      }
      card.style.transform = 'translateY(' + margin + 'px)';
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
    requestAnimationFrame(positionThings);
  };

  // run the app
  window.onload = () => {
    positionThings();
    // fade card opacity
    const reboot = document.querySelector('#reboot');
    const rebootClose = document.querySelector('#reboot-dialog-close');
    const rebootButton = document.querySelector('#reboot-dialog-reboot');
    const appWrapper = document.querySelector('.wrapper');
    const fab = document.querySelector('#fab');
    
    // load ripples
    const ripples = document.createElement('script');
    ripples.async = true;
    ripples.src = 'js/paper-ripple.min.js';
    ripples.onload = _ => {
      const buttons  = document.querySelectorAll('.button');
      [].slice.call(buttons).forEach(button => {
        button.PaperRipple = new PaperRipple();
        button.appendChild(button.PaperRipple.$);
        button.addEventListener('mousedown', ev => button.PaperRipple.downAction(ev));
        button.addEventListener('mouseup', e => button.PaperRipple.upAction());
      });
      
      fab.PaperRipple = new PaperRipple();
      fab.appendChild(fab.PaperRipple.$);
      fab.PaperRipple.$.classList.add('paper-ripple--round');
      fab.PaperRipple.recenters = true;
      fab.PaperRipple.center = true;
      fab.addEventListener('mousedown', ev => fab.PaperRipple.downAction(ev));
      fab.addEventListener('mouseup', ev => fab.PaperRipple.upAction());
    };
    document.querySelector('body').appendChild(ripples);
    
    
    fab.addEventListener('click', () => animateScroll());

    let scrollPOS;
    appWrapper.onscroll = e => {
      requestAnimationFrame(() => {
        let scrollTop = e.target.scrollTop;
        let totalScroll = e.target.scrollHeight - e.target.clientHeight;
        if (scrollTop >= totalScroll - (totalScroll / 5)) {
          fab.style.transform = 'translateY(0px)';
          return;
        }
        if (scrollTop < scrollPOS) {
          fab.style.transform = 'translateY(80px)';
        }
        if (scrollTop > scrollPOS) {
          fab.style.transform = 'translateY(0px)';
        }
        if (scrollTop === 0) {
          fab.style.transform = 'translateY(80px)';
        }
        scrollPOS = scrollTop;
      });
    };
    // socket.io setup
    socket = io.connect(location.origin);
    socket.on('connect', () => {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('offline')) {
        requestAnimationFrame(() => {
          led.classList.remove('offline');
          led.classList.add('online');
        });
      }
    });
    socket.on('disconnect', () => {
      var led = document.querySelector('#statusIndicator');
      let led2 = document.querySelector('#routerStatus');
      if (led.classList.contains('online')) {
        requestAnimationFrame(() => {
          led.classList.remove('online');
          led.classList.add('offline');
        });
      }
      if (led2.classList.contains('online')) {
        requestAnimationFrame(() => {
          led2.classList.remove('online');
          led2.classList.add('offline');
        });
      }
    });
    socket.on('history', logs => sortHistory(logs).then(data => {
      appData = data;
      graphData(data);
    }));
    socket.on('count', count => {
      // if (count.count <= appData[count.host].length) {
      //   document.querySelector('#previous').style.display = 'none';
      // }
    })
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
        return;
      }
      if (led.classList.contains('online')) {
        led.classList.remove('online');
        led.classList.add('offline');
      }
    });
    // open reboot dialog
    reboot.addEventListener('click', e => {
      if (e.target.classList.contains('disabled-button')) return;
      setTimeout(() => {
        reboot.classList.add('disabled-button');
      }, 300);
      openRebootDialog();
    });
    // close reboot dialog
    rebootClose.addEventListener('click', _ => closeRebootDialog().then(_ => {
      reboot.classList.remove('disabled-button');
    }));
    // close reboot dialog and reboot
    rebootButton.addEventListener('click', _ => closeRebootDialog().then(_ => {
      socket.emit('force-reboot');
    }));
  };
})();
