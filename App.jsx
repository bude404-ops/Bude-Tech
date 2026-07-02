import { useMiosStream } from "./hooks/useMiosStream";
import AgentBrainView from "./components/AgentBrainView";

export default function App() {
  const data = useMiosStream();

  if (!data) return <div>Loading M-IOS...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>🌐 M-IOS CONTROL CENTER</h1>

      <h2>Decision: {data.decision}</h2>

      <h3>Market Personality</h3>
      <pre>{JSON.stringify(data.personality, null, 2)}</pre>

      <h3>Swarm Agents</h3>
      {data.swarm.map((a, i) => (
        <AgentBrainView key={i} agent={a} />
      ))}

      <h3>LLM Reasoning</h3>
      <pre>{data.llm.reasoning}</pre>
    </div>
  );
}
