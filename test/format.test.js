const assert = require("node:assert/strict");
const {
  buildBudgetHashtag,
  buildBrandHashtag,
  buildChannelCaption,
  buildOriginHashtag
} = require("../src/format");

assert.equal(buildBrandHashtag("Mercedes-Benz G63 AMG"), "#MERCEDES");
assert.equal(buildBudgetHashtag(23500000), "#от_24_млн");
assert.equal(buildOriginHashtag("ЮЖНАЯ КОРЕЯ"), "#ЮЖНАЯ_КОРЕЯ");

const caption = buildChannelCaption({
  title: "Mercedes-Benz G63 AMG",
  productionYear: 2025,
  mileageKm: 4400,
  engineCc: 3982,
  driveType: "AWD",
  destinationCity: "Ростова/Москвы",
  originRegion: "США",
  note: "",
  calculation: {
    totalRub: 23500000
  }
});

assert.match(caption, /Mercedes-Benz G63 AMG/);
assert.match(caption, /▪️Пробег: 4\.400 км/);
assert.match(caption, /▪️Двигатель: 4\.0L/);
assert.match(caption, /#MERCEDES #от_24_млн #США/);
assert.match(caption, /<a href="https:\/\/t\.me\/ArtLine_Motors_Garik">Telegram<\/a>/);

console.log("format.test.js passed");
