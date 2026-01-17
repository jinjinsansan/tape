"use client";

import { AuthGate } from "@/components/auth-gate";

import { SelfEsteemTestClient } from "../diary/self-esteem-test/self-esteem-test-client";

export default function SelfEsteemPage() {
  return (
    <AuthGate>
      <SelfEsteemTestClient />
    </AuthGate>
  );
}
