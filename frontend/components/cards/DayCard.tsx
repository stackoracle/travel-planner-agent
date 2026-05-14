import type { DayPlan } from "@/lib/api"

interface Props {
  plan: DayPlan
  selected?: boolean
  onSelect?: () => void
}

export function DayCard({ plan, selected = false, onSelect }: Props) {
  const date = new Date(plan.date + "T00:00:00")
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })

  return (
    <div
      onClick={onSelect}
      style={{
        width: 240,
        flexShrink: 0,
        backgroundColor: selected ? "#FDF0EA" : "#F4F1EC",
        border: `1.5px solid ${selected ? "#E8652A" : "#E8E2D9"}`,
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected ? "0 0 0 3px #E8652A22" : "none",
        transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{
          borderBottom: "1px solid #E8E2D9",
          backgroundColor: selected ? "#FEF6F1" : "#FFFFFF",
          transition: "background-color 0.15s",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 16,
            fontWeight: 600,
            color: selected ? "#E8652A" : "#1A1614",
            transition: "color 0.15s",
          }}
        >
          Day {plan.day} · {dateStr}
        </p>
      </div>

      {/* Weather strip */}
      {plan.weather && (
        <div
          className="px-4 py-2"
          style={{
            borderBottom: "1px solid #E8E2D9",
            backgroundColor: selected ? "#FEF6F1" : "#FAFAF8",
          }}
        >
          <p style={{ fontSize: 12, color: "#6B6459" }}>🌡️ {plan.weather}</p>
        </div>
      )}

      {/* Sections */}
      <div className="px-4 py-3 space-y-3 flex-1">
        <Section emoji="☀️" label="Morning" text={plan.morning} />
        <Section emoji="🌤️" label="Afternoon" text={plan.afternoon} />
        <Section emoji="🌙" label="Evening" text={plan.evening} />
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2"
        style={{ borderTop: "1px solid #E8E2D9", backgroundColor: "#FFFFFF" }}
      >
        <p style={{ fontSize: 12, color: "#6B6459" }}>{plan.accommodation}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#E8652A" }}>
          {plan.estimated_cost}
        </p>
      </div>
    </div>
  )
}

function Section({
  emoji,
  label,
  text,
}: {
  emoji: string
  label: string
  text: string
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: "#A89E94",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {emoji} {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 13, color: "#1A1614", marginTop: 2, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  )
}
