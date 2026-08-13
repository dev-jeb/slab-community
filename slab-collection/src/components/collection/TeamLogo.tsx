"use client";

import { useState } from "react";

import { teamInitials, teamLogoUrl } from "@/lib/team-logo";

interface TeamLogoProps {
  team: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-36 w-36",
};

export function TeamLogo({ team, size = "md", className = "" }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const logoUrl = teamLogoUrl(team);
  const isLarge = size === "lg";
  const classes = `${sizeClass[size]} ${className} shrink-0 overflow-hidden ${
    isLarge ? "rounded-2xl" : "rounded-full"
  } bg-slate-800 flex items-center justify-center`;

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${team} logo`}
        onError={() => setFailed(true)}
        className={`${classes} object-contain ${size === "lg" ? "p-2" : "p-1.5"}`}
      />
    );
  }

  return (
    <div className={`${classes} ${size === "lg" ? "text-2xl" : "text-xs"} font-semibold text-sky-300`}>
      {teamInitials(team)}
    </div>
  );
}
