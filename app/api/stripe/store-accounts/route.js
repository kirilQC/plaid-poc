import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// Saves connected account ids (in memory, POC) and subscribes each one
// to the transactions data feed so Stripe starts pulling history.
export async function POST(request) {
  try {
    const { account_ids } = await request.json();
    if (!account_ids?.length) {
      return NextResponse.json({ error: "no accounts" }, { status: 400 });
    }
    for (const id of account_ids) {
      await getStripe().financialConnections.accounts.subscribe(id, {
        features: ["transactions"],
      });
    }
    globalThis.__stripeAccountIds = account_ids;
    return NextResponse.json({ connected: true, count: account_ids.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "store failed" },
      { status: 500 }
    );
  }
}
