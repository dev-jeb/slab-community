"use client";

import { useEffect, useState } from "react";

/**
 * True below the md breakpoint. One definition — this was copied into both search scopes, which is
 * exactly how the two would eventually disagree on where "mobile" begins.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}
