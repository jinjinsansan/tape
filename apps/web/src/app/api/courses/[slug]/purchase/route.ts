import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/server/auth";
import { OrdersController, Environment, LogLevel, Client as PayPalClient } from "@paypal/paypal-server-sdk";

export const dynamic = "force-dynamic";

const isProduction = process.env.PAYPAL_MODE === "live";
const clientId = isProduction
  ? process.env.PAYPAL_CLIENT_ID_LIVE!
  : process.env.PAYPAL_CLIENT_ID_SANDBOX!;
const clientSecret = isProduction
  ? process.env.PAYPAL_CLIENT_SECRET_LIVE!
  : process.env.PAYPAL_CLIENT_SECRET_SANDBOX!;

const paypalEnvironment = isProduction ? Environment.Production : Environment.Sandbox;
const paypalClient = new PayPalClient({
  clientCredentialsAuthCredentials: {
    oAuthClientId: clientId,
    oAuthClientSecret: clientSecret
  },
  timeout: 0,
  environment: paypalEnvironment,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: { logBody: true },
    logResponse: { logBody: true }
  }
});

const ordersController = new OrdersController(paypalClient);

/**
 * Create PayPal order for course purchase
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get course info
    const { data: courseData, error: courseError } = await supabase
      .from("learning_courses")
      .select("id, title, price, currency, published")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (courseError || !courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (courseData.price === 0) {
      return NextResponse.json({ error: "This course is free" }, { status: 400 });
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseData.id)
      .eq("status", "completed")
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json({ error: "Course already purchased" }, { status: 400 });
    }

    // Create PayPal order
    const collect = {
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            amount: {
              currencyCode: courseData.currency,
              value: courseData.price.toString()
            },
            description: courseData.title
          }
        ]
      },
      prefer: "return=minimal"
    };

    const { result, statusCode } = await ordersController.ordersCreate(collect);

    if (statusCode !== 201 || !result?.id) {
      throw new Error("Failed to create PayPal order");
    }

    return NextResponse.json({ orderId: result.id });
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

/**
 * Capture PayPal payment and record purchase
 */
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get course info
    const { data: courseData, error: courseError } = await supabase
      .from("learning_courses")
      .select("id, title, price, currency, published")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (courseError || !courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Capture PayPal order
    const collect = {
      id: orderId,
      prefer: "return=minimal"
    };

    const { result, statusCode } = await ordersController.ordersCapture(collect);

    if (statusCode !== 201 || result?.status !== "COMPLETED") {
      throw new Error("Failed to capture PayPal order");
    }

    // Extract payment amount
    const purchaseUnit = result.purchaseUnits?.[0];
    const capturedAmount = purchaseUnit?.payments?.captures?.[0]?.amount;

    if (!capturedAmount) {
      throw new Error("Invalid payment amount");
    }

    // Record purchase in database
    const { error: purchaseError } = await supabase.from("course_purchases").insert({
      user_id: user.id,
      course_id: courseData.id,
      amount: parseInt(capturedAmount.value || "0"),
      currency: capturedAmount.currencyCode || courseData.currency,
      payment_method: "paypal",
      payment_id: orderId,
      status: "completed",
      metadata: {
        paypal_order_id: orderId,
        paypal_capture_id: purchaseUnit?.payments?.captures?.[0]?.id
      }
    });

    if (purchaseError) {
      console.error("Failed to record purchase:", purchaseError);
      // Payment was successful but recording failed - this needs manual intervention
      throw new Error("Payment succeeded but failed to record purchase");
    }

    return NextResponse.json({
      success: true,
      message: "Course purchased successfully"
    });
  } catch (error) {
    console.error("Failed to capture payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
