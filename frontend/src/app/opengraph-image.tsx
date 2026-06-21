import { ImageResponse } from "next/og";

// Social/link-preview card (also reused as the Twitter image automatically).
export const alt = "Hyperyzer — AI Video Scoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -3 }}>Hyperyzer</div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 600,
            marginTop: 24,
            opacity: 0.95,
            maxWidth: 880,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          AI scores your video and finds the best hashtags and time to post
        </div>
      </div>
    ),
    { ...size }
  );
}
