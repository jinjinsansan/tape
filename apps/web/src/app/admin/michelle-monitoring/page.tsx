"use client";

import { useEffect, useState } from "react";
import { MasterLoginForm } from "./login-form";
import { MonitoringClient } from "./monitoring-client";
import { Loader2 } from "lucide-react";

export default function MichelleMonitoringPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to fetch sessions to check if authenticated
      const res = await fetch("/api/admin/michelle-master/sessions");
      setIsAuthenticated(res.ok);
    } catch {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <MasterLoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <MonitoringClient />;
}
