import { NextResponse } from "next/server";
import { plaidClient } from "../../../lib/plaid";

export async function GET() {
  const access_token = globalThis.__plaidAccessToken;
  if (!access_token) {
    return NextResponse.json({ error: "No account connected yet" }, { status: 400 });
  }
  try {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: start,
      end_date: end,
      options: { count: 10 },
    });
    const txns = response.data.transactions.map((t) => ({
      date: t.date,
      name: t.name,
      amount: t.amount,
      category: t.personal_finance_category?.primary || null,
    }));
    const accounts = response.data.accounts.map((a) => ({
      name: a.name,
      mask: a.mask,
      balance: a.balances.current,
    }));
    return NextResponse.json({ accounts, transactions: txns });
  } catch (err) {
    console.error(err.response?.data || err);
    return NextResponse.json(
      { error: err.response?.data?.error_message || "transactions failed" },
      { status: 500 }
    );
  }
}
