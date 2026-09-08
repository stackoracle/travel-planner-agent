import { TripForm } from "@/components/input/TripForm"
import { AuthNav } from "@/components/shared/AuthNav"
import { AuthGuard } from "@/components/shared/AuthGuard"

export default function PlanPage() {
  return (
    <AuthGuard>
      <main
        data-theme="trip-dark"
        className="relative min-h-screen flex flex-col md:flex-row"
        style={{ backgroundColor: "var(--tp-bg)", color: "var(--tp-text)" }}
      >
        {/* Left - brand panel */}
        <div
          className="relative flex flex-col justify-between overflow-hidden md:w-2/5 md:min-h-screen"
          style={{
            background: "linear-gradient(160deg, #0F2C59 0%, #2457B0 100%)",
            padding: "48px 40px",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              fontSize: 260,
              lineHeight: 1,
              opacity: 0.08,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-15deg)",
              pointerEvents: "none",
            }}
          >
            ✈
          </div>

          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "#FFFFFF",
              fontFamily: "var(--font-handwriting)",
              display: "inline-block",
              transform: "rotate(-2deg)",
              position: "relative",
            }}
          >
            ✈ TripAssist
          </p>

          <div style={{ position: "relative" }}>
            <h1
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.1,
              }}
            >
              My Trip
              <br />
              Schedule
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: 16,
                color: "#D9E4F5",
                fontFamily: "var(--font-dm-sans)",
                maxWidth: 360,
              }}
            >
              Powerful AI Trip Organizing Tool: Enjoy your most reasonable trip!
            </p>
          </div>

          <p
            style={{
              position: "relative",
              fontSize: 12,
              color: "#9FB6DE",
              fontFamily: "var(--font-dm-sans)",
              letterSpacing: "0.05em",
            }}
          >
            Five agents. One itinerary. Zero hassle.
          </p>
        </div>

        {/* Right - form panel */}
        <div className="relative flex-1 flex items-center justify-center px-6 py-6">
          <div className="absolute top-4 right-6">
            <AuthNav showPlanLink={false} />
          </div>

          <div
            className="tp-glass w-full max-w-xl"
            style={{
              backgroundColor: "var(--tp-surface-panel)",
              border: "1px solid var(--tp-border)",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
            }}
          >
            <TripForm />
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
