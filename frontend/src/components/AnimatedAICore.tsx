import { useEffect, useState } from "react";

interface Props {
  size?: number;
}

export function AnimatedAICore({ size = 260 }: Props) {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="ai-core-wrapper" style={{ width: size, height: size }} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        className={reducedMotion ? "ai-core-static" : "ai-core-animated"}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#0099cc" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#001a2e" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={cx * 0.85} fill="url(#coreGlow)" />

        <circle cx={cx} cy={cy} r={cx * 0.82} fill="none" stroke="#0a4a5e" strokeWidth="1" opacity="0.6" />
        <circle
          cx={cx} cy={cy} r={cx * 0.82} fill="none" stroke="#00d4ff" strokeWidth="2"
          strokeDasharray={`${cx * 0.82 * 2 * Math.PI * 0.25} ${cx * 0.82 * 2 * Math.PI * 0.75}`}
          strokeLinecap="round" filter="url(#glow)" className="ring-1" opacity="0.8"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const r = cx * 0.82;
          return (
            <line
              key={i}
              x1={cx + (r - 4) * Math.cos(angle)} y1={cy + (r - 4) * Math.sin(angle)}
              x2={cx + (r + 4) * Math.cos(angle)} y2={cy + (r + 4) * Math.sin(angle)}
              stroke="#00d4ff" strokeWidth="1.5" opacity="0.4"
            />
          );
        })}

        <circle cx={cx} cy={cy} r={cx * 0.65} fill="none" stroke="#062a38" strokeWidth="1" />
        <circle
          cx={cx} cy={cy} r={cx * 0.65} fill="none" stroke="#00b8e0" strokeWidth="2.5"
          strokeDasharray={`${cx * 0.65 * 2 * Math.PI * 0.35} ${cx * 0.65 * 2 * Math.PI * 0.65}`}
          strokeLinecap="round" filter="url(#glow)" className="ring-2" opacity="0.9"
        />

        <circle cx={cx} cy={cy} r={cx * 0.50} fill="none" stroke="#031c27" strokeWidth="1" />
        <circle
          cx={cx} cy={cy} r={cx * 0.50} fill="none" stroke="#0090b8" strokeWidth="2"
          strokeDasharray={`${cx * 0.50 * 2 * Math.PI * 0.45} ${cx * 0.50 * 2 * Math.PI * 0.55}`}
          strokeLinecap="round" filter="url(#glow)" className="ring-3" opacity="0.85"
        />

        <circle
          cx={cx} cy={cy} r={cx * 0.36} fill="none" stroke="#00d4ff"
          strokeWidth="1" strokeDasharray="4 6" opacity="0.3" className="ring-4"
        />

        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const r = cx * 0.65;
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)}
              r="3.5" fill="#00d4ff" filter="url(#glow)" opacity="0.7"
            />
          );
        })}

        <circle cx={cx} cy={cy} r={cx * 0.20} fill="#001824" stroke="#00d4ff" strokeWidth="1.5" opacity="0.9" />
        <circle cx={cx} cy={cy} r={cx * 0.20} fill="none" stroke="#00d4ff" strokeWidth="8" filter="url(#glowStrong)" className="core-pulse" opacity="0.4" />
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i * 36 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + cx * 0.14 * Math.cos(angle)} y1={cy + cx * 0.14 * Math.sin(angle)}
              x2={cx + cx * 0.19 * Math.cos(angle)} y2={cy + cx * 0.19 * Math.sin(angle)}
              stroke="#00d4ff" strokeWidth="1.5" opacity="0.6"
            />
          );
        })}
        <circle cx={cx} cy={cy} r="4" fill="#00d4ff" filter="url(#glowStrong)" />

        {[
          { r: cx * 0.73, a: 15 }, { r: cx * 0.73, a: 105 },
          { r: cx * 0.73, a: 195 }, { r: cx * 0.73, a: 285 },
          { r: cx * 0.57, a: 55 }, { r: cx * 0.57, a: 145 },
          { r: cx * 0.57, a: 235 }, { r: cx * 0.57, a: 325 },
        ].map(({ r, a }, i) => {
          const angle = (a * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)}
              r="2" fill="#00d4ff" opacity="0.5"
              className={`particle-${i % 3}`}
            />
          );
        })}
      </svg>
    </div>
  );
}
