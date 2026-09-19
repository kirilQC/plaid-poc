"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

export default function Home() {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connected | error
  const [message, setMessage] = useState("");
  const [data, setData] = useState(null);
  const [loadingTxns, setLoadingTxns] = useState(false);

  useEffect(() => {
    fetch("/api/create-link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.link_token) setLinkToken(d.link_token);
        else {
          setStatus("error");
          setMessage(d.error || "Could not create link token");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not reach server");
      });
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    setMessage("");
    const res = await fetch("/api/transactions");
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
    }
  }, []);

  const onSuccess = useCallback(
    async (public_token) => {
      const res = await fetch("/api/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      const d = await res.json();
      if (d.connected) {
        setStatus("connected");
        fetchTransactions();
      } else {
        setStatus("error");
        setMessage(d.error || "Token exchange failed");
      }
    },
    [fetchTransactions]
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

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
          Connect bank
        </button>
      )}

      {status === "connected" && (
        <div style={{ marginTop: 24 }}>
          <div style={{ color: "#4ade80", fontWeight: 600 }}>Connected</div>
          <button
            onClick={fetchTransactions}
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
