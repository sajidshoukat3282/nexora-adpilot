import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, subtitle, children, footer, width = "max-w-lg" }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-40 pointer-events-none ${open ? "" : ""}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full ${width} bg-ink-900 border-l border-ink-700/60 shadow-2xl
          transition-transform duration-300 ease-out flex flex-col ${
            open ? "translate-x-0 pointer-events-auto" : "translate-x-full"
          }`}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-ink-700/60 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-ink-50">{title}</h3>
            {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-50 p-1.5 rounded-md hover:bg-ink-800 shrink-0">
            <FiX size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto grow">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-ink-700/60 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
