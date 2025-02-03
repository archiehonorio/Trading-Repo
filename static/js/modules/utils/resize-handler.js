export function setupResizeHandling(charts, timeframes) {
  let resizeTimeout;

  function handleResize() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
      Object.entries(charts).forEach(([timeframe, chart]) => {
        const container = document.getElementById(
          timeframes[timeframe].container
        );
        if (container && chart.candlestickChart && chart.volumeChart) {
          const width = container.clientWidth;
          const candlestickHeight = Math.floor(container.clientHeight * 0.7);
          const volumeHeight = Math.floor(container.clientHeight * 0.25);

          try {
            chart.candlestickChart.resize(width, candlestickHeight);
            chart.volumeChart.resize(width, volumeHeight);
            chart.candlestickChart.timeScale().fitContent();
            chart.volumeChart.timeScale().fitContent();
          } catch (error) {
            console.error(`Error resizing charts for ${timeframe}:`, error);
          }
        }
      });
    }, 100);
  }

  window.addEventListener("resize", handleResize);
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(document.getElementById("container"));
}
