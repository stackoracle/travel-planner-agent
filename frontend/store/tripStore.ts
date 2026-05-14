"use client"

import { create } from "zustand"
import type { TripRequest, TripResult } from "@/lib/api"

export type AgentStatus = "idle" | "thinking" | "active" | "complete" | "error"

export interface AgentState {
  status: AgentStatus
  output: string
  toolCalls: string[]
  tokenCount: number
  startedAt: number | null
}

export interface LogEntry {
  time: string
  agent: string
  type: string
  message: string
}

const AGENTS = ["destination", "flight", "hotel", "weather", "itinerary"]

const defaultAgentState = (): AgentState => ({
  status: "idle",
  output: "",
  toolCalls: [],
  tokenCount: 0,
  startedAt: null,
})

interface Store {
  request: TripRequest | null
  jobId: string | null
  isRunning: boolean
  agents: Record<string, AgentState>
  logs: LogEntry[]
  result: TripResult | null
  setRequest: (r: TripRequest) => void
  setJobId: (id: string) => void
  setRunning: (running: boolean) => void
  appendToken: (agent: string, token: string) => void
  setStatus: (agent: string, status: AgentStatus) => void
  addToolCall: (agent: string, call: string) => void
  addLog: (entry: LogEntry) => void
  setResult: (result: TripResult) => void
  reset: () => void
}

export const useTripStore = create<Store>((set) => ({
  request: null,
  jobId: null,
  isRunning: false,
  agents: Object.fromEntries(AGENTS.map((a) => [a, defaultAgentState()])),
  logs: [],
  result: null,

  setRequest: (r) => set({ request: r }),
  setJobId: (id) => set({ jobId: id }),
  setRunning: (running) => set({ isRunning: running }),

  appendToken: (agent, token) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agent]: {
          ...(s.agents[agent] ?? defaultAgentState()),
          output: (s.agents[agent]?.output ?? "") + token,
          tokenCount: (s.agents[agent]?.tokenCount ?? 0) + 1,
          status: "active" as AgentStatus,
        },
      },
    })),

  setStatus: (agent, status) =>
    set((s) => {
      const cur = s.agents[agent] ?? defaultAgentState()
      return {
        agents: {
          ...s.agents,
          [agent]: {
            ...cur,
            status,
            startedAt:
              status === "thinking" && cur.startedAt === null
                ? Date.now()
                : cur.startedAt,
          },
        },
      }
    }),

  addToolCall: (agent, call) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agent]: {
          ...(s.agents[agent] ?? defaultAgentState()),
          toolCalls: [...(s.agents[agent]?.toolCalls ?? []), call],
        },
      },
    })),

  addLog: (entry) => set((s) => ({ logs: [...s.logs, entry] })),

  setResult: (result) => set({ result }),

  reset: () =>
    set({
      request: null,
      jobId: null,
      isRunning: false,
      agents: Object.fromEntries(AGENTS.map((a) => [a, defaultAgentState()])),
      logs: [],
      result: null,
    }),
}))
