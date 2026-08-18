"use client";

import { useEffect, useState } from "react";

import { primarySubjectName } from "@/lib/names";
import {
  getCachedPlayerImageUrl,
  resolvePlayerImageUrl,
  subscribePlayerImage,
} from "@/lib/player-image-cache";

export { primarySubjectName };

interface PlayerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "h-10 w-10 text-xs",
  md: "h-16 w-16 text-sm",
  lg: "h-full w-full text-2xl",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlayerAvatar({
  name,
  size = "md",
  className = "",
}: PlayerAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(() =>
    getCachedPlayerImageUrl(name),
  );
  const [failed, setFailed] = useState(false);

  // Name changes reset synchronously DURING render (the state-from-props pattern), so a recycled
  // avatar never paints the previous player's photo for a frame. The effect below then only has
  // the async part left: resolving a url the cache doesn't have yet.
  const [prevName, setPrevName] = useState(name);
  if (prevName !== name) {
    setPrevName(name);
    setFailed(false);
    setImageUrl(getCachedPlayerImageUrl(name));
  }

  useEffect(() => {
    if (imageUrl !== undefined) return;

    let cancelled = false;

    void resolvePlayerImageUrl(name).then((url) => {
      if (!cancelled) setImageUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [name, imageUrl]);

  useEffect(() => {
    return subscribePlayerImage((updatedName) => {
      if (updatedName.trim().toLowerCase() !== name.trim().toLowerCase()) return;
      setImageUrl(getCachedPlayerImageUrl(name));
      setFailed(false);
    });
  }, [name]);

  const classes = `${sizeClass[size]} ${className} overflow-hidden rounded-full bg-slate-800 flex items-center justify-center shrink-0`;

  if (imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${classes} object-cover object-top`}
      />
    );
  }

  return (
    <div className={`${classes} font-semibold text-sky-300`}>
      {initials(name)}
    </div>
  );
}
