import type { DayPlan } from "@/lib/api"

interface Props {
  plan: DayPlan
}

export function DayCard({ plan }: Props) {
  const date = new Date(plan.date + "T00:00:00")
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        backgroundColor: "#F4F1EC",
        border: "1px solid #E8E2D9",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid #E8E2D9", backgroundColor: "#FFFFFF" }}
      >
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 16,
            fontWeight: 600,
            color: "#1A1614",
          }}
        >
          Day {plan.day} · {dateStr}
        </p>
      </div>

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
      <p style={{ fontSize: 11, color: "#A89E94", fontWeight: 600, letterSpacing: "0.04em" }}>
        {emoji} {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 13, color: "#1A1614", marginTop: 2, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  )
}
