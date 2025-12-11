import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser } from "@/server/services/counselors";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get counselor earnings");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselor = await getCounselorByAuthUser(user.id);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 404 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Get all bookings for this counselor
    const { data: bookings, error } = await adminSupabase
      .from("counselor_bookings")
      .select("id, status, payment_status, price_cents, created_at")
      .eq("counselor_id", counselor.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate earnings statistics
    const allBookings = bookings ?? [];
    const paidBookings = allBookings.filter(b => b.payment_status === "paid");
    const pendingBookings = allBookings.filter(b => b.payment_status === "unpaid" && b.status === "pending");
    const confirmedBookings = allBookings.filter(b => b.status === "confirmed");
    const completedBookings = allBookings.filter(b => b.status === "completed");

    const totalEarnings = paidBookings.reduce((sum, b) => sum + b.price_cents, 0);
    const pendingEarnings = pendingBookings.reduce((sum, b) => sum + b.price_cents, 0);
    const thisMonthEarnings = paidBookings
      .filter(b => {
        const bookingDate = new Date(b.created_at);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, b) => sum + b.price_cents, 0);

    // Get monthly earnings for the last 6 months
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      const earnings = paidBookings
        .filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === month && bookingDate.getFullYear() === year;
        })
        .reduce((sum, b) => sum + b.price_cents, 0);

      monthlyEarnings.push({
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
        earnings,
      });
    }

    return NextResponse.json({
      earnings: {
        total: totalEarnings,
        pending: pendingEarnings,
        thisMonth: thisMonthEarnings,
        monthly: monthlyEarnings,
      },
      stats: {
        totalBookings: allBookings.length,
        paidBookings: paidBookings.length,
        confirmedBookings: confirmedBookings.length,
        completedBookings: completedBookings.length,
        pendingBookings: pendingBookings.length,
      },
    });
  } catch (error) {
    console.error("Failed to get earnings", error);
    return NextResponse.json({ error: "Failed to get earnings" }, { status: 500 });
  }
}
