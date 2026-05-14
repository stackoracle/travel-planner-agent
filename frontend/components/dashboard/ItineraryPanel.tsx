"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useTripStore } from "@/store/tripStore"
import { DayCard } from "@/components/cards/DayCard"

export function ItineraryPanel() {
  const result = useTripStore((s) => s.result)
  const itineraryStatus = useTripStore(
    (s) => s.agents["itinerary"]?.status ?? "idle"
  )

  const show = itineraryStatus === "complete" && result && result.itinerary.length > 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            borderTop: "1px solid #E8E2D9",
            backgroundColor: "#FAFAF8",
            flexShrink: 0,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #E8E2D9" }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1A1614",
                }}
              >
                Your Itinerary
              </p>
              {result!.total_estimated_cost && (
                <p style={{ fontSize: 12, color: "#A89E94", marginTop: 2 }}>
                  Est. total · {result!.total_estimated_cost}
                </p>
              )}
            </div>
          </div>

          {/* Day cards — horizontal scroll */}
          <div
            className="flex gap-4 overflow-x-auto px-6 py-4"
            style={{ scrollbarWidth: "thin", height: 296 }}
          >
            {result!.itinerary.map((day, i) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
              >
                <DayCard plan={day} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
