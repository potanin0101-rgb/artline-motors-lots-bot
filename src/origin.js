function getRegionStepText(step, originRegion) {
  const region = String(originRegion || "США").toUpperCase();

  const labels = {
    "США": {
      dealerBuyoutUsd: "Выкуп у дилера / продавца в США в USD.\nЕсли нет, отправь 0.",
      partnerFeeUsd: "Комиссия партнера в США в USD.\nМожно нажать 3500 или 4500.",
      usInlandUsd: "Доставка по США в USD.",
      oceanUsd: "Океан из США в USD.\nМожно выбрать 6500 или 7500."
    },
    "ОАЭ": {
      dealerBuyoutUsd: "Выкуп у дилера / продавца в ОАЭ в USD.\nЕсли нет, отправь 0.",
      partnerFeeUsd: "Комиссия партнера в ОАЭ в USD.\nМожно нажать 3500 или 4500.",
      usInlandUsd: "Доставка по ОАЭ в USD.",
      oceanUsd: "Фрахт из ОАЭ в USD."
    },
    "ЮЖНАЯ КОРЕЯ": {
      dealerBuyoutUsd: "Выкуп у дилера / продавца в Корее в USD.\nЕсли нет, отправь 0.",
      partnerFeeUsd: "Комиссия партнера в Корее в USD.\nМожно нажать 3500 или 4500.",
      usInlandUsd: "Доставка по Корее в USD.",
      oceanUsd: "Фрахт из Кореи в USD."
    },
    "КИТАЙ": {
      dealerBuyoutUsd: "Выкуп у дилера / продавца в Китае в USD.\nЕсли нет, отправь 0.",
      partnerFeeUsd: "Комиссия партнера в Китае в USD.\nМожно нажать 3500 или 4500.",
      usInlandUsd: "Доставка по Китаю в USD.",
      oceanUsd: "Фрахт из Китая в USD."
    },
    "ЕВРОПА": {
      dealerBuyoutUsd: "Выкуп у дилера / продавца в Европе в USD.\nЕсли нет, отправь 0.",
      partnerFeeUsd: "Комиссия партнера в Европе в USD.\nМожно нажать 3500 или 4500.",
      usInlandUsd: "Доставка по Европе в USD.",
      oceanUsd: "Логистика из Европы в USD."
    }
  };

  return (labels[region] || labels["США"])[step];
}

module.exports = {
  getRegionStepText
};
