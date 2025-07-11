"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setAuthenticated(true);
      } else {
        router.replace("/login");
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [router]);

  if (loading) return null;
  if (!authenticated) return null;
  return <>{children}</>;
} 