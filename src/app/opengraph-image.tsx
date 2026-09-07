import { ImageResponse } from "next/og";
export const alt = "VERBA.X — Auditoria trabalhista. Sua rescisão, às claras.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0e0918",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "75px",
        color: "#f6f3ed",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 34 }}>
        VERBA.<span style={{ color: "#e3bd72" }}>X</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 78,
          marginTop: 65,
          letterSpacing: "-3px",
        }}
      >
        Sua rescisão, às claras.
      </div>
      <div
        style={{
          display: "flex",
          color: "#c4bacd",
          fontSize: 28,
          marginTop: 30,
        }}
      >
        Cada valor com fórmula, fundamento e versão.
      </div>
      <div
        style={{
          display: "flex",
          color: "#e3bd72",
          marginTop: 65,
          fontSize: 24,
        }}
      >
        FATO → CÁLCULO → INTERPRETAÇÃO
      </div>
    </div>,
    { ...size },
  );
}
