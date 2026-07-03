import React from 'react';
import clsx from 'clsx';

/**
 * Table — dense operational table (Signal).
 * Header is a mono, uppercase, letter-spaced label row; body rows have
 * hairline dividers and align via a shared grid template. Numerics /
 * plates / IDs use font-mono so columns line up.
 *
 * Pass an explicit grid `template` so header and rows stay in lockstep.
 * Pair with server-side <Pagination/> (never client "load everything").
 */
type Col = { key: string; header: React.ReactNode; className?: string };

export function Table<T extends { id: string | number }>({
  columns,
  template,
  rows,
  onRowClick,
  renderCell,
  emptyMessage = 'No data.',
}: {
  columns: Col[];
  template: string; // e.g. "150px 190px 90px 130px 1fr 60px"
  rows: T[];
  onRowClick?: (row: T) => void;
  renderCell: (row: T, key: string) => React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-paper-line bg-paper-card">
      <div className="overflow-x-auto">
        <div
          className="grid gap-2 border-b border-paper-hair bg-paper-sunken px-[18px] py-2.5 font-mono text-meta uppercase tracking-wide text-ink-ghost"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.key} className={c.className}>{c.header}</span>
          ))}
        </div>
        {rows.length === 0 && (
          <div className="px-[18px] py-10 text-center text-sm text-ink-faint">{emptyMessage}</div>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={clsx(
              'grid items-center gap-2 border-b border-paper-faint px-[18px] py-3',
              onRowClick && 'cursor-pointer hover:bg-paper-sunken'
            )}
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} className={clsx('min-w-0', c.className)}>
                {renderCell(row, c.key)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
