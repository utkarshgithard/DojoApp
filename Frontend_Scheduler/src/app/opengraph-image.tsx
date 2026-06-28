import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export const alt = "DojoClass";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const faviconPath = join(process.cwd(), "public", "favicon.png");
  const faviconData = readFileSync(faviconPath);
  const faviconBase64 = `data:image/png;base64,${faviconData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconBase64}
          alt="DojoClass"
          width={400}
          height={400}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
