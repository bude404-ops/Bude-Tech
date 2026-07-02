export async function getMarket() {
  return {
    price: 42000 + Math.random() * 500,
    volatility: Math.random(),
    trendStrength: Math.random(),
    volumeSpike: Math.random() > 0.7
  };
}
