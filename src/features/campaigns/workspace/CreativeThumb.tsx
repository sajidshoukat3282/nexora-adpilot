import React from "react";
import { FiImage, FiVideo } from "react-icons/fi";
import type { CreativeVersion } from "@/domain";

/** No real file/image exists behind a demo creative upload — this renders
 *  an honest placeholder (format + dimensions), never a fabricated preview. */
export const CreativeThumb: React.FC<{ version: CreativeVersion; size?: number }> = ({ version, size = 64 }) => (
  <div
    className="rounded-lg bg-ink-800 border border-ink-700 flex flex-col items-center justify-center text-ink-500 shrink-0"
    style={{ width: size, height: size }}
  >
    {version.format === "mp4" ? <FiVideo size={size * 0.3} /> : <FiImage size={size * 0.3} />}
    <span className="text-[9px] mt-1 uppercase font-semibold">{version.format}</span>
  </div>
);
