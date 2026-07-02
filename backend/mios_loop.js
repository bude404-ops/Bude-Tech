import { getMarket } from "./market_data.js";
import { runSwarm } from "./swarm_engine.js";
import { runLLM } from "./llm_engine.js";
import { evolve } from "./evolution_engine.js";
import { updatePersonality } from "./personality_engine.js";

let state = {
  genomes: [],
  agents: [],
  personality: {
    btc: { aggression: 0.5, trend: 0.5, panic: 0.3 }
  }
};

export async function miosLoop() {
  const market = await getMarket();

  // 🌐 update market personality
  state.personality.btc = updatePersonality(state.personality.btc, market);

  // 🧠 swarm brain
  const swarm = runSwarm(state.agents, market, state.genomes);

  // 🤖 LLM reasoning layer
  const llm = await runLLM(swarm, market, state.personality);

  // 🎯 decision
  const decision = llm.bias === "LONG"
    ? "LONG"
    : llm.bias === "SHORT"
      ? "SHORT"
      : "NO TRADE";

  // 🧬 evolution
  state.genomes = evolve(state.genomes, llm);

  return {
    market,
    swarm,
    llm,
    decision,
    personality: state.personality.btc
  };
}
