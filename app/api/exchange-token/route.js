import { NextResponse } from "next/server";
import { plaidClient } from "../../../lib/plaid";

// POC only: holds the access token in server memory. It resets on redeploy.
// When building this out for real, persist to a database instead.
export async function POST(request) {
  try {
    const { public_token } = await request.json();
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    globalThis.__plaidAccessToken = response.data.access_token;
    return NextResponse.json({ item_id: response.data.item_id, connected: true });
  } catch (err) {
    console.error(err.response?.data || err);
    return NextResponse.json(
      { error: err.response?.data?.error_message || "exchange failed" },
      { status: 500 }
    );
  }
}
