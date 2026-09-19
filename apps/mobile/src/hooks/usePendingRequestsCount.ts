import { useEffect, useState } from "react";
import { api } from "../api/client";
import { getChatSocket } from "../api/socket";

// Bug fix batch 3, section 7: pending Activity Requests badge — real-time via
// the chat socket's per-user room, with a 60s poll as a fallback, and a
// refetch whenever the caller says the count should reset (opening the list).
export function usePendingRequestsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    function refresh() {
      api.get<{ count: number }>("/activity-requests/pending/count").then((res) => {
        if (active) setCount(res.count);
      });
    }
    refresh();

    const interval = setInterval(refresh, 60_000);
    getChatSocket().then((socket) => {
      socket.on("requests:count", (n: number) => {
        if (active) setCount(n);
      });
    });

    return () => {
      active = false;
      clearInterval(interval);
      getChatSocket().then((socket) => socket.off("requests:count"));
    };
  }, []);

  return count;
}
