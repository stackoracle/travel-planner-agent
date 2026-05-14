interface Props {
  summary: string
  budget: string
}

export function HotelCard({ summary, budget }: Props) {
  return (
    <div
      style={{
        backgroundColor: "#F4F1EC",
        border: "1px solid #E8E2D9",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 16 }}>🏨</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#2AAE8C",
          }}
        >
          {budget} · Hotels
        </span>
      </div>
      <p style={{ fontSize: 13, color: "#6B6459", lineHeight: 1.5 }}>
        {summary.slice(0, 200)}
        {summary.length > 200 ? "…" : ""}
      </p>
    </div>
  )
}
