const assert = require("node:assert/strict");
const { calculateLotTotals } = require("../src/calculator");

const result = calculateLotTotals({
  carPriceUsd: 48500,
  engineCc: 1998,
  horsepower: 249,
  productionYear: 2023,
  productionMonth: 7,
  usdRub: 92.5,
  eurRub: 101.3,
  dealerBuyoutUsd: 700,
  partnerFeeUsd: 3500,
  usInlandUsd: 1000,
  oceanUsd: 6500,
  brokerRussiaUsd: 1000,
  labRussiaRub: 80000,
  destinationDeliveryRub: 80000,
  managerCommissionRub: 150000,
  extraRub: 0,
  asOf: new Date(2026, 5, 16)
});

assert.equal(result.usdCosts.usdTotal, 61200);
assert.ok(result.rubCosts.dutyRub > 0);
assert.ok(result.rubCosts.utilizationRub > 0);
assert.ok(result.totalRub > result.rubCosts.dutyRub);

console.log("calculator.test.js passed");
