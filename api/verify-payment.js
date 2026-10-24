// Confirms a Paystack payment on the server, then records what was bought.
// The browser never decides whether a payment succeeded: we ask Paystack
// directly with the secret key, check the amount against our price list,
// and only then write to the database.
import { PRICE_OF } from "../src/catalog.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

async function rpc(name, args) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`database ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST." });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !process.env.PAYMENTS_SHARED_SECRET || !process.env.SUPABASE_URL) {
    return res.status(503).json({ ok: false, error: "Payments are not set up on the server yet." });
  }
  let body;
  try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: "Bad request." }); }
  const reference = String(body.reference || "").slice(0, 100);
  if (!/^[A-Za-z0-9_.=-]+$/.test(reference)) return res.status(400).json({ ok: false, error: "Bad reference." });

  const pr = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
  const pj = await pr.json().catch(() => ({}));
  const tx = pj && pj.data;
  if (!pr.ok || !tx || tx.status !== "success" || tx.currency !== "NGN") {
    return res.status(402).json({ ok: false, error: "Paystack has not confirmed this payment." });
  }
  // Trust the metadata Paystack stored at checkout, not what the browser sends now.
  const meta = typeof tx.metadata === "string" ? JSON.parse(tx.metadata || "{}") : tx.metadata || {};
  const paid = Math.round(tx.amount / 100);
  const price = PRICE_OF[meta.item_id];
  if (!price || paid < price) return res.status(400).json({ ok: false, error: "Amount does not match the price." });

  try {
    if (meta.kind === "ad") {
      await rpc("mark_ad_paid", { p_secret: process.env.PAYMENTS_SHARED_SECRET, p_ad: meta.ad_id, p_amount: paid, p_ref: reference });
    } else {
      if (!meta.device_id) return res.status(400).json({ ok: false, error: "Missing player id." });
      await rpc("record_purchase", { p_secret: process.env.PAYMENTS_SHARED_SECRET, p_device: String(meta.device_id).slice(0, 64), p_item: meta.item_id, p_amount: paid, p_ref: reference });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Payment confirmed but saving failed. Contact support with your reference." });
  }
  return res.status(200).json({ ok: true, item: meta.item_id, kind: meta.kind || "item" });
}
