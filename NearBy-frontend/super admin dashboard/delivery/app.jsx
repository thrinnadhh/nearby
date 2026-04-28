// Delivery Partner app container

const { NEARBY_PALETTES, NEARBY_TYPE,
        DPHome, DPIncoming, DPPhase1, DPPhase2 } = window;

function NBDeliveryApp({
  width = 390, height = 844, scope = "dp",
  startScreen = "home",
  palette = "mixed",
  typePair = "fraunces-hind",
  topSafe = 44,
}) {
  const tokens = NEARBY_PALETTES[palette] || NEARBY_PALETTES.mixed;
  const type   = NEARBY_TYPE[typePair] || NEARBY_TYPE["fraunces-hind"];

  const [screen, setScreen] = React.useState(startScreen);
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => setScreen(startScreen), [startScreen]);

  function dispatch(a) {
    if (a.type === "toggleOnline") setOnline(v => !v);
    if (a.type === "accept")  setScreen("phase1");
    if (a.type === "decline") setScreen("home");
    if (a.type === "phase1Done") setScreen("phase2");
    if (a.type === "delivered") setScreen("home");
  }

  const state = { online };
  const nav = {
    goHome:     () => setScreen("home"),
    goIncoming: () => setScreen("incoming"),
    goPhase1:   () => setScreen("phase1"),
    goPhase2:   () => setScreen("phase2"),
  };

  const Screens = { home: DPHome, incoming: DPIncoming, phase1: DPPhase1, phase2: DPPhase2 };
  const Current = Screens[screen] || DPHome;

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: tokens.paper, color: tokens.ink, fontFamily: type.body, overflow: "hidden",
      ["--nb-display"]: type.display,
      ["--nb-body"]: type.body,
    }}>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>
        <Current tokens={tokens} state={state} dispatch={dispatch} nav={nav} topSafe={topSafe} />
      </div>
    </div>
  );
}

Object.assign(window, { NBDeliveryApp });
