export function validateChartData(data) {
  return data.filter(
    (item) =>
      item.time != null &&
      !isNaN(item.open) &&
      !isNaN(item.high) &&
      !isNaN(item.low) &&
      !isNaN(item.close) &&
      item.time > 0 // Ensure time is positive
  );
}
