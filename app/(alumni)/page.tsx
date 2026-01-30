"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/feed");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
