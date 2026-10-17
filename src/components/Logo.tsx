/** Знак Glow Space, направление A «Двойное свечение»: два круга и общая область между ними. */
export function LogoMark({ height = 18 }: { height?: number }) {
  const width = Math.round((height * 64) / 44);
  // На малых размерах кольца утолщаются, чтобы не слипаться (как в макете: 36 / 24 / 16 px).
  const stroke = height >= 30 ? 2.6 : height >= 20 ? 3.2 : 4;
  return (
    <svg className="logo-mark" viewBox="0 0 64 44" width={width} height={height} aria-hidden="true">
      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth={stroke} opacity=".4" />
      <circle cx="42" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth={stroke} opacity=".4" />
      <path d="M 32 7.03 A 18 18 0 0 1 32 36.97 A 18 18 0 0 1 32 7.03 Z" fill="currentColor" />
    </svg>
  );
}

/** Знак + надпись GLOW SPACE (Outfit: GLOW — 600, SPACE — 300 цветом знака). */
export function Logo({ height = 18 }: { height?: number }) {
  return (
    <span className="logo">
      <LogoMark height={height} />
      <span className="wordmark">
        GLOW <span className="wordmark-space">SPACE</span>
      </span>
    </span>
  );
}
