export default function DiaryLoading() {
  return (
    <div className="min-h-screen bg-[#fff8f0] p-4 pb-16 md:p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-4 w-32 animate-pulse rounded-full bg-white/70" />
          <div className="mx-auto h-8 w-56 animate-pulse rounded-full bg-white/80" />
          <div className="mx-auto h-4 w-72 animate-pulse rounded-full bg-white/60" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-3xl border border-white/40 bg-white/80 shadow-[0_12px_24px_rgba(81,67,60,0.05)]"
            />
          ))}
        </div>
        <div className="h-[520px] animate-pulse rounded-3xl border border-white/50 bg-white/90 shadow-[0_18px_38px_rgba(81,67,60,0.07)]" />
      </div>
    </div>
  );
}
