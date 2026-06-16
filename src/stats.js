function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getStatsWindow(asOf = new Date()) {
  const date = new Date(asOf);
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = date.getDate() >= 16
    ? new Date(year, month, 16, 0, 0, 0, 0)
    : new Date(year, month - 1, 16, 0, 0, 0, 0);

  const end = new Date(start.getFullYear(), start.getMonth() + 1, 16, 0, 0, 0, 0);

  return {
    start,
    end,
    label: `${formatDateTime(start)} - ${formatDateTime(end)}`
  };
}

function isWithinRange(isoDate, start, end) {
  const date = new Date(isoDate);
  return date >= start && date < end;
}

function getMonthlyStats(lots, managers, asOf = new Date()) {
  const window = getStatsWindow(asOf);
  const summary = new Map();

  for (const [code, manager] of managers.entries()) {
    summary.set(code, {
      code,
      name: manager.name,
      total: 0,
      posted: 0,
      scheduled: 0
    });
  }

  for (const lot of lots) {
    if (!isWithinRange(lot.createdAt, window.start, window.end)) continue;
    const item = summary.get(lot.managerCode) || {
      code: lot.managerCode,
      name: lot.managerName || `Менеджер ${lot.managerCode}`,
      total: 0,
      posted: 0,
      scheduled: 0
    };
    item.total += 1;
    if (lot.status === "posted") item.posted += 1;
    if (lot.status === "scheduled") item.scheduled += 1;
    summary.set(lot.managerCode, item);
  }

  return {
    window,
    rows: Array.from(summary.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, "ru");
    })
  };
}

module.exports = {
  formatDateTime,
  getMonthlyStats,
  getStatsWindow
};
