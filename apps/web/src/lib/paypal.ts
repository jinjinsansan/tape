import { Client, Environment } from "@paypal/paypal-server-sdk";

const environment =
  process.env.PAYPAL_MODE === "live"
    ? Environment.Production
    : Environment.Sandbox;

export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_SECRET!,
  },
  environment,
});
