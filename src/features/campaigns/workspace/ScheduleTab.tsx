import React from "react";
import type { Campaign } from "@/domain";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ScheduleTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const { schedule } = campaign;

  return (
    <div className="space-y-5">
      <div className="text-xs text-ink-500 bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
        Schedule is set at campaign creation in this Phase 1 demo — in-place editing here is a planned Phase 2 capability, not yet backed by the repository.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-4">Flight Dates</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center panel-solid p-3">
              <div className="text-xs text-ink-500 mb-1">Start</div>
              <div className="text-lg font-bold text-ink-50">{schedule.startDate}</div>
            </div>
            <div className="text-ink-600">→</div>
            <div className="flex-1 text-center panel-solid p-3">
              <div className="text-xs text-ink-500 mb-1">End</div>
              <div className="text-lg font-bold text-ink-50">{schedule.endDate}</div>
            </div>
          </div>

          <h3 className="font-semibold text-ink-50 mt-6 mb-3">Days of Week</h3>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold ${
                  schedule.daysOfWeek.includes(i) ? "bg-signal-cyan/15 text-signal-cyan border border-signal-cyan/30" : "bg-ink-800 text-ink-600"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-4">Delivery Parameters</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-500">Operating Hours</dt>
            <dd className="text-ink-100">{schedule.operatingHours.start} – {schedule.operatingHours.end}</dd>
            <dt className="text-ink-500">Spot Duration</dt>
            <dd className="text-ink-100">{schedule.spotDurationSec}s</dd>
            <dt className="text-ink-500">Loop Position</dt>
            <dd className="text-ink-100">{schedule.loopPosition ?? "Not fixed"}</dd>
            <dt className="text-ink-500">Dayparts</dt>
            <dd className="text-ink-100">
              {schedule.dayparts.length > 0 ? schedule.dayparts.join(", ").replace(/_/g, " ") : "All hours"}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};
