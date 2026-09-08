"use client";

import { useEffect, useRef, useState } from "react";
import { useTripStore } from "@/store/tripStore";
import { useAuthStore } from "@/store/authStore";

type L = typeof import("leaflet");

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function geocode(
  q: string,
  token: string | null,
): Promise<{ lat: string; lon: string } | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(q)}`, { headers });
  if (!r.ok) return null;
  const data = (await r.json()) as Array<{ lat: string; lon: string }>;
  return data[0] ?? null;
}

// Sample `steps` points along a quadratic bezier arc between p1 and p2.
// The control point is pushed perpendicular to the midpoint so the line curves.
function buildBezierArc(
  p1: [number, number],
  p2: [number, number],
  steps = 48,
  curvature = 0.22,
): [number, number][] {
  const [la1, ln1] = p1;
  const [la2, ln2] = p2;
  const mla = (la1 + la2) / 2;
  const mln = (ln1 + ln2) / 2;
  // Perpendicular offset in lat/lng space (fine for city-scale distances)
  const cla = mla - (ln2 - ln1) * curvature;
  const cln = mln + (la2 - la1) * curvature;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * la1 + 2 * u * t * cla + t * t * la2,
      u * u * ln1 + 2 * u * t * cln + t * t * ln2,
    ]);
  }
  return pts;
}

// Inject an SVG arrowhead <marker> into Leaflet's overlay SVG layer (once),
// then wire stroke-dashoffset animation on the path element.
function animatePath(pathEl: Element, color: string) {
  const svg = pathEl.closest("svg");
  if (!svg) return;

  if (!svg.querySelector("#wp-arrow")) {
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", "wp-arrow");
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "5.5");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    const tip = document.createElementNS(ns, "path");
    tip.setAttribute("d", "M0,0 L0,7 L7,3.5 z");
    tip.setAttribute("fill", color);
    marker.appendChild(tip);
    defs.appendChild(marker);
    svg.insertBefore(defs, svg.firstChild);
  }

  (pathEl as SVGElement).setAttribute("marker-end", "url(#wp-arrow)");

  const geo = pathEl as SVGGeometryElement;
  const len = geo.getTotalLength();
  const style = (pathEl as SVGElement).style;
  style.strokeDasharray = String(len);
  style.strokeDashoffset = String(len);
  style.transition = "none";
  pathEl.getBoundingClientRect(); // force reflow so the initial offset registers
  style.transition = "stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)";
  style.strokeDashoffset = "0";
}

interface Props {
  defaultQuery: string;
  originQuery?: string;
}

export function MapPanel({ defaultQuery, originQuery }: Props) {
  const result = useTripStore((s) => s.result);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const token = useAuthStore((s) => s.token);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const destMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const originMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const routeLineRef = useRef<import("leaflet").Polyline | null>(null);
  const destCoordsRef = useRef<[number, number] | null>(null);
  const originCoordsRef = useRef<[number, number] | null>(null);
  const stopoverMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const stopoverCoordsRef = useRef<[number, number] | null>(null);
  const [leaflet, setLeaflet] = useState<L | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: string; lon: string } | null>(
    null,
  );

  const destination = result?.map_query ?? defaultQuery;
  const origin = originQuery ?? "";
  const stopover = result?.stopover ?? "";

  // Ask the browser for the user's real location once, up front - this is
  // what the current-location pin uses, regardless of the typed origin field.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCurrentPos({
          lat: String(pos.coords.latitude),
          lon: String(pos.coords.longitude),
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // Re-centers on the cached origin + destination pins - used both after they
  // first geocode and whenever a selected day is cleared, so the map never
  // has to re-geocode just to restore the overview.
  function fitOverview() {
    if (!mapRef.current || !leaflet || !destCoordsRef.current) return;
    const bounds: [number, number][] = [destCoordsRef.current];
    if (originCoordsRef.current) bounds.push(originCoordsRef.current);
    if (stopoverCoordsRef.current) bounds.push(stopoverCoordsRef.current);

    mapRef.current.invalidateSize();
    if (bounds.length > 1) {
      mapRef.current.fitBounds(leaflet.latLngBounds(bounds), {
        padding: [60, 60],
      });
    } else {
      mapRef.current.setView(destCoordsRef.current, 12);
    }
  }

  // Load Leaflet once (browser only)
  useEffect(() => {
    import("leaflet").then(setLeaflet);
  }, []);

  // Initialise map when Leaflet is ready
  useEffect(() => {
    if (!leaflet || !containerRef.current || mapRef.current) return;

    const map = leaflet.map(containerRef.current, {
      center: [50.075, 14.438],
      zoom: 11,
      zoomControl: true,
    });

    leaflet
      .tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ",
          maxZoom: 19,
        },
      )
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leaflet]);

  // Geocode origin + destination → pins plus an animated route line between them
  useEffect(() => {
    if (!leaflet || !mapRef.current || !destination) return;
    let cancelled = false;

    Promise.all([
      geocode(destination, token).catch(() => null),
      currentPos
        ? Promise.resolve(currentPos)
        : origin
          ? geocode(origin, token).catch(() => null)
          : Promise.resolve(null),
      stopover ? geocode(stopover, token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([destHit, originHit, stopoverHit]) => {
        if (cancelled || !destHit || !mapRef.current || !leaflet) return;
        const destLat = parseFloat(destHit.lat);
        const destLon = parseFloat(destHit.lon);
        destCoordsRef.current = [destLat, destLon];

        destMarkerRef.current?.remove();
        const destIcon = leaflet.divIcon({
          html: `<div style="background:#2457B0;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35)">📍</div>`,
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        destMarkerRef.current = leaflet
          .marker([destLat, destLon], { icon: destIcon })
          .bindPopup(`<strong>${destination}</strong>`)
          .addTo(mapRef.current);

        routeLineRef.current?.remove();
        routeLineRef.current = null;
        originMarkerRef.current?.remove();
        originMarkerRef.current = null;
        stopoverMarkerRef.current?.remove();
        stopoverMarkerRef.current = null;

        originCoordsRef.current = null;
        stopoverCoordsRef.current = null;

        if (originHit) {
          const originLat = parseFloat(originHit.lat);
          const originLon = parseFloat(originHit.lon);
          originCoordsRef.current = [originLat, originLon];
          const isCurrentPos = originHit === currentPos;

          const originIcon = leaflet.divIcon({
            html: `<div style="background:#DC2626;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35)">${isCurrentPos ? "📍" : "✈️"}</div>`,
            className: "",
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          originMarkerRef.current = leaflet
            .marker([originLat, originLon], { icon: originIcon })
            .bindPopup(`<strong>${isCurrentPos ? "Your location" : origin}</strong>`)
            .addTo(mapRef.current);

          let arcPts: [number, number][];
          if (stopoverHit) {
            const stopLat = parseFloat(stopoverHit.lat);
            const stopLon = parseFloat(stopoverHit.lon);
            stopoverCoordsRef.current = [stopLat, stopLon];

            const stopIcon = leaflet.divIcon({
              html: `<div style="background:#8B3A8B;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35)">✈️</div>`,
              className: "",
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });
            stopoverMarkerRef.current = leaflet
              .marker([stopLat, stopLon], { icon: stopIcon })
              .bindPopup(`<strong>Layover: ${stopover}</strong>`)
              .addTo(mapRef.current);

            const seg1 = buildBezierArc([originLat, originLon], [stopLat, stopLon]);
            const seg2 = buildBezierArc([stopLat, stopLon], [destLat, destLon]);
            arcPts = [...seg1, ...seg2.slice(1)];
          } else {
            arcPts = buildBezierArc([originLat, originLon], [destLat, destLon]);
          }

          const line = leaflet
            .polyline(arcPts, { color: "#DC2626", weight: 3, opacity: 0.85 })
            .addTo(mapRef.current);
          routeLineRef.current = line;

          requestAnimationFrame(() => {
            const el = line.getElement();
            if (el) animatePath(el, "#DC2626");
          });
        }

        if (!selectedDay) fitOverview();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // selectedDay intentionally omitted - handled via ref guard above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, destination, origin, currentPos, stopover]);

  // Show numbered markers + route when a day is selected
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylineRef.current?.remove();
    polylineRef.current = null;

    if (selectedDay === null) {
      const days = (result?.itinerary ?? [])
        .map((d) => ({ day: d.day, location: d.locations?.[0] }))
        .filter(
          (d): d is { day: number; location: string } => !!d.location,
        );

      if (!days.length) {
        fitOverview();
        return;
      }

      Promise.all(
        days.map(({ day, location }) =>
          geocode(`${location}, ${destination}`, token)
            .then((hit) =>
              hit
                ? { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), day }
                : null,
            )
            .catch(() => null),
        ),
      ).then((results) => {
        if (!mapRef.current || !leaflet) return;
        const valid = results.filter(Boolean) as {
          lat: number;
          lon: number;
          day: number;
        }[];
        if (!valid.length) {
          fitOverview();
          return;
        }

        const coords: [number, number][] = [];
        valid.forEach(({ lat, lon, day }) => {
          const icon = leaflet.divIcon({
            html: `<div style="background:#8B3A8B;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${day}</div>`,
            className: "",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const marker = leaflet
            .marker([lat, lon], { icon })
            .bindPopup(`<strong>Day ${day}</strong>`)
            .addTo(mapRef.current!);
          markersRef.current.push(marker);
          coords.push([lat, lon]);
        });

        if (coords.length > 1) {
          const arcPts: [number, number][] = [coords[0]];
          for (let i = 0; i < coords.length - 1; i++) {
            arcPts.push(...buildBezierArc(coords[i], coords[i + 1]).slice(1));
          }
          const line = leaflet
            .polyline(arcPts, {
              color: "#8B3A8B",
              weight: 2.5,
              opacity: 0.7,
              dashArray: "6 6",
            })
            .addTo(mapRef.current!);
          polylineRef.current = line;
        }

        const boundsCoords: [number, number][] = [...coords];
        if (destCoordsRef.current) boundsCoords.push(destCoordsRef.current);
        if (originCoordsRef.current) boundsCoords.push(originCoordsRef.current);

        mapRef.current!.invalidateSize();
        mapRef.current!.fitBounds(leaflet.latLngBounds(boundsCoords), {
          padding: [50, 50],
        });
      });
      return;
    }

    const dayPlan = result?.itinerary.find((d) => d.day === selectedDay);
    if (!dayPlan?.locations?.length) {
      fitOverview();
      return;
    }

    const labels = ["☀️", "🌤️", "🌙"];
    const colors = ["#E8652A", "#2A6EE8", "#8B3A8B"];

    Promise.all(
      dayPlan.locations.map((loc, i) =>
        geocode(`${loc}, ${destination}`, token)
          .then((hit) =>
            hit
              ? {
                  lat: parseFloat(hit.lat),
                  lon: parseFloat(hit.lon),
                  emoji: labels[i] ?? String(i + 1),
                  color: colors[i] ?? "#E8652A",
                  label: loc,
                  index: i + 1,
                }
              : null,
          )
          .catch(() => null),
      ),
    ).then((results) => {
      if (!mapRef.current || !leaflet) return;
      const valid = results.filter(Boolean) as {
        lat: number;
        lon: number;
        emoji: string;
        color: string;
        label: string;
        index: number;
      }[];
      if (!valid.length) return;

      const coords: [number, number][] = [];

      valid.forEach(({ lat, lon, emoji, color, label, index }) => {
        const icon = leaflet.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:2.5px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)">${emoji}</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = leaflet
          .marker([lat, lon], { icon })
          .bindPopup(`<strong>${index}. ${label}</strong>`)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
        coords.push([lat, lon]);
      });

      if (coords.length > 1) {
        // Chain bezier arcs between consecutive stops
        const arcPts: [number, number][] = [coords[0]];
        for (let i = 0; i < coords.length - 1; i++) {
          arcPts.push(...buildBezierArc(coords[i], coords[i + 1]).slice(1));
        }

        const line = leaflet
          .polyline(arcPts, { color: "#2457B0", weight: 3, opacity: 0.85 })
          .addTo(mapRef.current!);

        polylineRef.current = line;

        // Wire animation after Leaflet has rendered the SVG path
        requestAnimationFrame(() => {
          const el = line.getElement();
          if (el) animatePath(el, "#2457B0");
        });
      }

      // Include destination pin in bounds so it stays visible alongside day stops
      const boundsCoords: [number, number][] = [...coords];
      if (destMarkerRef.current) {
        const p = destMarkerRef.current.getLatLng();
        boundsCoords.push([p.lat, p.lng]);
      }

      // invalidateSize first so Leaflet knows its true height after the
      // itinerary panel has taken space in the flex layout
      mapRef.current!.invalidateSize();
      mapRef.current!.fitBounds(leaflet.latLngBounds(boundsCoords), {
        padding: [50, 50],
      });
    });
    // fitOverview intentionally omitted - it only reads refs/props current
    // at call time, so including it would just re-run this effect every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, selectedDay, result, destination, token]);

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: "#E8E2D9" }}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {!leaflet && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ color: "#A89E94" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
            <p style={{ fontSize: 13 }}>Loading map…</p>
            <p
              style={{
                fontSize: 12,
                marginTop: 4,
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              {destination}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
