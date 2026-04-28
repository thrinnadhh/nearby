// NearBy app shell — composes the prototype flow inside an artboard.
// Screens: home → shop → cart → checkout → tracking
// Shares state (cart, nav, tracking progress) via a single NBApp component.

const {
  NEARBY_PALETTES, NEARBY_TYPE, NEARBY_SHOPS, NEARBY_PRODUCTS,
  NBHomeScreen, NBShopScreen, NBCartScreen, NBCheckoutScreen,
  NBTrackingMapFirst, NBTrackingStatusFirst,
} = window;

function cartReducer(cart, action) {
  const next = { ...cart };
  if (action.type === "add")    next[action.id] = (next[action.id] || 0) + 1;
  if (action.type === "remove") {
    next[action.id] = (next[action.id] || 0) - 1;
    if (next[action.id] <= 0) delete next[action.id];
  }
  if (action.type === "clear")  return {};
  return next;
}

function NBApp({
  palette = "saffron", typePair = "fraunces-hind",
  cardVariant = "big", trackingVariant = "mapFirst", tone = "warm",
  startScreen = "home", seedCart = false,
  width = 390, height = 844, scope = "nb-ios",
}) {
  const tokens = NEARBY_PALETTES[palette];
  const type   = NEARBY_TYPE[typePair];
  // iOS status bar is ~44px tall, Android is ~24px. Infer from width (iOS 390, Android 412).
  const topSafe = width >= 400 ? 32 : 44;

  const initialCart = seedCart ? { p1: 1, p2: 2, p5: 2, p10: 3 } : {};
  const [cart, dispatchCart] = React.useReducer(cartReducer, initialCart);

  const [screen, setScreen] = React.useState(startScreen); // home | shop | cart | checkout | tracking
  const [shopId, setShopId] = React.useState("kumars");
  const [trackStep, setTrackStep] = React.useState(0);
  const [trackProgress, setTrackProgress] = React.useState(0);

  // Auto-advance tracking when on tracking screen
  React.useEffect(() => {
    if (screen !== "tracking") return;
    setTrackStep(0); setTrackProgress(0);
    const stepTimers = [
      setTimeout(() => setTrackStep(1), 900),
      setTimeout(() => setTrackStep(2), 2000),
      setTimeout(() => setTrackStep(3), 3400),
      setTimeout(() => setTrackStep(4), 8800),
    ];
    const progressTimer = setInterval(() => {
      setTrackProgress(p => (p >= 1 ? 1 : Math.min(1, p + 0.02)));
    }, 160);
    return () => { stepTimers.forEach(clearTimeout); clearInterval(progressTimer); };
  }, [screen]);

  const state = {
    userName: "Priya",
    area: "Basheerbagh",
    addressLine: "Flat 302, Lotus Residency, Road No. 7",
    cart, trackStep, trackProgress,
  };

  const dispatch = (a) => {
    if (a.type === "placeOrder") { dispatchCart({ type: "clear" }); return; }
    dispatchCart(a);
  };

  const nav = {
    goHome: () => setScreen("home"),
    goShop: (id) => { if (id) setShopId(id); setScreen("shop"); },
    goCart: () => setScreen("cart"),
    goCheckout: () => setScreen("checkout"),
    goTracking: () => setScreen("tracking"),
  };

  // keep cart context around for tracking after placeOrder (re-seed snapshot)
  const [trackingCart, setTrackingCart] = React.useState(null);
  React.useEffect(() => {
    if (screen === "tracking" && !trackingCart) setTrackingCart({ ...cart });
    if (screen === "home") setTrackingCart(null);
  }, [screen]);
  // If we placed an order, cart is cleared — use the snapshot for tracking.
  const effectiveCart = (screen === "tracking" && trackingCart && Object.keys(cart).length === 0)
    ? trackingCart : cart;

  const trackingState = { ...state, cart: effectiveCart };

  let Screen;
  if (screen === "home")      Screen = <NBHomeScreen tokens={tokens} state={state} nav={nav} cardVariant={cardVariant} tone={tone} topSafe={topSafe} />;
  else if (screen === "shop") Screen = <NBShopScreen tokens={tokens} shopId={shopId} state={state} dispatch={dispatch} nav={nav} topSafe={topSafe} />;
  else if (screen === "cart") Screen = <NBCartScreen tokens={tokens} state={state} dispatch={dispatch} nav={nav} topSafe={topSafe} />;
  else if (screen === "checkout") Screen = <NBCheckoutScreen tokens={tokens} state={state} dispatch={dispatch} nav={nav} topSafe={topSafe} />;
  else if (screen === "tracking") {
    const T = trackingVariant === "statusFirst" ? NBTrackingStatusFirst : NBTrackingMapFirst;
    Screen = <T tokens={tokens} state={trackingState} nav={nav} topSafe={topSafe} />;
  }

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: tokens.paper, color: tokens.ink,
      fontFamily: type.body, overflow: "hidden",
      "--nb-display": type.display, "--nb-body": type.body,
    }}>
      <style>{`
        .${scope} *::-webkit-scrollbar { width: 0; height: 0; }
        .${scope} { font-family: ${type.body}; }
      `}</style>
      <div className={scope} style={{
        width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}>
        {Screen}
      </div>
    </div>
  );
}

Object.assign(window, { NBApp, cartReducer });
