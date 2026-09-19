export const metadata = {
  title: "Plaid POC",
  description: "Proof of concept: Plaid Link + Chase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#0f1115",
          color: "#e8eaed",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
