// Order tracking — two layout variants:
//   • mapFirst  — map dominant (top half), status sheet (bottom half)
//   • statusFirst — timeline prominent, map is a companion card

const {
  NEARBY_SHOPS, NEARBY_TIMELINE, getCartLines,
  NBButton, NBIconCircle, NBDot, NBStar, NBRatingPill, NBVerifiedBadge,
  NBShopCover, NBProductThumb, formatINR, computeCartTotal,
} = window;

// A simulated "live map" — SVG with customer, shop, rider markers.
// progress 0..1 is how far along the rider is on the route.
function NBMiniMap({ tokens, progress = 0, style, withLabels = true, height = 240 }) {
  // route path from shop (top-left) → customer (bottom-right)
  const path = "M 50 60 C 130 80, 170 160, 280 230";
  // sample path at progress: approximate with quadratic points
  // Use two helper points
  const shop = { x: 50, y: 60 };
  const cust = { x: 280, y: 230 };
  const ctrl = { x: 180, y: 110 };
  // quadratic bezier
  const t = progress;
  const rider = {
    x: (1 - t) * (1 - t) * shop.x + 2 * (1 - t) * t * ctrl.x + t * t * cust.x,
    y: (1 - t) * (1 - t) * shop.y + 2 * (1 - t) * t * ctrl.y + t * t * cust.y,
  };

  // paper-style map palette (warm)
  const land = tokens.paperDeep;
  const road = "#E6D6B4";

  return (
    <div style={{
      position: "relative", width: "100%", height, background: land,
      borderRadius: 18, overflow: "hidden", border: `1px solid ${tokens.line}`,
      ...style,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 340 300" preserveAspectRatio="xMidYMid slice">
        {/* blocks / buildings */}
        {[
          [20, 20, 80, 40], [115, 15, 70, 35], [200, 25, 70, 50], [285, 35, 40, 50],
          [18, 100, 60, 40], [15, 180, 55, 55], [95, 210, 70, 50], [200, 120, 60, 45],
          [185, 195, 65, 60], [270, 170, 55, 45], [275, 240, 50, 40],
        ].map((r, i) => (
          <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx={4}
                fill={i % 2 ? "#F0E3CA" : "#ECDBB8"} opacity="0.9" />
        ))}
        {/* water patch */}
        <path d="M 230 60 Q 260 80, 250 110 Q 240 130, 220 120 Q 205 100, 215 80 Z"
              fill="#BBD7D6" opacity="0.75" />
        {/* roads (grid) */}
        <g stroke={road} strokeWidth="10" strokeLinecap="round" opacity="0.95">
          <line x1="0"   y1="80"  x2="340" y2="80" />
          <line x1="0"   y1="170" x2="340" y2="170" />
          <line x1="90"  y1="0"   x2="90"  y2="300" />
          <line x1="190" y1="0"   x2="190" y2="300" />
        </g>
        {/* route */}
        <path d={path} stroke={tokens.primary} strokeWidth="3" fill="none"
              strokeDasharray="6 5" strokeLinecap="round" />
        {/* completed part */}
        <path d={path} stroke={tokens.primaryDeep} strokeWidth="3.2" fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progress * 260} 400`} />

        {/* shop marker */}
        <g transform={`translate(${shop.x}, ${shop.y})`}>
          <circle r="14" fill="#fff" stroke={tokens.ink} strokeWidth="1.5" />
          <text textAnchor="middle" y="5" fontSize="14">🏪</text>
          {withLabels && <text x="18" y="5" fontSize="10" fill={tokens.ink} fontWeight="700">Shop</text>}
        </g>
        {/* customer marker */}
        <g transform={`translate(${cust.x}, ${cust.y})`}>
          <circle r="14" fill={tokens.primary} stroke="#fff" strokeWidth="2" />
          <circle r="4" fill="#fff" />
          {withLabels && <text x="-10" y="30" fontSize="10" fill={tokens.ink} fontWeight="700">You</text>}
        </g>
        {/* rider marker */}
        <g transform={`translate(${rider.x}, ${rider.y})`}>
          <circle r="18" fill={tokens.primary} opacity="0.18">
            <animate attributeName="r" values="16;22;16" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle r="12" fill={tokens.accent} stroke="#fff" strokeWidth="2" />
          <text textAnchor="middle" y="5" fontSize="13">🛵</text>
        </g>
      </svg>
    </div>
  );
}

// Vertical timeline
function NBTimeline({ tokens, stepIndex, compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 12 }}>
      {NEARBY_TIMELINE.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        const dotBg = done ? tokens.success : active ? tokens.primary : tokens.paperDeep;
        const dotFg = (done || active) ? "#fff" : tokens.inkMute;
        return (
          <div key={s.key} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 999, background: dotBg, color: dotFg,
                display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800,
                border: active ? `3px solid ${tokens.primary}44` : "none",
                boxSizing: "content-box",
              }}>{done ? "✓" : active ? "●" : i + 1}</div>
              {i < NEARBY_TIMELINE.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: compact ? 14 : 22,
                  background: done ? tokens.success : tokens.line, marginTop: 4 }} />
              )}
            </div>
            <div style={{ paddingBottom: compact ? 6 : 10, flex: 1 }}>
              <div style={{
                fontSize: compact ? 13 : 14, fontWeight: 700,
                color: (done || active) ? tokens.ink : tokens.inkMute,
                fontFamily: "var(--nb-body)",
              }}>{s.label}</div>
              {!compact && (
                <div style={{ fontSize: 12, color: tokens.inkMute, marginTop: 1 }}>
                  {active ? s.blurb : done ? "Done" : "Pending"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Rider card
function NBRiderCard({ tokens, etaMins }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: tokens.card, borderRadius: 16, padding: 12,
      border: `1px solid ${tokens.line}`,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 999,
        background: "oklch(0.85 0.08 28)", display: "grid", placeItems: "center",
        fontFamily: "var(--nb-display)", fontWeight: 700, fontSize: 18, color: "#6B3F1E",
      }}>R</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>Ramesh · Partner</div>
        <div style={{ fontSize: 11.5, color: tokens.inkMute, display: "flex", alignItems: "center", gap: 6 }}>
          <NBStar size={10} color={tokens.starGold} /> 4.9 · 812 deliveries · TS-5428
        </div>
      </div>
      <button style={{
        padding: "8px 12px", borderRadius: 999, border: `1px solid ${tokens.line}`,
        background: tokens.card, fontSize: 13, fontWeight: 700, color: tokens.ink, cursor: "pointer",
      }}>📞 Call</button>
    </div>
  );
}

// ───── Variant A: MAP-FIRST ─────
function NBTrackingMapFirst({ tokens, state, nav, topSafe = 44 }) {
  const eta = Math.max(0, Math.round((1 - state.trackProgress) * 16) + 2);
  const lines = getCartLines(state.cart);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const delivery = subtotal >= 300 ? 0 : 25;
  const total = subtotal + delivery;
  const shop = NEARBY_SHOPS.find(s => s.id === lines[0]?.shopId);

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      {/* Map */}
      <div style={{ padding: `${topSafe - 4}px 10px 0`, position: "relative" }}>
        <NBMiniMap tokens={tokens} progress={state.trackProgress} height={300} />
        <div style={{ position: "absolute", top: topSafe + 6, left: 20, display: "flex", gap: 8 }}>
          <NBIconCircle tokens={tokens} size={36} onClick={nav.goHome}>←</NBIconCircle>
        </div>
        <div style={{
          position: "absolute", bottom: 16, left: 20, right: 20,
          background: "#fff", borderRadius: 14, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 20px -12px rgba(0,0,0,0.35)",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999, background: tokens.primarySoft,
            color: tokens.primaryDeep, display: "grid", placeItems: "center", fontSize: 18,
          }}>🛵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Arriving in
            </div>
            <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>
              ~{eta} min
            </div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 999, background: tokens.successSoft,
            color: tokens.success, fontSize: 11.5, fontWeight: 700,
          }}>
            <NBDot color={tokens.success} size={6} /> {" "}Live
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{
          background: tokens.ink, color: tokens.paper, borderRadius: 16,
          padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {state.trackStep === 4 ? "Complete" : "On the way"}
            </div>
            <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600 }}>
              {NEARBY_TIMELINE[state.trackStep]?.label || "Delivered"}
            </div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, padding: "6px 10px",
            background: tokens.primary, color: "#fff", borderRadius: 999,
          }}>#NB-4821</div>
        </div>
      </div>

      {/* Rider */}
      {state.trackStep >= 3 && (
        <div style={{ padding: "10px 14px 0" }}>
          <NBRiderCard tokens={tokens} etaMins={eta} />
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{ background: tokens.card, borderRadius: 16, padding: 14, border: `1px solid ${tokens.line}` }}>
          <NBTimeline tokens={tokens} stepIndex={state.trackStep} compact />
        </div>
      </div>

      {/* Order summary */}
      {shop && (
        <div style={{ padding: "10px 14px 0" }}>
          <div style={{ background: tokens.card, borderRadius: 16, padding: 14, border: `1px solid ${tokens.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, overflow: "hidden" }}>
                <NBShopCover hue={shop.hue} name="" tokens={tokens} aspect="1/1" />
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: tokens.ink }}>{shop.name}</div>
              <div style={{ fontFamily: "var(--nb-display)", fontSize: 15, fontWeight: 600, color: tokens.ink }}>{formatINR(total)}</div>
            </div>
            <div style={{ fontSize: 12, color: tokens.inkMute, lineHeight: 1.5 }}>
              {lines.slice(0, 3).map(l => `${l.qty}× ${l.name}`).join(" · ")}
              {lines.length > 3 && ` · +${lines.length - 3} more`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Variant B: STATUS-FIRST (timeline prominent, map is a companion) ─────
function NBTrackingStatusFirst({ tokens, state, nav, topSafe = 44 }) {
  const eta = Math.max(0, Math.round((1 - state.trackProgress) * 16) + 2);
  const lines = getCartLines(state.cart);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const delivery = subtotal >= 300 ? 0 : 25;
  const total = subtotal + delivery;
  const shop = NEARBY_SHOPS.find(s => s.id === lines[0]?.shopId);
  const stepLabel = NEARBY_TIMELINE[state.trackStep]?.label || "Delivered";
  const blurb = NEARBY_TIMELINE[state.trackStep]?.blurb || "";

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: `${topSafe}px 14px 0`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goHome}>←</NBIconCircle>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>
          Order #4821
        </div>
      </div>

      {/* Status hero */}
      <div style={{ padding: "14px" }}>
        <div style={{
          background: tokens.primary, color: "#fff", borderRadius: 20, padding: "18px 18px 20px",
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative curve */}
          <svg width="100%" height="100%" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
            <path d="M 0 90 C 80 120, 200 40, 300 80 L 300 140 L 0 140 Z" fill="#fff" />
          </svg>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.85, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {state.trackStep === 4 ? "Delivered" : "Arriving in"}
            </div>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 44, fontWeight: 600, letterSpacing: -1,
              lineHeight: 1, marginTop: 4,
            }}>
              {state.trackStep === 4 ? "Done 🎉" : `${eta} min`}
            </div>
            <div style={{ fontSize: 13.5, marginTop: 10, opacity: 0.95, maxWidth: 260, textWrap: "pretty" }}>
              {stepLabel} · {blurb}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline card */}
      <div style={{ padding: "0 14px" }}>
        <div style={{
          background: tokens.card, borderRadius: 18, padding: "14px 16px",
          border: `1px solid ${tokens.line}`,
        }}>
          <NBTimeline tokens={tokens} stepIndex={state.trackStep} />
        </div>
      </div>

      {/* Rider */}
      {state.trackStep >= 3 && (
        <div style={{ padding: "12px 14px 0" }}>
          <NBRiderCard tokens={tokens} etaMins={eta} />
        </div>
      )}

      {/* Mini map (companion) */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4,
          textTransform: "uppercase", padding: "0 4px 8px",
        }}>Route</div>
        <NBMiniMap tokens={tokens} progress={state.trackProgress} height={160} withLabels={false} />
      </div>

      {/* Summary */}
      {shop && (
        <div style={{ padding: "12px 14px 0" }}>
          <div style={{ background: tokens.card, borderRadius: 16, padding: 14, border: `1px solid ${tokens.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>{shop.name}</div>
              <div style={{ fontFamily: "var(--nb-display)", fontSize: 15, fontWeight: 600, color: tokens.ink }}>{formatINR(total)}</div>
            </div>
            <div style={{ fontSize: 12, color: tokens.inkMute, marginTop: 4 }}>
              {lines.length} items · paid via UPI
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  NBMiniMap, NBTimeline, NBRiderCard, NBTrackingMapFirst, NBTrackingStatusFirst,
});
