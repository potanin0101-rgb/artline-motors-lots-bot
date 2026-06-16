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

function formatNumberWithDots(value) {
  return Math.round(value || 0).toLocaleString("ru-RU").replace(/\s/g, ".");
}

function formatRubTight(value) {
  return `${formatNumberWithDots(value)}₽`;
}

function formatEngineLiters(engineCc) {
  return `${(Number(engineCc || 0) / 1000).toFixed(1)}L`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOriginHashtag(originRegion) {
  const map = {
    "США": "#США",
    "ОАЭ": "#ОАЭ",
    "ЮЖНАЯ КОРЕЯ": "#ЮЖНАЯ_КОРЕЯ",
    "КИТАЙ": "#КИТАЙ",
    "ЕВРОПА": "#ЕВРОПА"
  };
  return map[originRegion] || "#АВТО";
}

function buildBudgetHashtag(totalRub) {
  const budgetMillions = Math.ceil(Number(totalRub || 0) / 1000000);
  return `#от_${Math.max(1, budgetMillions)}_млн`;
}

function buildBrandHashtag(title) {
  const firstWord = String(title || "")
    .trim()
    .split(/\s+/)[0]
    .split("-")[0]
    .replace(/[^\p{L}\p{N}]/gu, "");

  if (!firstWord) return "#АВТО";
  return `#${firstWord.toUpperCase()}`;
}

function buildChannelCaption(lot) {
  const lines = [];
  lines.push(escapeHtml(lot.title));
  lines.push("");
  lines.push(`▪️Год выпуска: ${escapeHtml(lot.productionYear)}`);
  lines.push(`▪️Пробег: ${escapeHtml(formatNumberWithDots(lot.mileageKm))} км`);
  lines.push(`▪️Двигатель: ${escapeHtml(formatEngineLiters(lot.engineCc))}`);
  lines.push(`▪️Привод: ${escapeHtml(lot.driveType)}`);
  lines.push("");
  lines.push(`💸 Стоимость данного авто выйдет под ключ до ${escapeHtml(lot.destinationCity)} - ${escapeHtml(formatRubTight(lot.calculation.totalRub))} в рублях по курсу на сегодня.`);
  if (lot.note) {
    lines.push("");
    lines.push(escapeHtml(lot.note));
  }
  if (lot.vin) {
    lines.push("");
    lines.push(`VIN: ${escapeHtml(lot.vin)}`);
  }
  lines.push("");
  lines.push([
    buildBrandHashtag(lot.title),
    buildBudgetHashtag(lot.calculation.totalRub),
    buildOriginHashtag(lot.originRegion)
  ].join(" "));
  lines.push("");
  lines.push("💬 По всем вопросам пишите или звоните:");
  lines.push("");
  lines.push("☎️ +79381597555");
  lines.push('📲 <a href="https://t.me/ArtLine_Motors_Garik">Telegram</a> / <a href="https://wa.me/79381597555">WhatsApp</a>');
  lines.push("");
  lines.push('🖥 <a href="http://artlinemotors.su/">artlinemotors.su</a>');
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
  buildBudgetHashtag,
  buildBrandHashtag,
  buildOriginHashtag,
  escapeHtml,
  formatDateTime,
  formatEngineLiters,
  formatNumberWithDots,
  moneyRub,
  moneyUsd
};
