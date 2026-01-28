export default function MindTreeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fffaf4] via-[#f9f3ff] to-[#f2fbff] p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8">
        <div className="h-6 w-48 animate-pulse rounded-full bg-white/70" />
        <div className="h-80 w-full max-w-sm animate-pulse rounded-[32px] bg-white/80 shadow-[0_18px_38px_rgba(81,67,60,0.08)]" />
        <div className="h-40 w-full animate-pulse rounded-[32px] bg-white/80 shadow-[0_18px_38px_rgba(81,67,60,0.08)]" />
        <div className="grid w-full gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[24px] bg-white/70 shadow-[0_12px_24px_rgba(81,67,60,0.05)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
