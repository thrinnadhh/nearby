// All API configuration must be imported from here — never hardcode URLs per-use.
// EXPO_PUBLIC_ prefix is required for Expo to expose env vars to the client bundle.

// Fail loudly at boot if env vars are missing — never silently fall back to the
// production hostname, which would cause misconfigured CI builds to hit live production.
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set. Copy .env.example to .env and fill in the values.`);
  }
  return value;
};

export const API_BASE_URL = requireEnv('EXPO_PUBLIC_API_URL');
export const SOCKET_URL = requireEnv('EXPO_PUBLIC_SOCKET_URL');
export const API_TIMEOUT = 15_000;
