const SLOT_MINUTES = 60;
const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 19;

function cloneDate(date) {
  return new Date(date.getTime());
}

function ceilToNextSlot(date) {
  const next = cloneDate(date);
  next.setSeconds(0, 0);

  const minutes = next.getMinutes();
  if (minutes === 0) return next;

  const delta = SLOT_MINUTES - (minutes % SLOT_MINUTES);
  next.setMinutes(minutes + delta, 0, 0);
  return next;
}

function getWindowStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORKDAY_START_HOUR, 0, 0, 0);
}

function getWindowEnd(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORKDAY_END_HOUR, 0, 0, 0);
}

function normalizeCandidate(date) {
  const rounded = ceilToNextSlot(date);
  const start = getWindowStart(rounded);
  const end = getWindowEnd(rounded);

  if (rounded < start) return start;
  if (rounded > end) {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, WORKDAY_START_HOUR, 0, 0, 0);
  }
  return rounded;
}

function incrementSlot(date) {
  const next = new Date(date.getTime() + SLOT_MINUTES * 60 * 1000);
  return normalizeCandidate(next);
}

function getNextScheduleAt(lots, now = new Date()) {
  let candidate = normalizeCandidate(now);

  const occupied = new Set(
    lots
      .filter((item) => item && item.scheduleAt)
      .map((item) => {
        const date = new Date(item.scheduleAt);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
      })
      .filter(Boolean)
  );

  while (occupied.has(candidate.getTime())) {
    candidate = incrementSlot(candidate);
  }

  return candidate;
}

module.exports = {
  WORKDAY_END_HOUR,
  WORKDAY_START_HOUR,
  getNextScheduleAt
};
