// Servers that help two phones find each other for voice chat.
// STUN is free and works on most Wi-Fi. TURN relays the audio when a mobile
// network blocks direct connections. Turn it on by adding either:
//  - CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN (Cloudflare Realtime TURN, free tier), or
//  - TURN_URLS (comma separated) + TURN_USERNAME + TURN_CREDENTIAL (any TURN provider)
const STUN = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const servers = [...STUN];
  const { CLOUDFLARE_TURN_KEY_ID: keyId, CLOUDFLARE_TURN_API_TOKEN: token, TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL, METERED_APP, METERED_API_KEY } = process.env;
  try {
    if (METERED_APP && METERED_API_KEY) {
      const app = METERED_APP.replace(/^https?:\/\//, "").replace(/\.metered\.live.*$/, "");
      const r = await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`);
      const list = await r.json();
      if (Array.isArray(list)) for (const s of list) if (String(s.urls || "").startsWith("turn")) servers.push(s);
    } else if (keyId && token) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ttl: 6 * 3600 }),
      });
      const j = await r.json();
      const ice = j && j.iceServers;
      if (ice) for (const s of Array.isArray(ice) ? ice : [ice]) servers.push(s);
    } else if (TURN_URLS && TURN_USERNAME && TURN_CREDENTIAL) {
      servers.push({ urls: TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean), username: TURN_USERNAME, credential: TURN_CREDENTIAL });
    }
  } catch (e) { /* fall back to STUN only */ }
  res.status(200).json({ iceServers: servers, relay: servers.length > STUN.length });
}
