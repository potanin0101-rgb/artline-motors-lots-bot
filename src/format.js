function moneyRub(value) {
  return `${Math.round(value || 0).toLocaleString("ru-RU")} ₽`;
}

function moneyUsd(value) {
  return `$${Math.round(value || 0).toLocaleString("ru-RU")}`;
}

function urgencyLabel(value) {
  return value === "auction" ? "Срочный лот на торги" : "Наличие у дилера";
}

function statusLabel(value) {
  if (value === "posted") return "Опубликован";
  if (value === "error") return "Ошибка публикации";
  return "В отложке";
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);
  const parts = [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear()
  ];
  const time = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0")
  ].join(":");
  return `${parts.join(".")} ${time}`;
}

function buildChannelCaption(lot) {
  const lines = [];
  lines.push(lot.title);
  if (lot.originRegion) lines.push(`Откуда авто: ${lot.originRegion}`);
  lines.push(`Срочность: ${urgencyLabel(lot.urgency)}`);
  if (lot.vin) lines.push(`VIN: ${lot.vin}`);
  lines.push(`Стоимость авто: ${moneyUsd(lot.carPriceUsd)}`);
  lines.push(`Курс: USD ${lot.usdRub}, EUR ${lot.eurRub}`);
  lines.push(`Расходы до РФ: ${moneyUsd(lot.dealerBuyoutUsd + lot.partnerFeeUsd + lot.usInlandUsd + lot.oceanUsd + lot.brokerRussiaUsd)}`);
  lines.push(`Пошлина: ${moneyRub(lot.calculation.rubCosts.dutyRub)}`);
  lines.push(`Таможенное оформление: ${moneyRub(lot.calculation.rubCosts.clearanceFeeRub)}`);
  lines.push(`Утильсбор: ${moneyRub(lot.calculation.rubCosts.utilizationRub)}`);
  lines.push(`Лаборатория: ${moneyRub(lot.labRussiaRub)}`);
  lines.push(`Доставка до ${lot.destinationCity}: ${moneyRub(lot.destinationDeliveryRub)}`);
  lines.push(`Комиссия: ${moneyRub(lot.managerCommissionRub)}`);
  if (lot.extraRub) lines.push(`Прочие расходы: ${moneyRub(lot.extraRub)}`);
  lines.push(`Итог под ключ: ${moneyRub(lot.calculation.totalRub)}`);
  if (lot.note) {
    lines.push("");
    lines.push(lot.note);
  }
  return lines.join("\n");
}

function buildLotCard(lot, options = {}) {
  const lines = [];
  lines.push(`${lot.id} • ${lot.title}`);
  lines.push(`Статус: ${statusLabel(lot.status)}`);
  if (lot.originRegion) lines.push(`Откуда авто: ${lot.originRegion}`);
  lines.push(`Срочность: ${urgencyLabel(lot.urgency)}`);
  if (options.includeManager) {
    lines.push(`Менеджер: ${lot.managerName} (#${lot.managerCode})`);
  }
  lines.push(`Отложка: ${formatDateTime(lot.scheduleAt)}`);
  lines.push(`Стоимость авто: ${moneyUsd(lot.carPriceUsd)}`);
  lines.push(`Итог: ${moneyRub(lot.calculation.totalRub)}`);
  lines.push(`Фото: ${Array.isArray(lot.photos) ? lot.photos.length : 0}`);
  lines.push(`Пошлина: ${moneyRub(lot.calculation.rubCosts.dutyRub)}`);
  lines.push(`Утиль: ${moneyRub(lot.calculation.rubCosts.utilizationRub)}`);
  if (lot.lastError) lines.push(`Ошибка: ${lot.lastError}`);
  return lines.join("\n");
}

function buildManagerStatsMessage(stats) {
  const lines = [];
  lines.push(`Период: ${stats.window.label}`);
  lines.push("");
  for (const row of stats.rows) {
    lines.push(`${row.name} (#${row.code}) — всего ${row.total}, опубликовано ${row.posted}, в отложке ${row.scheduled}`);
  }
  return lines.join("\n");
}

module.exports = {
  buildChannelCaption,
  buildLotCard,
  buildManagerStatsMessage,
  formatDateTime,
  moneyRub,
  moneyUsd
};
