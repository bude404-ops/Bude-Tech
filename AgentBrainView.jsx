export default function AgentBrainView({ agent }) {
  return (
    <div style={{
      border: "1px solid #333",
      margin: 10,
      padding: 10
    }}>
      <h4>{agent.name}</h4>
      <p>Bias: {agent.bias}</p>
      <p>Confidence: {agent.confidence}</p>
    </div>
  );
}
