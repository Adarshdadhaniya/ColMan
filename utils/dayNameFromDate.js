// utils/dayNameFromDate.js
function dayNameFromDate(date) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date(date).getDay()];
}

module.exports = dayNameFromDate;
