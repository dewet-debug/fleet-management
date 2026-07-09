import { ReportMeta, ReportParams, ReportResult } from './types';
import { integrationCoverageReport } from './coverage.report';
import { driverLeaderboardReport, vehicleLeaderboardReport } from './performance.report';
import { driverMonthOnMonthReport, vehicleMonthOnMonthReport } from './monthOnMonth.report';
import {
  fleetUtilisationReport,
  serviceDueReport,
  complianceExpiryReport,
  driverSafetyReport,
} from './operations.report';
import { drivingBehaviourReport } from './behaviour.report';
import { demandPatternsReport } from './patterns.report';
import { driverActivityReport } from './driverActivity.report';
import { driverHeatmapReport } from './driverHeatmap.report';
import { fleetFinancialsReport } from './financials.report';
import { fleetHealthReport } from './fleetHealth.report';
import { cartrackNotBoltReport } from './cartrackNotBolt.report';
import { stationaryVehiclesReport } from './stationary.report';
import { rentalRepeatOffendersReport } from './rentalRepeat.report';
import { rentalVsEarningsReport } from './rentalVsEarnings.report';
import { driverScorecardReport } from './driverScorecard.report';

interface ReportDef extends ReportMeta {
  run: (params: ReportParams) => Promise<ReportResult>;
}

/** The report catalog — order here drives the order in the UI. */
const REPORTS: ReportDef[] = [
  {
    key: 'fleet-health',
    title: 'Fleet Health — Executive',
    description: 'One-screen view: utilisation, collections, driver conversion and the action list.',
    category: 'Executive',
    usesDateRange: true,
    run: fleetHealthReport,
  },
  {
    key: 'fleet-financials',
    title: 'Fleet Financials',
    description: 'Monthly billing, collections, cash and profit-fund position.',
    category: 'Financials',
    usesDateRange: false,
    run: () => fleetFinancialsReport(),
  },
  {
    key: 'driver-scorecard',
    title: 'Driver Scorecard (Call-List)',
    description: 'One ranked call-list: rental owed, months behind, Bolt earnings and flags.',
    category: 'Financials',
    usesDateRange: false,
    run: () => driverScorecardReport(),
  },
  {
    key: 'rental-vs-earnings',
    title: 'Rental vs Earnings',
    description: 'Who can (and cannot) cover their rental from Bolt earnings.',
    category: 'Financials',
    usesDateRange: false,
    run: () => rentalVsEarningsReport(),
  },
  {
    key: 'rental-repeat-offenders',
    title: 'Rental Repeat Offenders',
    description: 'Drivers/vehicles that under-pay rental across multiple months.',
    category: 'Financials',
    usesDateRange: false,
    run: () => rentalRepeatOffendersReport(),
  },
  {
    key: 'demand-patterns',
    title: 'Demand & Revenue Patterns',
    description: 'Daily trend, weekday & month cycles, hour-of-day and a demand heatmap.',
    category: 'Analytics',
    usesDateRange: true,
    run: demandPatternsReport,
  },
  {
    key: 'driver-activity',
    title: 'Driver Activity & Hours',
    description: 'When drivers work, active/online hours, and workforce utilisation.',
    category: 'Analytics',
    usesDateRange: true,
    run: driverActivityReport,
  },
  {
    key: 'driver-heatmap',
    title: 'Driver Schedule Heatmap',
    description: "Pick a driver — see their day × hour working pattern.",
    category: 'Analytics',
    usesDateRange: true,
    run: driverHeatmapReport,
  },
  {
    key: 'integration-coverage',
    title: 'Bolt ↔ Cartrack Coverage',
    description: 'Cars on one system but missing from another, and registry gaps.',
    category: 'Data Integrity',
    usesDateRange: false,
    run: () => integrationCoverageReport(),
  },
  {
    key: 'driver-leaderboard',
    title: 'Driver Leaderboard',
    description: 'Top and poor performers by revenue, acceptance and cancellation.',
    category: 'Drivers',
    usesDateRange: true,
    run: driverLeaderboardReport,
  },
  {
    key: 'driver-month-on-month',
    title: 'Driver — Month on Month',
    description: 'Per-driver revenue and trips trended by month.',
    category: 'Drivers',
    usesDateRange: false,
    run: driverMonthOnMonthReport,
  },
  {
    key: 'driver-safety',
    title: 'Driver Safety & Behaviour',
    description: 'Coaching events and vehicle alerts by driver/vehicle.',
    category: 'Drivers',
    usesDateRange: true,
    run: driverSafetyReport,
  },
  {
    key: 'driving-behaviour',
    title: 'Driving Behaviour (trips)',
    description: 'Speeding and idling flagged from Cartrack trip telemetry.',
    category: 'Drivers',
    usesDateRange: true,
    run: drivingBehaviourReport,
  },
  {
    key: 'vehicle-leaderboard',
    title: 'Vehicle Leaderboard',
    description: 'Top and under-performing vehicles by revenue and profit.',
    category: 'Vehicles',
    usesDateRange: true,
    run: vehicleLeaderboardReport,
  },
  {
    key: 'vehicle-month-on-month',
    title: 'Vehicle — Month on Month',
    description: 'Per-vehicle revenue and trips trended by month.',
    category: 'Vehicles',
    usesDateRange: false,
    run: vehicleMonthOnMonthReport,
  },
  {
    key: 'fleet-utilisation',
    title: 'Fleet Utilisation',
    description: 'Active vs idle vehicles across Bolt and Cartrack.',
    category: 'Operations',
    usesDateRange: true,
    run: fleetUtilisationReport,
  },
  {
    key: 'cartrack-not-bolt',
    title: 'Private Use (Cartrack, no Bolt)',
    description: 'Cars being driven on Cartrack but not earning on Bolt — likely private use.',
    category: 'Operations',
    usesDateRange: true,
    run: cartrackNotBoltReport,
  },
  {
    key: 'stationary-vehicles',
    title: 'Stationary Vehicles (24h+)',
    description: 'Cars that have not moved (Cartrack) in 24h or more, and offline trackers.',
    category: 'Operations',
    usesDateRange: false,
    run: () => stationaryVehiclesReport(),
  },
  {
    key: 'service-due',
    title: 'Maintenance & Service Due',
    description: 'Vehicles overdue or approaching a service by date or km.',
    category: 'Operations',
    usesDateRange: false,
    run: serviceDueReport,
  },
  {
    key: 'compliance-expiry',
    title: 'Compliance & Expiries',
    description: 'Registration, insurance, licence and reminder expiries.',
    category: 'Operations',
    usesDateRange: false,
    run: complianceExpiryReport,
  },
];

const byKey = new Map(REPORTS.map((r) => [r.key, r]));

export function listReports(): ReportMeta[] {
  return REPORTS.map(({ key, title, description, category, usesDateRange }) => ({
    key,
    title,
    description,
    category,
    usesDateRange,
  }));
}

export function getReportDef(key: string): ReportDef | undefined {
  return byKey.get(key);
}

export async function runReport(key: string, params: ReportParams): Promise<ReportResult | null> {
  const def = byKey.get(key);
  if (!def) return null;
  return def.run(params);
}
