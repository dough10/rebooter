(() => {
  'use strict';

  let appData;

  /**
   * set the opacity of a give element to a give value
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
        var event = new CustomEvent('fade', {
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

  function sortNewEntry(entry) {
    return new Promise(resolve => {
      for (let key in appData) {
        if (appData[key] === entry.address) {
          appData[key].push(entry);
        }
      }
      resolve(appData);
    });
  }

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

  function returnTime(array) {
    let output = [];
    let len = array.length;
    for (let i = 0; i < len; i++) {
      output.push(new Date(array[i].time).toLocaleTimeString());
    }
    return output;
  }

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

  function graphData(data) {
    let card = document.querySelector('#card');
    let width = card.offsetWidth - 48;
    for (let key in data) {
      let id = 'el-' + key.replace(/\./g,'');
      let exist = document.querySelector('#' + id);
      if (exist) card.removeChild(exist);
      let div = document.createElement('div');
      let text = document.createElement('h4');
      div.id = id;
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
      let light = 'rgba(' + r + ',' + g + ',' + b + ', 0.2)';
      let dark = 'rgba(' + r + ',' + g + ',' + b + ', 1)';
      let chartData = {
        labels: returnTime(data[key]),
        datasets: [
          {
            label: "Ping Time",
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
    }
  }

  let timer = 0;
  window.onresize = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      graphData(appData);
      timer = 0;
    }, 100);
  };

  window.onload = () => {
    // socket.io setup
    let socket = io.connect(location.origin);
    socket.on('history', logs => sortHistory(logs).then(data => {
      appData = data;
      graphData(data);
      let card = document.querySelector('#card');
      fadeIn(card);
    }));

    socket.on('new', entry => sortNewEntry(entry).then(data => graphData(data)));
  };
})();
