const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "☀️", 2: "🌤️",
  3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌧️", 53: "🌧️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "🌨️", 77: "🌨️",
  80: "🌦️", 81: "🌦️", 82: "🌦️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
}

function wmoEmoji(code: number): string {
  return WMO_EMOJI[code] ?? "🌡️"
}

interface DailyForecast {
  time: string[]
  weathercode: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
}

interface Props {
  daily: DailyForecast
}

export function WeatherCard({ daily }: Props) {
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {daily.time.slice(0, 7).map((date, i) => {
        const d = new Date(date + "T00:00:00")
        const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        return (
          <div
            key={date}
            style={{
              textAlign: "center",
              minWidth: 48,
              backgroundColor: "#F4F1EC",
              borderRadius: 6,
              padding: "6px 8px",
              border: "1px solid #E8E2D9",
            }}
          >
            <p style={{ fontSize: 10, color: "#A89E94" }}>{label}</p>
            <p style={{ fontSize: 18, lineHeight: 1.4 }}>{wmoEmoji(daily.weathercode[i] ?? 0)}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1614" }}>
              {Math.round(daily.temperature_2m_max[i] ?? 0)}°
            </p>
            <p style={{ fontSize: 11, color: "#6B6459" }}>
              {Math.round(daily.temperature_2m_min[i] ?? 0)}°
            </p>
          </div>
        )
      })}
    </div>
  )
}
