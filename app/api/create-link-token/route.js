import { NextResponse } from "next/server";
import { plaidClient } from "../../../lib/plaid";

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "kiril-poc" },
      client_name: "QC Finance POC",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err.response?.data || err);
    return NextResponse.json(
      { error: err.response?.data?.error_message || "link token failed" },
      { status: 500 }
    );
  }
}
