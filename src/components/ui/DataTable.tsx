import React, { useMemo, useState } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { EmptyState } from "./Feedback";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  onRowClick,
  emptyTitle = "No results",
  emptyDescription,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [rows, sortKey, sortDir, columns]);

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-shell">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.sortValue ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-ink-100"
                    onClick={() => {
                      if (sortKey === col.key) setSortDir((d) => (d === 1 ? -1 : 1));
                      else {
                        setSortKey(col.key);
                        setSortDir(1);
                      }
                    }}
                  >
                    {col.header}
                    {sortKey === col.key && (sortDir === 1 ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />)}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={keyOf(row)} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
