function parseManagers(rawValue) {
  const map = new Map();
  for (const chunk of String(rawValue || "").split(/[,\n]/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const [code, ...nameParts] = trimmed.split(":");
    const normalizedCode = String(code || "").trim();
    const name = nameParts.join(":").trim();
    if (!normalizedCode || !name) continue;
    map.set(normalizedCode, { code: normalizedCode, name });
  }
  return map;
}

function parseCodeSet(rawValue) {
  const set = new Set();
  for (const chunk of String(rawValue || "").split(/[,\n]/)) {
    const code = chunk.trim();
    if (code) set.add(code);
  }
  return set;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}.`);
  }
  return value;
}

function loadConfig() {
  const managers = parseManagers(getRequiredEnv("MANAGERS"));
  if (managers.size === 0) {
    throw new Error("Не удалось прочитать MANAGERS. Используй формат 101:Иван,102:Павел.");
  }

  return {
    botToken: getRequiredEnv("BOT_TOKEN"),
    channelId: process.env.CHANNEL_ID || "",
    managers,
    adminCodes: parseCodeSet(process.env.ADMIN_CODES),
    defaultLabRub: Number(process.env.DEFAULT_LAB_RUB || 80000),
    defaultBrokerUsd: Number(process.env.DEFAULT_BROKER_USD || 1000),
    schedulerIntervalMs: 30000
  };
}

module.exports = {
  loadConfig
};
