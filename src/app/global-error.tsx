"use client";

import { useEffect } from "react";

/**
 * Root boundary — catches failures in the root layout itself, which the
 * (app)/error.tsx segment boundary cannot reach. Must render its own
 * <html>/<body>. Kept dependency-free so it works even if the app shell broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.125rem", color: "#1e293b" }}>Terjadi kesalahan</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
            Aplikasi mengalami masalah. Silakan coba lagi atau jalankan ulang aplikasi.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              height: "2.5rem",
              padding: "0 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#0d9488",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
