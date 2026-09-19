import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// POC only: reuses one Customer, held in server memory.
export async function POST() {
  try {
    if (!globalThis.__stripeCustomerId) {
      const customer = await getStripe().customers.create({ name: "Kiril POC" });
      globalThis.__stripeCustomerId = customer.id;
    }
    const session = await getStripe().financialConnections.sessions.create({
      account_holder: {
        type: "customer",
        customer: globalThis.__stripeCustomerId,
      },
      permissions: ["balances", "transactions"],
      filters: { countries: ["US"] },
    });
    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "session failed" },
      { status: 500 }
    );
  }
}
