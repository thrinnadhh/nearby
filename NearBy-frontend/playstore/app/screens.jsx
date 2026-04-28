// NearBy screens: Home, Shop, Cart, Checkout, Tracking (two variants)
// Each screen is a pure component that receives { tokens, state, dispatch, nav }

const {
  NEARBY_CATEGORIES, NEARBY_SHOPS, NEARBY_PRODUCTS, NEARBY_TIMELINE,
  NBDot, NBStar, NBRatingPill, NBVerifiedBadge, NBOpenBadge,
  NBProductThumb, NBShopCover, NBButton, NBIconCircle, NBTrustRibbon,
  formatINR,
} = window;

// ══════════════════════════════════════════════════════════════════════
// Shop cards — two layout variants for the Home feed
// ══════════════════════════════════════════════════════════════════════
function NBShopCardBig({ shop, tokens, onOpen }) {
  return (
    <div onClick={onOpen} style={{
      background: tokens.card, borderRadius: 20, overflow: "hidden",
      border: `1px solid ${tokens.line}`, cursor: "pointer",
      boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
    }}>
      <div style={{ padding: 8, paddingBottom: 0 }}>
        <NBShopCover hue={shop.hue} name={shop.name} tokens={tokens} />
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600,
              color: tokens.ink, letterSpacing: -0.2, lineHeight: 1.1,
            }}>{shop.name}</div>
            <div style={{ fontSize: 12.5, color: tokens.inkMute, marginTop: 2 }}>
              {shop.categoryLabel} · {shop.tagline}
            </div>
          </div>
          <NBRatingPill rating={shop.rating} tokens={tokens} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <NBOpenBadge open={shop.isOpen} closesAt={shop.closesAt} tokens={tokens} />
          <span style={pillS(tokens)}>📍 {shop.distance} km · {shop.area}</span>
          <span style={pillS(tokens)}>🛵 {shop.eta}</span>
          {shop.verified && <NBVerifiedBadge tokens={tokens} compact />}
        </div>
      </div>
    </div>
  );
}

function NBShopCardCompact({ shop, tokens, onOpen }) {
  return (
    <div onClick={onOpen} style={{
      display: "flex", gap: 12, background: tokens.card, borderRadius: 18,
      border: `1px solid ${tokens.line}`, padding: 10, cursor: "pointer",
    }}>
      <div style={{ width: 92, height: 92, borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
        <NBShopCover hue={shop.hue} name="" tokens={tokens} aspect="1/1" />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <div style={{
            fontFamily: "var(--nb-display)", fontSize: 16.5, fontWeight: 600,
            color: tokens.ink, letterSpacing: -0.2, lineHeight: 1.15,
          }}>{shop.name}</div>
          <NBRatingPill rating={shop.rating} tokens={tokens} compact />
        </div>
        <div style={{ fontSize: 12, color: tokens.inkMute }}>
          {shop.categoryLabel} · {shop.area} · {shop.distance} km
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
          <NBOpenBadge open={shop.isOpen} closesAt={shop.closesAt} tokens={tokens} />
          <span style={{ ...pillS(tokens), fontSize: 11 }}>🛵 {shop.eta}</span>
        </div>
      </div>
    </div>
  );
}

function NBShopCardEditorial({ shop, tokens, onOpen }) {
  // magazine-feel: full-bleed image, overlay title
  return (
    <div onClick={onOpen} style={{
      position: "relative", borderRadius: 22, overflow: "hidden", cursor: "pointer",
      border: `1px solid ${tokens.line}`, aspectRatio: "4/3", background: "#000",
    }}>
      <NBShopCover hue={shop.hue} name="" tokens={tokens} aspect="4/3" />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)",
      }} />
      <div style={{ position: "absolute", left: 14, top: 14, display: "flex", gap: 6 }}>
        <NBRatingPill rating={shop.rating} tokens={tokens} compact />
        {shop.verified && <NBVerifiedBadge tokens={tokens} compact />}
      </div>
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, color: "#fff" }}>
        <div style={{
          fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, letterSpacing: -0.3,
          lineHeight: 1.05,
        }}>{shop.name}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          {shop.categoryLabel} · {shop.area} · {shop.distance} km · {shop.eta}
        </div>
      </div>
    </div>
  );
}

function pillS(tokens) {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 9px", background: tokens.paperDeep, color: tokens.inkMute,
    borderRadius: 999, fontSize: 11.5, fontWeight: 500,
  };
}

// ══════════════════════════════════════════════════════════════════════
// HOME screen
// ══════════════════════════════════════════════════════════════════════
function NBHomeScreen({ tokens, state, nav, cardVariant = "big", tone = "warm", topSafe = 44 }) {
  const [cat, setCat] = React.useState("all");
  const shops = NEARBY_SHOPS.filter(s => cat === "all" || s.category === cat);

  const greetings = {
    warm:   { hi: `Namaste, ${state.userName}`, sub: "What can we get for you today?" },
    neutral:{ hi: `Hi, ${state.userName}`,     sub: "Shops delivering to you now" },
    crisp:  { hi: `Good evening`,              sub: `${state.userName} · ${state.area}` },
  };
  const g = greetings[tone] || greetings.warm;

  const CardComp = cardVariant === "compact"   ? NBShopCardCompact
                 : cardVariant === "editorial" ? NBShopCardEditorial
                 :                               NBShopCardBig;

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 88 }}>
      {/* Location header */}
      <div style={{ padding: `${topSafe}px 18px 4px`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Deliver to
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: tokens.ink }}>
            <span style={{ fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600 }}>
              📍 {state.area}
            </span>
            <span style={{ fontSize: 13, color: tokens.inkMute, marginLeft: 4 }}>▾</span>
          </div>
        </div>
        <NBIconCircle tokens={tokens} size={40}>
          <span style={{ fontSize: 16 }}>🔔</span>
        </NBIconCircle>
      </div>

      <div style={{ padding: "8px 18px 14px" }}>
        <div style={{
          fontFamily: "var(--nb-display)", fontSize: 30, fontWeight: 600, color: tokens.ink,
          letterSpacing: -0.6, lineHeight: 1.05, textWrap: "pretty",
        }}>{g.hi}.</div>
        <div style={{ color: tokens.inkMute, fontSize: 14.5, marginTop: 4 }}>{g.sub}</div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 18px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 14,
        }}>
          <span style={{ color: tokens.inkMute }}>🔍</span>
          <span style={{ color: tokens.inkMute, fontSize: 14 }}>Search shops or products…</span>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 8, padding: "14px 18px 6px", overflowX: "auto" }}>
        {NEARBY_CATEGORIES.map(c => {
          const active = cat === c.id;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 999, flexShrink: 0,
              background: active ? tokens.ink : tokens.card,
              color: active ? tokens.paper : tokens.ink,
              border: `1px solid ${active ? tokens.ink : tokens.line}`,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--nb-body)",
            }}>
              <span>{c.icon}</span>{c.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div style={{ padding: "12px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{
          fontFamily: "var(--nb-display)", fontSize: 20, fontWeight: 600, color: tokens.ink, letterSpacing: -0.2,
          whiteSpace: "nowrap",
        }}>Shops near you</div>
        <div style={{ fontSize: 11.5, color: tokens.inkMute, fontWeight: 600, whiteSpace: "nowrap" }}>{shops.length} open now</div>
      </div>

      <div style={{
        padding: "12px 18px 20px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {shops.map(s => (
          <CardComp key={s.id} shop={s} tokens={tokens} onOpen={() => nav.goShop(s.id)} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SHOP screen
// ══════════════════════════════════════════════════════════════════════
function NBShopScreen({ tokens, shopId, state, dispatch, nav, topSafe = 44 }) {
  const shop = NEARBY_SHOPS.find(s => s.id === shopId);
  const sections = NEARBY_PRODUCTS[shopId] || [];
  const cartCount = Object.values(state.cart).reduce((s, n) => s + n, 0);
  const cartTotal = computeCartTotal(state.cart);

  if (!shop) return <div style={{ padding: 20 }}>Shop not found</div>;

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: cartCount ? 120 : 60 }}>
      {/* Hero cover */}
      <div style={{ position: "relative" }}>
        <NBShopCover hue={shop.hue} name="" tokens={tokens} aspect="16/10" />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
        }} />
        <div style={{ position: "absolute", top: topSafe, left: 14, display: "flex", gap: 8 }}>
          <NBIconCircle tokens={tokens} size={38} onClick={nav.goHome}>←</NBIconCircle>
        </div>
        <div style={{ position: "absolute", top: topSafe, right: 14, display: "flex", gap: 8 }}>
          <NBIconCircle tokens={tokens} size={38}>♡</NBIconCircle>
          <NBIconCircle tokens={tokens} size={38}>↗</NBIconCircle>
        </div>
      </div>

      {/* Shop header card — floats over cover */}
      <div style={{
        margin: "-34px 14px 0", background: tokens.card, borderRadius: 20,
        padding: "16px 16px 14px", border: `1px solid ${tokens.line}`,
        boxShadow: "0 8px 24px -16px rgba(0,0,0,0.3)", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--nb-display)", fontSize: 24, fontWeight: 600,
              color: tokens.ink, letterSpacing: -0.4, lineHeight: 1.05,
            }}>{shop.name}</div>
            <div style={{ fontSize: 13, color: tokens.inkMute, marginTop: 2 }}>
              {shop.categoryLabel} · since {shop.since} · by {shop.owner}
            </div>
          </div>
          <NBRatingPill rating={shop.rating} tokens={tokens} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          <NBOpenBadge open={shop.isOpen} closesAt={shop.closesAt} tokens={tokens} />
          <span style={pillS(tokens)}>📍 {shop.distance} km · {shop.area}</span>
          <span style={pillS(tokens)}>🛵 {shop.eta}</span>
          <span style={pillS(tokens)}>{shop.productCount.toLocaleString("en-IN")} items</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <NBTrustRibbon score={shop.trustScore} tokens={tokens} />
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, padding: "16px 14px 6px", overflowX: "auto" }}>
        {sections.map(s => (
          <div key={s.section} style={{
            padding: "7px 12px", borderRadius: 999,
            background: tokens.paperDeep, color: tokens.ink,
            fontSize: 12.5, fontWeight: 600, flexShrink: 0, cursor: "pointer",
          }}>{s.section}</div>
        ))}
      </div>

      {/* Products */}
      {sections.map(section => (
        <div key={section.section} style={{ padding: "10px 14px" }}>
          <div style={{
            fontFamily: "var(--nb-display)", fontSize: 18, fontWeight: 600, color: tokens.ink,
            letterSpacing: -0.2, padding: "4px 2px 10px",
          }}>{section.section}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {section.items.map(p => {
              const qty = state.cart[p.id] || 0;
              const oos = p.stock === 0;
              return (
                <div key={p.id} style={{
                  background: tokens.card, borderRadius: 16, padding: 10,
                  border: `1px solid ${tokens.line}`, position: "relative",
                  opacity: oos ? 0.55 : 1,
                }}>
                  <div style={{ position: "relative" }}>
                    <NBProductThumb hue={p.hue} label={p.name} size={"100%"} radius={12}
                      withLabel={true}
                    />
                    {/* real size override */}
                    <div style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none" }} />
                  </div>
                  <div style={{
                    fontFamily: "var(--nb-body)", fontSize: 13, fontWeight: 600, color: tokens.ink,
                    marginTop: 8, lineHeight: 1.2,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: tokens.inkMute, marginTop: 2 }}>
                    {p.unit} · {p.crumb}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div>
                      <div style={{
                        fontFamily: "var(--nb-display)", fontSize: 17, fontWeight: 600, color: tokens.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}>{formatINR(p.price)}</div>
                      {p.stock > 0 && p.stock < 5 && (
                        <div style={{ fontSize: 10.5, color: tokens.danger, fontWeight: 600 }}>
                          Only {p.stock} left
                        </div>
                      )}
                    </div>
                    {oos ? (
                      <span style={{ fontSize: 11, color: tokens.inkMute, fontWeight: 600 }}>Unavailable</span>
                    ) : qty === 0 ? (
                      <button onClick={() => dispatch({ type: "add", id: p.id })} style={{
                        width: 32, height: 32, borderRadius: 999, border: "none",
                        background: tokens.primary, color: "#fff", fontSize: 18, fontWeight: 700,
                        cursor: "pointer", boxShadow: `0 6px 14px -6px ${tokens.primary}`,
                      }}>+</button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 0,
                        background: tokens.primary, color: "#fff", borderRadius: 999, padding: 2 }}>
                        <button onClick={() => dispatch({ type: "remove", id: p.id })} style={qtyBtn}>−</button>
                        <span style={{ padding: "0 8px", fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => dispatch({ type: "add", id: p.id })} style={qtyBtn}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Cart bar */}
      {cartCount > 0 && (
        <div style={{
          position: "absolute", left: 14, right: 14, bottom: 16,
          background: tokens.ink, color: tokens.paper, borderRadius: 18,
          padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 12px 24px -10px rgba(0,0,0,0.4)", cursor: "pointer",
        }} onClick={nav.goCart}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>
              {cartCount} item{cartCount > 1 ? "s" : ""} · {formatINR(cartTotal)}
            </div>
            <div style={{ fontFamily: "var(--nb-display)", fontSize: 17, fontWeight: 600 }}>
              View cart
            </div>
          </div>
          <div style={{
            background: tokens.primary, color: "#fff", padding: "10px 14px",
            borderRadius: 12, fontWeight: 700, fontSize: 13,
          }}>Checkout →</div>
        </div>
      )}
    </div>
  );
}

const qtyBtn = {
  width: 28, height: 28, borderRadius: 999, border: "none",
  background: "transparent", color: "#fff", fontSize: 16, fontWeight: 700,
  cursor: "pointer",
};

function computeCartTotal(cart) {
  // find prices across all shops
  let total = 0;
  for (const shopId of Object.keys(NEARBY_PRODUCTS)) {
    for (const sec of NEARBY_PRODUCTS[shopId]) {
      for (const p of sec.items) {
        if (cart[p.id]) total += cart[p.id] * p.price;
      }
    }
  }
  return total;
}

function getCartLines(cart) {
  const lines = [];
  for (const shopId of Object.keys(NEARBY_PRODUCTS)) {
    for (const sec of NEARBY_PRODUCTS[shopId]) {
      for (const p of sec.items) {
        if (cart[p.id]) lines.push({ ...p, shopId, qty: cart[p.id], lineTotal: cart[p.id] * p.price });
      }
    }
  }
  return lines;
}

// ══════════════════════════════════════════════════════════════════════
// CART screen
// ══════════════════════════════════════════════════════════════════════
function NBCartScreen({ tokens, state, dispatch, nav, topSafe = 44 }) {
  const lines = getCartLines(state.cart);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shopId = lines[0]?.shopId;
  const shop = NEARBY_SHOPS.find(s => s.id === shopId);
  const delivery = subtotal >= 300 ? 0 : 25;
  const total = subtotal + delivery;

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 120 }}>
      <div style={{
        padding: `${topSafe}px 18px 6px`, display: "flex", alignItems: "center", gap: 10,
      }}>
        <NBIconCircle tokens={tokens} size={36} onClick={() => nav.goShop(shopId)}>←</NBIconCircle>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>Your cart</div>
      </div>

      {lines.length === 0 ? (
        <div style={{ padding: "60px 30px", textAlign: "center", color: tokens.inkMute }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧺</div>
          <div style={{ fontFamily: "var(--nb-display)", fontSize: 20, color: tokens.ink, marginBottom: 6 }}>Your cart is empty</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Browse local shops and add a few things.</div>
          <NBButton tokens={tokens} onClick={nav.goHome}>Find a shop</NBButton>
        </div>
      ) : (
        <>
          {/* Shop header */}
          {shop && (
            <div style={{
              margin: "8px 14px", background: tokens.card, borderRadius: 16,
              border: `1px solid ${tokens.line}`, padding: 12,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden" }}>
                <NBShopCover hue={shop.hue} name="" tokens={tokens} aspect="1/1" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--nb-display)", fontSize: 15, fontWeight: 600, color: tokens.ink }}>{shop.name}</div>
                <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{shop.area} · {shop.eta}</div>
              </div>
              {shop.verified && <NBVerifiedBadge tokens={tokens} compact />}
            </div>
          )}

          {/* Line items */}
          <div style={{ padding: "2px 14px" }}>
            {lines.map(l => (
              <div key={l.id} style={{
                display: "flex", gap: 12, padding: "10px 0",
                borderBottom: `1px dashed ${tokens.line}`,
              }}>
                <NBProductThumb hue={l.hue} label={l.name} size={54} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tokens.ink, lineHeight: 1.2 }}>{l.name}</div>
                  <div style={{ fontSize: 11.5, color: tokens.inkMute }}>{l.unit}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", background: tokens.paperDeep, borderRadius: 999, padding: 2 }}>
                      <button onClick={() => dispatch({ type: "remove", id: l.id })} style={{ ...qtyBtn, color: tokens.ink }}>−</button>
                      <span style={{ padding: "0 10px", fontSize: 13, fontWeight: 700, color: tokens.ink }}>{l.qty}</span>
                      <button onClick={() => dispatch({ type: "add", id: l.id })} style={{ ...qtyBtn, color: tokens.ink }}>+</button>
                    </div>
                    <div style={{ marginLeft: "auto", fontFamily: "var(--nb-display)", fontWeight: 600, fontSize: 16, color: tokens.ink }}>
                      {formatINR(l.lineTotal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ padding: "14px 14px 0" }}>
            <div style={{
              background: tokens.card, borderRadius: 16, padding: 14,
              border: `1px solid ${tokens.line}`,
            }}>
              <Row l="Subtotal"  r={formatINR(subtotal)} tokens={tokens} />
              <Row l="Delivery"  r={delivery === 0 ? "Free" : formatINR(delivery)} tokens={tokens} hint={delivery === 0 ? "Order above ₹300" : ""} />
              <div style={{ height: 1, background: tokens.line, margin: "8px 0" }} />
              <Row l="Total" r={formatINR(total)} tokens={tokens} big />
            </div>
          </div>

          {/* Delivery slot hint */}
          <div style={{
            margin: "12px 14px 0", padding: 12, background: tokens.primarySoft, borderRadius: 14,
            fontSize: 12.5, color: tokens.primaryDeep, display: "flex", gap: 8, alignItems: "center",
          }}>
            <span>🛵</span>
            <div>Delivery by <b>Ramesh</b> · arrives in ~{shop?.eta || "25 min"}</div>
          </div>

          {/* Proceed */}
          <div style={{
            position: "absolute", left: 14, right: 14, bottom: 16,
            display: "flex", gap: 10,
          }}>
            <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`,
              borderRadius: 14, padding: "12px 14px", minWidth: 0, flex: "0 0 auto" }}>
              <div style={{ fontSize: 10.5, color: tokens.inkMute, fontWeight: 600 }}>TOTAL</div>
              <div style={{ fontFamily: "var(--nb-display)", fontWeight: 600, fontSize: 18, color: tokens.ink }}>{formatINR(total)}</div>
            </div>
            <NBButton tokens={tokens} full size="lg" onClick={nav.goCheckout}>
              Proceed to checkout →
            </NBButton>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ l, r, tokens, big, hint }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0" }}>
      <div>
        <div style={{ fontSize: big ? 15 : 13.5, fontWeight: big ? 700 : 500, color: tokens.ink }}>{l}</div>
        {hint && <div style={{ fontSize: 11, color: tokens.inkMute }}>{hint}</div>}
      </div>
      <div style={{
        fontFamily: big ? "var(--nb-display)" : "var(--nb-body)",
        fontSize: big ? 19 : 14, fontWeight: big ? 600 : 600, color: tokens.ink,
        fontVariantNumeric: "tabular-nums",
      }}>{r}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CHECKOUT screen
// ══════════════════════════════════════════════════════════════════════
function NBCheckoutScreen({ tokens, state, dispatch, nav, topSafe = 44 }) {
  const lines = getCartLines(state.cart);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const delivery = subtotal >= 300 ? 0 : 25;
  const total = subtotal + delivery;
  const [payment, setPayment] = React.useState("upi");
  const [placing, setPlacing] = React.useState(false);

  const place = () => {
    setPlacing(true);
    setTimeout(() => { setPlacing(false); nav.goTracking(); dispatch({ type: "placeOrder" }); }, 900);
  };

  const pays = [
    { id: "upi",  label: "UPI",  sub: "rajesh@okhdfc", icon: "💸", rec: true },
    { id: "card", label: "Card", sub: "•• 4821",        icon: "💳" },
    { id: "cod",  label: "Cash", sub: "Pay on delivery", icon: "🪙" },
  ];

  return (
    <div style={{ background: tokens.paper, minHeight: "100%", paddingBottom: 120 }}>
      <div style={{ padding: `${topSafe}px 18px 6px`, display: "flex", alignItems: "center", gap: 10 }}>
        <NBIconCircle tokens={tokens} size={36} onClick={nav.goCart}>←</NBIconCircle>
        <div style={{ fontFamily: "var(--nb-display)", fontSize: 22, fontWeight: 600, color: tokens.ink }}>Checkout</div>
      </div>

      {/* Address */}
      <div style={{ padding: "10px 14px" }}>
        <SectionTitle tokens={tokens}>Deliver to</SectionTitle>
        <div style={{
          background: tokens.card, border: `1px solid ${tokens.line}`,
          borderRadius: 16, padding: 14, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999, background: tokens.primarySoft,
            color: tokens.primaryDeep, display: "grid", placeItems: "center",
            fontSize: 16, flexShrink: 0,
          }}>🏠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>Home</div>
            <div style={{ fontSize: 12.5, color: tokens.inkMute, lineHeight: 1.4 }}>
              {state.addressLine}
              <br/>{state.area}, Hyderabad 500016
            </div>
          </div>
          <button style={{
            background: "transparent", border: "none", color: tokens.primaryDeep,
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>Change</button>
        </div>
      </div>

      {/* Items (collapsed summary) */}
      <div style={{ padding: "6px 14px" }}>
        <SectionTitle tokens={tokens}>{lines.length} items · {NEARBY_SHOPS.find(s => s.id === lines[0]?.shopId)?.name}</SectionTitle>
        <div style={{
          background: tokens.card, border: `1px solid ${tokens.line}`,
          borderRadius: 16, padding: 12,
        }}>
          {lines.map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5 }}>
              <span style={{ color: tokens.ink }}>{l.qty} × {l.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: tokens.inkMute }}>{formatINR(l.lineTotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div style={{ padding: "6px 14px" }}>
        <SectionTitle tokens={tokens}>Payment</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pays.map(p => {
            const active = payment === p.id;
            return (
              <button key={p.id} onClick={() => setPayment(p.id)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", textAlign: "left",
                background: active ? tokens.primarySoft : tokens.card,
                border: `1.5px solid ${active ? tokens.primary : tokens.line}`,
                borderRadius: 14, cursor: "pointer", fontFamily: "var(--nb-body)",
              }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>
                    {p.label} {p.rec && <span style={{
                      fontSize: 10, background: tokens.primary, color: "#fff",
                      padding: "2px 6px", borderRadius: 999, marginLeft: 6, fontWeight: 700,
                    }}>RECOMMENDED</span>}
                  </div>
                  <div style={{ fontSize: 12, color: tokens.inkMute }}>{p.sub}</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: 999,
                  border: `2px solid ${active ? tokens.primary : tokens.line}`,
                  background: active ? tokens.primary : "transparent",
                }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{
          background: tokens.card, borderRadius: 16, padding: 14,
          border: `1px solid ${tokens.line}`,
        }}>
          <Row l="Subtotal" r={formatINR(subtotal)} tokens={tokens} />
          <Row l="Delivery" r={delivery === 0 ? "Free" : formatINR(delivery)} tokens={tokens} />
          <div style={{ height: 1, background: tokens.line, margin: "8px 0" }} />
          <Row l="Pay now" r={formatINR(total)} tokens={tokens} big />
        </div>
      </div>

      {/* Place order */}
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 16 }}>
        <NBButton tokens={tokens} full size="lg" onClick={place} disabled={placing}>
          {placing ? "Placing order…" : `Place order · ${formatINR(total)}`}
        </NBButton>
      </div>
    </div>
  );
}

function SectionTitle({ tokens, children }) {
  return <div style={{
    fontSize: 11, color: tokens.inkMute, fontWeight: 700, letterSpacing: 0.4,
    textTransform: "uppercase", padding: "10px 4px 8px",
  }}>{children}</div>;
}

Object.assign(window, {
  NBHomeScreen, NBShopScreen, NBCartScreen, NBCheckoutScreen,
  NBShopCardBig, NBShopCardCompact, NBShopCardEditorial,
  computeCartTotal, getCartLines,
});
