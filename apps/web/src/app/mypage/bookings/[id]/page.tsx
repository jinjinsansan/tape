import { BookingDetailClient } from "./booking-detail-client";

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-tape-cream/30 to-white px-4 py-8">
      <BookingDetailClient bookingId={params.id} />
    </main>
  );
}
