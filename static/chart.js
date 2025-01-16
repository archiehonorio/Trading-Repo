document.addEventListener("DOMContentLoaded", function () {
  // First, ensure the main container exists
  const mainContainer = document.getElementById("container");
  if (!mainContainer) {
    console.error("Main container not found!");
    return;
  }
  const vR = 1000;
  const timeframes = {
    "1m": {
      interval: "1m",
      wsInterval: "@kline_1m",
      container: "chart-1m",
      visibleRange: vR,
    }, // Show 200 1-minute candles
    "3m": {
      interval: "3m",
      wsInterval: "@kline_3m",
      container: "chart-3m",
      visibleRange: vR,
    }, // Show 150 3-minute candles
    "15m": {
      interval: "15m",
      wsInterval: "@kline_15m",
      container: "chart-15m",
      visibleRange: vR, // Show 100 15-minute candles
    },
    "4h": {
      interval: "4h",
      wsInterval: "@kline_4h",
      container: "chart-4h",
      visibleRange: vR,
    }, // Show 50 4-hour candles
  };

  // Initialize charts grid wrapper
  const chartsGridWrapper = document.createElement("div");
  chartsGridWrapper.className = "charts-grid";
  mainContainer.appendChild(chartsGridWrapper);

  // Create container divs for each chart
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    // Create wrapper div
    const chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-wrapper";

    // Create header
    const chartHeader = document.createElement("div");
    chartHeader.className = "chart-header";

    const chartTitle = document.createElement("h4");
    chartTitle.className = "chart-title";
    chartTitle.textContent = `${timeframe} Chart`;
    chartHeader.appendChild(chartTitle);

    // Create chart container
    const chartDiv = document.createElement("div");
    chartDiv.id = config.container;
    chartDiv.style.height = "500px";

    // Assemble the structure
    chartWrapper.appendChild(chartHeader);
    chartWrapper.appendChild(chartDiv);
    chartsGridWrapper.appendChild(chartWrapper);
  });

  function createChart(containerId, visibleRange) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found!`);
      return null;
    }

    // Create container for both charts
    const chartContainer = document.createElement("div");
    chartContainer.style.width = "100%";
    chartContainer.style.height = "100%";
    container.appendChild(chartContainer);

    // Create candlestick chart container
    const candlestickContainer = document.createElement("div");
    candlestickContainer.style.width = "100%";
    candlestickContainer.style.height = "70%";
    chartContainer.appendChild(candlestickContainer);

    // Create volume chart container
    const volumeContainer = document.createElement("div");
    volumeContainer.style.width = "100%";
    volumeContainer.style.height = "25%";
    volumeContainer.style.marginTop = "5%";
    chartContainer.appendChild(volumeContainer);

    // Common time scale options
    const timeScaleOptions = {
      borderColor: "#DFDFDF",
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
    };

    // Candlestick chart options
    const candlestickOptions = {
      layout: {
        background: { color: "white" },
        textColor: "black",
      },
      width: container.clientWidth,
      height: candlestickContainer.clientHeight,
      grid: {
        vertLines: { color: "#E6E6E6" },
        horzLines: { color: "#E6E6E6" },
      },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "#DFDFDF",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: timeScaleOptions,
    };

    // Volume chart options
    const volumeOptions = {
      layout: {
        background: { color: "white" },
        textColor: "black",
      },
      width: container.clientWidth,
      height: volumeContainer.clientHeight,
      grid: {
        vertLines: { color: "#E6E6E6" },
        horzLines: { color: "#E6E6E6" },
      },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "#DFDFDF",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: timeScaleOptions,
    };

    const candlestickChart = LightweightCharts.createChart(
      candlestickContainer,
      candlestickOptions
    );
    const volumeChart = LightweightCharts.createChart(
      volumeContainer,
      volumeOptions
    );

    // Add candlestick series
    const candlestickSeries = candlestickChart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Add volume series
    const volumeSeries = volumeChart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
    });

    // Sync the time scales of both charts
    candlestickChart
      .timeScale()
      .subscribeVisibleTimeRangeChange((timeRange) => {
        volumeChart.timeScale().setVisibleRange(timeRange);
      });

    volumeChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
      candlestickChart.timeScale().setVisibleRange(timeRange);
    });

    // Sync crosshair movement
    candlestickChart.subscribeCrosshairMove((param) => {
      if (param === undefined) {
        volumeChart.clearCrosshairMove();
        return;
      }
      volumeChart.setCrosshairPosition(param.time, param.point.x);
    });

    volumeChart.subscribeCrosshairMove((param) => {
      if (param === undefined) {
        candlestickChart.clearCrosshairMove();
        return;
      }
      candlestickChart.setCrosshairPosition(param.time, param.point.x);
    });

    // Store the visibleRange for later use
    candlestickChart.defaultVisibleRange = visibleRange;

    return {
      candlestickChart,
      volumeChart,
      candlestickSeries,
      volumeSeries,
    };
  }

  // Create charts for each timeframe
  const charts = {};
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    const chartInstance = createChart(config.container, config.visibleRange);
    if (chartInstance) {
      charts[timeframe] = chartInstance;
    }
  });

  // Fetch historical data for each timeframe
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    fetch(`http://127.0.0.1:5000/history?interval=${config.interval}`)
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.map((item) => ({
          time: item.time,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
        }));

        const volumeData = data.map((item) => ({
          time: item.time,
          value: parseFloat(item.volume),
          color:
            parseFloat(item.close) >= parseFloat(item.open)
              ? "#26a69a"
              : "#ef5350",
        }));

        charts[timeframe].candlestickSeries.setData(formattedData);
        charts[timeframe].volumeSeries.setData(volumeData);

        // Ensure the data length is sufficient for the visible range
        if (formattedData.length >= config.visibleRange) {
          const visibleRange = config.visibleRange;
          const timeRange = {
            from: formattedData[
              Math.max(0, formattedData.length - visibleRange)
            ].time,
            to: formattedData[formattedData.length - 1].time,
          };

          charts[timeframe].candlestickChart
            .timeScale()
            .setVisibleRange(timeRange);
          charts[timeframe].volumeChart.timeScale().setVisibleRange(timeRange);
        } else {
          console.warn(
            `Data length for ${timeframe} is less than the visible range.`
          );
        }
      })
      .catch((error) =>
        console.error(`Error fetching ${timeframe} chart data:`, error)
      );
  });

  // Set up WebSocket connections for each timeframe
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/btcusdt${config.wsInterval}`
    );

    ws.onmessage = function (event) {
      const messageObject = JSON.parse(event.data);
      const candlestick = messageObject.k;

      charts[timeframe].candlestickSeries.update({
        time: candlestick.t / 1000,
        open: parseFloat(candlestick.o),
        high: parseFloat(candlestick.h),
        low: parseFloat(candlestick.l),
        close: parseFloat(candlestick.c),
      });

      charts[timeframe].volumeSeries.update({
        time: candlestick.t / 1000,
        value: parseFloat(candlestick.v),
        color:
          parseFloat(candlestick.c) >= parseFloat(candlestick.o)
            ? "#26a69a"
            : "#ef5350",
      });
    };

    ws.onerror = function (error) {
      console.error(`WebSocket error for ${timeframe}:`, error);
    };

    ws.onclose = function () {
      console.log(`WebSocket closed for ${timeframe}.`);
    };
  });

  // Handle window resize
  function handleResize() {
    Object.entries(charts).forEach(([timeframe, chart]) => {
      const container = document.getElementById(
        timeframes[timeframe].container
      );
      if (container && chart.candlestickChart && chart.volumeChart) {
        const width = container.clientWidth;
        const candlestickHeight = container.clientHeight * 0.7;
        const volumeHeight = container.clientHeight * 0.25;

        chart.candlestickChart.applyOptions({
          width: width,
          height: candlestickHeight,
        });

        chart.volumeChart.applyOptions({
          width: width,
          height: volumeHeight,
        });
      }
    });
  }

  window.addEventListener("resize", handleResize);
});
