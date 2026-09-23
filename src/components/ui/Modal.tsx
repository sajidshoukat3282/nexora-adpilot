import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}> = ({ open, onClose, title, children, footer, size = "md" }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${widths[size]} panel-solid p-0 max-h-[88vh] flex flex-col animate-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/60 shrink-0">
          <h3 className="text-base font-semibold text-ink-50">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-50 p-1 rounded-md hover:bg-ink-800">
            <FiX size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto grow">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-ink-700/60 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
