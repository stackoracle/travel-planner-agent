import { TripForm } from "@/components/input/TripForm"

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <div className="mb-10 text-center">
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#E8652A",
            fontFamily: "var(--font-dm-sans)",
            marginBottom: 16,
          }}
        >
          ✈ Waypoint
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: "#1A1614",
            lineHeight: 1.15,
          }}
        >
          Where are you going?
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            color: "#6B6459",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          Five AI agents research your trip in parallel.
        </p>
      </div>

      <TripForm />
    </main>
  )
}
