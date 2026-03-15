/**
 * GeopoliticalNewsDashboard.jsx
 * A live geopolitical news dashboard styled as a broadsheet newspaper.
 * Sections: Conflict Map (Leaflet), News Feed, Journalist Dispatch, Footer Ticker.
 * Uses Claude API (claude-opus-4-6) to generate live content on mount.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Static conflict data
// ---------------------------------------------------------------------------
const CONFLICT_HOTSPOTS = [
  { id: 1, lat: 35.6892, lng: 51.389,  name: "Tehran",      type: "diplomatic", desc: "Iranian leadership holds emergency security council session amid escalating regional tensions." },
  { id: 2, lat: 31.7683, lng: 35.2137, name: "Jerusalem",   type: "diplomatic", desc: "Israeli cabinet convenes amid rising threats from Iranian-backed proxies across northern borders." },
  { id: 3, lat: 33.8869, lng: 35.5131, name: "Beirut",      type: "ground",     desc: "Hezbollah forces maintain heightened readiness along the southern frontier." },
  { id: 4, lat: 36.2021, lng: 37.1343, name: "Aleppo",      type: "airstrike",  desc: "Coalition aircraft report strikes on Iranian weapons transfer routes in northern Syria." },
  { id: 5, lat: 33.5138, lng: 36.2765, name: "Damascus",    type: "airstrike",  desc: "Israeli Air Force conducts third sortie this week targeting IRGC positions." },
  { id: 6, lat: 33.3152, lng: 44.3661, name: "Baghdad",     type: "diplomatic", desc: "Iraqi parliament demands coalition explanation for cross-border operations." },
  { id: 7, lat: 24.6877, lng: 46.7219, name: "Riyadh",      type: "diplomatic", desc: "Saudi Crown Prince holds rare direct call with Iranian foreign minister." },
  { id: 8, lat: 25.2048, lng: 55.2708, name: "Dubai",       type: "diplomatic", desc: "GCC emergency summit convenes to assess Persian Gulf security posture." },
  { id: 9, lat: 23.6345, lng: 58.5932, name: "Muscat",      type: "diplomatic", desc: "Omani back-channel hosts Iran-US proximity talks for third consecutive day." },
  { id: 10, lat: 15.5527, lng: 32.5324, name: "Khartoum",   type: "ground",     desc: "Iranian-linked militias consolidate positions amid power vacuum." },
];

const MARKER_COLORS = { airstrike: "#b91c1c", ground: "#b45309", diplomatic: "#5b21b6" };

// ---------------------------------------------------------------------------
// Fallback content (used when API is unavailable)
// ---------------------------------------------------------------------------
const FALLBACK_HEADLINES = [
  { headline: "TEHRAN, March 15 — Iranian Foreign Ministry Convenes Emergency Session After Strait of Hormuz Standoff", brief: "Iran's foreign ministry convened Saturday after IRGC naval vessels shadowed a U.S. carrier group for 18 hours. Coastal defense batteries were placed on highest alert. Western diplomats in Geneva report back-channel talks have collapsed.", time: "47 minutes ago", importance: "breaking" },
  { headline: "JERUSALEM, March 15 — Israeli Cabinet Approves Northern Border Posture Enhancement", brief: "Israel's security cabinet approved measures described as 'defensive enhancements' after intelligence reports of Hezbollah repositioning long-range Fateh-110 missiles. The United States was briefed in advance. Iron Dome batteries have been repositioned northward.", time: "1 hour ago", importance: "breaking" },
  { headline: "BEIRUT, March 15 — Hezbollah Issues Formal Warning Over Syrian Airstrikes", brief: "Senior Hezbollah officials issued a formal warning to Israel over strikes in Syrian territory that the group claims struck affiliated storage facilities. The statement stopped short of declaring retaliation but invoked the 1979 defense pact with Tehran.", time: "2 hours ago", importance: "developing" },
  { headline: "WASHINGTON, March 15 — Pentagon Repositions Gerald R. Ford Strike Group to Persian Gulf", brief: "The USS Gerald R. Ford carrier strike group repositioned to the Persian Gulf at the request of regional partners. Pentagon spokesman declined to characterize the move as escalatory. Congressional leaders were notified under War Powers Act provisions.", time: "2 hours ago", importance: "developing" },
  { headline: "BAGHDAD, March 15 — Iraq Demands Explanation for Coalition Strikes Near Iranian Border", brief: "Iraq's prime minister formally demanded explanations from coalition partners after unidentified airstrikes struck western Iraq near the Iranian border. Coalition HQ in Doha issued no immediate statement. Russia called an emergency Security Council session.", time: "3 hours ago", importance: "update" },
  { headline: "UNITED NATIONS, March 15 — Security Council Emergency Session Adjourns Without Resolution", brief: "A Security Council emergency session adjourned without consensus after Russia and China vetoed Western-sponsored language referencing Iranian proxy forces. An Arab-bloc alternative resolution was tabled after U.S. objections. Talks resume Monday.", time: "3 hours ago", importance: "update" },
  { headline: "DUBAI, March 15 — GCC Energy Ministers Activate Oil Infrastructure Contingency Protocols", brief: "Gulf energy ministers activated contingency protocols for oil infrastructure protection. Saudi Aramco's Eastern Province facilities are running heightened security sweeps. Crude climbed 4.3 percent in Asian trading on supply-disruption fears.", time: "4 hours ago", importance: "developing" },
  { headline: "ANKARA, March 15 — Turkey Offers Neutral Territory for Emergency Multilateral Talks", brief: "Turkish Foreign Minister Fidan announced readiness to host emergency diplomatic talks, citing Ankara's working relationships with all conflicting parties. Egypt's president offered parallel mediation. Three nations have reportedly expressed preliminary interest.", time: "5 hours ago", importance: "update" },
  { headline: "CAIRO, March 15 — Arab League Calls Extraordinary Summit on Regional Security Architecture", brief: "The Arab League secretariat convened an extraordinary summit as member states sought a collective posture amid rapidly shifting alliances. Egypt proposed a multilateral maritime security framework for the Red Sea and Persian Gulf corridors. Saudi Arabia co-sponsored the motion.", time: "6 hours ago", importance: "update" },
];

const FALLBACK_DISPATCH = {
  byline: "Mira Khalil",
  publication: "The Independent Dispatch",
  dateline: "BEIRUT, Lebanon",
  publishedAgo: "34 minutes ago",
  content: `The streets of Beirut's southern suburbs were unusually quiet when I arrived this morning — that particular stillness veterans of conflict learn to read as portent rather than peace. The produce sellers had packed early. The children were not playing in the alleyways. Only the old men sat before their shuttered shops, worry beads counting out time between distant artillery and the muezzin's call.\n\nMy fixer, a former civil-war-era journalist who has survived three separate conflicts in this city, told me something I keep returning to: "The problem with this war is that everyone is fighting the last one." Hezbollah's leadership is responding to Israeli tactics from 2006, while Israeli planners respond to October 2023. Both sides are prepared for what already happened.\n\nWhat is actually unfolding is harder to see from inside it. The diplomatic back-channels I have tracked for weeks — Omani intermediaries, Qatari communications brokers, Swiss technical channels — have gone quiet in the way that means either a breakthrough or a complete collapse. In Beirut's government quarter, the ministers will not take my calls. That is never a good sign.\n\nWhat I know with certainty is this: the families moving north are not panicking. They are organized. They bring documents, medicines, and photographs. They have done this before. In Lebanon, displacement is not a crisis — it is a practiced art form, refined across generations of interrupted lives. The question now is not whether the next rupture comes, but whether anyone in a position of authority will choose, for once, to prevent it.`,
  bio: "Mira Khalil has reported from eleven active conflict zones over fifteen years for major international wire services and independent publications.",
};

const FALLBACK_TICKER = [
  "STRAIT OF HORMUZ — Iranian naval vessels shadow U.S. carrier group for second consecutive day",
  "UNITED NATIONS — Security Council emergency session fails to reach consensus on ceasefire framework",
  "DAMASCUS — Syrian government denies hosting Iranian missile storage facilities amid Israeli claims",
  "ANKARA — Turkish foreign minister meets with Iranian and Israeli envoys in back-to-back sessions",
  "WASHINGTON — Pentagon confirms additional carrier group deployment to Eastern Mediterranean",
  "LONDON — British intelligence assessment warns of significant escalation risk within 72 hours",
  "CAIRO — Egyptian president hosts emergency Arab League consultation on regional security",
  "PARIS — French foreign ministry summons ambassadors from six regional nations for consultations",
];

// ---------------------------------------------------------------------------
// Helper: build Anthropic client
// ---------------------------------------------------------------------------
function buildClient() {
  const key =
    (typeof process !== "undefined" && process.env
      ? process.env.ANTHROPIC_API_KEY ||
        process.env.REACT_APP_ANTHROPIC_API_KEY
      : undefined) || "";
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

// ---------------------------------------------------------------------------
// Global CSS injected once
// ---------------------------------------------------------------------------
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #f2ece0; }

.np-font { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
.body-font { font-family: Georgia, 'Times New Roman', serif; }

/* Map tiles grayscale */
.leaflet-tile { filter: grayscale(88%) contrast(90%) brightness(108%) sepia(8%); }

/* Leaflet overrides */
.leaflet-popup-content-wrapper {
  background: #f2ece0;
  border: 1px solid #9c8b72;
  border-radius: 0 !important;
  box-shadow: 3px 3px 10px rgba(0,0,0,0.25);
  font-family: Georgia, serif;
  font-size: 12px;
  color: #1a1a1a;
}
.leaflet-popup-tip { background: #f2ece0; }
.leaflet-popup-content { margin: 10px 14px; line-height: 1.5; }
.leaflet-container a.leaflet-popup-close-button { color: #5a4a3a; }
.leaflet-tooltip {
  background: #f2ece0;
  border: 1px solid #9c8b72;
  border-radius: 0 !important;
  font-family: Georgia, serif;
  font-size: 11px;
  font-weight: bold;
  color: #1a1a1a;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
  padding: 3px 8px;
}
.leaflet-tooltip-top::before { border-top-color: #9c8b72; }

/* Pulsing marker rings */
@keyframes pulse-ring {
  0%   { transform: scale(0.6); opacity: 0.9; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: pulse-ring 2.2s ease-out infinite;
}

/* Footer ticker */
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.ticker-track {
  display: flex;
  white-space: nowrap;
  animation: ticker-scroll 55s linear infinite;
  will-change: transform;
}
.ticker-track:hover { animation-play-state: paused; }

/* Headline rows */
.hl-row {
  border-bottom: 1px solid #c5b49a;
  padding: 9px 0;
  cursor: pointer;
  transition: background 0.12s;
}
.hl-row:hover { background: rgba(196,180,154,0.18); }

/* Drop-cap */
.drop-cap {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 62px;
  font-weight: 900;
  float: left;
  line-height: 0.78;
  margin-right: 5px;
  margin-top: 6px;
  color: #1a1a1a;
}

/* Skeleton shimmer */
@keyframes shimmer {
  0%, 100% { opacity: 0.45; }
  50%       { opacity: 0.9; }
}
.skeleton { animation: shimmer 1.6s ease-in-out infinite; background: #c5b49a; border-radius: 2px; }

/* Scrollbars */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #e8e0cc; }
::-webkit-scrollbar-thumb { background: #9c8b72; }

/* Column rule */
.col-rule { border-right: 1px solid #9c8b72; }

/* Section header label */
.sec-label {
  display: block;
  font-family: Georgia, serif;
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7a6550;
  margin-bottom: 4px;
}

/* Importance badges */
.badge-breaking  { color: #991b1b; font-size: 9px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; }
.badge-developing{ color: #92400e; font-size: 9px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; }
.badge-update    { color: #3b4a6b; font-size: 9px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; }
`;

function injectGlobalCSS() {
  if (document.getElementById("np-global-css")) return;
  const el = document.createElement("style");
  el.id = "np-global-css";
  el.textContent = GLOBAL_CSS;
  document.head.prepend(el);
}

// ---------------------------------------------------------------------------
// Leaflet loader
// ---------------------------------------------------------------------------
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = resolve;
    document.head.appendChild(js);
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonLine({ w = "100%", h = 13, mb = 6 }) {
  return <div className="skeleton" style={{ width: w, height: h, marginBottom: mb }} />;
}

function HeadlinesSkeleton() {
  return (
    <div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ borderBottom: "1px solid #c5b49a", padding: "10px 0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <SkeletonLine w={55} h={9} mb={0} />
            <SkeletonLine w={70} h={9} mb={0} />
          </div>
          <SkeletonLine w="100%" h={14} mb={4} />
          <SkeletonLine w="80%" h={14} mb={0} />
        </div>
      ))}
    </div>
  );
}

function DispatchSkeleton() {
  return (
    <div>
      <SkeletonLine w="50%" h={18} mb={10} />
      <SkeletonLine w="65%" h={12} mb={5} />
      <SkeletonLine w="40%" h={11} mb={20} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <SkeletonLine w="100%" h={13} mb={5} />
          <SkeletonLine w="100%" h={13} mb={5} />
          <SkeletonLine w="100%" h={13} mb={5} />
          <SkeletonLine w="72%" h={13} mb={0} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function GeopoliticalNewsDashboard() {
  const [headlines, setHeadlines]         = useState([]);
  const [dispatch, setDispatch]           = useState(null);
  const [expandedIdx, setExpandedIdx]     = useState(null);
  const [loadingHL, setLoadingHL]         = useState(true);
  const [loadingDS, setLoadingDS]         = useState(true);
  const [now, setNow]                     = useState(new Date());

  const mapEl    = useRef(null);
  const mapInst  = useRef(null);

  // Inject CSS once
  useEffect(() => { injectGlobalCSS(); }, []);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load Leaflet + init map
  useEffect(() => {
    let destroyed = false;
    loadLeaflet().then(() => {
      if (destroyed || !mapEl.current || mapInst.current) return;
      const L = window.L;
      const map = L.map(mapEl.current, {
        center: [31.5, 44.5],
        zoom: 5,
        zoomControl: false,
        attributionControl: true,
      });
      map.attributionControl.setPrefix("");

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 10,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      CONFLICT_HOTSPOTS.forEach((spot) => {
        const color = MARKER_COLORS[spot.type];
        const icon = L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="position:relative;width:24px;height:24px;">
            <div class="pulse-ring" style="background:${color};top:0;left:0;width:24px;height:24px;"></div>
            <div style="position:absolute;width:10px;height:10px;border-radius:50%;background:${color};top:7px;left:7px;border:1.5px solid #fff;"></div>
          </div>`,
        });
        L.marker([spot.lat, spot.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong style="font-family:'Playfair Display',Georgia,serif;font-size:13px;">${spot.name}</strong>` +
            `<br/><span style="font-size:11px;line-height:1.5;">${spot.desc}</span>`,
            { maxWidth: 220 }
          )
          .bindTooltip(spot.name, { direction: "top" });
      });

      mapInst.current = map;
    });
    return () => {
      destroyed = true;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    };
  }, []);

  // Fetch content from Claude API
  useEffect(() => {
    const client = buildClient();

    async function fetchHeadlines() {
      try {
        const msg = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 2800,
          thinking: { type: "adaptive" },
          messages: [{
            role: "user",
            content: `Generate exactly 9 realistic, dateline-style breaking news headlines about current geopolitical tensions in the Middle East (Iran, Israel, Lebanon, Gulf states). Today is ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.

Return ONLY a valid JSON array — no markdown, no commentary, no code fences. Each element:
- "headline": AP dateline format, e.g. "TEHRAN, March 15 — ..."
- "brief": 2–3 sentences in AP wire style, specific and factual-sounding
- "time": relative time string, e.g. "47 minutes ago"
- "importance": one of "breaking" | "developing" | "update"

Be specific — name real cities, units, political figures, institutions. Make each feel like genuine wire copy.`,
          }],
        });
        const text = msg.content.find((b) => b.type === "text")?.text ?? "";
        const m = text.match(/\[[\s\S]*\]/);
        if (m) setHeadlines(JSON.parse(m[0]));
        else    setHeadlines(FALLBACK_HEADLINES);
      } catch {
        setHeadlines(FALLBACK_HEADLINES);
      } finally {
        setLoadingHL(false);
      }
    }

    async function fetchDispatch() {
      try {
        const msg = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 2000,
          thinking: { type: "adaptive" },
          messages: [{
            role: "user",
            content: `Write a journalist dispatch — a first-person field report from an experienced independent war correspondent on the ground in the Middle East. Today is ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text. Fields:
- "byline": realistic journalist full name
- "publication": independent publication name
- "dateline": city and country in ALL CAPS, e.g. "BEIRUT, Lebanon"
- "publishedAgo": e.g. "23 minutes ago"
- "content": 4 paragraphs joined by \\n\\n — narrative, thoughtful, specific, ground-level observations, conversations with locals, street-level details, analytical context. Should feel like Dexter Filkins or Jon Lee Anderson — not generic wire copy.
- "bio": one sentence, past tense journalist bio

Write from Beirut, southern Lebanon, or northern Israel border. Avoid clichés. Include one real-seeming local character and a concrete observed detail.`,
          }],
        });
        const text = msg.content.find((b) => b.type === "text")?.text ?? "";
        const m = text.match(/\{[\s\S]*?\}(?=\s*$)/);
        if (m) setDispatch(JSON.parse(m[0]));
        else    setDispatch(FALLBACK_DISPATCH);
      } catch {
        setDispatch(FALLBACK_DISPATCH);
      } finally {
        setLoadingDS(false);
      }
    }

    fetchHeadlines();
    fetchDispatch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Formatted date
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).toUpperCase();

  const badgeClass = (imp) =>
    imp === "breaking" ? "badge-breaking" : imp === "developing" ? "badge-developing" : "badge-update";

  // Double ticker items so the seamless loop works
  const tickerItems = FALLBACK_TICKER;

  return (
    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", background: "#f2ece0", minHeight: "100vh", color: "#1a1a1a", paddingBottom: 52 }}>

      {/* ── MASTHEAD ─────────────────────────────────────────────────── */}
      <header style={{ background: "#f2ece0", padding: "0 28px" }}>
        {/* Top meta strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #9c8b72", fontSize: 11, fontFamily: "Georgia,serif", color: "#6a5840", letterSpacing: "0.06em" }}>
          <span>ESTABLISHED 2024</span>
          <span>{dateStr}</span>
          <span>LATE CITY EDITION</span>
        </div>

        {/* Publication name */}
        <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
          <h1 className="np-font" style={{ fontSize: "clamp(38px,6vw,80px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1, color: "#0a0a0a", margin: 0 }}>
            THE WORLD DISPATCH
          </h1>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 12, fontStyle: "italic", color: "#6a5840", margin: "4px 0 0", letterSpacing: "0.12em" }}>
            Independent Coverage of Global Affairs · War, Diplomacy &amp; Intelligence
          </p>
        </div>

        {/* Section nav bar */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, background: "#1a1a1a", color: "#f2ece0", padding: "5px 28px", margin: "0 -28px", fontSize: 10, fontFamily: "Georgia,serif", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {["Middle East Crisis", "Iran · Israel · Lebanon", "Gulf Security", "Diplomatic Fallout", "Intelligence Brief"].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span style={{ color: "#9c8b72" }}>·</span>}
              <span>{s}</span>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main style={{ padding: "0 28px" }}>

        {/* ── MAP SECTION ─────────────────────────────────────── */}
        <section style={{ borderBottom: "1px solid #9c8b72", paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "12px 0 8px", borderBottom: "3px solid #1a1a1a", marginBottom: 12 }}>
            <div>
              <span className="sec-label">Conflict Theater</span>
              <h2 className="np-font" style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                The Middle East Cauldron — Interactive War Map
              </h2>
            </div>
            <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontStyle: "italic", color: "#6a5840", flexShrink: 0, marginLeft: 16 }}>
              Live tracking · Updated continuously
            </p>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {/* Map container */}
            <div style={{ flex: 1, border: "1px solid #9c8b72" }}>
              <div ref={mapEl} style={{ height: 345, width: "100%", background: "#e8e0cc" }} />
            </div>

            {/* Legend */}
            <div style={{ width: 164, flexShrink: 0, border: "1px solid #9c8b72", background: "#ede7d9", padding: "14px 12px", height: 345 }}>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.16em", color: "#6a5840", marginBottom: 14 }}>
                Map Legend
              </p>
              {Object.entries(MARKER_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.28, animation: "pulse-ring 2.4s ease-out infinite" }} />
                    <div style={{ position: "absolute", width: 8, height: 8, top: 5, left: 5, borderRadius: "50%", background: color }} />
                  </div>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 11, lineHeight: 1.3, color: "#2a1a0a" }}>
                    {type === "airstrike" ? "Airstrike Operations" : type === "ground" ? "Ground Operations" : "Diplomatic Flashpoint"}
                  </span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid #9c8b72", marginTop: 14, paddingTop: 12 }}>
                <p style={{ fontFamily: "Georgia,serif", fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.14em", color: "#6a5840", marginBottom: 8 }}>
                  Active Zones
                </p>
                {CONFLICT_HOTSPOTS.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: MARKER_COLORS[s.type], flexShrink: 0 }} />
                    <span style={{ fontFamily: "Georgia,serif", fontSize: 10, color: "#3a2a1a" }}>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TWO-COLUMN SECTION ──────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

          {/* LEFT: News Feed */}
          <section className="col-rule" style={{ paddingRight: 22 }}>
            <div style={{ borderTop: "3px solid #1a1a1a", paddingTop: 12, marginBottom: 10 }}>
              <span className="sec-label">Breaking Developments</span>
              <h2 className="np-font" style={{ fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                Wire Reports &amp; Field Dispatches
              </h2>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontStyle: "italic", color: "#6a5840", margin: "4px 0 0" }}>
                Click any headline to expand wire brief
              </p>
            </div>

            <div style={{ height: 525, overflowY: "auto", paddingRight: 6 }}>
              {loadingHL ? (
                <HeadlinesSkeleton />
              ) : (
                headlines.map((item, idx) => (
                  <div
                    key={idx}
                    className="hl-row"
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    style={{ paddingLeft: 4, paddingRight: 4 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span className={badgeClass(item.importance)}>{item.importance}</span>
                      <span style={{ fontFamily: "Georgia,serif", fontSize: 10, color: "#9c8b72", fontStyle: "italic" }}>{item.time}</span>
                    </div>
                    <p className="np-font" style={{ fontSize: 14, fontWeight: expandedIdx === idx ? 700 : 400, lineHeight: 1.42, margin: 0, color: "#1a1a1a" }}>
                      {item.headline}
                    </p>
                    {expandedIdx === idx && item.brief && (
                      <p style={{ fontFamily: "Georgia,serif", fontSize: 12, lineHeight: 1.65, margin: "8px 0 2px", color: "#2a1a0a", borderLeft: "2px solid #9c8b72", paddingLeft: 10, fontStyle: "italic" }}>
                        {item.brief}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* RIGHT: Journalist Dispatch */}
          <section style={{ paddingLeft: 22 }}>
            <div style={{ borderTop: "3px solid #1a1a1a", paddingTop: 12, marginBottom: 10 }}>
              <span className="sec-label">Field Correspondence</span>
              <h2 className="np-font" style={{ fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                Dispatch: From Our Correspondent on the Ground
              </h2>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontStyle: "italic", color: "#6a5840", margin: "4px 0 0" }}>
                First-person field report · Independent journalism
              </p>
            </div>

            <div style={{ height: 525, overflowY: "auto", paddingRight: 6 }}>
              {loadingDS ? (
                <DispatchSkeleton />
              ) : dispatch ? (
                <article>
                  {/* Byline block */}
                  <div style={{ borderBottom: "1px solid #9c8b72", paddingBottom: 12, marginBottom: 16 }}>
                    <p className="np-font" style={{ fontSize: 20, fontWeight: 700, margin: "0 0 3px", color: "#1a1a1a" }}>
                      {dispatch.byline}
                    </p>
                    <p style={{ fontFamily: "Georgia,serif", fontSize: 12, fontStyle: "italic", color: "#6a5840", margin: "0 0 5px" }}>
                      {dispatch.publication}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontWeight: "bold", color: "#2a1a0a", margin: 0, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        {dispatch.dateline}
                      </p>
                      <p style={{ fontFamily: "Georgia,serif", fontSize: 11, color: "#9c8b72", margin: 0, fontStyle: "italic" }}>
                        {dispatch.publishedAgo}
                      </p>
                    </div>
                  </div>

                  {/* Article body */}
                  {(dispatch.content || "").split("\n\n").map((para, i) => (
                    <p key={i} style={{ fontFamily: "Georgia,serif", fontSize: 13.5, lineHeight: 1.72, margin: "0 0 14px", color: "#1a1a1a", textAlign: "justify", textIndent: i > 0 ? "1.6em" : 0 }}>
                      {i === 0 && (
                        <span className="drop-cap">{para[0]}</span>
                      )}
                      {i === 0 ? para.slice(1) : para}
                    </p>
                  ))}

                  {/* Bio */}
                  {dispatch.bio && (
                    <div style={{ borderTop: "1px solid #9c8b72", paddingTop: 10, marginTop: 6 }}>
                      <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontStyle: "italic", color: "#6a5840", margin: 0, lineHeight: 1.55 }}>
                        <em>{dispatch.bio}</em>
                      </p>
                    </div>
                  )}
                </article>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {/* ── FOOTER TICKER ────────────────────────────────────────────── */}
      <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 38, background: "#111", borderTop: "2px solid #7a6550", display: "flex", alignItems: "center", overflow: "hidden", zIndex: 1000 }}>
        {/* LIVE tag */}
        <div style={{ background: "#8b0000", color: "#f2ece0", padding: "0 14px", height: "100%", display: "flex", alignItems: "center", flexShrink: 0, borderRight: "2px solid #b91c1c" }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 10, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            ● LIVE UPDATES
          </span>
        </div>
        {/* Scrolling track — double items for seamless loop */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} style={{ fontFamily: "Georgia,serif", fontSize: 12, color: "#e8e0cc", padding: "0 36px", display: "inline-block" }}>
                <span style={{ color: "#9c8b72", marginRight: 10 }}>■</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
