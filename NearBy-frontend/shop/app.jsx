// Shop Owner app container — state, routing, tweak props

const { NEARBY_PALETTES, NEARBY_TYPE,
        ShopDashboard, ShopInbox, ShopProducts, ShopAnalytics, ShopBottomNav,
        SHOP_ORDERS_PENDING, SHOP_TODAY } = window;

function NBShopApp({
  width = 390, height = 844, scope = "shop",
  startScreen = "dashboard",
  palette = "mixed",
  typePair = "fraunces-hind",
  density = "cozy",
  urgency = "normal",
  topSafe = 44,
}) {
  const tokens = NEARBY_PALETTES[palette] || NEARBY_PALETTES.mixed;
  const type = NEARBY_TYPE[typePair] || NEARBY_TYPE["fraunces-hind"];

  const [screen, setScreen] = React.useState(startScreen);
  const [shopOpen, setShopOpen] = React.useState(true);
  const [acceptedIds, setAcceptedIds] = React.useState(() => new Set());
  const [rejectedIds, setRejectedIds] = React.useState(() => new Set());
  const [acceptedReadyMins, setAcceptedReadyMins] = React.useState({});
  const [availability, setAvailability] = React.useState({});
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => setScreen(startScreen), [startScreen]);

  function dispatch(a) {
    switch (a.type) {
      case "toggleShop":
        setShopOpen(v => {
          setToast(v ? "Shop closed — hidden from customers" : "Shop open — accepting orders");
          return !v;
        });
        break;
      case "accept":
        setAcceptedIds(s => new Set([...s, a.id]));
        setAcceptedReadyMins(m => ({ ...m, [a.id]: a.mins }));
        setToast(`Accepted · ready in ${a.mins} min`);
        break;
      case "reject":
        setRejectedIds(s => new Set([...s, a.id]));
        setToast(`Rejected · ${a.reason}`);
        break;
      case "toggleAvail":
        setAvailability(m => ({ ...m, [a.id]: !a.current }));
        break;
    }
  }

  React.useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const pending = SHOP_ORDERS_PENDING;
  const pendingCount = pending.filter(o => !acceptedIds.has(o.id) && !rejectedIds.has(o.id)).length;

  const state = { shopOpen, acceptedIds, rejectedIds, acceptedReadyMins, availability, pending, pendingCount };
  const nav = {
    goDashboard: () => setScreen("dashboard"),
    goInbox:     () => setScreen("inbox"),
    goProducts:  () => setScreen("products"),
    goAnalytics: () => setScreen("analytics"),
  };

  const Screens = {
    dashboard: ShopDashboard,
    inbox:     ShopInbox,
    products:  ShopProducts,
    analytics: ShopAnalytics,
  };
  const Current = Screens[screen] || ShopDashboard;

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: tokens.paper, color: tokens.ink,
      fontFamily: type.body, overflow: "hidden",
      ["--nb-display"]: type.display,
      ["--nb-body"]: type.body,
    }}>
      <div style={{
        position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
        paddingBottom: 82,
      }}>
        <Current
          tokens={tokens}
          state={state}
          dispatch={dispatch}
          nav={nav}
          topSafe={topSafe}
          urgency={urgency}
          density={density}
        />
      </div>

      <ShopBottomNav tokens={tokens} screen={screen} nav={nav} pendingCount={pendingCount} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", left: 14, right: 14, bottom: 90, zIndex: 60,
          background: tokens.ink, color: tokens.paper, padding: "11px 14px",
          borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: type.body,
          textAlign: "center", boxShadow: "0 10px 24px -12px rgba(0,0,0,0.4)",
        }}>{toast}</div>
      )}
    </div>
  );
}

Object.assign(window, { NBShopApp });
