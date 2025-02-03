import { validateChartData } from "../utils/validation.js";

export function fetchDataForCharts(timeframes, charts, token) {
  if (!timeframes || !charts || !token) {
    console.error("Invalid parameters provided to fetchDataForCharts");
    return;
  }

  Object.entries(timeframes).forEach(([timeframe, config]) => {
    // Validate chart instance exists
    if (!charts[timeframe]) {
      console.warn(`No chart instance found for timeframe: ${timeframe}`);
      return;
    }

    // Validate required config properties
    if (!config.interval || !config.container) {
      console.error(`Invalid config for timeframe: ${timeframe}`);
      return;
    }

    // Log the start of data fetching
    console.log(`Fetching data for ${timeframe} chart...`);

    fetch(
      `http://127.0.0.1:5000/history?interval=${config.interval}&token=${token}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Validate response data
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn(`No valid data returned for ${timeframe} interval.`);
          return;
        }

        console.log(`Received ${data.length} data points for ${timeframe}`);

        // Format and validate candlestick data
        const formattedData = validateChartData(
          data.map((item) => ({
            time: Math.floor(item.time),
            open: Number(parseFloat(item.open).toFixed(4)),
            high: Number(parseFloat(item.high).toFixed(4)),
            low: Number(parseFloat(item.low).toFixed(4)),
            close: Number(parseFloat(item.close).toFixed(4)),
          }))
        );

        // Format and validate volume data
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

        // Check if we have valid data after formatting
        if (formattedData.length === 0 || volumeData.length === 0) {
          console.warn(`No valid data after formatting for ${timeframe}`);
          return;
        }

        // Get the chart instance
        const chart = charts[timeframe];
        if (!chart || !chart.candlestickSeries || !chart.volumeSeries) {
          console.error(`Invalid chart instance for ${timeframe}`);
          return;
        }

        try {
          // Update chart data
          chart.candlestickSeries.setData(formattedData);
          chart.volumeSeries.setData(volumeData);

          // Fit content initially
          chart.candlestickChart.timeScale().fitContent();
          chart.volumeChart.timeScale().fitContent();

          // Set visible range after a short delay
          setTimeout(() => {
            if (
              config.visibleRange &&
              typeof config.visibleRange === "number" &&
              formattedData.length >= config.visibleRange
            ) {
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

          console.log(`Successfully updated ${timeframe} chart`);
        } catch (error) {
          console.error(`Error updating chart data for ${timeframe}:`, error);
        }
      })
      .catch((error) => {
        console.error(`Error fetching ${timeframe} chart data:`, error);
        // Optionally: Show user feedback or retry logic
      });
  });
}

// Optional: Add a retry mechanism for failed requests
function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  return fetch(url, options).catch((error) => {
    if (retries > 0) {
      console.log(`Retrying ${url}... (${retries} attempts remaining)`);
      return new Promise((resolve) =>
        setTimeout(
          () => resolve(fetchWithRetry(url, options, retries - 1, delay)),
          delay
        )
      );
    }
    throw error;
  });
}
