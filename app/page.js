"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { loadStripe } from "@stripe/stripe-js";

export default function Home() {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connected | error
  const [message, setMessage] = useState("");
  const [data, setData] = useState(null);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [provider, setProvider] = useState(null); // "plaid" | "stripe"
  const [stripeLoading, setStripeLoading] = useState(false);

  // Chase uses OAuth: Plaid redirects to chase.com and back here with
  // ?oauth_state_id=... In that case we must resume with the SAME link
  // token we started with (kept in localStorage), not a fresh one.
  const isOAuthRedirect =
    typeof window !== "undefined" &&
    window.location.search.includes("oauth_state_id=");

  useEffect(() => {
    if (isOAuthRedirect) {
      const saved = localStorage.getItem("plaid_link_token");
      if (saved) {
        setLinkToken(saved);
        return;
      }
    }
    fetch("/api/create-link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.link_token) {
          setLinkToken(d.link_token);
          localStorage.setItem("plaid_link_token", d.link_token);
        } else {
          // Plaid not configured or errored: leave its button disabled so
          // the Stripe path still works.
          console.warn("Plaid link token:", d.error);
        }
      })
      .catch((e) => console.warn("Plaid link token:", e));
  }, []);

  const fetchTransactions = useCallback(async (prov) => {
    setLoadingTxns(true);
    setMessage("");
    const url = prov === "stripe" ? "/api/stripe/transactions" : "/api/transactions";
    const res = await fetch(url);
    const d = await res.json();
    setLoadingTxns(false);
    if (d.error) {
      setMessage(
        d.error.includes("not yet ready")
          ? "Plaid is still preparing transactions. Wait ~15s and hit Refresh."
          : d.error
      );
    } else {
      setData(d);
      if (d.pending) {
        setMessage(
          "Stripe is still pulling transaction history. Wait ~30s and hit Refresh."
        );
      }
    }
  }, []);

  const connectStripe = useCallback(async () => {
    setStripeLoading(true);
    setMessage("");
    try {
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      const stripe = await loadStripe(pk);
      const res = await fetch("/api/stripe/create-session", { method: "POST" });
      const d = await res.json();
      if (!d.client_secret) throw new Error(d.error || "Could not create session");
      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: d.client_secret,
      });
      if (result.error) throw new Error(result.error.message);
      const ids =
        result.financialConnectionsSession?.accounts?.map((a) => a.id) || [];
      if (!ids.length) throw new Error("No accounts were connected");
      const storeRes = await fetch("/api/stripe/store-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_ids: ids }),
      });
      const stored = await storeRes.json();
      if (!stored.connected) throw new Error(stored.error || "Store failed");
      setProvider("stripe");
      setStatus("connected");
      fetchTransactions("stripe");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setStripeLoading(false);
    }
  }, [fetchTransactions]);

  const onSuccess = useCallback(
    async (public_token) => {
      const res = await fetch("/api/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      const d = await res.json();
      if (d.connected) {
        localStorage.removeItem("plaid_link_token");
        setProvider("plaid");
        setStatus("connected");
        fetchTransactions("plaid");
      } else {
        setStatus("error");
        setMessage(d.error || "Token exchange failed");
      }
    },
    [fetchTransactions]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    ...(isOAuthRedirect
      ? { receivedRedirectUri: window.location.href }
      : {}),
  });

  // After returning from the bank's OAuth page, reopen Link automatically
  // so it can finish the handshake.
  useEffect(() => {
    if (isOAuthRedirect && ready) open();
  }, [isOAuthRedirect, ready, open]);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Plaid POC</h1>

      {status !== "connected" && (
        <button
          onClick={() => open()}
          disabled={!ready}
          style={{
            marginTop: 24,
            padding: "12px 28px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: ready ? "pointer" : "not-allowed",
            background: ready ? "#2f6fed" : "#3a3f4a",
            color: "#fff",
          }}
        >
          Connect with Plaid
        </button>
      )}

      {status !== "connected" && (
        <button
          onClick={connectStripe}
          disabled={stripeLoading}
          style={{
            marginTop: 24,
            marginLeft: 12,
            padding: "12px 28px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: stripeLoading ? "not-allowed" : "pointer",
            background: "#635bff",
            color: "#fff",
          }}
        >
          {stripeLoading ? "Opening..." : "Connect with Stripe"}
        </button>
      )}

      {status === "connected" && (
        <div style={{ marginTop: 24 }}>
          <div style={{ color: "#4ade80", fontWeight: 600 }}>
            Connected via {provider === "stripe" ? "Stripe" : "Plaid"}
          </div>
          <button
            onClick={() => fetchTransactions(provider)}
            disabled={loadingTxns}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #3a3f4a",
              background: "transparent",
              color: "#e8eaed",
              cursor: "pointer",
            }}
          >
            {loadingTxns ? "Loading..." : "Refresh transactions"}
          </button>
        </div>
      )}

      {message && (
        <p style={{ marginTop: 16, color: "#f87171" }}>{message}</p>
      )}

      {data && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18 }}>Accounts</h2>
          {data.accounts.map((a) => (
            <div key={a.mask + a.name} style={{ padding: "6px 0" }}>
              {a.name} (...{a.mask}): $
              {a.balance?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          ))}
          <h2 style={{ fontSize: 18, marginTop: 24 }}>Recent transactions</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {data.transactions.map((t, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #23262e" }}>
                  <td style={{ padding: "8px 8px 8px 0", color: "#9aa0a6" }}>
                    {t.date}
                  </td>
                  <td style={{ padding: 8 }}>{t.name}</td>
                  <td
                    style={{
                      padding: "8px 0 8px 8px",
                      textAlign: "right",
                      color: t.amount < 0 ? "#4ade80" : "#e8eaed",
                    }}
                  >
                    {t.amount < 0 ? "+" : "-"}$
                    {Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
