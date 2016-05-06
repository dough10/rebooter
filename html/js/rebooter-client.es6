(_ => {
  'use strict';


  /**
   * Graphs !!!!!
   *
   * @param {Number} height
   * @param {Number} width
   * @param {String} pointerEvents   || defaults to auto  ** optional
   */
  class Graph {
    constructor(height, width, pointerEvents) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.pointerEvents = pointerEvents || 'auto';
    }

    /**
     * draw data to the graph
     *
     * @param {String} host
     * @param {Array} labels - labels for data points
     * @param {Array} data - data for data points
     * @param {Object} color - rbg color values
     * @param {Boolean} tooltips - if tooltips will be used on graph
     */
    drawGraph(host, labels, data, color, tooltips) {
      const ctx = this.canvas.getContext("2d");
      const chart = new Chart(ctx).Line({
        labels: labels,
        datasets: [
          {
            label: host + " Ping",
            fillColor: 'rgba(' + color.r + ',' + color.g + ',' + color.b + ', 0.1)',
            strokeColor: 'rgba(' + color.r + ',' + color.g + ',' + color.b + ', 1)',
            data: data
          }
        ]
      }, {
        animation: false,
        pointDot: false,
        showTooltips: tooltips,
        scaleLabel: "<%=value%> ms",
        scaleFontFamily: "'Roboto', 'Noto', sans-serif",
        scaleFontSize: 10
      });
    }

  }


  /**
   * display a toast message
   *
   * @param {String} message
   * @param {Number} timeout in seconds  || defualt 5 seconds  ** optional
   */
  class Toast {
    constructor(message, _timeout) {
      const transitionEnd = _ => {
        setTimeout(_ => {
          this.toast.addEventListener('transitionend', _ => {
            document.querySelector('body').removeChild(this.toast);
          });
          this.toast.classList.add('hidden');
        }, this._timeout);
        this.toast.removeEventListener('transitionend', transitionEnd);
      };
      this._timeout = _timeout * 1000 || 5000;
      this.toast = document.createElement('div');
      this.toast.classList.add('toast');
      this.toast.classList.add('hidden');
      this.toast.id = 'toast';
      this.toast.style.willChange = 'opacity';
      this.toast.addEventListener('transitionend', transitionEnd, true);
      this.toast.textContent = message;
      document.querySelector('body').appendChild(this.toast);
      setTimeout(_ => {
        this.toast.classList.remove('hidden');
      }, 50);
    }
  }

  /**
   * returns a material design icon buttonn
   */
  class IconButton {
    constructor (icon) {
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
  }

  /**
   * returns a loading element
   */
  class LoadingElement {
    constructor () {
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
  }


  class Dialog {
    constructor(host, highPing, lowPing, graphColor) {
      // create a new dialog
      const dialog = document.createElement('div');
      dialog.id = 'chartDialog';
      dialog.classList.add('dialog');
      const loading = new LoadingElement();
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
      const close = new IconButton('close');
      close.style.color = 'red';
      close.addEventListener('click', _ => {
        dialog.classList.remove('dialog-opened');
        dialog.addEventListener('transitionend', _ => {
          document.querySelector('body').removeChild(dialog);
        });
      });
      right.appendChild(close);
      spaceBetween.appendChild(right);
      // header text
      const label = document.createElement('h2');
      label.textContent = host;
      textHeader.appendChild(label);
      // highest ping
      const highest = document.createElement('div');
      highest.textContent = 'Highest Ping: ' + highPing + ' ms';
      highest.classList.add('high-low-text');
      textHeader.appendChild(highest);
      // lowest ping
      const lowest = document.createElement('div');
      lowest.textContent = 'Lowest Ping: ' + lowPing + ' ms';
      lowest.classList.add('high-low-text');
      textHeader.appendChild(lowest);
      // box for buttons to navigate back and forwards through data
      const buttonBar = document.createElement('div');
      buttonBar.classList.add('flex');
      buttonBar.classList.add('space-between');
      buttonBar.style.minHeight = '44px';
      const back = document.createElement('div');
      const previous = new IconButton('arrow_back');
      previous.id = 'previousButton';
      previous.style.opacity = 0;
      previous.style.display = 'none';
      previous.addEventListener('click', e => {
        loading.style.pointerEvents = 'auto';
        fadeIn(loading).then(_ => {
          page++;
          const limit = appData[host].length;
          const skip = (_ => {
            const skip = dataPoints - (limit * page);
            if (skip < 0) {
              return 0;
            } else {
              return skip;
            }
          })();
          socket.emit('log', {
            host: host,
            limit: limit,
            skip: skip
          });
        });
      });
      back.appendChild(previous);
      const forwardWrapper = document.createElement('div');
      const forward = new IconButton('arrow_forward');
      forward.id = 'forwardButton';
      forward.addEventListener('click', e => {
        loading.style.pointerEvents = 'auto';
        fadeIn(loading).then(_ => {
          const limit = appData[host].length;
          page--;
          socket.emit('log', {
            host: host,
            limit: limit,
            skip: dataPoints - (limit * page)
          });
        });
      });
      forwardWrapper.appendChild(forward);
      forward.style.opacity = 0;
      forward.style.display = 'none';
      buttonBar.appendChild(back);
      buttonBar.appendChild(forwardWrapper)
      dialog.appendChild(buttonBar);
      for (let index in graphColor) {
        label.dataset[index] = graphColor[index];
      }
      return dialog;
    }
  }

  let appData = {};
  let dataPoints;
  let socket;
  let page = 1;
  let maxPage;

  let loginToken;

  // size of the window of things in the window
  let scrollWidth;
  let winWidth;
  let winHeight;
  let cardWidth;


  /**
   * returns the height of a large graph
   */
  function bigGraphHeight() {
    if (winHeight < 450) {
      return 125;
    } else {
      return 250;
    }
  }


  /**
   * rturns the width of a large graph
   */
  function bigGraphWidth() {
    return winWidth - (80 + 32 + scrollWidth);
  }

  function useTooltips() {
    if (winWidth < 400) return false;
    return true;
  }

  /**
   * capture the window & content deminsions
   */
  function getWindowSize() {
    return new Promise(resolve => {
      winHeight = window.innerHeight;
      scrollWidth = scrollbarWidth();
      winWidth = window.innerWidth;
      cardWidth = document.querySelector('#card').offsetWidth;
      requestAnimationFrame(resolve);
    });
  }

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

  /**
   * start the reboot animation
   */
  function startRebootTimer() {
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
        el.style.willChange = 'initial';
        el.style.transition = 'initial';
        resolve();
      };
      el.addEventListener("transitionend", animationEnd, true);
      el.style.willChange = 'opacity';
      el.style.transition = 'opacity .5s ease-in-out';
      requestAnimationFrame(_ => {
        el.style.opacity = 1;
      });

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
        el.style.willChange = 'initial';
        el.style.transition = 'initial';
        resolve();
      };
      el.addEventListener("transitionend", animationEnd, true);
      el.style.willChange = 'opacity';
      el.style.transition = 'opacity .5s ease-in-out';
      requestAnimationFrame(_ => {
        el.style.opacity = 0;
      });
    });
  }


  /**
   * animate scroll to top of the page
   */
  function animateScroll() {
    const wrapper = document.querySelector('.wrapper');
    const card = document.querySelector('#card');
    const fromTop = wrapper.scrollTop;
    let margin = 0;
    const animationSeconds = 0.35;
    const inc = Math.abs((fromTop / animationSeconds) / 60);
    card.style.willChange = 'transform';
    requestAnimationFrame(function step() {
      margin += inc;
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
  function returnLabels(array) {
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
      output.push((_ => {
        if (winHeight < 500) {
          return '';
        } else if (winWidth < 700) {
          switch (true) {
            case (i === 0):
              return new Date(array[i].time).toLocaleTimeString();
              break;
            case (i === len - 1):
              return new Date(array[i].time).toLocaleTimeString();
              break;
            default:
              return '';
              break;
          }
        } else {
          return new Date(array[i].time).toLocaleString();
        }
      })());
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
      output.push((_ => {
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
   * return the highest value in a array
   *
   * @param {Array} array
   */
  function highestPing(array) {
    return Math.max.apply(Math, array);
  }

  /**
   * return the lowest value in a array
   *
   * @param {Array} array
   */
  function lowestPing(array) {
    return Math.min.apply(Math, array);
  }

  /**
   * returns the width value of a scrollbar
   */
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
   * return a object of color values
   */
  function getRandomColor() {
    const threshold = 200;
    let r = (Math.floor(Math.random() * 256));
    let g = (Math.floor(Math.random() * 256));
    let b = (Math.floor(Math.random() * 256));
    if (r > threshold && g > threshold && b > threshold) {
      r = (Math.floor(Math.random() * 256));
      g = (Math.floor(Math.random() * 256));
      b = (Math.floor(Math.random() * 256));
      return {
        r: r,
        g: g,
        b: b
      };
    } else {
      return {
        r: r,
        g: g,
        b: b
      };
    }
  }

  /**
   * close a existing if one is open
   */
  function closeExistingGraph() {
    return new Promise(resolve => {
      let exist = document.querySelector('#chartDialog');
      const body = document.querySelector('body');
      if (exist) {
        const transitionEnd = _ => {
          exist.removeEventListener('transitionend', transitionEnd);
          body.removeChild(exist);
          exist = null;
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
   * creates and opens a new detailed graph dialog
   */
  function openDialog(host, labels, graphData, graphColor) {
    page = 1;
    // create teh dialog
    const dialog = new Dialog(host, highestPing(graphData), lowestPing(graphData), graphColor);
    // create the canvas
    const detailedCanvas = new Graph(bigGraphHeight(), bigGraphWidth());
    detailedCanvas.canvas.style.opacity = 0;

    const transitionEnd = _ => {
      dialog.removeEventListener('transitionend', transitionEnd);
      // draw the detailed graph

      fadeIn(detailedCanvas.canvas).then(_ => socket.emit('count', host));
    };

    // append canvas to dialog
    dialog.appendChild(detailedCanvas.canvas);
    dialog.addEventListener('transitionend', transitionEnd);
    // send dialog to DOM
    document.querySelector('body').appendChild(dialog);
    detailedCanvas.drawGraph(host, labels, graphData, graphColor, useTooltips());
    // position the dialog
    const dialogTotalHeight = (dialog.offsetHeight + 48);
    const centerH = Math.floor((winHeight - 32) / 2);
    const centerDH = Math.floor(dialogTotalHeight / 2);
    dialog.style.top = Math.floor(centerH - centerDH) + 'px';
    dialog.style.left = '0px';
    // open the dialog
    setTimeout(_ => {
      dialog.classList.add('dialog-opened');
    }, 100);
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
      // generate graph data
      const graphData = returnData(data[key]);
      const graphColor = getRandomColor();
      // create wrappers
      const div = document.createElement('div');
      div.id = id;
      div.style.opacity = 0;
      const text = document.createElement('h3');
      text.textContent = key;
      div.appendChild(text);
      // create clickable area
      const canvasWrapper = document.createElement('div');
      canvasWrapper.classList.add('clickable');
      canvasWrapper.addEventListener('click', _ => closeExistingGraph()
        .then(_ => openDialog(key, returnLabels(data[key]), graphData, graphColor)));
      // append teh canvas to the wrapper
      div.appendChild(canvasWrapper);
      // send wrapper & it's content to the DOM
      card.appendChild(div);
      // create canvas
      const canvas = new Graph(100, cardWidth - 48, 'none');
      // append canvas element to DOM
      canvasWrapper.appendChild(canvas.canvas);
      // render data
      canvas.drawGraph(key, returnBlankLabel(data[key]), graphData, graphColor, false);
      // show graph & hide app loader if visable
      fadeIn(div);
      const loader = document.querySelector('#loader');
      if (loader.style.opacity !== 0) fadeOut(loader);
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


  function findDialogPos(dialog) {
    const centerH = Math.floor((winHeight - 32) / 2);
    const centerW = Math.floor((winWidth - 32) / 2);
    const centerDH = Math.floor((dialog.offsetHeight + 24) / 2);
    const centerDW = Math.floor((dialog.offsetWidth + 40) / 2);
    return {
      top: Math.floor(centerH - centerDH) + 'px',
      left:  Math.floor(centerW - centerDW) + 'px'
    }
  }


  /**
   * position placement of restart dialog
   */
  function positionThings() {
    // reboot dialog
    const rDialog = document.querySelector('#reboot-dialog');
    const rebootPos = findDialogPos(rDialog);
    rDialog.style.top = rebootPos.top;
    rDialog.style.left = rebootPos.left;

    const loginDialog = document.querySelector('#login-dialog');
    const loginPos = findDialogPos(loginDialog);
    loginDialog.style.top = loginPos.top;
    loginDialog.style.left = loginPos.left;


    // fab
    let fab = document.querySelector('#fab');
    fab.style.right = (((winWidth - 32) / 2) - (cardWidth / 2)) + 25 + 'px';

    // graph dialog
    const graphDialog = document.querySelector('#chartDialog');
    if (!graphDialog) return;
    let oldGraph = graphDialog.querySelector('canvas');
    requestAnimationFrame(_ => fadeOut(oldGraph).then(_ => {
      const label = graphDialog.querySelector('h2');
      const newGraph =  new Graph(bigGraphHeight(), bigGraphWidth());
      const host = label.textContent;
      graphDialog.removeChild(oldGraph);
      oldGraph = null;
      graphDialog.appendChild(newGraph.canvas);
      newGraph.drawGraph(host, returnLabels(appData[host]), returnData(appData[host]), label.dataset, useTooltips());
      fadeIn(newGraph.canvas).then(_ => {
        const pos = findDialogPos(graphDialog);
        graphDialog.style.top = pos.top;
        graphDialog.style.left = pos.left;
      })
    }));

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

  /**
   * fade out the login button and fade in the reboot button
   */
  function switchButtons() {
    const reboot = document.querySelector('#reboot');
    const loginButton = document.querySelector('#loginButton');
    fadeOut(loginButton).then(_ => {
      requestAnimationFrame(_ => {
        loginButton.style.display = 'none';
        reboot.style.display = 'flex';
        fadeIn(reboot);
      });
    });
  }


  function submitTwoFactor() {
    const username = document.querySelector('#username-input').value;
    const code = document.querySelector('#twoFactor-input').value;
    socket.emit('twoFactor', {
      username: username,
      code: code
    });
  }

  function submitLogin() {
    const username = document.querySelector('#username-input').value;
    const password = document.querySelector('#password-input').value;
    socket.emit('login', {
      username: username,
      password: password
    });
  }

  // redraw graphs on window reload
  let timer = 0;
  window.onresize = _ => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    timer = setTimeout(_ => {
      graphData(appData);
      timer = 0;
      requestAnimationFrame(_ => getWindowSize().then(positionThings));
    }, 200);
  };

  // run the app
  window.onload = _ => {

    requestAnimationFrame(_ => getWindowSize().then(positionThings));

    // fade card opacity
    const reboot = document.querySelector('#reboot');
    reboot.style.display = 'none';
    reboot.style.opacity = 0;
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

      const iconButtons = document.querySelectorAll('.icon-button');
      [].slice.call(iconButtons).forEach(button => {
        button.PaperRipple = new PaperRipple();
        button.appendChild(button.PaperRipple.$);
        button.PaperRipple.$.classList.add('paper-ripple--round');
        button.PaperRipple.recenters = true;
        button.PaperRipple.center = true;
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

    /**
     * socket connected
     */
    socket.on('connect', _ => {
      var led = document.querySelector('#statusIndicator');
      if (led.classList.contains('offline')) {
        requestAnimationFrame(_ => {
          led.classList.remove('offline');
          led.classList.add('online');
        });
      }
    });

    /**
     * socket disconnected
     */
    socket.on('disconnect', _ => {
      var led = document.querySelector('#statusIndicator');
      let led2 = document.querySelector('#routerStatus');
      if (led.classList.contains('online')) {
        requestAnimationFrame(_ => {
          led.classList.remove('online');
          led.classList.add('offline');
        });
      }
      if (led2.classList.contains('online')) {
        requestAnimationFrame(_ => {
          led2.classList.remove('online');
          led2.classList.add('offline');
        });
      }
    });

    /**
     * update main graphs with current data && update appData object
     */
    socket.on('history', logs => sortHistory(logs).then(data => {
      appData = data;
      graphData(data);
    }));


    /**
     * count how many data pointes for a host
     */
    socket.on('count', count => {
      const dialog = document.querySelector('#chartDialog');

      dataPoints = count.count;
      maxPage = Math.round(count.count / appData[count.host].length);
      if (count.count <= appData[count.host].length)
        return;
      // enable button
      let prev = dialog.querySelector('#previousButton');
      prev.style.display = 'flex';
      fadeIn(prev);
    });


    /**
     * update detaild graph
     */
    socket.on('log', log => {
      const graphLoader = document.querySelector('#graphDialogLoader');
      if (!log.history.length) {
        fadeOut(graphLoader);
        return;
      }
      const dialog = document.querySelector('#chartDialog');
      if (!dialog) return;
      let oldCanvas = dialog.querySelector('canvas');
      fadeOut(oldCanvas).then(_ => {
        dialog.removeChild(oldCanvas);
        oldCanvas = null;


        const graphData = returnData(log.history);
        // output pings
        const texts = dialog.querySelectorAll('.high-low-text');
        texts[0].textContent = 'Highest Ping: ' + highestPing(graphData) + ' ms';
        texts[1].textContent = 'Lowest Ping: ' + lowestPing(graphData) + ' ms';


        let forward = dialog.querySelector('#forwardButton');

        let prev = dialog.querySelector('#previousButton');


        if (page >= Math.floor(maxPage)) {
          fadeOut(prev).then(_ => {
            prev.style.display = 'none';
          });
        } else {
          prev.style.display = 'flex';
          fadeIn(prev);
        }

        if (page === 1) {
          fadeOut(forward).then(_ => {
            forward.style.display = 'none';
          });
        } else {
          forward.style.display = 'flex';
          fadeIn(forward);
        }

        const newCanvas = new Graph(bigGraphHeight(), bigGraphWidth());
        dialog.appendChild(newCanvas.canvas);
        // stamp data to the new canvas
        newCanvas.drawGraph(log.host, returnLabels(log.history), graphData, dialog.querySelector('h2').dataset, useTooltips());
        newCanvas.canvas.style.opacity = 0;
        graphLoader.style.pointerEvents = 'none';
        fadeIn(newCanvas.canvas);
        fadeOut(graphLoader);
      });
    });

    /**
     * update restarts data
     */
    socket.on('restarts', logs => {
      if (lastRebootTimer) clearTimeout(lastRebootTimer);
      outputRestarts(logs)
    });

    /**
     * server sent a toast message
     *
     * @param {String} message
     */
    socket.on('toast', message => {
      if (message === 'rebooting router...') {
        // ensure button is disabled
        if (!reboot.classList.contains('disabled-button')) {
          reboot.classList.add('disabled-button');
          startRebootAnimation();
        }
      }
      // enable button if router reboot has finished
      if (message === 'powering on router...')
        reboot.classList.remove('disabled-button');
      new Toast(message);
    });

    /**
     * update router status
     *
     * @param {Object} status
     */
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


    socket.on('login', token => {
      loginToken = token;
      document.querySelector('#username-input').value = '';
      document.querySelector('#password-input').value = '';
      document.querySelector('#twoFactor-input').value = '';
      const loginDialog = document.querySelector('#login-dialog');
      loginDialog.classList.remove('dialog-opened');
      switchButtons();
    });

    socket.on('twoFactor', _ => {
      const usernameInput = document.querySelector('#username-input').parentNode;
      const passwordInput = document.querySelector('#password-input').parentNode;
      const loginButton = document.querySelector('#login-action');
      const sendButton = document.querySelector('#twoFactor-action');
      const twoFactorInput = document.querySelector('#twoFactor-input').parentNode;
      const showHide = document.querySelector('#show-hide-pass');
      fadeOut(showHide).then(_ => {
        showHide.style.display = 'none';
      });
      fadeOut(usernameInput).then(_ => {
        usernameInput.style.display = 'none';
      });
      fadeOut(passwordInput).then(_ => {
        passwordInput.style.display = 'none';
      });
      fadeOut(loginButton).then(_ => {
        loginButton.style.display = 'none';
        twoFactorInput.style.display = 'block';
        sendButton.style.display = 'inline-block';
        fadeIn(sendButton);
        fadeIn(twoFactorInput);
      });
    });

    /**
     * open reboot dialog
     */
    reboot.addEventListener('click', e => {
      if (e.target.classList.contains('disabled-button')) return;
      setTimeout(_ => {
        reboot.classList.add('disabled-button');
      }, 300);
      openRebootDialog();
    });

    /**
     * close reboot dialog
     */
    rebootClose.addEventListener('click', _ => closeRebootDialog()
      .then(_ => reboot.classList.remove('disabled-button')));

    /**
     * close reboot dialog and reboot
     */
    rebootButton.addEventListener('click', _ => closeRebootDialog().then(_ => {
      startRebootTimer();
      socket.emit('force-reboot', loginToken);
    }));

    const loginButton = document.querySelector('#loginButton');
    loginButton.addEventListener('click', _ => {
      if (loginButton.classList.contains('disabled-button'))
        return;
      loginButton.classList.add('disabled-button');
      const loginDialog = document.querySelector('#login-dialog');
      loginDialog.classList.add('dialog-opened');
    });

    const showHide = document.querySelector('#show-hide-pass');
    showHide.addEventListener('click', _ => {
      const pass = document.querySelector('#password-input');
      if (pass.type === 'password') {
        pass.type = 'text';
        showHide.textContent = 'Hide Password';
      } else {
        pass.type = 'password';
        showHide.textContent = 'Show Password';
      }
    });

    const loginClose = document.querySelector('#login-close');
    loginClose.addEventListener('click', _ => {
      loginButton.classList.remove('disabled-button')
      const loginDialog = document.querySelector('#login-dialog');
      loginDialog.classList.remove('dialog-opened');
    });

    const loginAction = document.querySelector('#login-action');
    loginAction.addEventListener('click', submitLogin);

    const twoFactorAction = document.querySelector('#twoFactor-action');
    twoFactorAction.addEventListener('click', submitTwoFactor);

    const passwordInput = document.querySelector('#password-input');
    passwordInput.addEventListener('keyup', e => {
      if (e.keyCode === 13) {
        submitLogin();
      }
    });

    const twoFactorinput = document.querySelector('#twoFactor-input');
    twoFactorinput.addEventListener('keyup', e => {
      if (e.keyCode === 13) {
        submitTwoFactor();
      }
    });
  };
})();
