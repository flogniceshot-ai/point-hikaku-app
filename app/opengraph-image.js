import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "../lib/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} | ポイントサイト横断比較`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "#05070d",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(0,240,255,0.18), transparent 45%), radial-gradient(circle at 85% 85%, rgba(34,211,138,0.16), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              border: "4px solid #00f0ff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 700,
              color: "#00f0ff",
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, color: "#e8f4ff" }}>
            {SITE_NAME}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "56px", fontWeight: 700, color: "#e8f4ff", lineHeight: 1.3 }}>
          ポイントサイト横断比較
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: "28px",
            color: "#6f8299",
            maxWidth: "920px",
            lineHeight: 1.5,
          }}
        >
          {SITE_DESCRIPTION.slice(0, 60)}
        </div>
      </div>
    ),
    { ...size }
  );
}
