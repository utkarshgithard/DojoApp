import { ImageResponse } from "next/og";

// Let Next.js statically generate this image at build time by using the default runtime
export const runtime = "nodejs";

export const alt = "DojoClass — All Student Needs in One Tool | Online Study Rooms, Attendance & Daily Track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Big Torii gate logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "160px",
            height: "160px",
            borderRadius: "36px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            marginBottom: "32px",
            fontSize: "90px",
          }}
        >
          ⛩️
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          DojoClass
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "30px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          All Student Needs in One Tool | Online Study Rooms, Attendance & Daily Track
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "18px",
            color: "rgba(255,255,255,0.35)",
            display: "flex",
          }}
        >
          dojoclass.space
        </div>
      </div>
    ),
    { ...size }
  );
}
