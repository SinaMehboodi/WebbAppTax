"use client";

import { usePathname } from "next/navigation";

/**
 * Hides its children on specific pathnames. Use to suppress duplicate CTAs
 * (e.g. the "Sign up" pill in the global header is redundant on the landing
 * page, which has its own giant "Create my account" CTA).
 *
 *   <HideOnPath paths={["/"]}>...</HideOnPath>
 */
export default function HideOnPath({ paths = [], children }) {
  const pathname = usePathname() || "";
  if (paths.includes(pathname)) return null;
  return children;
}
