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
    chartDiv.style.height = "500px"; // Fixed height for parent container

    chartWrapper.appendChild(chartHeader);
    chartWrapper.appendChild(chartDiv);
    chartsGridWrapper.appendChild(chartWrapper);

    charts[timeframe] = createChart(config.container, config.visibleRange);
  });

  return charts;
}

function createChart(containerId, visibleRange) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found!`);
    return null;
  }

  // Clear existing content in container
  container.innerHTML = "";

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

  // Verify library availability
  if (!window.LightweightCharts) {
    throw new Error("Lightweight Charts library not loaded!");
  }

  // Create charts AFTER containers are in DOM
  const candlestickChart = LightweightCharts.createChart(
    candlestickContainer,
    chartOptions
  );
  const volumeChart = LightweightCharts.createChart(
    volumeContainer,
    chartOptions
  );

  // Verify chart instance
  if (
    !candlestickChart ||
    typeof candlestickChart.addCandlestickSeries !== "function"
  ) {
    throw new Error("Candlestick chart initialization failed!");
  }

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
    if (!timeRange || timeRange.from === null || timeRange.to === null) {
      console.warn("Skipping sync - invalid time range:", timeRange);
      return;
    }

    // Convert to numbers if needed
    const from =
      typeof timeRange.from === "number"
        ? timeRange.from
        : Number(timeRange.from);
    const to =
      typeof timeRange.to === "number" ? timeRange.to : Number(timeRange.to);

    // Validate numerical values
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      console.warn("Invalid numerical values in time range:", { from, to });
      return;
    }

    // Ensure target chart is ready
    if (!targetChart || !targetChart.timeScale) {
      console.warn("Target chart not initialized");
      return;
    }

    try {
      targetChart.timeScale().setVisibleRange({
        from: Math.floor(from),
        to: Math.ceil(to),
      });
    } catch (error) {
      console.warn("Error syncing time range:", error);
    }
  }

  // Delay the initial sync to ensure charts are ready
  setTimeout(() => {
    candlestickChart
      .timeScale()
      .subscribeVisibleTimeRangeChange((timeRange) => {
        syncTimeRange(candlestickChart, volumeChart, timeRange);
      });

    volumeChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
      syncTimeRange(volumeChart, candlestickChart, timeRange);
    });
  }, 500);

  // Synchronize crosshairs
  function syncCrosshair(sourceChart, targetChart, param) {
    if (
      !targetChart ||
      typeof targetChart.setCrosshairPosition !== "function"
    ) {
      return; // Skip if method unavailable
    }
    if (!param || param.time == null) {
      targetChart.setCrosshairPosition(null, null);
      return;
    }
    targetChart.setCrosshairPosition(null, param.time);
  }

  candlestickChart.subscribeCrosshairMove((param) => {
    syncCrosshair(candlestickChart, volumeChart, param);
  });

  volumeChart.subscribeCrosshairMove((param) => {
    syncCrosshair(volumeChart, candlestickChart, param);
  });

  return { candlestickChart, volumeChart, candlestickSeries, volumeSeries };
}
