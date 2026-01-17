"use client";

import { AuthGate } from "@/components/auth-gate";

import { SelfEsteemTestClient } from "./self-esteem-test-client";

export default function SelfEsteemTestPage() {
  return (
    <AuthGate>
      <SelfEsteemTestClient />
    </AuthGate>
  );
}
