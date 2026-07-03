# Assemble49 Fleet Console — Design Enhancement Brief

**For:** Claude Design
**Goal:** *Enhance* an existing, implemented design system — not a from-scratch redesign. A coherent system ("Signal") already ships across every screen. We want it elevated: richer data-viz, more polish and hierarchy, better empty/loading/interaction states, and a stronger, more branded feel — while keeping it fast and data-dense.

---

## 1. What the app is
Internal fleet-operations console for **Assemble49** (branded "Assemble49 Fleet Console") — an e-hailing vehicle-rental fleet operating on **Bolt** in Johannesburg. ~150 vehicles (scaling to thousands). Users are **internal ops staff** (Admin, Fleet Manager) plus a limited external **Service Company** portal. It ingests **Bolt** commercial data (trips/revenue — live, ~170k trips/month) and is wired for **Cartrack** telematics (GPS/behaviour/fuel — integration built, awaiting credentials). Currency **ZAR**, timezone **SAST (UTC+2)**.

---

## 2. Implemented stack & hard constraints
Design must be buildable in this — please enhance *within* it:
- **React 18 + TypeScript + Vite**, **Tailwind CSS** (design tokens = Tailwind theme; no CSS-in-JS / component library).
- **Heroicons v2** (`react-icons/hi2`) — outline variants.
- **TanStack Query v5** (loading/empty/error states matter), `react-hot-toast`.
- **Charts are hand-built** with divs/CSS today (no charting lib). **MapLibre GL** + **OpenStreetMap raster tiles** for maps.
- **No dark mode** yet. Desktop-first (no strong responsive/mobile story yet).

If a proposal needs a charting library (Recharts/visx) or a branded basemap (MapTiler/Mapbox style) — call it out as a new dependency to confirm.

---

## 3. The current design system — "Signal" (this is the baseline to build on)

**Language:** utilitarian, data-dense, **borders over shadows**, cool-slate "paper" neutrals, one indigo brand colour, a deliberate semantic status palette, and a **monospace face for every figure** (numbers, money, plates, IDs, timestamps) so tables read as trustworthy data.

### Brand & colour tokens (Tailwind, live values)
Derived from the **Assemble49 logo** (indigo "A" with a periwinkle outline on slate). Logo asset: `client/public/assemble49-mark.png`.

- **Primary (indigo):** `500 #40427a` (buttons, active nav, links), `600 #343565`, `700 #2a2b50`, `300 #9596cf` (periwinkle accent), `50 #eeeef8` (active-nav bg).
- **Neutrals (cool paper):** app bg `#f4f5f8`, card `#ffffff`, sunken `#f8f9fc`, border `#e2e3ec`, hairline `#ecedf3`.
- **Ink (text):** headings `#1e1e2a`, emphasised/numeric `#232430`, body `#3e3f4b`, muted `#696a78`, faint `#9597a5`, ghost/labels `#a2a4b1`.
- **Semantic (text + tinted pill bg):** success `#17935b`/`#e4f4ec`, warning `#bd7f14`/`#f7edd6`, info `#2f6ea8`/`#e6eff7`, danger `#b0392f`/`#f6e6e3`, neutral `#6b7688`/`#eceef2`.

### Type
- **UI:** IBM Plex Sans (400–700). **Numerics/IDs/plates/timestamps:** IBM Plex Mono (tabular-nums) — a signature; keep it.
- Scale: page title 17px bold · card title 15px bold · body 14px · secondary 13px · **meta** 10px uppercase tracked (labels) · **stat** 26px mono (KPI numbers).

### Shape & elevation
- Radii: cards/tables 11px, controls/chips 8px, pills full. **Borders, not shadows** (shadows only for true overlays: modals, dropdowns, map pins).

### Components already built (`client/src/components/ui/`)
`Button` (primary/secondary/danger/ghost) · `Input` · `Select` · `Modal` · `ConfirmDialog` · `Table` (dense grid: columns + CSS `template` + `renderCell`, row-click, empty state) · `Badge` + **`StatusBadge`** (semantic pill + dot) · `Card` + **`Stat`** (KPI cell) · `Pagination` · `LoadingSpinner` · `EmptyState`.
Plus hand-built chart primitives (`components/bolt/charts.tsx`): `RevenueTrendChart` (stacked bars), `PaymentMixDonut` (conic-gradient), `CompletionFunnel`, `TopVehiclesBars`; and MapLibre maps (`DemandMap`, `FleetMapPage`).

### Status vocabularies (all map to the one semantic palette)
- **Bolt order:** finished / client_cancelled / driver_rejected / driver_did_not_respond / driver_cancelled_after_accept / client_did_not_show
- **Vehicle:** ACTIVE / IN_SERVICE / OUT_OF_SERVICE / RETIRED
- **Driver:** ACTIVE / INACTIVE / SUSPENDED
- **Service workflow (ordered → drives a stepper):** DRAFT → SCHEDULED → AUTHORIZED → IN_PROGRESS → COMPLETED → APPROVED (+ RETURNED)
- **Sync:** RUNNING / COMPLETED / COMPLETED_WITH_ERRORS / FAILED

### Shell
- **Sidebar** 236px, white, hairline border, Assemble49 logo+wordmark, grouped nav (**MAIN** / **INTEGRATIONS** with green health dots / **ADMIN** / **PORTAL**), active = `primary-50` bg + `primary-700` text. Role-gated.
- **Header** 60px, avatar + name + role chip, logout. Page titles render in-content.

---

## 4. Screen inventory (all currently built — candidates to enhance)
- **Dashboard** — KPI strip, 30-day revenue-trend chart, fleet-status donut, payment-mix donut, completion funnel, top-earning vehicles, recent Bolt trips, "needs attention", integrations freshness. *(Charts are clickable → drill into filtered Bolt Trips.)*
- **Vehicles** list + **Vehicle Detail** (tabs: identity / lease / insurance blocks, cost analysis, per-vehicle recent Bolt trips; edit/delete).
- **Drivers** list (licence-expiry warnings) + **Driver Detail**.
- **Assignments** (vehicle ↔ driver history).
- **Services** list + **Service Detail** (**workflow stepper**, ZAR cost breakdown, before/during/after/damage photo slots).
- **Bolt Trips** + **Analytics** tab (revenue trend, payment mix, completion funnel, top vehicles, **demand map**) — URL-filterable, chart click-throughs.
- **Live Map** — MapLibre map of vehicle positions, 30s auto-refresh, marker popups, searchable side list.
- **Profitability** — per-vehicle Bolt revenue × utilisation × (reserved cost/telematics) with a data-coverage banner.
- **Cartrack** & **MNC·A49** integration consoles (shared shell: status header, "Sync now", stat strip, tabbed logs/data).
- **Users**, **Service Types**, **Service Intervals** (config tables).
- **Bulk Upload** (drag-drop + validation-results table), **Service Portal** (external, lighter chrome), **Login**.

---

## 5. Where to focus the enhancement (priorities)
1. **Data-visualisation sophistication.** The charts are functional but basic hand-built CSS (bars/donuts/funnel). Elevate them: better axes/gridlines/labels, hover tooltips, smoother scales, small-multiples, sparklines in tables, and a consistent chart style kit. (Flag if you want a chart lib.)
2. **Dashboard as a real command centre.** Stronger hierarchy, "at-a-glance health", trend deltas (▲▼ vs prior period), and clearer primary vs secondary panels.
3. **Maps.** OSM raster looks generic. Propose a **branded, muted basemap** and richer markers/clustering/heat for the Live Map and demand map.
4. **Micro-states & interaction.** Skeleton loaders (not just spinners), richer empty states, hover/focus/press affordances, subtle transitions, "last synced / updating" cues.
5. **Typographic & spatial polish.** Tighten hierarchy, spacing rhythm, table density options (comfortable/compact), and number formatting consistency.
6. **Status system refinement.** A crisper, more legible badge/stepper/health-dot treatment across the many vocabularies in §3.
7. **Optional but valuable:** a **dark mode**, and a **responsive/tablet** pass (ops staff on the move).

Keep it **fast and dense** — this is a tool people stare at all day. Decoration should serve scanability.

---

## 6. What Claude Design still needs from us
- **Official Assemble49 brand guide** if one exists (we *derived* the indigo/periwinkle palette + logo mark from an email-signature banner — please confirm or correct exact brand colours, secondary palette, and any brand fonts vs. our IBM Plex choice).
- **Priority screens** for the first enhancement pass (suggest: Dashboard, Bolt Analytics, Live Map, Vehicle Detail).
- **Decisions:** dark mode yes/no; responsive targets; OK to add a charting lib and/or a keyed map basemap; density preference.
- Any **screenshots/recording** of the current app in use (or we can provide from `http://localhost:5173`).

## 7. Suggested deliverables
- An **enhanced Tailwind token set** (refined palette incl. dark mode, elevation, spacing, chart colours) that reskins the existing `ui/` primitives.
- A **chart/data-viz style kit** (the recurring bar/donut/funnel/trend/sparkline/map patterns).
- High-fidelity redesigns of the priority screens + the reusable patterns they establish (KPI strip, filter bar, dense table, detail layout, stepper, integration console, map view).
