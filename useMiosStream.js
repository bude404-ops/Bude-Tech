import { useEffect, useState } from "react";

export function useMiosStream() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("wss://mios-backend.onrender.com"));

    ws.onmessage = (msg) => {
      setData(JSON.parse(msg.data));
    };

    return () => ws.close();
  }, []);

  return data;
}
