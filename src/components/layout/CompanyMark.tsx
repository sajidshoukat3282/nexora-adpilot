import React from "react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

/** The company logo if one is uploaded, otherwise the gold initial tile. */
export const CompanyMark: React.FC<{ name: string; box: string; text: string; rounded?: string }> = ({ name, box, text, rounded = "rounded-lg" }) => {
  const logo = useCompanyLogo();
  if (logo) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-[#f6e2a1]/40 bg-[#fbf9f4] shadow-[0_4px_14px_rgba(201,155,59,0.3)]`}>
        <img src={logo} alt={name} className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center ${rounded} border border-[#f6e2a1]/40 ${text} bg-gradient-to-br from-[#f1d68a] via-[#c99b3b] to-[#a97b22] text-[#1a1204] shadow-[0_4px_14px_rgba(201,155,59,0.3)]`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
