# Cartrack Fleet API — coverage

Source of truth: **https://developer.cartrack.com/openapi/openapi.yaml** (OpenAPI 3.1, 171 paths).
Regional base URL for us: `https://fleetapi-za.cartrack.com/rest`.

Status legend:
- ✅ **Full** — API client method + Prisma model + sync service + read endpoint
- 🟡 **Client** — typed client method exists (`CartrackApiClient`); persistence/UI to be wired once real payloads are available (no credentials yet)
- ⬜ **Not planned** — not relevant to an e-hailing rental fleet (can add on request)

| Cartrack resource | Endpoint(s) | Status | Notes |
|---|---|---|---|
| Vehicles | `/vehicles` | ✅ | registry + status |
| Vehicle Status | `/vehicles/status` | ✅ | live GPS/ignition/speed → Live Map |
| Trips | `/trips` | ✅ | |
| Drivers | `/drivers` | ✅ | |
| Vehicle Driver Linkage | `/vehicle-driver-linkage` | ✅ | |
| Alerts / Notifications | `/alerts/notifications` | ✅ | |
| Fuel | `/fuel` | ✅ | |
| Vehicle Groups | `/vehicle-groups` | ✅ | |
| **Coaching** (driver behaviour) | `/coaching/events` | ✅ | `CartrackCoachingEvent` + `syncCoaching` + `GET /cartrack/coaching-events` |
| **Geofences** | `/geofences`, `/geofences/groups` | ✅ | `CartrackGeofence` + `syncGeofences` + `GET /cartrack/geofences` |
| **Geofence visits** | `/geofences/visits`, `/geofences/visitors` | ✅ | `CartrackGeofenceVisit` + `syncGeofenceVisits` + `GET /cartrack/geofence-visits` |
| **Vehicle Events** | `/vehicles/events`, `/vehicles/{reg}/events/idling` | ✅ | `CartrackVehicleEvent` + `syncVehicleEvents` + `GET /cartrack/vehicle-events` |
| **Reminders** | `/reminders/fleet` | ✅ | `CartrackReminder` + `syncReminders` + `GET /cartrack/reminders` |
| **Points of Interest** | `/pois` | ✅ | `CartrackPoi` + `syncPois` + `GET /cartrack/pois` |
| Driver Groups | `/drivers/groups` | 🟡 | `getDriverGroups()` |
| Maintenance | `/maintenance/{reg}`, `/maintenance/reasons` | 🟡 | `getMaintenance()`, `getMaintenanceReasons()` — overlaps our Services module |
| Electric Vehicle | `/vehicles/soc/latest`, `/charging/latest`, `/range`, `/ev-consumption` | 🟡 | `getVehicleSocLatest()` etc. — for when EVs join the fleet |
| Remote Commands | `/vehicles/{reg}/immobilise`, `/central-locking`, `/immobilise/status` | 🟡 | `immobiliseVehicle()`, `setCentralLocking()`, `getImmobiliseStatus()` — **write**; invoke only from an explicit authorised UI action, never a scheduler |
| Locate | `/vehicles/nearest`, `/vehicles/{reg}/share-location-link` | 🟡 | `getNearestVehicles()`, `getVehicleShareLocationLink()` |
| Vehicle Event Types | `/vehicles/events/types` | 🟡 | `getVehicleEventTypes()` (reference data) |
| Delivery, MiFleet, Vision, Tachograph, CarWatch, Fitments, Generator, Helpdesk, Leads, Mikey, RUC, Subusers, Topics, AEMP, Manufacturers, System | (various) | ⬜ | Not relevant to an e-hailing rental fleet — available to add on request |

## Notes
- **Credentials required.** Nothing above is active until Cartrack Fleet API credentials are set (`CARTRACK_API_USERNAME` / `CARTRACK_API_PASSWORD`) and the integration is enabled. The client methods and sync pipeline are ready; they run for registered fleet vehicles once credentials exist.
- **Schemas are best-effort.** The ✅ Prisma models store a flat set of likely fields plus a full `rawJson` blob, and the sync services parse defensively — the exact field names will be reconciled against the first real API responses (Cartrack's OpenAPI documents the shapes but we verify against live data before relying on parsed fields).
- New syncs are gated by per-resource flags on `CartrackConfig` (`coachingSyncEnabled`, `geofenceSyncEnabled`, `vehicleEventSyncEnabled`, `reminderSyncEnabled`, `poiSyncEnabled`) and run as part of `FULL` sync or individually.
