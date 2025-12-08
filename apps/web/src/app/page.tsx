import { defaultTheme } from "@tape/ui";
import { normalizeChunk } from "@tape/rag";
import { SupabaseStatus } from "@/components/supabase-status";

const normalizedSample = normalizeChunk({
  id: "demo",
  content: "Tape式心理学プラットフォーム起動"
});

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 font-sans text-zinc-900">
      <main className="w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">Tape式心理学</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Monorepo foundation is ready.
        </h1>
        <p className="mt-2 text-zinc-600">
          Default UI theme: <span className="font-semibold">{defaultTheme}</span>
        </p>
        <div className="mt-6 rounded-xl bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-500">Sample normalized chunk</p>
          <pre className="mt-2 overflow-auto rounded-lg bg-white p-4 text-xs text-zinc-800">
            {JSON.stringify(normalizedSample, null, 2)}
          </pre>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-zinc-600">
          <SupabaseStatus enabled={supabaseConfigured} />
          <span className="text-xs text-zinc-500">
            Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY to enable client initialization.
          </span>
        </div>
      </main>
    </div>
  );
}
