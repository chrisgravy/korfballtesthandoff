"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Re-renders the current page's server data whenever a match row changes.
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Older dashboards call it the anon key, newer ones the publishable key.
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("matches-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 500);
      })
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [router]);
  return null;
}
