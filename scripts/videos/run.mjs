// Records the single portfolio demo video for TripAssist against local dev
// instances of the frontend (Next.js, :3000) and backend (FastAPI, :8000).
//
// This recorder was originally built for a different project (an "Agentic
// RAG" document Q&A tool) and reused a document-upload + evaluation-run
// story that doesn't exist here. The beats below are TripAssist's own:
// sign up -> empty dashboard -> fill the trip form -> watch five agents
// stream in parallel -> itinerary reveal -> drill into a day -> trip saved
// to history. The supporting libs (human-shaped real OS input, the desktop
// capture, the caption overlay) are generic and unchanged; lib/upload.mjs
// and fixtures/ are leftover from the old app's file-upload flow and are not
// used here since TripAssist has no file uploads.
//
// Captures the real desktop (ffmpeg gdigrab) rather than Playwright's own
// video recorder so the fullscreen, chrome-less browser window - and the
// real Windows mouse pointer - are exactly what ends up in frame. Mouse and
// keyboard input is real OS input (lib/os-input.mjs), driven along eased,
// human-shaped paths (lib/human.mjs), not Playwright's synthetic input:
// page.mouse dispatches straight into the renderer, so on a screen capture
// the pointer would never actually move while the page reacts on its own.
//
//   node run.mjs                 dry run, no capture, useful while editing beats
//   node run.mjs --record        capture to ../../demo/video/tripassist-demo.mp4

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installOverlay, setCaption } from "./lib/overlay.mjs";
import { OsInput } from "./lib/os-input.mjs";
import { useInput, calibrate, humanClick, humanType, keepAwake, pause, readingPause } from "./lib/human.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
// Must be "localhost", not "127.0.0.1" - the backend's CORS allowlist
// (main.py) only permits http://localhost:3000, and the two hosts are
// different origins to the browser even though they resolve the same way.
const FRONTEND_URL = "http://localhost:3000";

// A fresh, unique account every run - the "empty trip history" beat on the
// dashboard only reads honestly for an account that has genuinely never
// planned a trip before.
const RUN_STAMP = Date.now();
const ACCOUNT = {
  name: "Demo Traveller",
  // Pydantic's EmailStr rejects ".local" as an invalid TLD - needs to look
  // like a real address even though nothing is ever sent to it.
  email: `demo.${RUN_STAMP}@tripassist-demo.com`,
  password: "DemoPass123!",
};

const TRIP = {
  destination: "Lisbon, Portugal",
  originTyped: "Amsterdam",
  originMatch: "Amsterdam, Netherlands",
  departure: futureIsoDate(45),
  return: futureIsoDate(51),
  style: "Foodie",
  budget: "Mid-range",
  currency: "€",
  payment: "Credit card",
};

const OUTPUT_PATH = path.join(REPO_ROOT, "demo", "video", "tripassist-demo.mp4");

const SCREEN = { width: 1920, height: 1080 };
const RECORD = process.argv.includes("--record");

function futureIsoDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

class ScreenRecorder {
  constructor(outputPath) {
    this.outputPath = outputPath;
    this.proc = null;
  }

  async start() {
    this.proc = spawn(
      "ffmpeg",
      [
        "-y",
        "-f", "gdigrab",
        "-framerate", "25",
        "-draw_mouse", "1",
        "-i", "desktop",
        "-video_size", `${SCREEN.width}x${SCREEN.height}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-crf", "20",
        this.outputPath,
      ],
      { stdio: ["pipe", "ignore", "pipe"] }
    );
    this.stderr = "";
    this.proc.stderr.setEncoding("utf-8");
    this.proc.stderr.on("data", (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-4000);
    });
    this.exited = new Promise((resolve) => this.proc.on("exit", resolve));
    await pause(1000);
  }

  async stop() {
    if (!this.proc) return;
    this.proc.stdin.write("q");
    const code = await this.exited;
    this.proc = null;
    if (code !== 0) {
      throw new Error(`ffmpeg exited with code ${code}:\n${this.stderr.slice(-1500)}`);
    }
  }
}

async function beat(page, text, action, { holdMs = 1800, title = false } = {}) {
  await setCaption(page, text, { title });
  if (action) await action();
  await readingPause(holdMs);
}

/** Find one agent's Live Feed card by its exact badge label ("Weather",
 * "Destination", "Flights", "Hotels", "Itinerary") - not by hasText on the
 * whole card, since a card's own streamed prose can easily mention another
 * agent's label as a plain word (e.g. the destination agent's write-up
 * mentioning "hotel" areas). Matching the badge span's exact text instead
 * anchors on markup, not on whatever the model happens to write. */
function agentCardLocator(page, label) {
  const badge = page.locator("span", { hasText: new RegExp(`^${label}$`) });
  return page.locator(".tp-glass").filter({ has: badge }).first();
}

/** Open one agent's fullscreen card (tool calls + full streamed markdown),
 * hold on it while the caption reads, then close it. The Expand button only
 * renders once the card has some output, so this waits for it rather than
 * racing the stream. */
async function expandAgentCard(page, label, caption, { holdMs = 3200 } = {}) {
  await beat(
    page,
    caption,
    async () => {
      const expandBtn = agentCardLocator(page, label).locator('button[title="Expand"]');
      await waitVisible(page, expandBtn, { timeoutMs: 60000 });
      await humanClick(page, expandBtn);
    },
    { holdMs }
  );
  await humanClick(page, page.locator('button[title="Close (Esc)"]'));
  await pause(400);
}

/** Poll a locator's visibility without hanging forever on content that only
 * exists once background agent work (real LLM + web search calls) finishes.
 * A tiny cursor twitch every few seconds keeps Windows from idle-locking the
 * display during an unattended multi-minute wait mid-recording. */
async function waitVisible(page, locator, { timeoutMs, pollMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await locator.first().isVisible().catch(() => false)) return;
    if (Date.now() > deadline) throw new Error("waitVisible: timed out waiting for element to appear.");
    await keepAwake();
    await pause(pollMs);
  }
}

async function main() {
  if (RECORD) await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  // channel: "chrome" uses the system-installed, signed Chrome rather than
  // Playwright's own downloaded Chromium build. On a machine with an
  // Application Control / WDAC-style policy, the downloaded build can be
  // blocked from opening a window at all (it still launches headless, since
  // that doesn't create a window) while the already-trusted system browser
  // is unaffected.
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--start-maximized", "--disable-infobars", "--hide-crash-restore-bubble"],
  });
  browser.on("disconnected", () => console.error("  ! browser DISCONNECTED event fired"));
  const context = await browser.newContext({ viewport: null });
  await installOverlay(context);
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.on("crash", () => console.error("  ! page CRASH event fired"));
  page.on("close", () => console.error("  ! page CLOSE event fired"));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`  ! page console error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.error(`  ! page pageerror: ${err.message}`));

  // Maximized, not true fullscreen: the capture is the whole desktop either
  // way (ffmpeg gdigrab -i desktop), and forcing CDP fullscreen was a likely
  // source of Chromium disconnects seen recording this way - a maximized
  // window is a plainer, more stable state, and calibrate() below measures
  // whatever chrome/tab-strip offset it leaves rather than assuming zero.
  const session = await context.newCDPSession(page);
  const { windowId } = await session.send("Browser.getWindowForTarget");
  await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "maximized" } });
  const { bounds } = await session.send("Browser.getWindowBounds", { windowId });
  if (bounds.windowState !== "maximized") {
    throw new Error(`Browser window did not reach the maximized state (got "${bounds.windowState}").`);
  }
  console.log("  browser window state: maximized");
  await page.waitForTimeout(1200);

  const input = new OsInput();
  await input.start();
  useInput(input);
  await input.focus();
  await calibrate(page);

  const recorder = RECORD ? new ScreenRecorder(OUTPUT_PATH) : null;
  if (recorder) await recorder.start();

  try {
    await beat(
      page,
      "TripAssist — a multi-agent AI system. Four specialist agents research your trip in parallel; a fifth synthesizes everything into one itinerary.",
      async () => {
        await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
      },
      { holdMs: 3800, title: true }
    );

    await beat(page, "New here — every trip is tied to an account, so trip history and total spend are tracked over time.", async () => {
      await Promise.all([
        page.waitForURL(/\/signup/, { timeout: 15000 }),
        humanClick(page, page.locator('a[href="/signup"]')),
      ]);
      await page.waitForLoadState("networkidle");
    });

    await beat(page, "Signing up — name, email, password. Nothing exotic, just a normal account.", async () => {
      await humanType(page, page.locator('input[autocomplete="name"]'), ACCOUNT.name);
      await humanType(page, page.locator('input[autocomplete="email"]'), ACCOUNT.email);
      await humanType(page, page.locator('input[autocomplete="new-password"]'), ACCOUNT.password);
    });

    await beat(
      page,
      "The password is hashed server-side; the JWT that comes back is stored client-side and sent as a bearer token on every request.",
      async () => {
        await Promise.all([
          page.waitForURL(/\/dashboard/, { timeout: 15000 }),
          humanClick(page, page.getByRole("button", { name: "Sign up" })),
        ]);
        await page.waitForLoadState("networkidle");
      },
      { holdMs: 2400 }
    );

    await beat(page, "A fresh account starts with an empty trip history.", null, { holdMs: 2000 });

    await beat(page, "Planning a trip feeds one form into five parallel agents: destination, flights, hotels, weather, and a synthesizer.", async () => {
      await Promise.all([
        page.waitForURL(/\/plan/, { timeout: 15000 }),
        humanClick(page, page.getByRole("link", { name: "✈ Plan your first trip" })),
      ]);
      await page.waitForLoadState("networkidle");
    });

    await beat(page, `"${TRIP.destination}" — the destination agent researches neighbourhoods, attractions, and local food here.`, async () => {
      await humanType(page, page.getByPlaceholder("Destination(e.g. Tokyo, Japan)"), TRIP.destination);
    });

    await beat(page, "Origin runs through a city autocomplete — needed for flight search and for drawing the route on the map.", async () => {
      await humanType(page, page.getByPlaceholder("e.g. Amsterdam, Netherlands"), TRIP.originTyped, { afterMs: 0 });
      await pause(400);
      await input.key("ENTER");
      await pause(400);
    });

    await beat(
      page,
      "Dates, travellers, travel style, budget, currency, payment method — all of it shapes what each agent goes and researches, not just the final writeup.",
      async () => {
        const dateInputs = page.locator('input[type="date"]');
        await humanClick(page, dateInputs.nth(0));
        await dateInputs.nth(0).fill(TRIP.departure);
        await pause(200);
        await humanClick(page, dateInputs.nth(1));
        await dateInputs.nth(1).fill(TRIP.return);
        await pause(200);
        await humanClick(page, page.locator("button", { hasText: TRIP.style }));
        await humanClick(page, page.locator("button", { hasText: TRIP.budget }));
        await humanClick(page, page.locator("button", { hasText: TRIP.currency }));
        await humanClick(page, page.locator("button", { hasText: TRIP.payment }));
      },
      { holdMs: 2400 }
    );

    await beat(
      page,
      "Submitting kicks off the orchestrator — four agents launch together via asyncio.gather. Nothing here runs one at a time.",
      async () => {
        await Promise.all([
          page.waitForURL(/\/trip\//, { timeout: 15000 }),
          humanClick(page, page.getByRole("button", { name: "Make a plan for my trip" })),
        ]);
        await page.waitForLoadState("networkidle");
      },
      { holdMs: 2600 }
    );

    await beat(
      page,
      "Four independent agents, four independent statuses — each with its own elapsed timer and tool-call count, all updating live over one SSE connection.",
      async () => {
        await pause(2500);
      },
      { holdMs: 2600 }
    );

    // The four parallel agents can finish in well under a minute on a fast
    // backend, and the itinerary agent right behind them - fast enough that
    // a leisurely, fixed-pace tour of each agent's card while they're still
    // "live" isn't reliable. So the tour below happens on the completed,
    // static cards instead: the Live Feed keeps every card (tool calls +
    // full output) after it finishes, so nothing about the walkthrough
    // depends on catching an agent mid-stream.
    await beat(
      page,
      "The itinerary agent won't start until all four of those finish — it's the only one that runs sequentially, and the only one with no tools of its own.",
      async () => {
        await waitVisible(page, page.getByText("Your Itinerary"), { timeoutMs: 180000 });
      },
      { holdMs: 2400 }
    );

    // Re-focus after a wait of unpredictable length (real LLM + web-search
    // calls): a notification or the OS reclaiming attention during an idle
    // stretch would otherwise send the next real click and keystrokes
    // somewhere other than the browser.
    await input.focus();

    await beat(
      page,
      "All five agents done, and the day-by-day plan is Pydantic-validated into structured data — not just prose.",
      null,
      { holdMs: 2600 }
    );

    await beat(
      page,
      "Closing this for a moment to look at how each agent actually got here.",
      async () => {
        await humanClick(page, page.locator('button[title="Close (Esc)"]'));
      },
      { holdMs: 1600 }
    );

    await beat(
      page,
      "The Live Feed keeps every agent's card after it finishes — the tool calls it made, and its full answer. Expanding one shows the whole thing.",
      null,
      { holdMs: 2600 }
    );

    await expandAgentCard(
      page,
      "Weather",
      "Weather skips the LLM for the forecast itself — it geocodes the destination and calls Open-Meteo directly. The model only comes in afterward, to turn raw numbers into packing advice.",
      { holdMs: 3600 }
    );

    await expandAgentCard(
      page,
      "Destination",
      "Destination ran three separate Tavily searches — attractions, neighbourhoods, food — then synthesized all three into this write-up, streamed back token by token.",
      { holdMs: 3600 }
    );

    await expandAgentCard(
      page,
      "Flights",
      "Flights searched routes and current pricing for this exact origin, destination, and travel date — not a generic price page.",
      { holdMs: 3200 }
    );

    await expandAgentCard(
      page,
      "Hotels",
      "Hotels searched for stays matching the chosen budget tier and travel style specifically, then recommended real, named options.",
      { holdMs: 3200 }
    );

    await expandAgentCard(
      page,
      "Itinerary",
      "And this is the fifth agent's own raw synthesis — the same text that got parsed into the structured day cards.",
      { holdMs: 3000 }
    );

    await beat(
      page,
      "Meanwhile the map geocoded origin and destination on its own and drew the route in — a plain Leaflet layer, no maps SDK.",
      async () => {
        await pause(1500);
      },
      { holdMs: 2400 }
    );

    await beat(
      page,
      "Back to the itinerary — selecting a day re-centers the map on that day's actual stops, with a numbered route between them.",
      async () => {
        await humanClick(page, page.getByRole("button", { name: "🗓 View itinerary" }));
        await pause(600);
        await humanClick(page, page.getByText(/^Day 1 ·/).first());
        await pause(1200);
      },
      { holdMs: 2800 }
    );

    await beat(
      page,
      "TripAssist — agentic AI meets full-stack engineering: FastAPI orchestrating five agents with asyncio.gather and SSE streaming, Next.js and Zustand rendering it live, token by token.",
      async () => {
        await humanClick(page, page.locator('button[title="Close (Esc)"]'));
      },
      { holdMs: 4200, title: true }
    );

    await beat(
      page,
      "Back on the dashboard, the trip is saved with its total cost — nothing here disappears once the tab closes.",
      async () => {
        await Promise.all([
          page.waitForURL(/\/dashboard/, { timeout: 15000 }),
          humanClick(page, page.locator('a[href="/dashboard"]').first()),
        ]);
        await page.waitForLoadState("networkidle");
      },
      { holdMs: 3600, title: true }
    );
  } catch (err) {
    console.error("\nFAILED");
    console.error(`url: ${page.url()}`);
    const bodyText = await page.locator("body").innerText().catch(() => "(unreadable)");
    console.error(`body (first 500): ${bodyText.slice(0, 500).replace(/\s+/g, " ")}`);
    throw err;
  } finally {
    await setCaption(page, "");
    if (recorder) await recorder.stop();
    await browser.close();
    await input.stop();
  }

  console.log("\nDone.", RECORD ? `Video written to ${OUTPUT_PATH}` : "(dry run, nothing recorded)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
