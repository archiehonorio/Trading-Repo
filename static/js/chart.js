import { validateChartData } from "./utils.js";

export function initializeCharts(mainContainer, timeframes) {
  const chartsGridWrapper = document.createElement("div");
  chartsGridWrapper.className = "charts-grid";
  mainContainer.appendChild(chartsGridWrapper);

  const charts = {};
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    const chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-wrapper";

    const chartHeader = document.createElement("div");
    chartHeader.className = "chart-header";

    const chartTitle = document.createElement("h4");
    chartTitle.className = "chart-title";
    chartTitle.textContent = `${timeframe} Chart`;
    chartHeader.appendChild(chartTitle);

    const chartDiv = document.createElement("div");
    chartDiv.id = config.container;
    chartDiv.style.height = "500px";

    chartWrapper.appendChild(chartHeader);
    chartWrapper.appendChild(chartDiv);
    chartsGridWrapper.appendChild(chartWrapper);

    charts[timeframe] = createChart(config.container, config.visibleRange);
  });

  fetchDataForCharts(timeframes, charts);
  return charts;
}

function createChart(containerId, visibleRange) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found!`);
    return null;
  }

  const chartContainer = document.createElement("div");
  chartContainer.style.width = "100%";
  chartContainer.style.height = "100%";
  container.appendChild(chartContainer);

  const candlestickContainer = document.createElement("div");
  candlestickContainer.style.width = "100%";
  candlestickContainer.style.height = "70%";
  chartContainer.appendChild(candlestickContainer);

  const volumeContainer = document.createElement("div");
  volumeContainer.style.width = "100%";
  volumeContainer.style.height = "25%";
  volumeContainer.style.marginTop = "5%";
  chartContainer.appendChild(volumeContainer);

  const timeScaleOptions = {
    borderColor: "#DFDFDF",
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: true,
    fixRightEdge: true,
    rightOffset: 12,
    barSpacing: 3,
  };

  const chartOptions = {
    layout: {
      background: { color: "white" },
      textColor: "black",
      fontSize: 12,
    },
    grid: {
      vertLines: { color: "#E6E6E6" },
      horzLines: { color: "#E6E6E6" },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: {
      borderColor: "#DFDFDF",
      scaleMargins: { top: 0.1, bottom: 0.1 },
      autoScale: true,
    },
    timeScale: timeScaleOptions,
  };

  const candlestickChart = LightweightCharts.createChart(candlestickContainer, {
    ...chartOptions,
    height: candlestickContainer.clientHeight,
  });

  const volumeChart = LightweightCharts.createChart(volumeContainer, {
    ...chartOptions,
    height: volumeContainer.clientHeight,
  });

  const candlestickSeries = candlestickChart.addCandlestickSeries({
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderVisible: false,
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
    priceFormat: {
      type: "price",
      precision: 4,
      minMove: 0.0001,
    },
  });

  const volumeSeries = volumeChart.addHistogramSeries({
    color: "#26a69a",
    priceFormat: {
      type: "volume",
      precision: 4,
    },
  });

  // Synchronize the charts
  function syncTimeRange(sourceChart, targetChart, timeRange) {
    if (
      timeRange &&
      typeof timeRange.from === "number" &&
      typeof timeRange.to === "number" &&
      timeRange.from !== null &&
      timeRange.to !== null
    ) {
      try {
        targetChart.timeScale().setVisibleRange(timeRange);
      } catch (error) {
        console.warn("Error syncing time range:", error);
      }
    } else {
      console.warn("Invalid time range:", timeRange);
    }
  }

  candlestickChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
    syncTimeRange(candlestickChart, volumeChart, timeRange);
  });

  volumeChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
    syncTimeRange(volumeChart, candlestickChart, timeRange);
  });

  // Synchronize crosshairs
  function syncCrosshair(sourceChart, targetChart, param) {
    if (!param || !param.time || !param.point) {
      targetChart.setCrosshairPosition(null);
      return;
    }
    targetChart.setCrosshairPosition(param.time, param.point.x);
  }

  candlestickChart.subscribeCrosshairMove((param) => {
    syncCrosshair(candlestickChart, volumeChart, param);
  });

  volumeChart.subscribeCrosshairMove((param) => {
    syncCrosshair(volumeChart, candlestickChart, param);
  });

  return { candlestickChart, volumeChart, candlestickSeries, volumeSeries };
}

function fetchDataForCharts(timeframes, charts) {
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    fetch(`http://127.0.0.1:5000/history?interval=${config.interval}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn(`No valid data returned for ${timeframe} interval.`);
          return;
        }

        const formattedData = validateChartData(
          data.map((item) => ({
            time: Math.floor(item.time),
            open: Number(parseFloat(item.open).toFixed(4)),
            high: Number(parseFloat(item.high).toFixed(4)),
            low: Number(parseFloat(item.low).toFixed(4)),
            close: Number(parseFloat(item.close).toFixed(4)),
          }))
        );

        const volumeData = data
          .map((item) => ({
            time: Math.floor(item.time),
            value: Number(parseFloat(item.volume).toFixed(4)),
            color:
              parseFloat(item.close) >= parseFloat(item.open)
                ? "#26a69a"
                : "#ef5350",
          }))
          .filter((item) => item.time && !isNaN(item.value));

        if (formattedData.length === 0) {
          console.warn(`No valid data after formatting for ${timeframe}`);
          return;
        }

        const chart = charts[timeframe];
        try {
          chart.candlestickSeries.setData(formattedData);
          chart.volumeSeries.setData(volumeData);

          // First fit the content
          chart.candlestickChart.timeScale().fitContent();
          chart.volumeChart.timeScale().fitContent();

          // Set visible range with delay to ensure data is loaded
          setTimeout(() => {
            if (formattedData.length >= config.visibleRange) {
              const startIndex = Math.max(
                0,
                formattedData.length - config.visibleRange
              );
              const timeRange = {
                from: formattedData[startIndex].time,
                to: formattedData[formattedData.length - 1].time,
              };

              if (
                typeof timeRange.from === "number" &&
                typeof timeRange.to === "number"
              ) {
                chart.candlestickChart.timeScale().setVisibleRange(timeRange);
                chart.volumeChart.timeScale().setVisibleRange(timeRange);
              }
            }
          }, 250);
        } catch (error) {
          console.error(`Error updating chart data for ${timeframe}:`, error);
        }
      })
      .catch((error) =>
        console.error(`Error fetching ${timeframe} chart data:`, error)
      );
  });
}
