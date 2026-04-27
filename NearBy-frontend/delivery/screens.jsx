// Delivery Partner screens — Home, Incoming request, Phase 1 (to shop), Phase 2 (to customer + OTP)

const {
  DP_PROFILE, DP_TODAY, DP_WEEK, DP_INCOMING, DP_PHASE1, DP_PHASE2,
  NBButton, NBIconCircle, NBStar, formatINR,
} = window;

// ══════════════════════════════════════════════════════════════════════
// Shared: mini map tile (stylized SVG with a route)
// ══════════════════════════════════════════════════════════════════════
function DPMap({ tokens, height = 220, mode = "to-shop", progress = 0.35 }) {
  // Simulated route. Origin is rider (bottom-left-ish), destination is top-right.
  const routes = {
    "to-shop":     { a: [60, 230], b: [270, 70],  aLabel: "You", bLabel: "Shop" },
    "to-customer":{ a: [80, 240], b: [290, 80],  aLabel: "You", bLabel: "Drop"  },
  };
  const r = routes[mode] || routes["to-shop"];
  const midX = (r.a[0] + r.b[0]) / 2 + 30;
  const midY = (r.a[1] + r.b[1]) / 2 - 10;
  const path = `M ${r.a[0]} ${r.a[1]} Q ${midX} ${midY} ${r.b[0]} ${r.b[1]}`;
  // Compute a point along the quadratic for the rider icon
  const t = progress;
  const px = (1-t)*(1-t)*r.a[0] + 2*(1-t)*t*midX + t*t*r.b[0];
  const py = (1-t)*(1-t)*r.a[1] + 2*(1-t)*t*midY + t*t*r.b[1];

  return (
    <div style={{
      position: "relative", height, width: "100%",
      borderRadius: 18, overflow: "hidden",
      background: `linear-gradient(180deg, #E9E1D0 0%, #DED4BE 100%)`,
    }}>
      <svg viewBox="0 0 360 280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        {/* grid roads */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 72 + 10} y1="0" x2={i * 72 + 10} y2="280"
                stroke="#C8BC9F" strokeWidth="1.4" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 60 + 20} x2="360" y2={i * 60 + 20}
                stroke="#C8BC9F" strokeWidth="1.4" />
        ))}
        {/* main road highlighted */}
        <path d={path} stroke="#9C8C68" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.35"/>
        <path d={path} stroke={tokens.primary} strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray="8 6" />
        {/* parks */}
        <rect x="160" y="160" width="48" height="34" fill="#B8CCA0" rx="4" />
        <rect x="40"  y="60"  width="32" height="42" fill="#B8CCA0" rx="4" />

        {/* origin */}
        <circle cx={r.a[0]} cy={r.a[1]} r="10" fill={tokens.ink} />
        <circle cx={r.a[0]} cy={r.a[1]} r="4"  fill="#fff" />
        {/* destination */}
        <circle cx={r.b[0]} cy={r.b[1]} r="14" fill={tokens.primary} />
        <text x={r.b[0]} y={r.b[1] + 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
          {mode === "to-shop" ? "K" : "A"}
        </text>
        {/* rider */}
        <g transform={`translate(${px} ${py})`}>
          <circle r="13" fill="#fff" stroke={tokens.ink} strokeWidth="2.5" />
          <text y="4" textAnchor="middle" fontSize="14">🛵</text>
        </g>
      </svg>
      <div style={{
        position: "absolute", top: 10, right: 10,
        background: "rgba(255,255,255,0.92)", padding: "4px 10px",
        borderRadius: 999, fontSize: 11, fontWeight: 700, color: tokens.ink,
      }}>Live</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// HOME — online/offline toggle + earnings
// ══════════════════════════════════════════════════════════════════════
function DPHome({ tokens, state, dispatch, nav, topSafe = 44 }) {
  const online = state.online;
  const goalPct = Math.min(100, (DP_TODAY.earnings / DP_TODAY.goalEarnings) * 100);
  const max = Math.max(...DP_WEEK.map(d => d.earnings));

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 30 }}>
      {/* Header */}
      <div style={{ padding: `${topSafe}px 18px 14px`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 999, flexShrink: 0,
          background: `oklch(0.85 0.08 ${DP_PROFILE.hue})`,
          display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", fontSize: 15,
        }}>RY</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Delivery Partner
          </div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Hi, {DP_PROFILE.name.split(" ")[0]}
          </div>
        </div>
        <NBIconCircle tokens={tokens} size={36}><span style={{ fontSize: 14 }}>☰</span></NBIconCircle>
      </div>

      {/* GIANT online/offline toggle */}
      <div style={{ padding: "0 14px" }}>
        <button onClick={() => dispatch({ type: "toggleOnline" })} style={{
          width: "100%", padding: "22px", borderRadius: 24, border: "none",
          background: online ? tokens.success : "#4a3f35",
          color: "#fff", cursor: "pointer", textAlign: "left",
          boxShadow: online ? `0 14px 30px -12px ${tokens.success}cc` : "0 10px 22px -12px rgba(0,0,0,0.5)",
          transition: "all .25s ease",
        }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Tap to go {online ? "offline" : "online"}
          </div>
          <div style={{
            fontFamily: "var(--nb-display)", fontSize: 30, fontWeight: 600, letterSpacing: -0.7, marginTop: 6,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
              You are {online ? "ONLINE" : "OFFLINE"}
            </span>
            <div style={{
              width: 54, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.25)",
              position: "relative", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 3, left: online ? 27 : 3,
                width: 24, height: 24, borderRadius: 999, background: "#fff",
                transition: "left .25s ease", boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.92, marginTop: 6, fontWeight: 500 }}>
            {online
              ? "Receiving requests · Basheerbagh area"
              : "Not receiving requests right now"}
          </div>
        </button>
      </div>

      {/* Simulate incoming request */}
      {online && (
        <div style={{ padding: "12px 14px 0" }}>
          <button onClick={nav.goIncoming} style={{
            width: "100%", padding: "12px 14px", borderRadius: 14, border: `1.5px dashed ${tokens.primary}`,
            background: tokens.primarySoft, color: tokens.primaryDeep,
            fontSize: 13, fontWeight: 700, fontFamily: "var(--nb-body)", cursor: "pointer",
          }}>
            📣 Simulate incoming request
          </button>
        </div>
      )}

      {/* Today's earnings card */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 18, padding: 16,
          border: `1px solid ${tokens.line}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Today's earnings
            </div>
            <div style={{ fontSize: 11.5, color: tokens.inkMute, fontWeight: 600 }}>
              Goal {formatINR(DP_TODAY.goalEarnings)}
            </div>
          </div>
          <div style={{
            fontFamily: "var(--nb-display)", fontSize: 40, fontWeight: 600,
            color: tokens.ink, letterSpacing: -1, fontVariantNumeric: "tabular-nums", lineHeight: 1,
            marginTop: 4,
          }}>
            {formatINR(DP_TODAY.earnings)}
          </div>
          {/* goal bar */}
          <div style={{ height: 8, background: tokens.paperDeep, borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${goalPct}%`, background: tokens.primary }} />
          </div>
          <div style={{ fontSize: 11.5, color: tokens.inkMute, marginTop: 6 }}>
            {formatINR(DP_TODAY.goalEarnings - DP_TODAY.earnings)} to goal · {Math.round(goalPct)}%
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${tokens.line}`,
          }}>
            <MiniStat tokens={tokens} k="Orders"   v={DP_TODAY.orders} />
            <MiniStat tokens={tokens} k="Online"   v={`${DP_TODAY.onlineHours}h`} />
            <MiniStat tokens={tokens} k="Distance" v={`${DP_TODAY.distanceKm}km`} />
          </div>
        </div>
      </div>

      {/* Week chart */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          This week
        </div>
        <div style={{ background: tokens.card, borderRadius: 16, padding: "14px 12px 10px", border: `1px solid ${tokens.line}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {DP_WEEK.map((d, i) => {
              const h = (d.earnings / max) * 100;
              const today = i === DP_WEEK.length - 1;
              return (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{
                      width: "100%", height: `${h}%`, borderRadius: "6px 6px 2px 2px",
                      background: today ? tokens.primary : `${tokens.primary}55`,
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: today ? tokens.ink : tokens.inkMute, fontWeight: today ? 700 : 600 }}>
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rating + profile card */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: 14,
          border: `1px solid ${tokens.line}`, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <NBStar size={14} color={tokens.starGold} />
              <span style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink, lineHeight: 1 }}>
                {DP_PROFILE.rating}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: tokens.inkMute, marginTop: 2 }}>
              {DP_PROFILE.completed.toLocaleString()} deliveries
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 12, borderLeft: `1px dashed ${tokens.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>{DP_PROFILE.vehicle.split(" · ")[0]}</div>
            <div style={{ fontSize: 11.5, color: tokens.inkMute, fontVariantNumeric: "tabular-nums" }}>
              {DP_PROFILE.vehicle.split(" · ")[1]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ tokens, k, v }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600,
        color: tokens.ink, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums",
      }}>{v}</div>
      <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{k}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// INCOMING REQUEST — countdown overlay
// ══════════════════════════════════════════════════════════════════════
function DPIncoming({ tokens, dispatch, nav, topSafe = 44 }) {
  const [remaining, setRemaining] = React.useState(DP_INCOMING.countdownSec);
  React.useEffect(() => {
    if (remaining <= 0) { nav.goHome(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const pct = (remaining / DP_INCOMING.countdownSec) * 100;
  const urgent = remaining <= 5;

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", position: "relative" }}>
      {/* Dim overlay background (simulates alert over home) */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(20,12,6,0.35), rgba(20,12,6,0.15))",
      }} />

      {/* Alert card */}
      <div style={{
        position: "relative", margin: `${topSafe + 20}px 14px 0`, padding: 18,
        background: tokens.card, borderRadius: 24,
        border: `3px solid ${urgent ? tokens.danger : tokens.primary}`,
        boxShadow: `0 24px 60px -20px rgba(0,0,0,0.35), 0 0 0 8px ${urgent ? tokens.danger + "33" : tokens.primary + "22"}`,
      }}>
        {/* Countdown ring + timer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r="28" stroke={tokens.paperDeep} strokeWidth="6" fill="none" />
              <circle cx="32" cy="32" r="28"
                stroke={urgent ? tokens.danger : tokens.primary}
                strokeWidth="6" fill="none"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct/100)}`}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset .9s linear" }} />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 700,
              color: urgent ? tokens.danger : tokens.ink, fontVariantNumeric: "tabular-nums",
            }}>{remaining}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, color: tokens.inkMute, fontWeight: 700,
              letterSpacing: 0.4, textTransform: "uppercase",
            }}>New delivery request</div>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 38, fontWeight: 600,
              color: tokens.ink, letterSpacing: -0.8, lineHeight: 1, marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatINR(DP_INCOMING.payout)}
            </div>
            <div style={{ fontSize: 12, color: tokens.inkMute, marginTop: 4 }}>
              Payout · {DP_INCOMING.totalKm}km total
            </div>
          </div>
        </div>

        {/* Route summary */}
        <div style={{ marginTop: 16, padding: 12, background: tokens.paper, borderRadius: 14 }}>
          <RouteRow tokens={tokens} icon="🏪" label="Pickup" place={DP_INCOMING.shopName}
            area={DP_INCOMING.shopArea} dist={`${DP_INCOMING.shopDistanceKm} km away`} />
          <div style={{ height: 14, borderLeft: `2px dotted ${tokens.line}`, marginLeft: 16 }} />
          <RouteRow tokens={tokens} icon="📍" label="Drop" place={DP_INCOMING.customerFirstName}
            area={DP_INCOMING.dropArea} dist={`+${DP_INCOMING.dropDistanceKm} km`} />
        </div>

        {/* Meta chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Chip tokens={tokens}>{DP_INCOMING.itemsCount} items</Chip>
          <Chip tokens={tokens}>{DP_INCOMING.totalKm} km</Chip>
          <Chip tokens={tokens} kind="success">UPI paid</Chip>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={nav.goHome} style={{
            flex: 1, padding: "14px", borderRadius: 14,
            border: `1.5px solid ${tokens.line}`, background: tokens.card, color: tokens.inkMute,
            fontFamily: "var(--nb-body)", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>Reject</button>
          <button onClick={() => { dispatch({ type: "acceptRequest" }); nav.goPhase1(); }} style={{
            flex: 2, padding: "14px", borderRadius: 14, border: "none",
            background: tokens.success, color: "#fff",
            fontFamily: "var(--nb-body)", fontSize: 15, fontWeight: 800, cursor: "pointer",
            boxShadow: `0 10px 22px -12px ${tokens.success}`,
          }}>Accept · {formatINR(DP_INCOMING.payout)}</button>
        </div>
      </div>
    </div>
  );
}

function RouteRow({ tokens, icon, label, place, area, dist }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, background: tokens.card,
        border: `1px solid ${tokens.line}`, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {place}
        </div>
        <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{area}</div>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: tokens.inkMute, flexShrink: 0 }}>{dist}</div>
    </div>
  );
}

function Chip({ tokens, children, kind = "neutral" }) {
  const bg = kind === "success" ? tokens.successSoft : tokens.paperDeep;
  const fg = kind === "success" ? tokens.success : tokens.ink;
  return <span style={{
    fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
    background: bg, color: fg,
  }}>{children}</span>;
}

// ══════════════════════════════════════════════════════════════════════
// PHASE 1 — Go to shop
// ══════════════════════════════════════════════════════════════════════
function DPPhase1({ tokens, nav, topSafe = 44 }) {
  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      <div style={{ padding: `${topSafe}px 18px 10px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goHome}>←</NBIconCircle>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Step 1 of 2 · #{DP_PHASE1.orderNo}
          </div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>
            Go to shop
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ padding: "0 14px" }}>
        <DPMap tokens={tokens} mode="to-shop" height={200} progress={0.25} />
      </div>

      {/* ETA banner */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          background: tokens.ink, color: tokens.paper, borderRadius: 16, padding: "12px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 10.5, opacity: 0.75, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              ETA to shop
            </div>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 26, fontWeight: 600,
              letterSpacing: -0.5, lineHeight: 1, marginTop: 2,
            }}>
              {DP_PHASE1.etaMin} min <span style={{ fontSize: 14, opacity: 0.7 }}>· {DP_PHASE1.distanceKm} km</span>
            </div>
          </div>
          <button style={{
            padding: "10px 14px", borderRadius: 12, border: "none",
            background: tokens.primary, color: "#fff",
            fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>🧭 Navigate</button>
        </div>
      </div>

      {/* Shop card */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: 14,
          border: `1px solid ${tokens.line}`,
        }}>
          <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Pickup from
          </div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, marginTop: 2 }}>
            {DP_PHASE1.shopName}
          </div>
          <div style={{ fontSize: 12.5, color: tokens.inkMute, marginTop: 2 }}>{DP_PHASE1.shopAddress}</div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={ghostBtn(tokens)}>📞 Call shop</button>
            <button style={ghostBtn(tokens)}>💬 Message</button>
          </div>

          {DP_PHASE1.instructions && (
            <div style={{
              marginTop: 12, padding: "10px 12px", background: tokens.primarySoft,
              borderRadius: 12, fontSize: 12.5, color: tokens.primaryDeep, fontWeight: 600,
            }}>
              💡 {DP_PHASE1.instructions}
            </div>
          )}
        </div>
      </div>

      {/* Order summary */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: 14,
          border: `1px solid ${tokens.line}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>
              {DP_PHASE1.itemsCount} items to pick up
            </div>
            <div style={{ fontSize: 11.5, color: tokens.inkMute }}>Verify with shop before collecting</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 700 }}>Payout</div>
            <div style={{ fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600, color: tokens.primaryDeep }}>
              {formatINR(DP_PHASE1.payout)}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "16px 14px 0" }}>
        <NBButton tokens={tokens} full size="lg" onClick={nav.goPhase2}>
          Picked up · Start delivery
        </NBButton>
      </div>
    </div>
  );
}

function ghostBtn(tokens) {
  return {
    flex: 1, padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink,
    fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
  };
}

// ══════════════════════════════════════════════════════════════════════
// PHASE 2 — Go to customer + OTP entry
// ══════════════════════════════════════════════════════════════════════
function DPPhase2({ tokens, nav, topSafe = 44 }) {
  const [otp, setOtp] = React.useState(["", "", "", ""]);
  const [showOTP, setShowOTP] = React.useState(false);
  const [delivered, setDelivered] = React.useState(false);
  const refs = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

  function setDigit(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 3) refs[i + 1].current?.focus();
  }

  const entered = otp.join("");
  const ok = entered === DP_PHASE2.otp;
  const bad = entered.length === 4 && !ok;

  React.useEffect(() => {
    if (ok) {
      const t = setTimeout(() => setDelivered(true), 600);
      return () => clearTimeout(t);
    }
  }, [ok]);

  if (delivered) return <DeliveredScreen tokens={tokens} nav={nav} topSafe={topSafe} />;

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      <div style={{ padding: `${topSafe}px 18px 10px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goPhase1}>←</NBIconCircle>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Step 2 of 2 · #{DP_PHASE2.orderNo}
          </div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3 }}>
            Deliver to {DP_PHASE2.customerFirstName}
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ padding: "0 14px" }}>
        <DPMap tokens={tokens} mode="to-customer" height={180} progress={0.55} />
      </div>

      {/* ETA + navigate */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          background: tokens.ink, color: tokens.paper, borderRadius: 16, padding: "12px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 10.5, opacity: 0.75, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              ETA to customer
            </div>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 26, fontWeight: 600,
              letterSpacing: -0.5, lineHeight: 1, marginTop: 2,
            }}>
              {DP_PHASE2.etaMin} min <span style={{ fontSize: 14, opacity: 0.7 }}>· {DP_PHASE2.distanceKm} km</span>
            </div>
          </div>
          <button style={{
            padding: "10px 14px", borderRadius: 12, border: "none",
            background: tokens.primary, color: "#fff",
            fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>🧭 Navigate</button>
        </div>
      </div>

      {/* Customer card */}
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: 14,
          border: `1px solid ${tokens.line}`,
        }}>
          <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Deliver to
          </div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, marginTop: 2 }}>
            {DP_PHASE2.customerFirstName}
          </div>
          <div style={{ fontSize: 12.5, color: tokens.inkMute, marginTop: 2 }}>{DP_PHASE2.customerAddress}</div>
          <div style={{
            marginTop: 10, padding: "10px 12px", background: tokens.primarySoft,
            borderRadius: 12, fontSize: 12.5, color: tokens.primaryDeep, fontWeight: 600,
          }}>
            💡 {DP_PHASE2.customerInstructions}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={ghostBtn(tokens)}>📞 Call</button>
            <button style={ghostBtn(tokens)}>💬 Message</button>
          </div>
        </div>
      </div>

      {/* OTP entry or unlock */}
      <div style={{ padding: "14px 14px 0" }}>
        {!showOTP ? (
          <button onClick={() => setShowOTP(true)} style={{
            width: "100%", padding: "16px", borderRadius: 16, border: "none",
            background: tokens.success, color: "#fff",
            fontFamily: "var(--nb-body)", fontSize: 15, fontWeight: 800, cursor: "pointer",
            boxShadow: `0 10px 22px -12px ${tokens.success}`,
          }}>
            🔐 Arrived · Enter customer OTP
          </button>
        ) : (
          <div style={{
            background: tokens.card, borderRadius: 18, padding: 16,
            border: `2px solid ${ok ? tokens.success : bad ? tokens.danger : tokens.line}`,
            transition: "border-color .2s",
          }}>
            <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Enter 4-digit OTP from {DP_PHASE2.customerFirstName}
            </div>
            <div style={{ fontSize: 12.5, color: tokens.inkMute, marginTop: 4 }}>
              Ask customer to read it from their app · Hint: {DP_PHASE2.otp}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
              {otp.map((d, i) => (
                <input key={i} ref={refs[i]} value={d}
                  onChange={e => setDigit(i, e.target.value)}
                  onKeyDown={e => { if (e.key === "Backspace" && !d && i > 0) refs[i - 1].current?.focus(); }}
                  inputMode="numeric" maxLength={1}
                  style={{
                    width: 52, height: 62, textAlign: "center",
                    fontFamily: "var(--nb-display)", fontSize: 28, fontWeight: 700,
                    border: `2px solid ${ok ? tokens.success : bad ? tokens.danger : d ? tokens.primary : tokens.line}`,
                    borderRadius: 14, background: tokens.paper, color: tokens.ink,
                    outline: "none", transition: "border-color .15s",
                  }} />
              ))}
            </div>
            {bad && (
              <div style={{ textAlign: "center", color: tokens.danger, fontSize: 12, fontWeight: 700, marginTop: 10 }}>
                OTP doesn't match. Please ask again.
              </div>
            )}
            {ok && (
              <div style={{ textAlign: "center", color: tokens.success, fontSize: 13, fontWeight: 700, marginTop: 10 }}>
                ✓ OTP verified — marking delivered…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items collapsible */}
      <div style={{ padding: "12px 14px 0" }}>
        <details style={{
          background: tokens.card, borderRadius: 16, border: `1px solid ${tokens.line}`, padding: "12px 14px",
        }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: tokens.ink }}>
            Items ({DP_PHASE2.items.length}) ›
          </summary>
          <div style={{ marginTop: 10, fontSize: 12.5, color: tokens.ink, lineHeight: 1.6 }}>
            {DP_PHASE2.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{it.q}× {it.name}</span>
                <span style={{ color: tokens.inkMute }}>{it.unit}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function DeliveredScreen({ tokens, nav, topSafe }) {
  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingTop: topSafe + 40, textAlign: "center", padding: "40px 24px" }}>
      <div style={{
        width: 82, height: 82, borderRadius: 999, background: tokens.success,
        display: "grid", placeItems: "center", margin: "0 auto 20px",
        color: "#fff", fontSize: 42, boxShadow: `0 14px 30px -12px ${tokens.success}`,
      }}>✓</div>
      <div style={{ fontFamily: "var(--nb-display)", fontSize: 28, fontWeight: 600, color: tokens.ink, letterSpacing: -0.5 }}>
        Delivered!
      </div>
      <div style={{ fontSize: 13.5, color: tokens.inkMute, marginTop: 4 }}>
        Order #{DP_PHASE2.orderNo} complete
      </div>

      <div style={{
        marginTop: 28, padding: "18px 20px", background: tokens.card, borderRadius: 18,
        border: `1px solid ${tokens.line}`, textAlign: "left",
      }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
          You earned
        </div>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 40, fontWeight: 600, color: tokens.primaryDeep, lineHeight: 1, marginTop: 2 }}>
          {formatINR(DP_PHASE2.payout)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12.5, color: tokens.inkMute }}>
          <span>Today's total</span>
          <span style={{ color: tokens.ink, fontWeight: 700 }}>{formatINR(685 + DP_PHASE2.payout)}</span>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <NBButton tokens={tokens} full size="lg" onClick={nav.goHome}>
          Back to home
        </NBButton>
      </div>
    </div>
  );
}

Object.assign(window, { DPHome, DPIncoming, DPPhase1, DPPhase2 });
