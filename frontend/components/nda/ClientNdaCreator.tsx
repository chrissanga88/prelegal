"use client";

import dynamic from "next/dynamic";

/**
 * The creator defaults the Effective Date to the user's local "today", which
 * can't be known at prerender time, so it renders on the client only.
 */
export const ClientNdaCreator = dynamic(
  () => import("./NdaCreator").then((mod) => mod.NdaCreator),
  {
    ssr: false,
    loading: () => <p className="text-sm text-zinc-500">Loading the NDA creator…</p>,
  },
);
