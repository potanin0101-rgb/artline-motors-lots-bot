const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DB = {
  meta: {
    nextLotNumber: 1
  },
  lots: []
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadDb(filePath) {
  ensureDir(filePath);
  if (!fs.existsSync(filePath)) {
    saveDb(filePath, DEFAULT_DB);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw || "{}");
  return {
    meta: { ...DEFAULT_DB.meta, ...(data.meta || {}) },
    lots: Array.isArray(data.lots) ? data.lots : []
  };
}

function saveDb(filePath, db) {
  ensureDir(filePath);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2));
  fs.renameSync(tempPath, filePath);
}

function withDb(filePath, mutator) {
  const db = loadDb(filePath);
  const result = mutator(db);
  saveDb(filePath, db);
  return result;
}

function buildLotId(number) {
  return `LOT-${String(number).padStart(5, "0")}`;
}

function createLot(filePath, payload) {
  return withDb(filePath, (db) => {
    const now = new Date().toISOString();
    const id = buildLotId(db.meta.nextLotNumber);
    db.meta.nextLotNumber += 1;

    const lot = {
      id,
      createdAt: now,
      updatedAt: now,
      ...clone(payload)
    };

    db.lots.push(lot);
    return lot;
  });
}

function updateLot(filePath, lotId, patch) {
  return withDb(filePath, (db) => {
    const index = db.lots.findIndex((item) => item.id === lotId);
    if (index < 0) {
      throw new Error(`Лот ${lotId} не найден.`);
    }

    const current = db.lots[index];
    const nextPatch = typeof patch === "function" ? patch(clone(current)) : patch;
    const updated = {
      ...current,
      ...clone(nextPatch),
      updatedAt: new Date().toISOString()
    };

    db.lots[index] = updated;
    return updated;
  });
}

function getLot(filePath, lotId) {
  return loadDb(filePath).lots.find((item) => item.id === lotId) || null;
}

function listLots(filePath, predicate = null) {
  const lots = loadDb(filePath).lots.slice();
  return predicate ? lots.filter(predicate) : lots;
}

module.exports = {
  createLot,
  getLot,
  listLots,
  loadDb,
  updateLot
};
