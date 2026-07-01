import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily, fontFamilyMono, waitForFonts } from "./fonts";
import { COLORS, GRADIENT_BR, SPRINGS } from "./theme";

/**
 * Week-1 campaign — seven 11–16s vertical shorts (see campaign/week-1.md).
 * Same visual language as HyperyzerAdV2; every CTA drives the FREE tier.
 * All compositions are 1080×1920 @ 30fps and share the soundtrack bed
 * (trimmed automatically at each composition's end).
 */

export const CAMPAIGN_FPS = 30;
const W = 1080;
const H = 1920;

export const DAY_DURATIONS: Record<string, number> = {
  Day1: 12,
  Day2: 14,
  Day3: 15,
  Day4: 13,
  Day5: 16,
  Day6: 11,
  Day7: 12,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ── Shared primitives (mirrors HyperyzerAdV2) ─────────────────────────────────

const useLocalT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};

const Grad: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      background: `linear-gradient(105deg, ${COLORS.pink}, ${COLORS.orange})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);

const BrandMark: React.FC<{ size?: number; dark?: boolean }> = ({
  size = 96,
  dark = false,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: dark ? "#fff" : COLORS.slate900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
      }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        style={{ marginLeft: size * 0.04 }}
      >
        <path d="M8 5.5v13l11-6.5z" fill={dark ? COLORS.slate900 : "#fff"} />
      </svg>
    </div>
    <span
      style={{
        fontSize: size * 0.62,
        fontWeight: 800,
        letterSpacing: -1.5,
        color: dark ? "#fff" : COLORS.slate900,
      }}
    >
      Hyperyzer
    </span>
  </div>
);

const Pop: React.FC<{
  children: React.ReactNode;
  delay?: number;
  out?: number;
  durationSec: number;
  rise?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, out = 0.35, durationSec, rise = 46, style }) => {
  const { t, frame, fps } = useLocalT();
  const enter = spring({
    frame: frame - Math.round(delay * fps),
    fps,
    config: SPRINGS.soft,
    durationInFrames: Math.round(0.9 * fps),
  });
  const exit = interpolate(t, [durationSec - out, durationSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * rise}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const SceneFade: React.FC<{
  durationSec: number;
  out?: number;
  children: React.ReactNode;
}> = ({ durationSec, out = 0.4, children }) => {
  const { t } = useLocalT();
  const opacity = interpolate(t, [durationSec - out, durationSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const TypeLine: React.FC<{
  text: string;
  startAt: number;
  cps?: number;
  style?: React.CSSProperties;
}> = ({ text, startAt, cps = 34, style }) => {
  const { t } = useLocalT();
  const chars = Math.floor(Math.max(0, t - startAt) * cps);
  const shown = text.slice(0, chars);
  const done = chars >= text.length;
  return (
    <span style={style}>
      {shown}
      {!done && chars > 0 && <span style={{ opacity: 0.6 }}>|</span>}
    </span>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; light?: boolean }> = ({
  children,
  light = false,
}) => (
  <div
    style={{
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: 12,
      textTransform: "uppercase",
      color: light ? COLORS.slate400 : "rgba(255,255,255,0.5)",
    }}
  >
    {children}
  </div>
);

const Chip: React.FC<{ text: string; appearAt: number }> = ({ text, appearAt }) => {
  const { frame, fps } = useLocalT();
  const p = spring({
    frame: frame - Math.round(appearAt * fps),
    fps,
    config: SPRINGS.pop,
    durationInFrames: Math.round(0.6 * fps),
  });
  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${p})`,
        fontSize: 36,
        fontWeight: 700,
        color: COLORS.pink700,
        background: "rgba(252,231,243,0.95)",
        border: `1px solid ${COLORS.pink100}`,
        borderRadius: 14,
        padding: "12px 24px",
      }}
    >
      {text}
    </span>
  );
};

const IconZap: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "#fff",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2 4.5 13.5H11L9.5 22 18 10.5h-6.5L13 2Z" fill={color} />
  </svg>
);

const IconClock: React.FC<{ size?: number; color?: string }> = ({
  size = 44,
  color = "#fff",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth="1.8" />
    <path
      d="M12 6.75V12l3.5 2.1"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Cross: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="#f87171"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = COLORS.emerald,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4.5 12.5l5 5 10-11"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Standard closing scene (dark): brand + gradient CTA pill + free subtext. */
const CtaScene: React.FC<{ label: string; durationSec: number }> = ({
  label,
  durationSec,
}) => {
  const { t, frame, fps } = useLocalT();
  const pulse = 1 + Math.sin(t * 3.4) * 0.02;
  const btnIn = spring({
    frame: frame - Math.round(0.55 * fps),
    fps,
    config: SPRINGS.pop,
    durationInFrames: Math.round(0.8 * fps),
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 }}>
      <Pop durationSec={durationSec} delay={0.1} out={0.15}>
        <BrandMark size={92} dark />
      </Pop>
      <div
        style={{
          opacity: btnIn,
          transform: `scale(${btnIn * pulse})`,
          background: GRADIENT_BR,
          borderRadius: 30,
          padding: "36px 70px",
          boxShadow: "0 24px 70px rgba(236,72,153,0.5)",
          maxWidth: 940,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
          {label}
        </span>
      </div>
      <Pop durationSec={durationSec} delay={1.0} out={0.15} rise={24}>
        <div
          style={{
            fontFamily: fontFamilyMono,
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: -1,
          }}
        >
          hyperyzer.com
        </div>
      </Pop>
      <Pop durationSec={durationSec} delay={1.35} out={0.15} rise={20}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
          Free to start · 10 credits · no card
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

/** Background morphing through [times]→[colors] on the master timeline. */
const Morph: React.FC<{ times: number[]; colors: string[] }> = ({ times, colors }) => {
  const { t } = useLocalT();
  const bg = interpolateColors(t, times, colors);
  // Brand glow follows whether we are on a light or dark stop.
  const lightness = interpolateColors(t, times, colors) === COLORS.bg ? 1 : 0;
  void lightness;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(80% 55% at 50% 42%, rgba(236,72,153,0.12), transparent 70%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Composition frame: letterbox the design canvas + font gate + audio bed.
 * Each day mounts its own score (public/week1-dayN.wav, built by
 * scripts/render-week1-audio.mjs with SFX cues matched to that day's scenes). */
const Frame: React.FC<{ audio: string; children: React.ReactNode }> = ({
  audio,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const [handle] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    waitForFonts().then(() => continueRender(handle));
  }, [handle]);
  const scale = Math.min(width / W, height / H);
  return (
    <AbsoluteFill style={{ background: "#070709", fontFamily }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          left: (width - W * scale) / 2,
          top: (height - H * scale) / 2,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};

const seq = (from: number, to: number, fps: number) => ({
  from: Math.round(from * fps),
  durationInFrames: Math.round((to - from) * fps),
});

// ── Score tile (shared by Days 1–2) ───────────────────────────────────────────

const ScoreTile: React.FC<{
  label: string;
  value: number;
  color: string;
  appearAt: number;
  width?: number;
  flashAmberAt?: number;
}> = ({ label, value, color, appearAt, width = 280, flashAmberAt }) => {
  const { t, frame, fps } = useLocalT();
  const p = spring({
    frame: frame - Math.round(appearAt * fps),
    fps,
    config: SPRINGS.bar,
    durationInFrames: Math.round(1.2 * fps),
  });
  const flash =
    flashAmberAt !== undefined
      ? clamp01(Math.sin(Math.max(0, t - flashAmberAt) * 7)) *
        (t > flashAmberAt && t < flashAmberAt + 1.6 ? 1 : 0)
      : 0;
  return (
    <div
      style={{
        opacity: Math.min(1, p * 2),
        width,
        borderRadius: 26,
        background: `rgba(255,255,255,${0.94 - flash * 0.1})`,
        border: flash > 0.3 ? "2px solid #f59e0b" : "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 18px 50px rgba(236,72,153,0.12)",
        padding: "30px 32px",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: COLORS.slate400,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 84,
          fontWeight: 800,
          color: COLORS.slate900,
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(value * p)}
      </div>
      <div
        style={{
          marginTop: 16,
          height: 14,
          borderRadius: 7,
          background: "rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value * p}%`,
            borderRadius: 7,
            background: color,
          }}
        />
      </div>
    </div>
  );
};

// ══ DAY 1 — "The 5-Second Test" (12s) ════════════════════════════════════════

const D1Countdown: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const { t, frame, fps } = useLocalT();
  const idx = Math.min(4, Math.floor(t / 0.6));
  const digit = 5 - idx;
  const local = (t - idx * 0.6) / 0.6;
  const scale = 1.25 - 0.25 * clamp01(local * 3);
  const pulse = 1 + Math.sin(t * 9) * 0.02;
  const exit = interpolate(t, [durationSec - 0.35, durationSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  void frame;
  void fps;
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 50, opacity: exit }}
    >
      <div
        style={{
          fontSize: 480,
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1,
          transform: `scale(${scale})`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {digit}
      </div>
      <div
        style={{
          transform: `scale(${pulse})`,
          borderRadius: 24,
          border: "2px solid rgba(248,113,113,0.7)",
          background: "rgba(248,113,113,0.12)",
          padding: "24px 44px",
          display: "flex",
          alignItems: "baseline",
          gap: 18,
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 800, color: "#f87171", letterSpacing: 3 }}>
          HOOK
        </span>
        <span style={{ fontSize: 64, fontWeight: 800, color: "#fff" }}>41/100</span>
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
        Weak hook = instant scroll.
      </div>
    </AbsoluteFill>
  );
};

const D1Rescue: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 52 }}>
      <Pop durationSec={durationSec} delay={0.1}>
        <BrandMark size={92} />
      </Pop>
      <Pop durationSec={durationSec} delay={0.45}>
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            color: COLORS.slate900,
            letterSpacing: -1.5,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          Hyperyzer scores your hook <Grad>before</Grad> you post.
        </div>
      </Pop>
      <Pop durationSec={durationSec} delay={0.9} rise={60}>
        <ScoreTile label="Hook" value={89} color={COLORS.pink} appearAt={1.0} width={420} />
      </Pop>
    </AbsoluteFill>
  );
};

export const Day1: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day1;
  return (
    <Frame audio="week1-day1.wav">
      <Morph
        times={[0, 3.8, 4.5, 7.6, 8.2, D]}
        colors={["#070709", "#070709", COLORS.bg, COLORS.bg, "#070709", "#070709"]}
      />
      <Sequence {...seq(0, 1.1, fps)} name="hook">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
          <Pop durationSec={1.1} delay={0} out={0.2}>
            <Kicker>The scroll test</Kicker>
          </Pop>
          <Pop durationSec={1.1} delay={0.08} out={0.2}>
            <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
              <Grad>5 SECONDS</Grad>
            </div>
          </Pop>
        </AbsoluteFill>
      </Sequence>
      <Sequence {...seq(1.1, 4.2, fps)} name="countdown">
        <D1Countdown durationSec={3.1} />
      </Sequence>
      <Sequence {...seq(4.2, 8.0, fps)} name="rescue">
        <SceneFade durationSec={3.8}>
          <D1Rescue durationSec={3.8} />
        </SceneFade>
      </Sequence>
      <Sequence {...seq(8.0, D, fps)} name="cta">
        <CtaScene label="Score your next video — free" durationSec={D - 8.0} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 2 — "Watch an AI score this hook" (14s) ══════════════════════════════

const D2Card: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
      <Pop durationSec={durationSec} delay={0.05}>
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            color: COLORS.slate900,
            letterSpacing: -1.5,
            textAlign: "center",
          }}
        >
          I let an AI grade my hook. <Grad>Brutal.</Grad>
        </div>
      </Pop>
      <Pop durationSec={durationSec} delay={0.3} rise={70}>
        <div
          style={{
            width: 940,
            borderRadius: 36,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 30px 80px rgba(236,72,153,0.16)",
            padding: "44px 48px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: COLORS.slate400,
              }}
            >
              Your hook
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: COLORS.pink,
                background: COLORS.pink100,
                border: `1px solid ${COLORS.pink100}`,
                borderRadius: 12,
                padding: "8px 20px",
              }}
            >
              AI
            </span>
          </div>
          <div style={{ marginTop: 20, minHeight: 150 }}>
            <TypeLine
              text={'"POV: you’ve never seen a 100-day hardcore run end like this"'}
              startAt={0.7}
              cps={40}
              style={{
                fontSize: 46,
                fontWeight: 700,
                color: COLORS.slate900,
                lineHeight: 1.35,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 26 }}>
            <ScoreTile label="Hook" value={88} color={COLORS.pink} appearAt={2.6} />
            <ScoreTile label="Retention" value={74} color={COLORS.emerald} appearAt={3.5} flashAmberAt={8.1} />
            <ScoreTile label="Viral" value={91} color={COLORS.orange} appearAt={4.4} />
          </div>
        </div>
      </Pop>
      <Pop durationSec={durationSec} delay={8.0} rise={40}>
        <div
          style={{
            borderRadius: 999,
            background: COLORS.slate900,
            color: "#fff",
            fontSize: 44,
            fontWeight: 800,
            padding: "26px 54px",
            boxShadow: "0 20px 55px rgba(15,23,42,0.35)",
          }}
        >
          Strong hook. <span style={{ color: "#fbbf24" }}>Fix retention.</span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

export const Day2: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day2;
  return (
    <Frame audio="week1-day2.wav">
      <Morph
        times={[0, 10.4, 11.2, D]}
        colors={[COLORS.bg, COLORS.bg, "#070709", "#070709"]}
      />
      <Sequence {...seq(0, 11.2, fps)} name="demo">
        <SceneFade durationSec={11.2} out={0.6}>
          <D2Card durationSec={11.2} />
        </SceneFade>
      </Sequence>
      <Sequence {...seq(11.2, D, fps)} name="cta">
        <CtaScene label="Analyze your next video — free" durationSec={D - 11.2} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 3 — "Why your last video flopped" (15s) ══════════════════════════════

const ProblemRow: React.FC<{ text: string; appearAt: number }> = ({ text, appearAt }) => {
  const { frame, fps } = useLocalT();
  const p = spring({
    frame: frame - Math.round(appearAt * fps),
    fps,
    config: SPRINGS.soft,
    durationInFrames: Math.round(0.8 * fps),
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateX(${(1 - p) * -90}px)`,
        display: "flex",
        alignItems: "center",
        gap: 30,
        width: 880,
        borderRadius: 26,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "34px 40px",
      }}
    >
      <Cross />
      <span style={{ fontSize: 54, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
        {text}
      </span>
    </div>
  );
};

const D3Fixes: React.FC<{ durationSec: number }> = ({ durationSec }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 42 }}>
    <Pop durationSec={durationSec} delay={0.1}>
      <BrandMark size={84} />
    </Pop>
    <Pop durationSec={durationSec} delay={0.4}>
      <div
        style={{
          fontSize: 70,
          fontWeight: 800,
          color: COLORS.slate900,
          letterSpacing: -1.5,
        }}
      >
        Hyperyzer fixes <Grad>all three.</Grad>
      </div>
    </Pop>
    <Pop durationSec={durationSec} delay={0.8} rise={50}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: "rgba(255,255,255,0.94)",
          borderRadius: 24,
          border: "1px solid rgba(0,0,0,0.05)",
          padding: "26px 40px",
          boxShadow: "0 18px 50px rgba(236,72,153,0.12)",
        }}
      >
        <CheckIcon />
        <span style={{ fontSize: 42, fontWeight: 800, color: COLORS.slate900 }}>
          Hook 41 → 89
        </span>
      </div>
    </Pop>
    <Pop durationSec={durationSec} delay={1.15} rise={50}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <CheckIcon />
        <Chip text="#minecraft" appearAt={1.3} />
        <Chip text="#hardcore" appearAt={1.42} />
        <Chip text="#100days" appearAt={1.54} />
        <Chip text="#fyp" appearAt={1.66} />
      </div>
    </Pop>
    <Pop durationSec={durationSec} delay={1.6} rise={50}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: GRADIENT_BR,
          borderRadius: 24,
          padding: "26px 44px",
          boxShadow: "0 18px 55px rgba(236,72,153,0.4)",
        }}
      >
        <CheckIcon color="#fff" />
        <IconClock />
        <span style={{ fontSize: 42, fontWeight: 800, color: "#fff" }}>
          Post Tue &amp; Thu · 6–9 PM
        </span>
      </div>
    </Pop>
  </AbsoluteFill>
);

export const Day3: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day3;
  return (
    <Frame audio="week1-day3.wav">
      <Morph
        times={[0, 6.6, 7.4, 10.8, 11.5, D]}
        colors={["#070709", "#070709", COLORS.bg, COLORS.bg, "#070709", "#070709"]}
      />
      <Sequence {...seq(0, 7.0, fps)} name="problems">
        <SceneFade durationSec={7.0} out={0.5}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
            <Pop durationSec={7.0} delay={0.05} out={0.5}>
              <Kicker>Why it died</Kicker>
            </Pop>
            <Pop durationSec={7.0} delay={0.15} out={0.5}>
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: -2,
                  textAlign: "center",
                  lineHeight: 1.18,
                  maxWidth: 920,
                }}
              >
                3 reasons your last video <Grad>flopped</Grad>
              </div>
            </Pop>
            <ProblemRow text="Weak hook" appearAt={1.6} />
            <ProblemRow text="Wrong hashtags" appearAt={2.9} />
            <ProblemRow text="Posted at 3 A.M." appearAt={4.2} />
            <Pop durationSec={7.0} delay={5.3} out={0.5} rise={26}>
              <div style={{ fontSize: 42, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                (it wasn&rsquo;t the algorithm)
              </div>
            </Pop>
          </AbsoluteFill>
        </SceneFade>
      </Sequence>
      <Sequence {...seq(7.0, 11.5, fps)} name="fixes">
        <SceneFade durationSec={4.5} out={0.5}>
          <D3Fixes durationSec={4.5} />
        </SceneFade>
      </Sequence>
      <Sequence {...seq(11.5, D, fps)} name="cta">
        <CtaScene label="Fix your next video — free" durationSec={D - 11.5} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 4 — "One click. +18 points." (13s) ═══════════════════════════════════

const OptStat: React.FC<{
  label: string;
  before: number;
  after: number;
  flipAt: number;
}> = ({ label, before, after, flipAt }) => {
  const { frame, fps } = useLocalT();
  const p = spring({
    frame: frame - Math.round(flipAt * fps),
    fps,
    config: SPRINGS.pop,
    durationInFrames: Math.round(0.9 * fps),
  });
  const value = Math.round(before + (after - before) * p);
  const green = p > 0.25;
  return (
    <div
      style={{
        width: 286,
        borderRadius: 26,
        background: green ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.94)",
        border: green ? `2px solid ${COLORS.emerald}` : "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 18px 50px rgba(236,72,153,0.1)",
        padding: "30px 32px",
        transform: `scale(${1 + (p > 0 && p < 1 ? Math.sin(p * Math.PI) * 0.05 : 0)})`,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: green ? COLORS.emerald : COLORS.slate400,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: COLORS.slate900,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.05,
          }}
        >
          {value}
        </span>
        {green && (
          <span style={{ fontSize: 38, fontWeight: 800, color: COLORS.emerald }}>
            ▲{after - before}
          </span>
        )}
      </div>
    </div>
  );
};

export const Day4: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day4;
  const body = 9.0;
  return (
    <Frame audio="week1-day4.wav">
      <Morph times={[0, 8.3, 9.0, D]} colors={[COLORS.bg, COLORS.bg, "#070709", "#070709"]} />
      <Sequence {...seq(0, body, fps)} name="optimize">
        <SceneFade durationSec={body} out={0.5}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 }}>
            <Pop durationSec={body} delay={0.05} out={0.5}>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: COLORS.slate900,
                  letterSpacing: -1.5,
                  textAlign: "center",
                  lineHeight: 1.2,
                  maxWidth: 940,
                }}
              >
                Watch <Grad>one click</Grad> rewrite my whole video.
              </div>
            </Pop>
            <Pop durationSec={body} delay={0.4} out={0.5} rise={60}>
              <div style={{ display: "flex", gap: 26 }}>
                <OptStat label="Hook" before={88} after={96} flipAt={4.0} />
                <OptStat label="Retention" before={74} after={90} flipAt={4.35} />
                <OptStat label="Viral" before={91} after={97} flipAt={4.7} />
              </div>
            </Pop>
            <Pop durationSec={body} delay={2.0} out={0.5} rise={40}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: GRADIENT_BR,
                  borderRadius: 999,
                  padding: "28px 56px",
                  boxShadow: "0 22px 60px rgba(236,72,153,0.45)",
                }}
              >
                <IconZap size={48} />
                <span style={{ fontSize: 48, fontWeight: 800, color: "#fff" }}>
                  One-Click Optimize
                </span>
              </div>
            </Pop>
            <Pop durationSec={body} delay={5.6} out={0.5} rise={30}>
              <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
                <Grad>+30 points total</Grad>
              </div>
            </Pop>
          </AbsoluteFill>
        </SceneFade>
      </Sequence>
      <Sequence {...seq(body, D, fps)} name="cta">
        <CtaScene label="Optimize your next video — free" durationSec={D - body} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 5 — "It writes it for you" (16s) ═════════════════════════════════════

const ScriptLine: React.FC<{
  tag: string;
  text: string;
  startAt: number;
}> = ({ tag, text, startAt }) => {
  const { t } = useLocalT();
  const visible = t >= startAt - 0.15;
  return (
    <div style={{ display: "flex", gap: 26, opacity: visible ? 1 : 0, minHeight: 118 }}>
      <span
        style={{
          fontFamily: fontFamilyMono,
          fontSize: 30,
          fontWeight: 700,
          color: COLORS.pink,
          letterSpacing: 2,
          width: 130,
          flexShrink: 0,
          paddingTop: 8,
        }}
      >
        {tag}
      </span>
      <TypeLine
        text={text}
        startAt={startAt}
        cps={38}
        style={{ fontSize: 40, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}
      />
    </div>
  );
};

export const Day5: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day5;
  const body = 12.0;
  return (
    <Frame audio="week1-day5.wav">
      <Morph times={[0, D]} colors={["#070709", "#070709"]} />
      <Sequence {...seq(0, body, fps)} name="studio">
        <SceneFade durationSec={body} out={0.5}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
            <Pop durationSec={body} delay={0.05} out={0.5}>
              <Kicker>The Studio</Kicker>
            </Pop>
            <Pop durationSec={body} delay={0.2} out={0.5}>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: -2,
                  textAlign: "center",
                  lineHeight: 1.18,
                  maxWidth: 940,
                }}
              >
                Don&rsquo;t just score it —<br />
                <Grad>it writes it for you.</Grad>
              </div>
            </Pop>
            <Pop durationSec={body} delay={0.8} out={0.5} rise={70}>
              <div
                style={{
                  width: 940,
                  borderRadius: 36,
                  background: "#0b1222",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
                  padding: "46px 50px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 22,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: 5,
                    textTransform: "uppercase",
                    color: "#f9a8d4",
                    marginBottom: 6,
                  }}
                >
                  AI Script Writer
                </div>
                <ScriptLine
                  tag="HOOK"
                  text="I gave my dog a job interview. He negotiated."
                  startAt={2.0}
                />
                <ScriptLine
                  tag="BEAT"
                  text="Show the resume: one dog treat, laminated."
                  startAt={4.2}
                />
                <ScriptLine
                  tag="TWIST"
                  text="He gets the job — then asks for a raise."
                  startAt={6.4}
                />
                <ScriptLine
                  tag="CTA"
                  text="Follow for part 2: salary negotiation."
                  startAt={8.6}
                />
              </div>
            </Pop>
          </AbsoluteFill>
        </SceneFade>
      </Sequence>
      <Sequence {...seq(body, D, fps)} name="cta">
        <CtaScene label="Try the free analyzer" durationSec={D - body} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 6 — "Post at the right time" (11s) ═══════════════════════════════════

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const WeekGrid: React.FC<{ litAt: number }> = ({ litAt }) => {
  const { frame, fps } = useLocalT();
  return (
    <div style={{ display: "flex", gap: 22 }}>
      {DAY_LABELS.map((d, i) => {
        const lit = i === 1 || i === 3; // Tue, Thu
        const p = spring({
          frame: frame - Math.round((litAt + (i === 1 ? 0 : 0.3)) * fps),
          fps,
          config: SPRINGS.pop,
          durationInFrames: Math.round(0.7 * fps),
        });
        const on = lit ? p : 0;
        return (
          <div
            key={`${d}-${i}`}
            style={{
              width: 118,
              height: 150,
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: on > 0.3 ? GRADIENT_BR : "rgba(15,23,42,0.06)",
              border: "1px solid rgba(15,23,42,0.08)",
              transform: `scale(${1 + on * 0.08})`,
              boxShadow: on > 0.3 ? "0 18px 50px rgba(236,72,153,0.35)" : "none",
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: on > 0.3 ? "#fff" : COLORS.slate400,
              }}
            >
              {d}
            </span>
            {on > 0.5 && <CheckIcon size={34} color="#fff" />}
          </div>
        );
      })}
    </div>
  );
};

export const Day6: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day6;
  const body = 8.5;
  return (
    <Frame audio="week1-day6.wav">
      <Morph times={[0, 7.8, 8.5, D]} colors={[COLORS.bg, COLORS.bg, "#070709", "#070709"]} />
      <Sequence {...seq(0, body, fps)} name="timing">
        <SceneFade durationSec={body} out={0.5}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 52 }}>
            <Pop durationSec={body} delay={0.05} out={0.5}>
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  color: COLORS.slate900,
                  letterSpacing: -1.5,
                  textAlign: "center",
                  lineHeight: 1.2,
                  maxWidth: 940,
                }}
              >
                You&rsquo;re posting at the <Grad>wrong time.</Grad>
              </div>
            </Pop>
            <Pop durationSec={body} delay={0.5} out={0.5} rise={50}>
              <WeekGrid litAt={1.6} />
            </Pop>
            <Pop durationSec={body} delay={2.4} out={0.5} rise={40}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  background: GRADIENT_BR,
                  borderRadius: 999,
                  padding: "28px 56px",
                  boxShadow: "0 22px 60px rgba(236,72,153,0.4)",
                }}
              >
                <IconClock size={52} />
                <span style={{ fontSize: 50, fontWeight: 800, color: "#fff" }}>
                  Tue &amp; Thu · 6–9 PM
                </span>
              </div>
            </Pop>
            <Pop durationSec={body} delay={5.6} out={0.5} rise={30}>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.slate600,
                  textAlign: "center",
                  maxWidth: 880,
                  lineHeight: 1.35,
                }}
              >
                Hyperyzer tells you when your audience is actually watching.
              </div>
            </Pop>
          </AbsoluteFill>
        </SceneFade>
      </Sequence>
      <Sequence {...seq(body, D, fps)} name="cta">
        <CtaScene label="Find your best time — free" durationSec={D - body} />
      </Sequence>
    </Frame>
  );
};

// ══ DAY 7 — "Start free" (12s) ═══════════════════════════════════════════════

const FlashCard: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({
  from,
  to,
  children,
}) => {
  const { t, frame, fps } = useLocalT();
  if (t < from || t > to) return null;
  const p = spring({
    frame: frame - Math.round(from * fps),
    fps,
    config: SPRINGS.pop,
    durationInFrames: Math.round(0.5 * fps),
  });
  const exit = interpolate(t, [to - 0.18, to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: p * exit, transform: `scale(${0.85 + p * 0.15})` }}>{children}</div>
    </AbsoluteFill>
  );
};

const MiniRing: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 40,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 36,
      padding: "44px 60px",
    }}
  >
    <div
      style={{
        width: 190,
        height: 190,
        borderRadius: 95,
        background: GRADIENT_BR,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 86, fontWeight: 800, color: "#fff", lineHeight: 1 }}>A</span>
      <span style={{ fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
        84/100
      </span>
    </div>
    <span style={{ fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
      Scores + grade
    </span>
  </div>
);

export const Day7: React.FC = () => {
  const { fps } = useVideoConfig();
  const D = DAY_DURATIONS.Day7;
  return (
    <Frame audio="week1-day7.wav">
      <Morph times={[0, D]} colors={["#070709", "#070709"]} />
      <Sequence {...seq(0, 4.0, fps)} name="montage">
        <FlashCard from={0} to={1.0}>
          <MiniRing />
        </FlashCard>
        <FlashCard from={1.0} to={2.0}>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { l: "Hook", v: "96 ▲8" },
              { l: "Retention", v: "90 ▲16" },
              { l: "Viral", v: "97 ▲6" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  borderRadius: 26,
                  background: "rgba(16,185,129,0.12)",
                  border: `2px solid ${COLORS.emerald}`,
                  padding: "30px 34px",
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.emerald, letterSpacing: 3 }}>
                  {s.l.toUpperCase()}
                </div>
                <div style={{ fontSize: 60, fontWeight: 800, color: "#fff" }}>{s.v}</div>
              </div>
            ))}
          </div>
        </FlashCard>
        <FlashCard from={2.0} to={3.0}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
            <Chip text="#fyp" appearAt={2.05} />
            <Chip text="#creatortips" appearAt={2.12} />
            <Chip text="#viral" appearAt={2.19} />
            <Chip text="#howto" appearAt={2.26} />
            <Chip text="#storytime" appearAt={2.33} />
          </div>
        </FlashCard>
        <FlashCard from={3.0} to={4.0}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              background: GRADIENT_BR,
              borderRadius: 999,
              padding: "30px 60px",
            }}
          >
            <IconClock size={52} />
            <span style={{ fontSize: 52, fontWeight: 800, color: "#fff" }}>
              Best time: Tue · 6 PM
            </span>
          </div>
        </FlashCard>
      </Sequence>
      <Sequence {...seq(4.0, 9.0, fps)} name="offer">
        <SceneFade durationSec={5.0} out={0.4}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 }}>
            <Pop durationSec={5.0} delay={0.1} out={0.4}>
              <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: -5 }}>
                <Grad>Start free.</Grad>
              </div>
            </Pop>
            <Pop durationSec={5.0} delay={0.5} out={0.4}>
              <div style={{ fontSize: 52, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
                10 credits. No card. No risk.
              </div>
            </Pop>
            <Pop durationSec={5.0} delay={1.4} out={0.4} rise={60}>
              <div
                style={{
                  position: "relative",
                  width: 660,
                  borderRadius: 34,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  padding: "48px 52px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -26,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: GRADIENT_BR,
                    borderRadius: 999,
                    padding: "12px 32px",
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: 3,
                  }}
                >
                  START HERE
                </div>
                <div style={{ fontSize: 46, fontWeight: 800, color: "#fff" }}>Free</div>
                <div style={{ fontSize: 96, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
                  €0
                </div>
                <div style={{ fontSize: 36, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>
                  10 starter credits · full report: scores, fixes, hashtags &amp; timing
                </div>
              </div>
            </Pop>
          </AbsoluteFill>
        </SceneFade>
      </Sequence>
      <Sequence {...seq(9.0, D, fps)} name="cta">
        <CtaScene label="Analyze your next video — free" durationSec={D - 9.0} />
      </Sequence>
    </Frame>
  );
};
