(_ => {
  'use strict';
  // object to store application data
  let appData = {};

  let dataPoints;

  let socket;

  let page = 1;

  let maxPage;

  /**
   * return readable time sence a given date
   *
   * @param {String} time - date or time the entry was made
   */
  function ago(time){
    if (time) {
      const date = new Date(time);
      const seconds = Math.floor((new Date() - date) / 1000);
      let interval = Math.floor(seconds / 31536000);
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
        return 'just now';
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
   * return a array of ping entry times
   *
   * @param {Array} array
   */
  function returnLocaleTime(array) {
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
      output.push(new Date(array[i].time).toLocaleString());
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


  function getRandomColor() {
    const threshold = 200;
    const r = (Math.floor(Math.random() * 256));
    const g = (Math.floor(Math.random() * 256));
    const b = (Math.floor(Math.random() * 256));
    if (r > threshold && g > threshold && b > threshold) {
      getRandomColor();
    } else {
      return {
        r: r,
        g: g,
        b: b
      };
    }
  }

  function closeExistingGraph() {
    return new Promise(resolve => {
      const exist = document.querySelector('#chartDialog');
      const body = document.querySelector('body');
      if (exist) {
        const transitionEnd = _ => {
          exist.removeEventListener('transitionend', transitionEnd);
          body.removeChild(exist);
          resolve();
        };
        exist.addEventListener('transitionend', transitionEnd);
        exist.classList.remove('dialog-opened');
      } else {
        resolve();
      }
    });
  }

  /**
   * render graphs of the input data
   *
   * @param {Object} data
   */
  function graphData(data) {
    const card = document.querySelector('#card');
    for (const key in data) {
      // check if a dialog already is opened
      const id = 'el-' + key.replace(/\./g,'');
      const exist = document.querySelector('#' + id);
      if (exist) card.removeChild(exist);
      // create the new dialog
      const div = document.createElement('div');
      const text = document.createElement('h3');
      div.id = id;
      div.style.opacity = 0;
      // set header text
      text.textContent = key;
      div.appendChild(text);
      // create canvas
      const canvas = document.createElement('canvas');
      canvas.width = card.offsetWidth - 48;
      canvas.height = 100;
      canvas.style.pointerEvents = 'none';
      // create clickable area
      const canvasWrapper = document.createElement('div');
      canvasWrapper.classList.add('clickable');
      canvasWrapper.style.position = 'relative';
      canvasWrapper.appendChild(canvas);
      div.appendChild(canvasWrapper);
      // send graph to the DOM
      card.appendChild(div);
      // generate graph data
      const graphData = returnData(data[key]);
      const color = getRandomColor();
      const r = color.r;
      const g = color.g;
      const b = color.b;
      const chartData = {
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
      const ctx = canvas.getContext("2d");
      const chart = new Chart(ctx).Line(chartData, {
        animation: false,
        pointDot: false,
        showTooltips: false,
        scaleLabel: "<%=value%> ms",
        scaleFontFamily: "'Roboto', 'Noto', sans-serif",
        scaleFontSize: 10
      });
      fadeIn(div);
      const loader = document.querySelector('#loader');
      if (loader.style.opacity !== 0) fadeOut(loader);
      canvasWrapper.addEventListener('click', _ => closeExistingGraph().then(_ => {
        page = 1;
        const body = document.querySelector('body');
        // create a new dialog
        const dialog = document.createElement('div');
        dialog.id = 'chartDialog';
        dialog.classList.add('dialog');
        const loading = createLoadingElement();
        loading.id = 'graphDialogLoader';
        dialog.appendChild(loading);
        const spaceBetween = document.createElement('div');
        dialog.appendChild(spaceBetween);
        spaceBetween.classList.add('flex');
        spaceBetween.classList.add('space-between');
        // create the text container
        const textHeader = document.createElement('div');
        spaceBetween.appendChild(textHeader);
        const right = document.createElement('div');
        const close = createIconButton('close');
        close.style.color = 'red';
        close.addEventListener('click', e => {
          dialog.classList.remove('dialog-opened');
          setTimeout(() => {
            body.removeChild(dialog);
          }, 400);
        });
        right.appendChild(close);
        spaceBetween.appendChild(right);
        // header text
        const label = document.createElement('h2');
        label.textContent = key;
        textHeader.appendChild(label);
        // highest ping
        const highest = document.createElement('div');
        highest.textContent = 'Highest Ping: ' + highestPing(graphData) + ' ms';
        highest.classList.add('high-low-text');
        textHeader.appendChild(highest);
        // lowest ping
        const lowest = document.createElement('div');
        lowest.textContent = 'Lowest Ping: ' + lowestPing(graphData) + ' ms';
        lowest.classList.add('high-low-text');
        textHeader.appendChild(lowest);

        // box for buttons to navigate back and forwards through data
        const buttonBar = document.createElement('div');
        buttonBar.classList.add('flex');
        buttonBar.classList.add('space-between');
        const back = document.createElement('div');
        back.id = 'backB';
        const forward = document.createElement('div');
        forward.id = 'forwardB';
        buttonBar.appendChild(back);
        buttonBar.appendChild(forward)
        dialog.appendChild(buttonBar);

        // create the canvas
        const winHeight = window.innerHeight;
        const detailedCanvas = document.createElement('canvas');
        detailedCanvas.width = window.innerWidth - (80 + 32 + scrollbarWidth());
        detailedCanvas.height = (_ => {
          if (winHeight < 450) {
            return 125;
          } else {
            return 250;
          }
        })();
        detailedCanvas.style.marginBottom = '16px';
        dialog.appendChild(detailedCanvas);

        // send dialog to DOM
        body.appendChild(dialog);

        // position the dialog
        const dialogTotalHeight = (dialog.offsetHeight + 48);
        const centerH = Math.floor((winHeight - 32) / 2);
        const centerDH = Math.floor(dialogTotalHeight / 2);
        dialog.style.top = Math.floor(centerH - centerDH) + 'px';
        dialog.style.left = '0px';

        // set detailed graph
        chartData.labels = returnLocaleTime(data[key]);
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
        socket.emit('count', key);
        socket.on('count', count => {
          dataPoints = count.count;
          maxPage = count.count / appData[count.host].length;
          if (count.count > appData[count.host].length) {
            // previous button
            const previous = createIconButton('arrow_back');
            previous.id = 'previousButton';
            previous.addEventListener('click', e => {
              const graphLoader = document.querySelector('#graphDialogLoader');
              graphLoader.style.pointerEvents = 'auto';
              fadeIn(graphLoader);
              if (previous.classList.contains('icon-button-disabled')) return;
              previous.classList.add('icon-button-disabled')
              const limit = data[key].length;
              page++;
              socket.emit('log', {
                host: key,
                limit: limit,
                skip: count.count - (limit * page),
                color: {
                  r: r,
                  g: g,
                  b: b
                }
              });
            });
            back.appendChild(previous);
          }
        });
      }));
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
    lastRebootTimer = setTimeout(_ => outputRestarts(logs), 1000);
    if (logs.length) {
      requestAnimationFrame(_ => {
        last.textContent = ago(logs[logs.length - 1].time);
      });
      return;
    }
    requestAnimationFrame(_ => {
      last.textContent = 'never';
    });
  }

  /**
   * display a toast message
   */
  function showToast(text, _timeout) {
    const toast = document.createElement('div');
    const transitionEnd = _ => {
      setTimeout(_ => {
        toast.addEventListener('transitionend', _ => {
          document.querySelector('body').removeChild(toast);
        });
        toast.classList.add('hidden');
      }, _timeout || 5000);
      toast.removeEventListener('transitionend', transitionEnd);
      toast.style.willChange = 'initial';
    };
    toast.classList.add('toast');
    toast.classList.add('hidden');
    toast.style.willChange = 'opacity';
    toast.id = 'toast'
    toast.textContent = text;
    document.querySelector('body').appendChild(toast);
    setTimeout(_ => {
      toast.classList.remove('hidden');
      toast.addEventListener('transitionend', transitionEnd, true);
    }, 50);
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
      const dialog = document.querySelector('#reboot-dialog');
      const transitionEnd = _ => {
        dialog.style.willChange = 'initial';
        dialog.removeEventListener('transitionend', transitionEnd);
        resolve();
      };
      if (!dialog.classList.contains('dialog-opened')) {
        dialog.style.willChange = 'transform';
        dialog.classList.add('dialog-opened');
        dialog.addEventListener('transitionend', transitionEnd, true);
      }
    });
  }

  /**
   * close the reboot dialog
   */
   function closeRebootDialog() {
    return new Promise(resolve => {
      const dialog = document.querySelector('#reboot-dialog');
      const transitionEnd = _ => {
        dialog.style.willChange = 'initial';
        dialog.removeEventListener('transitionend', transitionEnd);
        resolve();
      };
      if (dialog.classList.contains('dialog-opened')) {
        dialog.style.willChange = 'transform';
        dialog.classList.remove('dialog-opened');
        dialog.addEventListener('transitionend', transitionEnd, true);
      }
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


  function createIconButton(icon) {
    const button = document.createElement('i');
    button.classList.add('material-icons');
    button.textContent = icon;
    button.classList.add('icon-button')
    button.PaperRipple = new PaperRipple();
    button.appendChild(button.PaperRipple.$);
    button.PaperRipple.$.classList.add('paper-ripple--round');
    button.PaperRipple.recenters = true;
    button.PaperRipple.center = true;
    button.addEventListener('mousedown', ev => button.PaperRipple.downAction(ev));
    button.addEventListener('mouseup', ev => button.PaperRipple.upAction());
    return button;
  }


  function createLoadingElement() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('loader');
    const centered = document.createElement('div');
    wrapper.appendChild(centered);
    centered.textContent = 'Loading...';
    const barWrapper = document.createElement('div');
    barWrapper.classList.add('bar-wrapper');
    barWrapper.style.display = 'block';
    barWrapper.style.width = '250px';
    const bar = document.createElement('div');
    bar.classList.add('load-bar');
    barWrapper.appendChild(bar);
    centered.appendChild(barWrapper);
    wrapper.style.opacity = 0;
    return wrapper;
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


    fab.addEventListener('click', _ => animateScroll());

    let scrollPOS;
    appWrapper.onscroll = e => {
      requestAnimationFrame(_ => {
        let scrollTop = e.target.scrollTop;
        let totalScroll = e.target.scrollHeight - e.target.clientHeight;
        if (scrollTop >= totalScroll - (totalScroll / 5)) {
          fab.style.transform = 'translateY(0px)';
          return;
        }
        switch (true) {
          case (scrollTop < scrollPOS):
            fab.style.transform = 'translateY(80px)';
            break;
          case (scrollTop > scrollPOS):
            fab.style.transform = 'translateY(0px)';
            break;
          case (scrollTop === 0):
            fab.style.transform = 'translateY(80px)';
            break;
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
    socket.on('log', log => {
      if (log.history.length) {
        const dialog = document.querySelector('#chartDialog');
        const oldCanvas = dialog.querySelector('canvas');
        const newCanvas = document.createElement('canvas');
        newCanvas.width = window.innerWidth - (80 + 32 + scrollbarWidth());
        newCanvas.height = (_ => {
          if (window.innerHeight < 450) {
            return 125;
          } else {
            return 250;
          }
        })();
        newCanvas.style.opacity = 0;
        fadeOut(oldCanvas).then(_ => {
          dialog.removeChild(oldCanvas);
          dialog.appendChild(newCanvas);
          const graphData = returnData(log.history);
          const texts = dialog.querySelectorAll('.high-low-text');
          texts[0].textContent = 'Highest Ping: ' + highestPing(graphData) + ' ms';
          texts[1].textContent = 'Lowest Ping: ' + lowestPing(graphData) + ' ms';
          // work with buttons
          const forwardExist = dialog.querySelector('#forwardButton');
          if (forwardExist && forwardExist.classList.contains('icon-button-disabled'))
            forwardExist.classList.remove('icon-button-disabled');
          if (!forwardExist) {
            const forward = createIconButton('arrow_forward');
            forward.id = 'forwardButton';
            forward.addEventListener('click', e => {
              const graphLoader = document.querySelector('#graphDialogLoader');
              graphLoader.style.pointerEvents = 'auto';
              fadeIn(graphLoader);
              if (forward.classList.contains('icon-button-disabled')) return;
              forward.classList.add('icon-button-disabled');
              const limit = log.history.length;
              page--;
              socket.emit('log', {
                host: log.host,
                limit: limit,
                skip: dataPoints - (limit * page),
                color: {
                  r: log.color.r,
                  g: log.color.g,
                  b: log.color.b
                }
              });
            });
            forward.style.opacity = 0;
            dialog.querySelector('#forwardB').appendChild(forward);
            fadeIn(forward);
          }


          const prevExist = dialog.querySelector('#previousButton');
          if (prevExist && prevExist.classList.contains('icon-button-disabled'))
            prevExist.classList.remove('icon-button-disabled');

          if (!prevExist) {
            // previous button
            const previous = createIconButton('arrow_back');
            previous.id = 'previousButton';
            previous.addEventListener('click', e => {
              const graphLoader = document.querySelector('#graphDialogLoader');
              graphLoader.style.pointerEvents = 'auto';
              fadeIn(graphLoader);
              if (previous.classList.contains('icon-button-disabled')) return;
              previous.classList.add('icon-button-disabled');
              const limit = log.history.length;
              page++;
              socket.emit('log', {
                host: log.host,
                limit: limit,
                skip: dataPoints - (limit * page),
                color: {
                  r: log.color.r,
                  g: log.color.g,
                  b: log.color.b
                }
              });
            });
            previous.style.opacity = 0;
            dialog.querySelector('#backB').appendChild(previous);
            fadeIn(previous);
          }

          if (page >= Math.floor(maxPage)) {
            fadeOut(prevExist).then(_ => prevExist.parentNode.removeChild(prevExist));
          }

          if (page === 1) {
            fadeOut(forwardExist).then(_ => forwardExist.parentNode.removeChild(forwardExist));
          }
          const graphLoader = document.querySelector('#graphDialogLoader');
          graphLoader.style.pointerEvents = 'none';
          fadeOut(graphLoader);
          // stamp data to the new canvas
          const chartData = {
            labels: returnLocaleTime(log.history),
            datasets: [
              {
                label: log.host + " Ping",
                fillColor: 'rgba(' + log.color.r + ',' + log.color.g + ',' + log.color.b + ', 0.1)',
                strokeColor: 'rgba(' + log.color.r + ',' + log.color.g + ',' + log.color.b + ', 1)',
                data: graphData
              }
            ]
          };
          const ctx = newCanvas.getContext("2d");
          const chart = new Chart(ctx).Line(chartData, {
            animation: false,
            pointDot: false,
            showTooltips: (_ => {
              if (window.innerWidth < 400) return false;
              return true;
            })(),
            scaleLabel: "<%=value%> ms",
            scaleFontFamily: "'Roboto', 'Noto', sans-serif",
            scaleFontSize: 10
          });
          fadeIn(newCanvas);
        });
      }
    });
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
