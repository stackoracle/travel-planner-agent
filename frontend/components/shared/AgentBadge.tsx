const AGENT_COLORS: Record<string, string> = {
  destination: "#E8652A",
  flight: "#2A6EE8",
  hotel: "#2AAE8C",
  weather: "#C49A00",
  itinerary: "#8B3A8B",
}

const AGENT_LABELS: Record<string, string> = {
  destination: "Destination",
  flight: "Flights",
  hotel: "Hotels",
  weather: "Weather",
  itinerary: "Itinerary",
}

interface Props {
  agent: string
  className?: string
}

export function AgentBadge({ agent, className }: Props) {
  const color = AGENT_COLORS[agent] ?? "#A89E94"
  return (
    <span
      className={className}
      style={{
        color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {AGENT_LABELS[agent] ?? agent}
    </span>
  )
}
