import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

const environment =
  process.env.PAYPAL_MODE === "live"
    ? Environment.Production
    : Environment.Sandbox;

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_SECRET!,
  },
  environment,
});

export const ordersController = new OrdersController(client as any);
