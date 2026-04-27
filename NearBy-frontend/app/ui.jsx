// Shared UI atoms for NearBy: badges, pills, stars, thumbnails, buttons.
// These read from `tokens` prop (the active palette) so variants re-skin live.

const { formatINR } = window;

// Solid brand dot
function NBDot({ color = "#2F8F5E", size = 8 }) {
  return <span style={{
    display: "inline-block", width: size, height: size, borderRadius: 999,
    background: color, boxShadow: `0 0 0 3px ${color}22`, flexShrink: 0,
  }} />;
}

function NBStar({ size = 12, filled = true, color = "#E49B15" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}
         stroke={color} strokeWidth="1.6" style={{ flexShrink: 0 }}>
      <polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9" />
    </svg>
  );
}

function NBRatingPill({ rating, tokens, compact = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: compact ? "2px 7px" : "3px 9px",
      background: tokens.successSoft, color: tokens.primaryDeep,
      borderRadius: 999, fontSize: compact ? 11 : 12, fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
    }}>
      <NBStar size={compact ? 10 : 12} color={tokens.success} />
      {rating.toFixed(1)}
    </span>
  );
}

function NBVerifiedBadge({ tokens, label = "Verified", compact = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: compact ? "2px 7px" : "3px 9px",
      background: tokens.primarySoft, color: tokens.primaryDeep,
      borderRadius: 999, fontSize: compact ? 10 : 11, fontWeight: 700,
      letterSpacing: 0.2, textTransform: "uppercase",
    }}>
      <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.4 2 3.1-.3.9 3 2.6 1.8-1.2 2.9 1.2 2.9-2.6 1.8-.9 3-3.1-.3L12 22l-2.4-2-3.1.3-.9-3L3 15.5l1.2-2.9L3 9.7l2.6-1.8.9-3 3.1.3L12 2z"
              fill={tokens.primary} />
        <path d="M8.5 12l2.3 2.3L15.5 9.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

function NBOpenBadge({ open, closesAt, tokens }) {
  const bg = open ? tokens.successSoft : "#EFE7DC";
  const fg = open ? tokens.success    : tokens.inkMute;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", background: bg, color: fg,
      borderRadius: 999, fontSize: 11, fontWeight: 600,
    }}>
      <NBDot color={fg} size={6} />
      {open ? `Open · till ${closesAt}` : closesAt}
    </span>
  );
}

// Painted product/shop thumbnail — we don't have photos, so make a
// hand-styled painted swatch with the item's initial. This looks richer
// than grey placeholders and fits the warm brand.
function NBProductThumb({ hue = 30, label = "?", size = 72, radius = 14, withLabel = true }) {
  const bg1 = `oklch(0.88 0.09 ${hue})`;
  const bg2 = `oklch(0.78 0.13 ${hue})`;
  const ring = `oklch(0.58 0.14 ${hue})`;
  const initial = (label || "?").trim()[0]?.toUpperCase() || "?";
  const isNumeric = typeof size === "number";
  const labelFs = isNumeric ? size * 0.38 : 28;
  return (
    <div style={{
      width: size, height: isNumeric ? size : "auto",
      aspectRatio: isNumeric ? undefined : "1/1",
      borderRadius: radius,
      background: `radial-gradient(120% 120% at 20% 15%, ${bg1}, ${bg2})`,
      position: "relative", overflow: "hidden", flexShrink: 0,
      boxShadow: `inset 0 0 0 1px ${ring}33`,
    }}>
      {/* painted blob */}
      <svg width="100%" height="100%" viewBox="0 0 72 72" style={{ position: "absolute", inset: 0 }}>
        <circle cx="52" cy="20" r="12" fill={ring} opacity="0.18" />
        <circle cx="18" cy="50" r="16" fill="#ffffff" opacity="0.22" />
      </svg>
      {withLabel && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontFamily: "var(--nb-display)", fontWeight: 600,
          fontSize: labelFs, color: ring, letterSpacing: -0.5,
        }}>{initial}</div>
      )}
    </div>
  );
}

// Shop cover — wider painted scene with an awning-style top
function NBShopCover({ hue = 28, name, aspect = "16/9", tokens }) {
  const bg1 = `oklch(0.92 0.06 ${hue})`;
  const bg2 = `oklch(0.80 0.14 ${hue})`;
  const accent = `oklch(0.55 0.17 ${hue})`;
  return (
    <div style={{
      width: "100%", aspectRatio: aspect, borderRadius: 16, overflow: "hidden",
      position: "relative",
      background: `linear-gradient(160deg, ${bg1}, ${bg2})`,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice"
           style={{ position: "absolute", inset: 0 }}>
        {/* awning stripes */}
        <g opacity="0.9">
          {[...Array(10)].map((_, i) => (
            <rect key={i} x={i * 40} y="0" width="20" height="38" fill={accent} opacity="0.55" />
          ))}
        </g>
        <rect x="0" y="36" width="400" height="6" fill={accent} opacity="0.9" />
        {/* shop facade */}
        <rect x="40" y="80" width="320" height="140" rx="8" fill="#ffffff" opacity="0.5" />
        <rect x="70" y="120" width="100" height="90" rx="6" fill={accent} opacity="0.25" />
        <rect x="190" y="120" width="140" height="90" rx="6" fill={accent} opacity="0.18" />
        {/* string-lights */}
        <path d="M0 55 Q 100 70 200 55 T 400 55" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.8" />
        {[30, 80, 130, 180, 230, 280, 330].map((x, i) => (
          <circle key={i} cx={x} cy={57 + (i%2?3:0)} r="3.5" fill={tokens?.accent || "#F4A62A"} />
        ))}
      </svg>
      <div style={{
        position: "absolute", left: 14, bottom: 12,
        fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600,
        color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.35)", letterSpacing: -0.3,
      }}>{name}</div>
    </div>
  );
}

function NBButton({ children, onClick, variant = "primary", tokens, full = false, size = "md", disabled = false, style }) {
  const pad = size === "lg" ? "15px 22px" : size === "sm" ? "8px 14px" : "12px 18px";
  const fs  = size === "lg" ? 16 : size === "sm" ? 13 : 15;
  const bg = disabled ? "#D9CEBD"
    : variant === "primary" ? tokens.primary
    : variant === "ghost"   ? "transparent"
    : variant === "soft"    ? tokens.primarySoft
    : variant === "danger"  ? "transparent"
    : tokens.card;
  const fg = disabled ? "#8A7C6A"
    : variant === "primary" ? "#fff"
    : variant === "ghost"   ? tokens.ink
    : variant === "soft"    ? tokens.primaryDeep
    : variant === "danger"  ? tokens.danger
    : tokens.ink;
  const border = variant === "outline" ? `1.5px solid ${tokens.line}`
    : variant === "danger" ? `1.5px solid ${tokens.danger}33`
    : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: pad, width: full ? "100%" : "auto",
      background: bg, color: fg, border, borderRadius: 14,
      fontSize: fs, fontWeight: 600, fontFamily: "var(--nb-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: variant === "primary" && !disabled ? `0 6px 14px -6px ${tokens.primary}aa` : "none",
      transition: "transform .1s ease, box-shadow .2s ease",
      ...style,
    }}>{children}</button>
  );
}

function NBIconCircle({ children, size = 36, tokens, onClick, bg }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 999,
      background: bg || tokens.card, color: tokens.ink,
      border: `1px solid ${tokens.line}`, cursor: "pointer",
      display: "grid", placeItems: "center", flexShrink: 0,
    }}>{children}</button>
  );
}

// "Handwritten" trust ribbon
function NBTrustRibbon({ score, tokens }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", background: tokens.primarySoft,
      borderRadius: 14, border: `1px dashed ${tokens.primary}55`,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 999, background: tokens.primary,
        color: "#fff", display: "grid", placeItems: "center",
        fontFamily: "var(--nb-display)", fontWeight: 700, fontSize: 16,
      }}>{score}</div>
      <div>
        <div style={{ fontSize: 12, color: tokens.inkMute, fontWeight: 600 }}>Trust score</div>
        <div style={{ fontSize: 13, color: tokens.ink, fontWeight: 600 }}>
          Trusted Seller · fast response
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NBDot, NBStar, NBRatingPill, NBVerifiedBadge, NBOpenBadge,
  NBProductThumb, NBShopCover, NBButton, NBIconCircle, NBTrustRibbon,
});
