"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTripStore } from "@/store/tripStore";
import { DayCard } from "@/components/cards/DayCard";

export function ItineraryPanel() {
  const result = useTripStore((s) => s.result);
  const itineraryStatus = useTripStore(
    (s) => s.agents["itinerary"]?.status ?? "idle",
  );
  const selectedDay = useTripStore((s) => s.selectedDay);
  const setSelectedDay = useTripStore((s) => s.setSelectedDay);

  const ready =
    itineraryStatus === "complete" && !!result && result.itinerary.length > 0;

  const [open, setOpen] = useState(false);

  // Pop open automatically once the itinerary finishes - same interaction
  // as clicking an agent card's Expand button, just triggered by completion
  // instead of a click. Adjusting state during render (React's documented
  // pattern for this) rather than in an effect, so a manual close isn't
  // immediately reopened on the next render while `ready` stays true.
  const [prevReady, setPrevReady] = useState(ready);
  if (ready !== prevReady) {
    setPrevReady(ready);
    if (ready) setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!ready) return null;

  return (
    <>
      {/* Reopen affordance - only needed once the auto-opened window is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 999,
            backgroundColor: "#8B3A8B",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          🗓 View itinerary
        </button>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                data-theme="trip-dark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center"
                style={{
                  zIndex: 9999,
                  backgroundColor: "var(--tp-overlay)",
                  backdropFilter: "blur(6px)",
                }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="tp-glass flex flex-col"
                  style={{
                    width: "min(1100px, 94vw)",
                    height: "82vh",
                    backgroundColor: "var(--tp-surface-panel)",
                    borderRadius: 12,
                    border: "2px solid #8B3A8B",
                    overflow: "hidden",
                    boxShadow: "var(--tp-modal-shadow)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{
                      borderBottom: "1px solid var(--tp-border)",
                      backgroundColor: "var(--tp-surface-2)",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: "var(--font-playfair)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: "var(--tp-text)",
                        }}
                      >
                        Your Itinerary
                      </p>
                      {result.total_estimated_cost && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--tp-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          Est. total · {result.total_estimated_cost}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      style={{
                        fontSize: 18,
                        color: "var(--tp-text-muted)",
                        lineHeight: 1,
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                      title="Close (Esc)"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Day cards */}
                  <div
                    className="flex-1 flex flex-wrap gap-4 overflow-y-auto px-6 py-5"
                    style={{ minHeight: 0 }}
                  >
                    {result.itinerary.map((day, i) => (
                      <motion.div
                        key={day.day}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.25 }}
                      >
                        <DayCard
                          plan={day}
                          selected={selectedDay === day.day}
                          onSelect={() =>
                            setSelectedDay(selectedDay === day.day ? null : day.day)
                          }
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
