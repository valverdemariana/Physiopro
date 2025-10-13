
"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Index() {
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) window.location.href = "/dashboard";
      else window.location.href = "/login";
    };
    run();
  }, []);
  return null;
}
