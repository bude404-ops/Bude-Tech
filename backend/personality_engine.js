export function updatePersonality(p, market) {
  p.aggression += market.volumeSpike ? 0.05 : -0.01;
  p.trend += market.trendStrength * 0.02;
  p.panic += market.volatility * 0.03;

  p.aggression = Math.max(0, Math.min(1, p.aggression));
  p.trend = Math.max(0, Math.min(1, p.trend));
  p.panic = Math.max(0, Math.min(1, p.panic));

  return p;
}
