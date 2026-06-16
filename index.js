const path = require("node:path");
const { loadEnvFile } = require("./src/env");
const { loadConfig } = require("./src/config");
const { calculateLotTotals } = require("./src/calculator");
const { createLot, getLot, listLots, updateLot } = require("./src/storage");
const { getMonthlyStats } = require("./src/stats");
const { buildChannelCaption, buildLotCard, buildManagerStatsMessage, moneyRub } = require("./src/format");

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile();

const config = loadConfig();
const API_BASE = `https://api.telegram.org/bot${config.botToken}`;
const DB_PATH = path.join(__dirname, "data", "db.json");
const sessions = new Map();

const LOT_STEPS = [
  "originRegion",
  "title",
  "vin",
  "carPriceUsd",
  "engineCc",
  "horsepower",
  "productionYear",
  "productionMonth",
  "mileageKm",
  "driveType",
  "usdRub",
  "eurRub",
  "dealerBuyoutUsd",
  "partnerFeeUsd",
  "usInlandUsd",
  "oceanUsd",
  "brokerRussiaUsd",
  "labRussiaRub",
  "destinationCity",
  "destinationDeliveryRub",
  "managerCommissionRub",
  "extraRub",
  "note"
];

const STEP_TEXT = {
  originRegion: "Выбери, откуда автомобиль.",
  title: "Введи название лота.\nНапример: BMW X5 xDrive40i M Sport",
  vin: "Введи VIN или отправь `-`, если пока пропускаем.",
  carPriceUsd: "Стоимость автомобиля в USD.\nНапример: 48500",
  engineCc: "Объем двигателя в куб. см.\nНапример: 1998",
  horsepower: "Мощность в л.с.\nНапример: 249",
  productionYear: "Год выпуска.\nНапример: 2023",
  productionMonth: "Месяц выпуска числом от 1 до 12.\nНапример: 7",
  mileageKm: "Пробег в километрах.\nНапример: 4400",
  driveType: "Укажи привод.\nНапример: AWD",
  usdRub: "Курс USD/RUB для расчета.\nНапример: 92.5",
  eurRub: "Курс EUR/RUB для расчета пошлины.\nНапример: 101.3",
  dealerBuyoutUsd: "Выкуп у дилера в USD.\nЕсли нет, отправь 0.",
  partnerFeeUsd: "Комиссия партнера в USD.\nМожно нажать 3500 или 4500.",
  usInlandUsd: "Доставка по США в USD.",
  oceanUsd: "Океан в USD.\nМожно выбрать 6500 или 7500.",
  brokerRussiaUsd: "Брокер РФ в USD.\nЕсли стандартно, можно выбрать 1000.",
  labRussiaRub: "Лаборатория в рублях.\nЕсли стандартно, можно выбрать 80000.",
  destinationCity: "Куда считаем доставку по РФ?\nНапример: Москва",
  destinationDeliveryRub: "Доставка по РФ в рублях.",
  managerCommissionRub: "Комиссия в рублях.",
  extraRub: "Прочие расходы в рублях.\nЕсли нет, отправь 0.",
  note: "Комментарий для поста.\nЕсли без комментария, отправь `-`."
};

function parseAmount(text) {
  const normalized = String(text || "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      userCode: null,
      userName: null,
      isAdmin: false,
      step: null,
      draft: null
    });
  }
  return sessions.get(chatId);
}

function resetDraft(session) {
  session.step = null;
  session.draft = null;
}

function mainMenuKeyboard(session) {
  const rows = [
    [{ text: "Новый лот" }, { text: "Моя статистика" }],
    [{ text: "Мои лоты" }]
  ];

  if (session.isAdmin) {
    rows.push([{ text: "Очередь публикаций" }, { text: "Статистика менеджеров" }]);
  }

  return {
    keyboard: rows,
    resize_keyboard: true
  };
}

function stepKeyboard(step) {
  if (step === "originRegion") {
    return {
      inline_keyboard: [
        [{ text: "США", callback_data: "stepText:originRegion:США" }],
        [{ text: "ОАЭ", callback_data: "stepText:originRegion:ОАЭ" }],
        [{ text: "ЮЖНАЯ КОРЕЯ", callback_data: "stepText:originRegion:ЮЖНАЯ КОРЕЯ" }],
        [{ text: "КИТАЙ", callback_data: "stepText:originRegion:КИТАЙ" }],
        [{ text: "ЕВРОПА", callback_data: "stepText:originRegion:ЕВРОПА" }]
      ]
    };
  }

  if (step === "partnerFeeUsd") {
    return {
      inline_keyboard: [
        [
          { text: "$3500", callback_data: "step:partnerFeeUsd:3500" },
          { text: "$4500", callback_data: "step:partnerFeeUsd:4500" }
        ]
      ]
    };
  }

  if (step === "oceanUsd") {
    return {
      inline_keyboard: [
        [
          { text: "$6500", callback_data: "step:oceanUsd:6500" },
          { text: "$7500", callback_data: "step:oceanUsd:7500" }
        ]
      ]
    };
  }

  if (step === "brokerRussiaUsd") {
    return {
      inline_keyboard: [
        [{ text: "$1000", callback_data: "step:brokerRussiaUsd:1000" }]
      ]
    };
  }

  if (step === "labRussiaRub") {
    return {
      inline_keyboard: [
        [{ text: "80 000 ₽", callback_data: `step:labRussiaRub:${config.defaultLabRub}` }]
      ]
    };
  }

  if (step === "driveType") {
    return {
      inline_keyboard: [
        [
          { text: "AWD", callback_data: "stepText:driveType:AWD" },
          { text: "4WD", callback_data: "stepText:driveType:4WD" }
        ],
        [
          { text: "FWD", callback_data: "stepText:driveType:FWD" },
          { text: "RWD", callback_data: "stepText:driveType:RWD" }
        ]
      ]
    };
  }

  if (step === "note") {
    return {
      inline_keyboard: [
        [{ text: "Без комментария", callback_data: "step:note:skip" }]
      ]
    };
  }

  return null;
}

async function telegram(method, payload) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description}`);
  }
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

function getManagerByCode(code) {
  const manager = config.managers.get(String(code));
  if (!manager) {
    if (!config.adminCodes.has(String(code))) return null;
    return {
      code: String(code),
      name: `Администратор ${code}`,
      isAdmin: true
    };
  }
  return {
    code: manager.code,
    name: manager.name,
    isAdmin: config.adminCodes.has(manager.code)
  };
}

function nextLotStep(currentStep) {
  const index = LOT_STEPS.indexOf(currentStep);
  return LOT_STEPS[index + 1] || null;
}

function buildDraftBase(session) {
  return {
    managerCode: session.userCode,
    managerName: session.userName,
    brokerRussiaUsd: config.defaultBrokerUsd,
    labRussiaRub: config.defaultLabRub,
    photos: []
  };
}

async function askForLogin(chatId) {
  await sendMessage(
    chatId,
    "Введи свой внутренний номер менеджера.\nНапример: `101`",
    { reply_markup: { remove_keyboard: true } }
  );
}

async function showMainMenu(chatId, session, prefix = "") {
  const text = prefix || `Ты в меню, ${session.userName} (#${session.userCode}).`;
  await sendMessage(chatId, text, { reply_markup: mainMenuKeyboard(session) });
}

async function askStep(chatId, session) {
  if (session.step === "photos") {
    await sendMessage(chatId, "Отправляй фотографии по одной. Когда закончишь, нажми кнопку ниже.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Готово с фото", callback_data: "photos:done" }],
          [{ text: "Сохранить без фото", callback_data: "photos:skip" }]
        ]
      }
    });
    return;
  }

  if (session.step === "urgency") {
    await sendMessage(chatId, "Выбери срочность лота.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Срочный лот на торги", callback_data: "urgency:auction" }],
          [{ text: "Наличие у дилера", callback_data: "urgency:stock" }]
        ]
      }
    });
    return;
  }

  if (session.step === "schedule") {
    await sendMessage(chatId, "Когда публиковать лот?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Сейчас", callback_data: "schedule:now" }],
          [{ text: "Через 1 час", callback_data: "schedule:plus1h" }],
          [{ text: "Завтра в 10:00", callback_data: "schedule:tomorrow10" }],
          [{ text: "Ввести вручную", callback_data: "schedule:manual" }]
        ]
      }
    });
    return;
  }

  if (session.step === "scheduleManual") {
    await sendMessage(chatId, "Введи дату и время публикации в формате `ДД.ММ.ГГГГ ЧЧ:ММ`.\nНапример: `18.06.2026 14:30`");
    return;
  }

  await sendMessage(chatId, STEP_TEXT[session.step], {
    reply_markup: stepKeyboard(session.step) || undefined
  });
}

function validateStep(step, value) {
  const nowYear = new Date().getFullYear();

  if (step === "originRegion" || step === "title" || step === "destinationCity" || step === "driveType") {
    return String(value || "").trim() ? null : "Поле не может быть пустым.";
  }

  if (step === "vin") return null;
  if (step === "note") return null;

  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Нужно ввести число.";
  }

  if (step === "carPriceUsd" && value <= 0) return "Стоимость авто должна быть больше нуля.";
  if (step === "engineCc" && (value < 1 || value > 10000)) return "Объем двигателя выглядит неверно.";
  if (step === "horsepower" && (value < 1 || value > 2000)) return "Мощность выглядит неверно.";
  if (step === "productionYear" && (value < 1980 || value > nowYear)) return `Год должен быть от 1980 до ${nowYear}.`;
  if (step === "productionMonth" && (value < 1 || value > 12)) return "Месяц должен быть от 1 до 12.";
  if (step === "mileageKm" && (value < 0 || value > 1000000)) return "Пробег выглядит неверно.";
  if (value < 0 && step !== "eurRub" && step !== "usdRub") return "Сумма не может быть отрицательной.";
  if ((step === "usdRub" || step === "eurRub") && value <= 0) return "Курс должен быть больше нуля.";
  return null;
}

function parseDateTimeInput(text) {
  const match = String(text || "").trim().match(/^(\d{2})\.(\d{2})(?:\.(\d{4}))?\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dd, mm, yyyy, hh, min] = match;
  const year = yyyy ? Number(yyyy) : new Date().getFullYear();
  const date = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(min), 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function draftPreview(draft) {
  const calculation = calculateLotTotals(draft);
  return [
    `Предпросмотр: ${draft.title}`,
    `Итог под ключ: ${moneyRub(calculation.totalRub)}`,
    `Пошлина: ${moneyRub(calculation.rubCosts.dutyRub)}`,
    `Таможенное оформление: ${moneyRub(calculation.rubCosts.clearanceFeeRub)}`,
    `Утильсбор: ${moneyRub(calculation.rubCosts.utilizationRub)}`,
    `Фото: ${Array.isArray(draft.photos) ? draft.photos.length : 0}`
  ].join("\n");
}

async function finalizeDraft(chatId, session) {
  const draft = session.draft;
  const calculation = calculateLotTotals(draft);
  const lot = createLot(DB_PATH, {
    ...draft,
    calculation,
    status: "scheduled",
    postedAt: null,
    channelMessageId: null,
    lastError: null
  });

  resetDraft(session);
  await sendMessage(chatId, `${buildLotCard(lot)}\n\nЛот сохранен в отложку.`, {
    reply_markup: mainMenuKeyboard(session)
  });
}

async function startNewLot(chatId, session) {
  session.draft = buildDraftBase(session);
  session.step = LOT_STEPS[0];
  await askStep(chatId, session);
}

async function showOwnLots(chatId, session) {
  const lots = listLots(DB_PATH, (item) => item.managerCode === session.userCode)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  if (lots.length === 0) {
    await sendMessage(chatId, "У тебя пока нет сохраненных лотов.", {
      reply_markup: mainMenuKeyboard(session)
    });
    return;
  }

  for (const lot of lots) {
    const extra = session.isAdmin
      ? {
        reply_markup: {
          inline_keyboard: [[{ text: "Опубликовать сейчас", callback_data: `admin:publish:${lot.id}` }]]
        }
      }
      : {};

    await sendMessage(chatId, buildLotCard(lot), extra);
  }
}

async function showOwnStats(chatId, session) {
  const stats = getMonthlyStats(listLots(DB_PATH), config.managers);
  const row = stats.rows.find((item) => item.code === session.userCode) || {
    code: session.userCode,
    name: session.userName,
    total: 0,
    posted: 0,
    scheduled: 0
  };

  await sendMessage(chatId, [
    `Период: ${stats.window.label}`,
    `${row.name} (#${row.code})`,
    `Всего лотов: ${row.total}`,
    `Опубликовано: ${row.posted}`,
    `В отложке: ${row.scheduled}`
  ].join("\n"), {
    reply_markup: mainMenuKeyboard(session)
  });
}

async function showAdminStats(chatId, session) {
  const stats = getMonthlyStats(listLots(DB_PATH), config.managers);
  await sendMessage(chatId, buildManagerStatsMessage(stats), {
    reply_markup: mainMenuKeyboard(session)
  });
}

async function showQueue(chatId, session) {
  const lots = listLots(DB_PATH, (item) => item.status === "scheduled" || item.status === "error")
    .sort((a, b) => new Date(a.scheduleAt) - new Date(b.scheduleAt))
    .slice(0, 15);

  if (lots.length === 0) {
    await sendMessage(chatId, "Очередь пустая.", { reply_markup: mainMenuKeyboard(session) });
    return;
  }

  for (const lot of lots) {
    await sendMessage(chatId, buildLotCard(lot, { includeManager: true }), {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Опубликовать сейчас", callback_data: `admin:publish:${lot.id}` }],
          [
            { text: "+1 час", callback_data: `admin:delay1h:${lot.id}` },
            { text: "Завтра 10:00", callback_data: `admin:tomorrow10:${lot.id}` }
          ],
          [{ text: "Убрать из отложки", callback_data: `admin:archive:${lot.id}` }]
        ]
      }
    });
  }
}

function getPhotoFileId(message) {
  if (!Array.isArray(message.photo) || message.photo.length === 0) return null;
  const photo = message.photo[message.photo.length - 1];
  return photo.file_id || null;
}

async function postLotToChannel(lot) {
  if (!config.channelId) {
    throw new Error("Не задан CHANNEL_ID.");
  }

  const caption = buildChannelCaption(lot);
  const photoIds = Array.isArray(lot.photos) ? lot.photos.map((item) => item.fileId).filter(Boolean) : [];

  if (photoIds.length >= 2) {
    const result = await telegram("sendMediaGroup", {
      chat_id: config.channelId,
      media: photoIds.map((fileId, index) => ({
        type: "photo",
        media: fileId,
        ...(index === 0 ? { caption, parse_mode: "HTML" } : {})
      }))
    });

    return Array.isArray(result) && result[0] ? result[0].message_id : null;
  }

  if (photoIds.length === 1) {
    const result = await telegram("sendPhoto", {
      chat_id: config.channelId,
      photo: photoIds[0],
      caption,
      parse_mode: "HTML"
    });
    return result.message_id;
  }

  const result = await telegram("sendMessage", {
    chat_id: config.channelId,
    text: caption,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
  return result.message_id;
}

async function publishLot(lotId) {
  const lot = getLot(DB_PATH, lotId);
  if (!lot) {
    throw new Error(`Лот ${lotId} не найден.`);
  }

  const messageId = await postLotToChannel(lot);
  return updateLot(DB_PATH, lotId, {
    status: "posted",
    postedAt: new Date().toISOString(),
    channelMessageId: messageId,
    lastError: null
  });
}

function tomorrowAtTen() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0, 0);
}

async function processScheduledLots() {
  const dueLots = listLots(DB_PATH, (item) => item.status === "scheduled" && new Date(item.scheduleAt) <= new Date())
    .sort((a, b) => new Date(a.scheduleAt) - new Date(b.scheduleAt));

  for (const lot of dueLots) {
    try {
      await publishLot(lot.id);
    } catch (error) {
      updateLot(DB_PATH, lot.id, {
        status: "error",
        lastError: error.message
      });
    }
  }
}

async function handleDraftText(message, session) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const step = session.step;

  if (step === "scheduleManual") {
    const scheduleAt = parseDateTimeInput(text);
    if (!scheduleAt || scheduleAt <= new Date()) {
      await sendMessage(chatId, "Дата не распознана или уже в прошлом. Используй формат `ДД.ММ.ГГГГ ЧЧ:ММ`.");
      return;
    }

    session.draft.scheduleAt = scheduleAt.toISOString();
    await finalizeDraft(chatId, session);
    return;
  }

  if (step === "photos") {
    const fileId = getPhotoFileId(message);
    if (!fileId) {
      await sendMessage(chatId, "Жду фотографию или кнопку завершения.");
      return;
    }

    const exists = session.draft.photos.some((item) => item.fileId === fileId);
    if (!exists) {
      session.draft.photos.push({ fileId });
    }
    await sendMessage(chatId, `Фото добавлено. Сейчас в лоте: ${session.draft.photos.length}.`);
    return;
  }

  if (step === "originRegion" || step === "title" || step === "destinationCity" || step === "driveType") {
    const error = validateStep(step, text);
    if (error) {
      await sendMessage(chatId, error);
      return;
    }
    if (step === "originRegion" || step === "driveType") {
      session.draft[step] = text.toUpperCase();
    } else {
      session.draft[step] = text;
    }
  } else if (step === "vin" || step === "note") {
    session.draft[step] = text === "-" ? "" : text;
  } else {
    const value = parseAmount(text);
    const error = validateStep(step, value);
    if (error) {
      await sendMessage(chatId, error);
      return;
    }
    session.draft[step] = value;
  }

  const nextStep = nextLotStep(step);
  if (nextStep) {
    session.step = nextStep;
    await askStep(chatId, session);
    return;
  }

  try {
    calculateLotTotals(session.draft);
  } catch (error) {
    await sendMessage(chatId, `Не удалось посчитать лот: ${error.message}`);
    return;
  }

  session.step = "photos";
  await sendMessage(chatId, draftPreview(session.draft));
  await askStep(chatId, session);
}

async function handleLogin(chatId, session, text) {
  const user = getManagerByCode(text);
  if (!user) {
    await sendMessage(chatId, "Такой номер не найден. Проверь код еще раз.");
    return;
  }

  session.userCode = user.code;
  session.userName = user.name;
  session.isAdmin = user.isAdmin;
  await showMainMenu(chatId, session, `Вход выполнен: ${user.name} (#${user.code}).`);
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const session = getSession(chatId);
  const text = (message.text || "").trim();

  if (text === "/start") {
    resetDraft(session);
    await askForLogin(chatId);
    return;
  }

  if (!session.userCode) {
    await handleLogin(chatId, session, text);
    return;
  }

  if (text === "/menu") {
    resetDraft(session);
    await showMainMenu(chatId, session);
    return;
  }

  if (text === "/new" || text === "Новый лот") {
    await startNewLot(chatId, session);
    return;
  }

  if (text === "Моя статистика") {
    resetDraft(session);
    await showOwnStats(chatId, session);
    return;
  }

  if (text === "Мои лоты") {
    resetDraft(session);
    await showOwnLots(chatId, session);
    return;
  }

  if (text === "Очередь публикаций" && session.isAdmin) {
    resetDraft(session);
    await showQueue(chatId, session);
    return;
  }

  if (text === "Статистика менеджеров" && session.isAdmin) {
    resetDraft(session);
    await showAdminStats(chatId, session);
    return;
  }

  if (session.step) {
    await handleDraftText(message, session);
    return;
  }

  await showMainMenu(chatId, session);
}

async function handleAdminAction(chatId, session, action, lotId) {
  if (!session.isAdmin) {
    await sendMessage(chatId, "Эта команда доступна только админу.");
    return;
  }

  if (action === "publish") {
    const lot = await publishLot(lotId);
    await sendMessage(chatId, `Лот ${lot.id} опубликован.`);
    return;
  }

  if (action === "delay1h") {
    const lot = updateLot(DB_PATH, lotId, {
      status: "scheduled",
      scheduleAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      lastError: null
    });
    await sendMessage(chatId, `Лот ${lot.id} перенесен на 1 час.`);
    return;
  }

  if (action === "tomorrow10") {
    const lot = updateLot(DB_PATH, lotId, {
      status: "scheduled",
      scheduleAt: tomorrowAtTen().toISOString(),
      lastError: null
    });
    await sendMessage(chatId, `Лот ${lot.id} перенесен на завтра 10:00.`);
    return;
  }

  if (action === "archive") {
    const lot = updateLot(DB_PATH, lotId, {
      status: "archived"
    });
    await sendMessage(chatId, `Лот ${lot.id} убран из отложки.`);
  }
}

async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const session = getSession(chatId);
  const data = callbackQuery.data || "";

  await telegram("answerCallbackQuery", { callback_query_id: callbackQuery.id });

  if (!session.userCode) {
    await askForLogin(chatId);
    return;
  }

  if (data.startsWith("step:")) {
    const [, key, rawValue] = data.split(":");
    if (!session.draft || session.step !== key) return;
    session.draft[key] = rawValue === "skip" ? "" : Number(rawValue);
    const nextStep = nextLotStep(key);
    if (nextStep) {
      session.step = nextStep;
      await askStep(chatId, session);
      return;
    }

    try {
      calculateLotTotals(session.draft);
    } catch (error) {
      await sendMessage(chatId, `Не удалось посчитать лот: ${error.message}`);
      return;
    }

    session.step = "photos";
    await sendMessage(chatId, draftPreview(session.draft));
    await askStep(chatId, session);
    return;
  }

  if (data.startsWith("stepText:")) {
    const [, key, ...valueParts] = data.split(":");
    if (!session.draft || session.step !== key) return;
    const value = valueParts.join(":");
    session.draft[key] = key === "originRegion" || key === "driveType" ? value.toUpperCase() : value;
    session.step = nextLotStep(key);
    await askStep(chatId, session);
    return;
  }

  if (data === "photos:skip" || data === "photos:done") {
    if (!session.draft || session.step !== "photos") return;
    session.step = "urgency";
    await askStep(chatId, session);
    return;
  }

  if (data.startsWith("urgency:")) {
    if (!session.draft || session.step !== "urgency") return;
    session.draft.urgency = data.split(":")[1];
    session.step = "schedule";
    await askStep(chatId, session);
    return;
  }

  if (data.startsWith("schedule:")) {
    if (!session.draft || session.step !== "schedule") return;
    const action = data.split(":")[1];

    if (action === "now") {
      session.draft.scheduleAt = new Date().toISOString();
      await finalizeDraft(chatId, session);
      return;
    }

    if (action === "plus1h") {
      session.draft.scheduleAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await finalizeDraft(chatId, session);
      return;
    }

    if (action === "tomorrow10") {
      session.draft.scheduleAt = tomorrowAtTen().toISOString();
      await finalizeDraft(chatId, session);
      return;
    }

    if (action === "manual") {
      session.step = "scheduleManual";
      await askStep(chatId, session);
    }
    return;
  }

  if (data.startsWith("admin:")) {
    const [, action, lotId] = data.split(":");
    await handleAdminAction(chatId, session, action, lotId);
  }
}

async function poll() {
  let offset = 0;
  console.log("Artline Motors lots bot started.");
  if (!config.channelId) {
    console.warn("CHANNEL_ID не задан. Автопубликация в канал будет падать ошибкой, пока не добавишь переменную.");
  }

  await telegram("deleteWebhook", { drop_pending_updates: false });

  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) await handleMessage(update.message);
        if (update.callback_query) await handleCallback(update.callback_query);
      }

      await processScheduledLots();
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

if (require.main === module) {
  poll().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  parseAmount,
  parseDateTimeInput
};
