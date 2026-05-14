"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTripStore } from "@/store/tripStore";
import { DayCard } from "@/components/cards/DayCard";

const HANDLE_H = 6;
const HEADER_H = 52;
const MIN_CARDS_H = 100;
const DEFAULT_H = 320;

export function ItineraryPanel() {
  const result = useTripStore((s) => s.result);
  const itineraryStatus = useTripStore(
    (s) => s.agents["itinerary"]?.status ?? "idle",
  );
  const selectedDay = useTripStore((s) => s.selectedDay);
  const setSelectedDay = useTripStore((s) => s.setSelectedDay);

  const show =
    itineraryStatus === "complete" && result && result.itinerary.length > 0;

  const [panelH, setPanelH] = useState(DEFAULT_H);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true;
    setIsDragging(true);
    startY.current = e.clientY;
    startH.current = panelH;
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - e.clientY;
      setPanelH(
        Math.min(
          600,
          Math.max(MIN_CARDS_H + HANDLE_H + HEADER_H, startH.current + delta),
        ),
      );
    };
    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const totalH = collapsed ? HANDLE_H + HEADER_H : panelH;
  const cardsH = panelH - HANDLE_H - HEADER_H;

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
            height: totalH,
            transition: isDragging ? "none" : "height 0.2s ease",
            overflow: "hidden",
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            style={{
              height: HANDLE_H,
              cursor: "row-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 36,
                height: 3,
                borderRadius: 2,
                backgroundColor: isDragging ? "#E8652A" : "#D4CFC8",
                transition: "background-color 0.15s",
              }}
            />
          </div>

          {/* Header */}
          <div
            className="px-6 flex items-center justify-between"
            style={{
              height: HEADER_H,
              borderBottom: collapsed ? "none" : "1px solid #E8E2D9",
            }}
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
              {!collapsed && result!.total_estimated_cost && (
                <p style={{ fontSize: 12, color: "#A89E94", marginTop: 1 }}>
                  Est. total · {result!.total_estimated_cost}
                </p>
              )}
            </div>

            <button
              onClick={() => setCollapsed((c) => !c)}
              style={{
                fontSize: 13,
                color: "#A89E94",
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #E8E2D9",
                backgroundColor: "#FFFFFF",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              {collapsed ? "▲ Expand" : "▼ Collapse"}
            </button>
          </div>

          {/* Day cards - flex wrap */}
          {!collapsed && (
            <div
              className="flex flex-wrap gap-4 overflow-y-auto px-6 py-4"
              style={{ height: cardsH }}
            >
              {result!.itinerary.map((day, i) => (
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
