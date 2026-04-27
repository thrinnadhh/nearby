// Design tokens for NearBy — shared across all screens & palette variants.
// Three palette options; typography pair toggles via Tweaks.

const NEARBY_PALETTES = {
  saffron: {
    name: "Saffron Market",
    primary: "#E35D23",        // warm terracotta/saffron
    primaryDeep: "#B9431B",
    primarySoft: "#FBE4D3",
    accent: "#F4A62A",          // turmeric / price highlight
    success: "#2F8F5E",
    successSoft: "#D6EEDE",
    danger: "#C63A3A",
    ink: "#261A14",             // deep warm brown (text)
    inkMute: "#6B5B52",
    paper: "#FBF4EA",           // cream background
    paperDeep: "#F3E9D7",
    card: "#FFFFFF",
    line: "#E9DDC7",
    starGold: "#E49B15",
  },
  emerald: {
    name: "Fresh Emerald",
    primary: "#0E9F6E",
    primaryDeep: "#067253",
    primarySoft: "#D3F0E3",
    accent: "#F59E0B",
    success: "#0E9F6E",
    successSoft: "#D3F0E3",
    danger: "#C63A3A",
    ink: "#14231C",
    inkMute: "#5B6B63",
    paper: "#F6F3EC",
    paperDeep: "#ECE7DB",
    card: "#FFFFFF",
    line: "#E0DACA",
    starGold: "#E49B15",
  },
  mixed: {
    name: "Turmeric & Leaf",
    primary: "#D35323",         // saffron primary
    primaryDeep: "#A03C17",
    primarySoft: "#FADCC6",
    accent: "#0E9F6E",          // green as secondary/trust
    success: "#0E9F6E",
    successSoft: "#D3F0E3",
    danger: "#C63A3A",
    ink: "#2A1F17",
    inkMute: "#70615A",
    paper: "#FAF2E3",
    paperDeep: "#F0E3CB",
    card: "#FFFFFF",
    line: "#E7D9BF",
    starGold: "#E49B15",
  },
};

const NEARBY_TYPE = {
  "fraunces-hind": {
    name: "Fraunces × Hind",
    display: "'Fraunces', 'Georgia', serif",
    body: "'Hind', 'Inter', system-ui, sans-serif",
    displayWeightBold: 700,
    displayWeightReg: 500,
  },
  "dm-hind": {
    name: "DM Serif × Hind",
    display: "'DM Serif Display', 'Georgia', serif",
    body: "'Hind', 'Inter', system-ui, sans-serif",
    displayWeightBold: 400,
    displayWeightReg: 400,
  },
  "instrument-manrope": {
    name: "Instrument × Manrope",
    display: "'Instrument Serif', 'Georgia', serif",
    body: "'Manrope', system-ui, sans-serif",
    displayWeightBold: 400,
    displayWeightReg: 400,
  },
};

// Simple INR money formatter
function formatINR(n) {
  if (n == null) return "";
  const s = Math.round(n).toString();
  // 1,23,456 style
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + rest + "," + last3;
}

Object.assign(window, { NEARBY_PALETTES, NEARBY_TYPE, formatINR });
