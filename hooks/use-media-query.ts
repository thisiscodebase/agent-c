"use client";

import { useEffect, useState } from "react";

/**
 * Defaults to `false` on the server and on first paint, then settles after
 * hydration — so callers must tolerate a render where the query is unmatched.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}
