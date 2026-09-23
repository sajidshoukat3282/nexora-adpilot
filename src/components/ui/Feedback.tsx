import React from "react";

/** Every illustrative/simulated number in the app wears this, per the
 *  Phase 1 brief's requirement to never imply demo data is real. */
export const DemoTag: React.FC<{ label?: string }> = ({ label = "Demo data" }) => (
  <span className="demo-tag" title="This value is illustrative demo data, not a real measurement.">
    {label}
  </span>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = "h-4 w-full" }) => (
  <div className={`skeleton rounded-md ${className}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="panel p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-32" />
    <Skeleton className="h-3 w-40" />
  </div>
);

export const SkeletonRows: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton className="h-4 w-full" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    {icon && <div className="text-ink-500 mb-4 text-3xl">{icon}</div>}
    <div className="text-ink-100 font-semibold mb-1">{title}</div>
    {description && <div className="text-ink-400 text-sm max-w-sm mb-4">{description}</div>}
    {action}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="text-signal-red font-semibold mb-1">Something went wrong</div>
    <div className="text-ink-400 text-sm max-w-sm mb-4">{message}</div>
    {onRetry && (
      <button className="btn-secondary" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export const PermissionDenied: React.FC<{ action?: string }> = ({ action = "perform this action" }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-ink-600 rounded-xl2">
    <div className="text-2xl mb-3">🔒</div>
    <div className="text-ink-100 font-semibold mb-1">Permission required</div>
    <div className="text-ink-400 text-sm max-w-sm">
      Your current role doesn't have access to {action}. This is a Phase 1 RBAC demonstration —
      switch roles from the top bar to see how access changes.
    </div>
  </div>
);
