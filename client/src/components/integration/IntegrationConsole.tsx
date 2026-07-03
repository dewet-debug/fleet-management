import React from 'react';
import clsx from 'clsx';
import type { IconType } from 'react-icons';
import { Card, Stat } from '../ui';

/**
 * IntegrationConsole — Signal shell shared by every provider integration
 * (Cartrack, A49/MNC, and the future Netstar provider from the README).
 *
 * Layout, top to bottom:
 *   1. Status header — provider name + subtitle, a `statusSlot` (typically a
 *      "Connected" Badge + "last synced …" freshness stamp) and a right-hand
 *      `actions` slot for the "Sync now" primary Button(s).
 *   2. A 4-up `Stat` strip inside a flush Card.
 *   3. An underline tab bar + the active panel (`children`).
 *
 * Purely presentational — all data hooks, mutations and tab state live in the
 * page so this shell stays generic and reusable.
 */

export interface ConsoleStat {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
}

export interface ConsoleTab {
  key: string;
  label: string;
  icon?: IconType;
}

interface IntegrationConsoleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** e.g. a "Connected" Badge + "last synced …" freshness stamp. */
  statusSlot?: React.ReactNode;
  /** right-hand slot — the "Sync now" primary Button(s). */
  actions?: React.ReactNode;
  stats: ConsoleStat[];
  tabs: ConsoleTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}

export default function IntegrationConsole({
  title,
  subtitle,
  statusSlot,
  actions,
  stats,
  tabs,
  activeTab,
  onTabChange,
  children,
}: IntegrationConsoleProps) {
  return (
    <div className="space-y-4">
      {/* status header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div>
            <h1 className="text-xl font-bold text-ink">{title}</h1>
            {subtitle && <p className="font-mono text-xs text-ink-faint">{subtitle}</p>}
          </div>
          {statusSlot && <div className="flex items-center gap-3">{statusSlot}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* 4-up stat strip */}
      <Card bodyClassName="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-4 md:divide-y-0">
          {stats.map((s) => (
            <Stat
              key={s.label}
              label={s.label}
              value={s.value}
              sub={s.sub}
              valueClassName={s.valueClassName}
            />
          ))}
        </div>
      </Card>

      {/* tabbed panel */}
      <div className="border-b border-paper-line">
        <nav className="flex flex-wrap gap-1">
          {tabs.map((t) => {
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={clsx(
                  'flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary-500 text-primary-700'
                    : 'border-transparent text-ink-muted hover:text-ink'
                )}
              >
                {t.icon && <t.icon className="text-sm" />}
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
