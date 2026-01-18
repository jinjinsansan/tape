import { DiaryAssistantClient } from "./diary-assistant-client";
import { AuthGate } from "@/components/auth-gate";

export default function DiaryAssistantPage() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-[#f9f3ef] p-4 pb-16 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <DiaryAssistantClient />
        </div>
      </div>
    </AuthGate>
  );
}
