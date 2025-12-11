import * as paypal from "@paypal/paypal-server-sdk";

const environment =
  process.env.PAYPAL_MODE === "live"
    ? new paypal.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID!,
        process.env.PAYPAL_SECRET!
      )
    : new paypal.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID!,
        process.env.PAYPAL_SECRET!
      );

export const paypalClient = new paypal.PayPalHttpClient(environment);
