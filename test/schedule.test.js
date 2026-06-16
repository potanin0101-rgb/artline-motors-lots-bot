const assert = require("node:assert/strict");
const { getNextScheduleAt } = require("../src/schedule");

const slotA = getNextScheduleAt([], new Date(2026, 5, 16, 8, 12));
assert.equal(slotA.getHours(), 9);
assert.equal(slotA.getMinutes(), 0);

const slotB = getNextScheduleAt([], new Date(2026, 5, 16, 14, 23));
assert.equal(slotB.getHours(), 15);
assert.equal(slotB.getMinutes(), 0);

const slotC = getNextScheduleAt([], new Date(2026, 5, 16, 20, 5));
assert.equal(slotC.getDate(), 17);
assert.equal(slotC.getHours(), 9);
assert.equal(slotC.getMinutes(), 0);

const slotD = getNextScheduleAt([
  { scheduleAt: "2026-06-16T12:00:00.000Z" },
  { scheduleAt: "2026-06-16T13:00:00.000Z" }
], new Date("2026-06-16T12:15:00.000Z"));
assert.equal(slotD.toISOString(), "2026-06-16T14:00:00.000Z");

console.log("schedule.test.js passed");
