export function validateChartData(data) {
  return data.filter((item) => {
    const isValid =
      item.time &&
      typeof item.time === "number" &&
      !isNaN(item.time) &&
      item.open &&
      item.high &&
      item.low &&
      item.close;
    return isValid;
  });
}
