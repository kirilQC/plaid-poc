import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

export async function GET() {
  const ids = globalThis.__stripeAccountIds;
  if (!ids?.length) {
    return NextResponse.json({ error: "No account connected yet" }, { status: 400 });
  }
  try {
    const accounts = [];
    const transactions = [];
    for (const id of ids) {
      const acct = await getStripe().financialConnections.accounts.retrieve(id);
      accounts.push({
        name: acct.display_name || acct.institution_name,
        mask: acct.last4,
        balance: acct.balance?.current?.usd != null ? acct.balance.current.usd / 100 : null,
      });
      const txns = await getStripe().financialConnections.transactions.list({
        account: id,
        limit: 10,
      });
      for (const t of txns.data) {
        transactions.push({
          date: new Date(t.transacted_at * 1000).toISOString().slice(0, 10),
          name: t.description,
          // Stripe: negative = money out. Flip sign to match Plaid's
          // convention used by the UI (positive = money out).
          amount: -t.amount / 100,
          category: null,
        });
      }
    }
    transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
    return NextResponse.json({
      accounts,
      transactions: transactions.slice(0, 10),
      pending: transactions.length === 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "transactions failed" },
      { status: 500 }
    );
  }
}
