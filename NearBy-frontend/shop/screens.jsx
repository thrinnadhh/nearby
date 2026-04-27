// Shop Owner screens — Dashboard, Inbox, Products, Analytics
// Reuses ui.jsx atoms (NBButton, NBIconCircle, NBProductThumb, NBDot, NBStar, formatINR)

const {
  SHOP_PROFILE, SHOP_TODAY, SHOP_ORDERS_PENDING, SHOP_ORDERS_ACTIVE,
  SHOP_INVENTORY, SHOP_REVENUE_WEEK, SHOP_TOP_PRODUCTS, SHOP_HEATMAP, SHOP_TRUST_BREAKDOWN,
  NBButton, NBIconCircle, NBProductThumb, NBDot, NBStar, formatINR,
} = window;

function mmss(sec) {
  const m = Math.max(0, Math.floor(sec / 60));
  const s = Math.max(0, sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════════════════════════
// DASHBOARD — giant open/close toggle is the hero
// ══════════════════════════════════════════════════════════════════════
function ShopDashboard({ tokens, state, dispatch, nav, topSafe = 44 }) {
  const open = state.shopOpen;
  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 30 }}>
      {/* Header */}
      <div style={{ padding: `${topSafe}px 18px 14px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Dashboard</div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {SHOP_PROFILE.name}
          </div>
        </div>
        <NBIconCircle tokens={tokens} size={40}><span style={{ fontSize: 16 }}>🔔</span></NBIconCircle>
      </div>

      {/* GIANT OPEN/CLOSE toggle */}
      <div style={{ padding: "4px 14px 0" }}>
        <button onClick={() => dispatch({ type: "toggleShop" })} style={{
          width: "100%", padding: "20px 22px", borderRadius: 24, border: "none",
          background: open ? tokens.success : "#55463A",
          color: "#fff", cursor: "pointer", textAlign: "left",
          boxShadow: open ? `0 14px 30px -12px ${tokens.success}cc` : "0 10px 22px -12px rgba(0,0,0,0.5)",
          transition: "all .25s ease",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Tap to {open ? "close" : "open"}
          </div>
          <div style={{
            marginTop: 6,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <span style={{
              fontFamily: "var(--nb-display)", fontSize: 28, fontWeight: 600, letterSpacing: -0.6,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0,
            }}>Shop is {open ? "OPEN" : "CLOSED"}</span>
            {/* Toggle knob */}
            <div style={{
              width: 54, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.25)",
              position: "relative", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 3, left: open ? 27 : 3,
                width: 24, height: 24, borderRadius: 999, background: "#fff",
                transition: "left .25s ease", boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
          <div style={{ fontSize: 13, opacity: 0.92, marginTop: 8, fontWeight: 500 }}>
            {open
              ? "Accepting orders · Your shop is visible in the app"
              : "Hidden from app · Customers can't order right now"}
          </div>
        </button>
      </div>

      {/* Pending orders banner */}
      <div style={{ padding: "14px 14px 0" }}>
        <div onClick={nav.goInbox} style={{
          background: tokens.danger, color: "#fff", borderRadius: 18, padding: "14px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
          gap: 12,
          boxShadow: `0 10px 22px -14px ${tokens.danger}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Action needed
            </div>
            <div style={{ fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {state.pendingCount} orders waiting
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>View inbox →</div>
        </div>
      </div>

      {/* Today's stats */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Today
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Stat tokens={tokens} k="Orders"     v={SHOP_TODAY.orders}            sub="Received today" />
          <Stat tokens={tokens} k="Revenue"    v={formatINR(SHOP_TODAY.revenue)} sub="Gross" />
          <Stat tokens={tokens} k="Completion" v={`${SHOP_TODAY.completion}%`}   sub="Rate" accent />
          <Stat tokens={tokens} k="Response"   v={`${SHOP_TODAY.avgResponseMin}m`} sub="Avg response" />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Quick actions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <QAction tokens={tokens} icon="➕" label="Add product"  sub="Photo + price" onClick={nav.goProducts} />
          <QAction tokens={tokens} icon="📊" label="Analytics"    sub="Last 7 days"   onClick={nav.goAnalytics} />
          <QAction tokens={tokens} icon="🕒" label="Working hours" sub="Mon–Sun" />
          <QAction tokens={tokens} icon="💬" label="Support"       sub="WhatsApp" />
        </div>
      </div>
    </div>
  );
}

function Stat({ tokens, k, v, sub, accent }) {
  return (
    <div style={{
      background: tokens.card, border: `1px solid ${tokens.line}`,
      borderRadius: 16, padding: 14,
    }}>
      <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.3 }}>{k}</div>
      <div style={{
        fontFamily: "var(--nb-display)", fontSize: 26, fontWeight: 600,
        color: accent ? tokens.primaryDeep : tokens.ink, letterSpacing: -0.5,
        fontVariantNumeric: "tabular-nums", marginTop: 2,
      }}>{v}</div>
      <div style={{ fontSize: 11.5, color: tokens.inkMute, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function QAction({ tokens, icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 16,
      padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "var(--nb-body)",
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{label}</div>
      <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{sub}</div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ORDER INBOX — timer-driven accept/reject
// ══════════════════════════════════════════════════════════════════════
function ShopInbox({ tokens, state, dispatch, nav, topSafe = 44, urgency = "normal" }) {
  const [tab, setTab] = React.useState("pending");
  const [acceptFor, setAcceptFor] = React.useState(null); // order id for bottom sheet
  const [rejectFor, setRejectFor] = React.useState(null);

  // Timer: 3 minutes per pending order. Compute remaining from receivedAgo + tick.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const limitSec = 180;

  const pending = state.pending.filter(o => !state.acceptedIds.has(o.id) && !state.rejectedIds.has(o.id));
  const active = [
    ...SHOP_ORDERS_ACTIVE,
    ...state.pending.filter(o => state.acceptedIds.has(o.id)).map(o => ({
      id: o.id, orderNo: o.orderNo, customerFirstName: o.customerFirstName,
      customerArea: o.customerArea, total: o.total, status: "Preparing",
      readyInMin: state.acceptedReadyMins[o.id] || 10, items: o.items,
    })),
  ];

  const tabs = [
    { id: "pending",   label: "Pending",   count: pending.length },
    { id: "active",    label: "Active",    count: active.length },
    { id: "completed", label: "Completed", count: 28 },
  ];

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      <div style={{ padding: `${topSafe}px 18px 10px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goDashboard}>←</NBIconCircle>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>Order inbox</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 6 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12,
              border: "none", cursor: "pointer",
              background: active ? tokens.ink : tokens.card,
              color: active ? tokens.paper : tokens.ink,
              fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {t.label}
              <span style={{
                fontSize: 10, padding: "1px 7px", borderRadius: 999,
                background: active ? tokens.paper : tokens.ink,
                color: active ? tokens.ink : tokens.paper, fontWeight: 800,
              }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Pending orders */}
      {tab === "pending" && (
        <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.map(o => {
            const remaining = limitSec - (o.receivedAgo + tick);
            const urgent = remaining < 60;
            const expiring = urgency === "strict" ? remaining < 90 : urgent;
            return (
              <div key={o.id} style={{
                background: tokens.card, borderRadius: 18, padding: 14,
                border: `2px solid ${expiring ? tokens.danger : tokens.line}`,
                boxShadow: expiring ? `0 0 0 4px ${tokens.danger}22` : "none",
                transition: "all .3s",
              }}>
                {/* Countdown */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{
                    fontFamily: "var(--nb-display)", fontSize: 28, fontWeight: 600,
                    color: expiring ? tokens.danger : tokens.ink,
                    letterSpacing: -0.5, fontVariantNumeric: "tabular-nums",
                  }}>
                    ⏱ {mmss(Math.max(0, remaining))}
                  </div>
                  <div style={{
                    fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
                    background: tokens.paperDeep, color: tokens.inkMute, fontWeight: 700,
                  }}>#{o.orderNo}</div>
                </div>
                <div style={{ fontSize: 11.5, color: expiring ? tokens.danger : tokens.inkMute, fontWeight: 600, marginTop: -2 }}>
                  {expiring ? "Expiring — act now" : "remaining to respond"}
                </div>

                {/* Customer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{o.customerFirstName}</div>
                    <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{o.customerArea} · {o.items.length} items</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600, color: tokens.ink }}>
                      {formatINR(o.total)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: o.paid ? tokens.success : tokens.accent }}>
                      {o.payment} · {o.paid ? "Paid" : "COD"}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  marginTop: 10, padding: "10px 12px", background: tokens.paper,
                  borderRadius: 12, fontSize: 12.5, color: tokens.ink, lineHeight: 1.6,
                }}>
                  {o.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{it.q}× {it.name}</span>
                      <span style={{ color: tokens.inkMute }}>{it.unit}</span>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setRejectFor(o.id)} style={{
                    padding: "11px 14px", borderRadius: 12,
                    border: `1.5px solid ${tokens.danger}55`,
                    background: "transparent", color: tokens.danger,
                    fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>Reject</button>
                  <button onClick={() => setAcceptFor(o.id)} style={{
                    flex: 1, padding: "12px 14px", borderRadius: 12, border: "none",
                    background: tokens.success, color: "#fff",
                    fontFamily: "var(--nb-body)", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    boxShadow: `0 8px 18px -10px ${tokens.success}`,
                  }}>Accept order →</button>
                </div>
              </div>
            );
          })}
          {pending.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: tokens.inkMute }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Inbox clear</div>
              <div style={{ fontSize: 12 }}>All pending orders handled.</div>
            </div>
          )}
        </div>
      )}

      {/* Active orders */}
      {tab === "active" && (
        <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map(o => (
            <div key={o.id} style={{
              background: tokens.card, borderRadius: 16, padding: 14,
              border: `1px solid ${tokens.line}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{o.customerFirstName} · #{o.orderNo}</div>
                  <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{o.customerArea} · {formatINR(o.total)}</div>
                </div>
                <div style={{
                  padding: "4px 10px", borderRadius: 999,
                  background: o.status === "Ready" ? tokens.successSoft : tokens.primarySoft,
                  color: o.status === "Ready" ? tokens.success : tokens.primaryDeep,
                  fontSize: 11.5, fontWeight: 700,
                }}>{o.status}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1, height: 6, background: tokens.paperDeep, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: o.status === "Ready" ? "100%" : "45%",
                    background: o.status === "Ready" ? tokens.success : tokens.primary,
                  }} />
                </div>
                <div style={{ fontSize: 12, color: tokens.inkMute, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {o.status === "Ready" ? "Waiting pickup" : `Ready in ${o.readyInMin}m`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{
                  flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${tokens.line}`,
                  background: tokens.card, color: tokens.ink, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>View items</button>
                <button style={{
                  flex: 1, padding: "10px", borderRadius: 12, border: "none",
                  background: o.status === "Ready" ? tokens.ink : tokens.success,
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>{o.status === "Ready" ? "Partner coming" : "Mark as ready"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "completed" && (
        <div style={{ padding: "40px 30px", textAlign: "center", color: tokens.inkMute }}>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, color: tokens.ink }}>28 completed</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Today so far · {formatINR(3480)}</div>
        </div>
      )}

      {/* Accept bottom sheet */}
      {acceptFor && (
        <BottomSheet tokens={tokens} onClose={() => setAcceptFor(null)} title="Ready in how long?">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[5, 10, 15, 20, 30, 45].map(m => (
              <button key={m} onClick={() => { dispatch({ type: "accept", id: acceptFor, mins: m }); setAcceptFor(null); }}
                style={{
                  padding: "14px 10px", borderRadius: 14, border: `1.5px solid ${tokens.line}`,
                  background: tokens.card, cursor: "pointer",
                  fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600, color: tokens.ink,
                }}>
                {m}<span style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 500, marginLeft: 3 }}>min</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Reject bottom sheet */}
      {rejectFor && (
        <BottomSheet tokens={tokens} onClose={() => setRejectFor(null)} title="Why are you rejecting?">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Out of stock", "Shop closing early", "Too many orders", "Address outside our range", "Other"].map(r => (
              <button key={r} onClick={() => { dispatch({ type: "reject", id: rejectFor, reason: r }); setRejectFor(null); }}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${tokens.line}`,
                  background: tokens.card, cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--nb-body)", fontSize: 14, fontWeight: 600, color: tokens.ink,
                }}>{r}</button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function BottomSheet({ tokens, title, onClose, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,12,6,0.4)" }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: tokens.paper, borderRadius: "22px 22px 0 0",
        padding: "10px 18px 22px",
        boxShadow: "0 -10px 30px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          width: 40, height: 4, background: tokens.line, borderRadius: 999,
          margin: "0 auto 14px",
        }} />
        <div style={{
          fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600,
          color: tokens.ink, marginBottom: 14, letterSpacing: -0.3,
        }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PRODUCTS — list + add/edit
// ══════════════════════════════════════════════════════════════════════
function ShopProducts({ tokens, state, dispatch, nav, topSafe = 44 }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("All");
  const [adding, setAdding] = React.useState(false);
  const cats = ["All", ...Array.from(new Set(SHOP_INVENTORY.map(i => i.cat)))];
  const items = SHOP_INVENTORY.filter(i =>
    (cat === "All" || i.cat === cat) &&
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 20 }}>
      <div style={{ padding: `${topSafe}px 18px 10px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goDashboard}>←</NBIconCircle>
        <div style={{ flex: 1, fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>
          Products
        </div>
        <button onClick={() => setAdding(true)} style={{
          padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer",
          background: tokens.primary, color: "#fff", fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 700,
        }}>＋ Add</button>
      </div>

      {/* Search */}
      <div style={{ padding: "0 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 12,
        }}>
          <span style={{ color: tokens.inkMute }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your products…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent",
                     fontSize: 14, color: tokens.ink, fontFamily: "var(--nb-body)" }} />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, padding: "12px 14px 4px", overflowX: "auto" }}>
        {cats.map(c => {
          const active = cat === c;
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "7px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              flexShrink: 0, fontSize: 12.5, fontWeight: 700,
              background: active ? tokens.ink : tokens.card, color: active ? tokens.paper : tokens.ink,
              border: `1px solid ${active ? tokens.ink : tokens.line}`,
              fontFamily: "var(--nb-body)",
            }}>{c}</button>
          );
        })}
      </div>

      {/* Product list */}
      <div style={{ padding: "8px 14px" }}>
        {items.map(it => {
          const avail = state.availability[it.id] ?? it.avail;
          const lowStock = it.stock > 0 && it.stock < 5;
          const oos = it.stock === 0;
          return (
            <div key={it.id} style={{
              display: "flex", gap: 12, padding: "10px 0",
              borderBottom: `1px dashed ${tokens.line}`, alignItems: "center",
            }}>
              <NBProductThumb hue={it.hue} label={it.name} size={54} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink, lineHeight: 1.15 }}>{it.name}</div>
                <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{it.unit} · {it.cat}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <span style={{ fontFamily: "var(--nb-display)", fontSize: 15, fontWeight: 600, color: tokens.ink }}>
                    {formatINR(it.price)}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: oos ? tokens.danger : lowStock ? tokens.accent : tokens.inkMute,
                  }}>
                    {oos ? "Out of stock" : `${it.stock} in stock`}
                  </span>
                </div>
              </div>
              {/* Availability toggle */}
              <button onClick={() => dispatch({ type: "toggleAvail", id: it.id, current: avail })}
                disabled={oos}
                style={{
                  width: 46, height: 26, borderRadius: 999, position: "relative",
                  background: avail && !oos ? tokens.success : tokens.paperDeep,
                  border: "none", cursor: oos ? "not-allowed" : "pointer", flexShrink: 0,
                  opacity: oos ? 0.5 : 1,
                }}>
                <div style={{
                  position: "absolute", top: 2, left: avail && !oos ? 22 : 2,
                  width: 22, height: 22, background: "#fff", borderRadius: 999,
                  transition: "left .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* CSV bulk upload footer */}
      <div style={{
        margin: "14px 14px 0", padding: 14, background: tokens.primarySoft, borderRadius: 14,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>📄</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.primaryDeep }}>Bulk upload via CSV</div>
          <div style={{ fontSize: 11.5, color: tokens.inkMute }}>Add hundreds of products at once</div>
        </div>
        <button style={{
          padding: "7px 11px", borderRadius: 10, border: `1px solid ${tokens.primary}`,
          background: tokens.card, color: tokens.primaryDeep, fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Upload</button>
      </div>

      {/* Add product sheet */}
      {adding && (
        <BottomSheet tokens={tokens} onClose={() => setAdding(false)} title="New product">
          <AddProductForm tokens={tokens} onDone={() => setAdding(false)} />
        </BottomSheet>
      )}
    </div>
  );
}

function AddProductForm({ tokens, onDone }) {
  const [name, setName]   = React.useState("");
  const [unit, setUnit]   = React.useState("");
  const [price, setPrice] = React.useState("");
  const [stock, setStock] = React.useState("");
  const valid = name && price;

  return (
    <div>
      {/* Photo block */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        padding: 12, background: tokens.paperDeep, borderRadius: 14, marginBottom: 12,
      }}>
        <div style={{
          width: 66, height: 66, borderRadius: 12, background: tokens.card,
          border: `2px dashed ${tokens.line}`,
          display: "grid", placeItems: "center", color: tokens.inkMute, fontSize: 22,
        }}>📷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>Add a photo</div>
          <div style={{ fontSize: 11.5, color: tokens.inkMute, marginBottom: 6 }}>Square 1:1 works best</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={chipBtn(tokens)}>📸 Camera</button>
            <button style={chipBtn(tokens)}>🖼 Gallery</button>
          </div>
        </div>
      </div>

      <Field tokens={tokens} label="Product name" value={name} onChange={setName} ph="e.g. Sona Masoori Rice" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field tokens={tokens} label="Price (₹)" value={price} onChange={setPrice} ph="0" numeric />
        <Field tokens={tokens} label="Unit"      value={unit}  onChange={setUnit}  ph="1 kg / 500 ml" />
      </div>
      <Field tokens={tokens} label="Stock qty" value={stock} onChange={setStock} ph="How many?" numeric />

      <NBButton tokens={tokens} full size="lg" onClick={onDone} disabled={!valid}
        style={{ marginTop: 8 }}>
        Add to inventory
      </NBButton>
    </div>
  );
}

function chipBtn(tokens) {
  return {
    padding: "6px 10px", borderRadius: 10, border: `1px solid ${tokens.line}`,
    background: tokens.card, color: tokens.ink, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
  };
}

function Field({ tokens, label, value, onChange, ph, numeric }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
        inputMode={numeric ? "numeric" : "text"}
        style={{
          width: "100%", padding: "11px 12px", borderRadius: 12,
          border: `1.5px solid ${tokens.line}`, background: tokens.card, color: tokens.ink,
          fontFamily: "var(--nb-body)", fontSize: 14, outline: "none", boxSizing: "border-box",
        }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ANALYTICS — chart, top products, heatmap, trust
// ══════════════════════════════════════════════════════════════════════
function ShopAnalytics({ tokens, nav, topSafe = 44 }) {
  const [period, setPeriod] = React.useState("7d");
  const data = SHOP_REVENUE_WEEK;
  const maxRev = Math.max(...data.map(d => d.revenue));

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 30 }}>
      <div style={{ padding: `${topSafe}px 18px 10px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goDashboard}>←</NBIconCircle>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>Analytics</div>
      </div>

      {/* Period selector */}
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 6 }}>
        {[["1d","Today"],["7d","7 days"],["30d","30 days"],["90d","90 days"]].map(([id,l]) => {
          const active = period === id;
          return (
            <button key={id} onClick={() => setPeriod(id)} style={{
              flex: 1, padding: "8px 6px", borderRadius: 10, border: "none",
              background: active ? tokens.ink : tokens.card,
              color: active ? tokens.paper : tokens.ink,
              border: `1px solid ${active ? tokens.ink : tokens.line}`,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--nb-body)",
            }}>{l}</button>
          );
        })}
      </div>

      {/* Key metrics */}
      <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat tokens={tokens} k="Orders"     v="94"           sub="7 days" />
        <Stat tokens={tokens} k="Revenue"    v={formatINR(14230)} sub="Gross" accent />
        <Stat tokens={tokens} k="Completion" v="94%"          sub="Rate" />
        <Stat tokens={tokens} k="Avg rating" v="4.8"          sub="127 reviews" />
      </div>

      {/* Revenue chart */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Revenue
        </div>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: "14px 10px 8px",
          border: `1px solid ${tokens.line}`,
        }}>
          <Chart data={data} maxRev={maxRev} tokens={tokens} />
        </div>
      </div>

      {/* Top products */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Top products (30 days)
        </div>
        <div style={{ background: tokens.card, borderRadius: 16, border: `1px solid ${tokens.line}`, overflow: "hidden" }}>
          {SHOP_TOP_PRODUCTS.map((p, i) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px",
              borderTop: i ? `1px solid ${tokens.line}` : "none",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 8,
                background: tokens.paperDeep, color: tokens.ink,
                display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800,
              }}>{i + 1}</div>
              <NBProductThumb hue={p.hue} label={p.name} size={36} radius={9} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>{p.name}</div>
                <div style={{ fontSize: 11, color: tokens.inkMute }}>{p.orders} orders</div>
              </div>
              <div style={{ fontFamily: "var(--nb-display)", fontSize: 15, fontWeight: 600, color: tokens.ink, fontVariantNumeric: "tabular-nums" }}>
                {formatINR(p.revenue)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Peak hours · 7 days × 24 hrs
        </div>
        <div style={{ background: tokens.card, borderRadius: 16, padding: "12px 10px", border: `1px solid ${tokens.line}` }}>
          <Heatmap tokens={tokens} />
        </div>
      </div>

      {/* Trust breakdown */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 4px 8px" }}>
          Trust score breakdown
        </div>
        <div style={{ background: tokens.card, borderRadius: 16, padding: 14, border: `1px solid ${tokens.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 999, background: tokens.primary,
              color: "#fff", display: "grid", placeItems: "center",
              fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 700,
            }}>{SHOP_PROFILE.trustScore}</div>
            <div>
              <div style={{ fontFamily: "var(--nb-display)", fontSize: 17, fontWeight: 600, color: tokens.ink }}>
                Trusted Seller
              </div>
              <div style={{ fontSize: 12, color: tokens.inkMute }}>Top 3% in Hyderabad</div>
            </div>
          </div>
          {SHOP_TRUST_BREAKDOWN.map(b => (
            <div key={b.k} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: tokens.ink, fontWeight: 600, marginBottom: 3 }}>
                <span>{b.k}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {b.v}{b.unit || ""}{b.max ? ` / ${b.max}` : ""}
                </span>
              </div>
              <div style={{ height: 6, background: tokens.paperDeep, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.pct}%`, background: tokens.primary }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chart({ data, maxRev, tokens }) {
  const W = 300, H = 140, P = 16;
  const stepX = (W - P * 2) / (data.length - 1);
  const pts = data.map((d, i) => [P + i * stepX, H - P - (d.revenue / maxRev) * (H - P * 2)]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = path + ` L ${pts[pts.length-1][0].toFixed(1)} ${H-P} L ${pts[0][0].toFixed(1)} ${H-P} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="150">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={tokens.primary} stopOpacity="0.35" />
            <stop offset="100%" stopColor={tokens.primary} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={P} x2={W-P} y1={P + (H - 2*P) * g} y2={P + (H - 2*P) * g}
                stroke={tokens.line} strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#chartFill)" />
        <path d={path} fill="none" stroke={tokens.primary} strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={tokens.primary} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 18px", fontSize: 11, color: tokens.inkMute, fontWeight: 600 }}>
        {data.map(d => <span key={d.day}>{d.day}</span>)}
      </div>
    </div>
  );
}

function Heatmap({ tokens }) {
  const rows = SHOP_HEATMAP;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "28px repeat(24, 1fr)", gap: 2, alignItems: "center" }}>
        <div />
        {[0, 6, 12, 18].map(h => (
          <div key={h} style={{
            gridColumn: `${h + 2} / span 6`, fontSize: 9.5, color: tokens.inkMute, fontWeight: 600,
          }}>{h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h-12}p` : `${h}a`}</div>
        ))}
        {rows.map(({ day, row }) => (
          <React.Fragment key={day}>
            <div style={{ fontSize: 10, color: tokens.inkMute, fontWeight: 700 }}>{day}</div>
            {row.map((v, i) => (
              <div key={i} style={{
                aspectRatio: "1/1", borderRadius: 3,
                background: v === 0 ? tokens.paperDeep
                          : `oklch(${0.96 - v * 0.045} ${0.035 + v * 0.012} 30)`,
              }} />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: tokens.inkMute }}>Quiet</span>
        {[0, 2, 5, 7, 10].map(v => (
          <div key={v} style={{
            width: 12, height: 12, borderRadius: 3,
            background: v === 0 ? tokens.paperDeep : `oklch(${0.96 - v * 0.045} ${0.035 + v * 0.012} 30)`,
          }} />
        ))}
        <span style={{ fontSize: 10, color: tokens.inkMute }}>Busy</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Bottom nav (present on all screens except modal)
// ══════════════════════════════════════════════════════════════════════
function ShopBottomNav({ tokens, screen, nav, pendingCount }) {
  const items = [
    { id: "dashboard", label: "Home",      icon: "◉", onClick: nav.goDashboard },
    { id: "inbox",     label: "Inbox",     icon: "📥", onClick: nav.goInbox, badge: pendingCount },
    { id: "products",  label: "Products",  icon: "📦", onClick: nav.goProducts },
    { id: "analytics", label: "Analytics", icon: "📊", onClick: nav.goAnalytics },
  ];
  return (
    <div style={{
      position: "absolute", left: 14, right: 14, bottom: 14,
      background: tokens.ink, color: tokens.paper, borderRadius: 18,
      padding: "8px 6px", display: "flex", justifyContent: "space-around",
      boxShadow: "0 12px 24px -14px rgba(0,0,0,0.5)", zIndex: 50,
    }}>
      {items.map(it => {
        const active = screen === it.id;
        return (
          <button key={it.id} onClick={it.onClick} style={{
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "6px 12px", borderRadius: 12, position: "relative",
            color: active ? tokens.primary : tokens.paper, opacity: active ? 1 : 0.75,
          }}>
            <span style={{ fontSize: 18 }}>{it.icon}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "var(--nb-body)" }}>{it.label}</span>
            {it.badge > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 4,
                background: tokens.danger, color: "#fff",
                fontSize: 9, fontWeight: 800, minWidth: 14, height: 14,
                borderRadius: 999, display: "grid", placeItems: "center", padding: "0 4px",
              }}>{it.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { ShopDashboard, ShopInbox, ShopProducts, ShopAnalytics, ShopBottomNav });
