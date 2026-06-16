const assert = require("node:assert/strict");
const { getStatsWindow, getMonthlyStats } = require("../src/stats");

const windowA = getStatsWindow(new Date(2026, 5, 20, 12, 0, 0));
assert.equal(windowA.start.getDate(), 16);
assert.equal(windowA.start.getMonth(), 5);
assert.equal(windowA.end.getMonth(), 6);

const managers = new Map([
  ["101", { code: "101", name: "Иван" }],
  ["102", { code: "102", name: "Павел" }]
]);

const stats = getMonthlyStats([
  {
    id: "LOT-1",
    managerCode: "101",
    managerName: "Иван",
    status: "posted",
    createdAt: "2026-06-18T10:00:00.000Z"
  },
  {
    id: "LOT-2",
    managerCode: "101",
    managerName: "Иван",
    status: "scheduled",
    createdAt: "2026-06-19T10:00:00.000Z"
  },
  {
    id: "LOT-3",
    managerCode: "102",
    managerName: "Павел",
    status: "scheduled",
    createdAt: "2026-05-10T10:00:00.000Z"
  }
], managers, new Date(2026, 5, 20, 12, 0, 0));

const ivan = stats.rows.find((item) => item.code === "101");
const pavel = stats.rows.find((item) => item.code === "102");

assert.equal(ivan.total, 2);
assert.equal(ivan.posted, 1);
assert.equal(ivan.scheduled, 1);
assert.equal(pavel.total, 0);

console.log("stats.test.js passed");
