# Fleet Management App — Design Handoff Brief

**For:** Claude Design (look & feel / redesign)
**App:** My Next Car (MNC) internal fleet management system
**Prepared from:** the actual live codebase, July 2026 (supersedes the Feb 2026 Cartrack-era brief)

---

## 1. What this app is

An **internal operations tool** for **My Next Car (MNC)** — an e-hailing vehicle-rental fleet operating **exclusively on Bolt in Johannesburg, South Africa**. Staff use it to manage vehicles, drivers, maintenance, and to monitor commercial performance (trips & revenue) and telematics.

- **Users:** internal fleet-operations staff (admins, fleet managers) and, in a limited portal, external service companies. **Not** drivers or riders.
- **Scale today:** ~148 vehicles in the registry; architecture targets growth to thousands. The Bolt dataset alone is **~172,000 trips/month** (~6,000/day).
- **Currency:** ZAR (South African Rand). Region: Johannesburg (SAST, UTC+2).
- **Tone:** utilitarian, data-dense, operational. This is a working tool people stare at all day — clarity, scanability, and trustworthy numbers matter more than decoration.

---

## 2. Tech stack & design constraints (important for implementability)

The redesign must be buildable in the existing stack — please design **within these constraints**, not around them:

- **Frontend:** React 18 + TypeScript, Vite, React Router.
- **Styling:** **Tailwind CSS** (utility classes). No CSS-in-JS, no component library like MUI/Chakra. Design tokens = Tailwind theme.
- **Data/state:** TanStack React Query v5 (server data, loading/error states), `react-hot-toast` (notifications).
- **Icons:** **Heroicons v2** (via `react-icons/hi2`). Prefer icons available in that set.
- **Charts:** none installed yet — if the redesign introduces charts, that's a net-new dependency (flag it).

**Current theme (what exists today — the baseline to improve on):**
- **Primary color:** blue — Tailwind's default blue palette aliased as `primary` (`primary-500 = #3b82f6`, `600 = #2563eb`, `700 = #1d4ed8`).
- **Neutrals:** gray scale; app background `gray-50`, body text `gray-900`.
- **Typography:** default system sans-serif stack (no custom/brand font loaded yet).
- **Layout shell:** fixed **left sidebar, 256px (`w-64`)**, white with a right border; main content area to the right; page titles are `text-2xl font-bold`.
- There is **no dark mode** today.

The current look is a generic, un-branded Tailwind admin. **The goal of this engagement is a branded, polished, coherent visual system** — so treat the colors/typography above as replaceable, but keep the Tailwind-token approach.

---

## 3. Existing UI component library (retheme these)

There's a small in-house component set in `client/src/components/ui/` that every screen already uses. The redesign should **restyle/extend these primitives** (so it propagates everywhere) rather than invent per-screen widgets:

| Component | Notes |
|---|---|
| `Button` | variants incl. `primary`, `secondary`; `isLoading` state |
| `Input`, `Select` | form controls |
| `Modal`, `ConfirmDialog` | overlays |
| `Table` | tabular data (most screens are tables) |
| `Badge` | status pills — current colors: `blue, green, yellow, red, gray, purple` |
| `Card` | content container |
| `Pagination` | page controls |
| `LoadingSpinner`, `EmptyState` | async/empty states |

**Status color system is worth designing deliberately** — the app is full of status badges with distinct vocabularies (see §6). A consistent, legible status palette (semantic: success/warning/danger/neutral/info) that maps across all these enums would be high-impact.

---

## 4. Roles & navigation

Three roles, each sees a different nav set:

- **ADMIN** — everything, incl. an "Admin" section.
- **FLEET_MANAGER** — operations + integrations, no admin config.
- **SERVICE_COMPANY** — a single external "Service Portal" only.

**Current sidebar structure** (role-gated):
- **Main:** Dashboard · Vehicles · Drivers · Assignments · Services · **Bolt Trips** · Bulk Upload
- **Admin (ADMIN only):** Users · Service Types · Intervals · Cartrack · MNC (A49)
- **Portal (SERVICE_COMPANY only):** Service Portal

The nav is already fairly long and will grow (the data model hints at Alerts, Fuel, Coaching, Geofences, EV, etc. as future modules). **Nav grouping/hierarchy and information architecture is a real design problem worth solving** — consider collapsible groups, an "Integrations" grouping, and room for future modules.

---

## 5. Screen inventory (what needs design)

Each route below is a live screen. Grouped by priority tier.

### Tier 1 — core, highest-traffic
- **Dashboard** (`/`) — fleet overview / KPIs / landing. Prime candidate for a strong redesign (cards, trends, at-a-glance health).
- **Vehicles** (`/vehicles`, list) + **Vehicle Detail** (`/vehicles/:id`) — master list; detail is data-rich (identity, lease, insurance, service history, telematics, trips). The detail page is the densest screen and the most valuable to get right.
- **Drivers** (`/drivers`, list) + **Driver Detail** (`/drivers/:id`).
- **Bolt Trips** (`/bolt-trips`) — **NEW**, commercial/revenue screen (detailed in §5a).

### Tier 2 — operational
- **Assignments** (`/assignments`) — which driver is in which vehicle, over time.
- **Services** (`/services`, list) + **Service Detail** (`/services/:id`) — maintenance job records with a multi-step status workflow and photo attachments.
- **Bulk Upload** (`/bulk-upload`) — spreadsheet import flow (file upload, validation, results).

### Tier 3 — admin & integrations
- **Users** (`/admin/users`), **Service Types** (`/admin/service-types`), **Service Intervals** (`/admin/service-intervals`) — config/CRUD.
- **Cartrack** (`/admin/cartrack`) and **MNC/A49** (`/admin/a49`) — integration dashboards (sync status, logs, synced data tables, "Sync now" actions). The new Bolt screen and these share a family resemblance; a consistent **"integration console" pattern** (status header, last-synced, logs table, data tabs) would unify them.

### Tier 4 — external
- **Service Portal** (`/portal`) — the only screen external service companies see. Should feel like a focused, simplified sub-app (lighter chrome, task-oriented).

### 5a. Bolt Trips screen (the newest, design-forward opportunity)

Currently: a header, a row of **summary cards**, a **filter bar**, and a **paginated table**.

- **Summary cards (reflect current filters):** Order Attempts · Finished Trips · Gross Fare (ZAR) · Net Earnings · Bolt Commission · Distance (km); plus a "registry match: X matched / Y unmatched" line.
- **Filters:** free-text search (plate / driver / order ref / address), status dropdown, matched/unmatched dropdown, and a From–To date range.
- **Table columns:** Created · Vehicle (plate + model, with an "unmatched" tag) · Driver · Route (pickup → dropoff) · Status badge · Payment · Distance · Gross · Net.

**Design opportunities here (this data is rich):**
- Trips carry **pickup/dropoff lat-lng** → a **map view** (route pins/heatmap) is a natural addition.
- Strong **revenue analytics** surface: gross vs net vs commission, per-day/per-vehicle/per-driver breakdowns, trend lines. The current screen is table-first; a dashboard-style "Bolt performance" view is a clear opportunity.
- **Status taxonomy** matters (only ~40% of order attempts are completed "finished" trips; the rest are cancels/rejections) — the design should make "attempts vs finished" legible and not misleading.
- **"Matched vs unmatched to registry"** is an important data-quality signal to surface tastefully.

---

## 6. Status vocabularies (design a coherent system for these)

The app uses several status enums that all need consistent, legible badge styling:

- **Bolt order status:** `finished`, `client_cancelled`, `driver_rejected`, `driver_did_not_respond`, `driver_cancelled_after_accept`, `client_did_not_show`.
- **Vehicle status:** `ACTIVE`, `IN_SERVICE`, `OUT_OF_SERVICE`, `RETIRED`.
- **Driver status:** `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- **Service record status (workflow):** `DRAFT → SCHEDULED → AUTHORIZED → IN_PROGRESS → COMPLETED → APPROVED` (plus `RETURNED`). A **stepper/timeline** treatment would suit this.
- **Sync log status:** `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`.

A shared semantic mapping (success / in-progress / warning / danger / neutral) applied consistently across all of these would tie the UI together.

---

## 7. Data shape (informs what appears on screen)

Key entities and their notable fields (so layouts reflect real data):

- **Vehicle:** plate, VIN, make/model/year, color, status, odometer, fuel type; lease block (company, agreement no, start/end, monthly cost, book value); insurance block (provider, policy no, coverage, expiry, premium); registration/warranty expiry; fleet number.
- **Driver:** name, employee ID, email, phone, license number + expiry, status.
- **Assignment:** vehicle ↔ driver, start/end dates, status, who created it.
- **Service record:** vehicle, provider, service type, workflow status, scheduled/authorized/started/completed/approved timestamps, cost breakdown (labour, parts, VAT, totals in ZAR), invoice info, odometer at service, condition ratings, technician notes, **photos** (before/during/after/damage).
- **Bolt trip:** order ref, plate (→ registry), driver, status, payment method, pickup/dropoff address + lat-lng, distance (m), lifecycle timestamps, price components (ride price, booking fee, commission, net earnings, tip, discounts), category (Economy / Bolt / Wait&Save).
- **Telematics (Cartrack):** live position, ignition, speed, trips, fuel, alerts (speeding/geofence/harsh/tamper). Present in the data model; "last synced" freshness is a recurring concept.

Every integration record also stores a raw JSON blob — useful if the design wants **expandable "raw/advanced data"** panels.

---

## 8. Operational context that should shape the UI

- **Data freshness varies by source:** some data is near-real-time, most is **polled every few minutes** and backfilled. Show **"last synced" timestamps** rather than implying pure real-time.
- **High-volume tables:** Bolt trips are hundreds of thousands of rows — design must assume **server-side pagination, filtering, and sensible defaults** (e.g., default to a recent date window), not "load everything."
- **Multi-provider future:** telematics may add a second provider (Netstar) alongside Cartrack; the UI may eventually need to indicate/filter by provider.
- **Money is central:** ZAR formatting, gross/net/commission distinctions — get currency presentation right and consistent.

---

## 9. What Claude Design still needs from us (please provide)

This brief covers **functionality, data, and current implementation**. For an actual visual redesign, also hand Design:

1. **MNC brand assets** — logo, brand colors, fonts (if any). Right now the app is un-branded Tailwind blue; a brand palette + type choice is the biggest lever.
2. **Screenshots of the current app** (or access to `http://localhost:5173`) so Design sees the real starting point.
3. **Priority screens** — redesigning everything at once is a lot. Suggested first pass: **Dashboard**, **Vehicle Detail**, and **Bolt Trips** (highest value + most representative patterns: cards, dense tables, status, money).
4. **Preferences to confirm:** light-only vs dark mode, density (compact vs comfortable), desktop-only vs responsive/tablet, and any accessibility targets.

---

## 10. Suggested design deliverables

- A **branded Tailwind theme** (primary/neutral/semantic color tokens, type scale, spacing, radius, shadows) that reskins the existing `ui/` primitives.
- A **status/badge system** covering the vocabularies in §6.
- Redesigned **Dashboard**, **Vehicle Detail**, and **Bolt Trips** as the flagship screens, plus the reusable patterns they establish (page header, filter bar, KPI cards, data table, detail layout, integration console).
- **Navigation/IA** proposal for a sidebar that scales to many modules.
