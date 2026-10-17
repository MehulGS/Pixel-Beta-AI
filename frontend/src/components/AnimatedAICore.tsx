import { useEffect, useState } from "react";

interface Props {
  size?: number;
}

function pt(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = pt(cx, cy, r, startDeg);
  const end   = pt(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function AnimatedAICore({ size = 300 }: Props) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cx = size / 2;
  const cy = size / 2;

  const R = {
    outerGlow:  cx * 0.96,
    tick:       cx * 0.88,
    ring1:      cx * 0.84,
    ring2:      cx * 0.72,
    ring3:      cx * 0.60,
    ring4:      cx * 0.49,
    nodes:      cx * 0.72,
    segArc:     cx * 0.60,
    particles1: cx * 0.80,
    particles2: cx * 0.55,
    center:     cx * 0.22,
    coreDot:    cx * 0.06,
  };

  const animated = !reducedMotion;

  return (
    <div
      className={`ai-core-wrapper ${reducedMotion ? "ai-core-static" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--core-primary)"   stopOpacity="0.25" />
            <stop offset="35%"  stopColor="var(--core-secondary)"  stopOpacity="0.12" />
            <stop offset="70%"  stopColor="var(--core-primary)"   stopOpacity="0.04" />
            <stop offset="100%" stopColor="var(--core-primary)"   stopOpacity="0" />
          </radialGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--core-primary)"  stopOpacity="1" />
            <stop offset="40%"  stopColor="var(--core-primary)"  stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--core-secondary)" stopOpacity="0" />
          </radialGradient>
          <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="haloGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={R.outerGlow} fill="url(#coreGlow)" className={animated ? "core-outer-pulse" : ""} />

        <circle cx={cx} cy={cy} r={R.ring1} fill="none" stroke="var(--core-primary)" strokeWidth="0.5" opacity="0.12" />

        <g className={animated ? "ring-spin-cw-slow" : ""}>
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = i * 10;
            const isMajor = i % 3 === 0;
            const inner = pt(cx, cy, R.tick - (isMajor ? 7 : 4), angle);
            const outer = pt(cx, cy, R.tick + (isMajor ? 3 : 1), angle);
            return (
              <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="var(--core-primary)" strokeWidth={isMajor ? 1.5 : 0.8} opacity={isMajor ? 0.5 : 0.25} />
            );
          })}
          <circle cx={cx} cy={cy} r={R.tick} fill="none" stroke="var(--core-primary)" strokeWidth="0.5" opacity="0.15" />
        </g>

        <g className={animated ? "ring-spin-cw-slow" : ""}>
          <circle cx={cx} cy={cy} r={R.ring1} fill="none" stroke="var(--core-bg-ring)" strokeWidth="3" opacity="0.6" />
          {[0, 90, 180, 270].map((startAngle, i) => (
            <path key={i} d={arcPath(cx, cy, R.ring1, startAngle + 5, startAngle + 65)}
              fill="none" stroke="var(--core-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.8" filter="url(#glowSoft)" />
          ))}
          {[45, 135, 225, 315].map((angle, i) => {
            const outer = pt(cx, cy, R.ring1 + 8, angle);
            const inner = pt(cx, cy, R.ring1 - 2, angle);
            return (
              <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="var(--core-primary)" strokeWidth="2" opacity="0.6" filter="url(#glowSoft)" />
            );
          })}
        </g>

        <g className={animated ? "ring-spin-ccw-med" : ""}>
          <circle cx={cx} cy={cy} r={R.ring2} fill="none" stroke="var(--core-bg-ring)" strokeWidth="2" opacity="0.5" />
          <path d={arcPath(cx, cy, R.ring2, 10, 160)} fill="none" stroke="var(--core-primary)"
            strokeWidth="2.5" strokeLinecap="round" opacity="0.9" filter="url(#glowSoft)" />
          <path d={arcPath(cx, cy, R.ring2, 190, 340)} fill="none" stroke="var(--core-secondary)"
            strokeWidth="2" strokeLinecap="round" opacity="0.6" filter="url(#glowSoft)" />
        </g>

        <g className={animated ? "ring-spin-ccw-med" : ""}>
          {Array.from({ length: 8 }).map((_, i) => {
            const p = pt(cx, cy, R.nodes, i * 45);
            return <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--core-primary)" opacity="0.7" filter="url(#glowSoft)" />;
          })}
        </g>

        <g className={animated ? "ring-spin-cw-fast" : ""}>
          <circle cx={cx} cy={cy} r={R.ring3} fill="none" stroke="var(--core-bg-ring)" strokeWidth="2" opacity="0.4" />
          {[0, 120, 240].map((start, i) => (
            <path key={i} d={arcPath(cx, cy, R.ring3, start + 8, start + 100)}
              fill="none" stroke="var(--core-primary)" strokeWidth="2.5" strokeLinecap="round"
              opacity={0.85 - i * 0.1} filter="url(#glowSoft)" />
          ))}
        </g>

        <g className={animated ? "ring-spin-ccw-slow" : ""}>
          <circle cx={cx} cy={cy} r={R.ring4} fill="none" stroke="var(--core-primary)"
            strokeWidth="1" strokeDasharray="5 8" opacity="0.35" />
        </g>

        <g className={animated ? "arc-spin-cw" : ""}>
          {[30, 150, 270].map((start, i) => (
            <path key={i} d={arcPath(cx, cy, R.segArc - 4, start, start + 30)}
              fill="none" stroke="var(--core-secondary)" strokeWidth="4" strokeLinecap="round" opacity="0.4" filter="url(#glowSoft)" />
          ))}
        </g>
        <g className={animated ? "arc-spin-ccw" : ""}>
          {[60, 180, 300].map((start, i) => (
            <path key={i} d={arcPath(cx, cy, R.segArc + 4, start, start + 20)}
              fill="none" stroke="var(--core-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          ))}
        </g>

        {Array.from({ length: 8 }).map((_, i) => {
          const p = pt(cx, cy, R.particles1, i * 45 + 22.5);
          const cls = i % 3 === 0 ? "particle-a" : i % 3 === 1 ? "particle-b" : "particle-c";
          return (
            <circle key={`po-${i}`} cx={p.x} cy={p.y} r="2.5" fill="var(--core-primary)"
              opacity="0.6" className={animated ? cls : ""} filter="url(#glowSoft)" />
          );
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const p = pt(cx, cy, R.particles2, i * 60);
          const cls = i % 3 === 0 ? "particle-b" : i % 3 === 1 ? "particle-c" : "particle-a";
          return (
            <circle key={`pi-${i}`} cx={p.x} cy={p.y} r="2" fill="var(--core-secondary)"
              opacity="0.5" className={animated ? cls : ""} />
          );
        })}

        <circle cx={cx} cy={cy} r={R.center * 1.6} fill="none" stroke="var(--core-primary)"
          strokeWidth="8" opacity="0.08" filter="url(#haloGlow)" className={animated ? "core-outer-pulse" : ""} />

        <circle cx={cx} cy={cy} r={R.center} fill="var(--core-center)"
          stroke="var(--core-primary)" strokeWidth="1.5" opacity="0.95" />

        {Array.from({ length: 12 }).map((_, i) => {
          const inner = pt(cx, cy, R.center * 0.5, i * 30);
          const outer = pt(cx, cy, R.center * 0.88, i * 30);
          return (
            <line key={`spoke-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="var(--core-primary)" strokeWidth="0.8" opacity="0.4" />
          );
        })}

        <circle cx={cx} cy={cy} r={R.center} fill="none" stroke="var(--core-primary)"
          strokeWidth="6" opacity="0.3" filter="url(#glowStrong)" className={animated ? "core-center-pulse" : ""} />

        <circle cx={cx} cy={cy} r={R.center * 0.7} fill="url(#centerGlow)"
          opacity="0.6" className={animated ? "core-center-pulse" : ""} />

        <circle cx={cx} cy={cy} r={R.coreDot} fill="var(--core-primary)" filter="url(#glowStrong)" opacity="1" />
        <circle cx={cx} cy={cy} r={R.coreDot * 0.5} fill="white" opacity="0.9" />

        <path
          d={`M ${cx + R.ring1 * 0.7} ${cy - R.ring1 * 0.7} L ${cx + R.ring1 * 0.9} ${cy - R.ring1 * 0.9} L ${cx + R.ring1 * 0.9} ${cy - R.outerGlow * 0.75}`}
          fill="none" stroke="var(--core-primary)" strokeWidth="1" opacity="0.25" strokeLinecap="square" />
        <path
          d={`M ${cx - R.ring1 * 0.7} ${cy + R.ring1 * 0.7} L ${cx - R.ring1 * 0.9} ${cy + R.ring1 * 0.9} L ${cx - R.ring1 * 0.9} ${cy + R.outerGlow * 0.75}`}
          fill="none" stroke="var(--core-primary)" strokeWidth="1" opacity="0.2" strokeLinecap="square" />
        <rect x={cx + R.ring1 * 0.87} y={cy - R.outerGlow * 0.78} width="5" height="5"
          fill="var(--core-primary)" opacity="0.4"
          transform={`rotate(45, ${cx + R.ring1 * 0.895}, ${cy - R.outerGlow * 0.755})`} />
        <rect x={cx - R.ring1 * 0.92} y={cy + R.outerGlow * 0.72} width="5" height="5"
          fill="var(--core-secondary)" opacity="0.35"
          transform={`rotate(45, ${cx - R.ring1 * 0.895}, ${cy + R.outerGlow * 0.745})`} />
      </svg>
    </div>
  );
}
