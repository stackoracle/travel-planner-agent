"use client";

import { useEffect, useRef } from "react";
import { useTripStore } from "@/store/tripStore";
import { getResult } from "@/lib/api";

interface AgentEvent {
  agent: string;
  type:
    | "thinking"
    | "token"
    | "tool_call"
    | "tool_result"
    | "complete"
    | "error"
    | "done";
  data: string;
}

function now(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function useAgentStream(jobId: string | null, token: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const appendToken = useTripStore((s) => s.appendToken);
  const setOutput = useTripStore((s) => s.setOutput);
  const setStatus = useTripStore((s) => s.setStatus);
  const addToolCall = useTripStore((s) => s.addToolCall);
  const addLog = useTripStore((s) => s.addLog);
  const setResult = useTripStore((s) => s.setResult);
  const setRunning = useTripStore((s) => s.setRunning);

  useEffect(() => {
    if (!jobId || !token) return;

    const connect = () => {
      // EventSource can't set an Authorization header, so the token
      // travels as a query param instead - the backend validates it.
      const es = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/stream/${jobId}?token=${encodeURIComponent(token)}`,
      );
      esRef.current = es;

      es.onmessage = async (e: MessageEvent<string>) => {
        const event = JSON.parse(e.data) as AgentEvent;
        const { agent, type, data } = event;

        switch (type) {
          case "thinking":
            setStatus(agent, "thinking");
            addLog({ time: now(), agent, type, message: data });
            break;
          case "token":
            appendToken(agent, data);
            break;
          case "tool_call":
            addToolCall(agent, data);
            addLog({ time: now(), agent, type, message: data });
            break;
          case "tool_result":
            addLog({ time: now(), agent, type, message: data });
            break;
          case "complete":
            // data is the full accumulated body - trust it over the tokens
            // we assembled, which may have gaps after a reconnect or be
            // absent entirely when a finished job is replayed.
            if (data) setOutput(agent, data);
            setStatus(agent, "complete");
            break;
          case "error":
            setStatus(agent, "error");
            addLog({ time: now(), agent, type, message: data });
            break;
          case "done":
            es.close();
            setRunning(false);
            try {
              const result = await getResult(jobId, token);
              setResult(result);
            } catch {
              // result fetch failed - stream is still done
            }
            break;
        }
      };

      es.onerror = () => {
        es.close();
        if (retriesRef.current < 3) {
          retriesRef.current++;
          const delay = Math.pow(2, retriesRef.current) * 1000;
          setTimeout(connect, delay);
        }
      };
    };

    setRunning(true);
    connect();

    return () => {
      esRef.current?.close();
    };
  }, [jobId, token]); // eslint-disable-line react-hooks/exhaustive-deps
}
