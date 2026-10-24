// The "Advertise on Naija Sus" page: brands upload their ad, pay with Paystack,
// and the ad waits for approval before it shows up in the game.
import { AD_PACKAGES } from "./catalog.js";

const $ = (s) => document.querySelector(s);
const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let cfg = {}, sb = null, placement = "ad_billboard", kind = "product";

function deviceId() {
  try { const d = JSON.parse(localStorage.getItem("naija-sus-v1") || "{}"); return d.deviceId || null; } catch (e) { return null; }
}
function say(text, cls = "") { const m = $("#msg"); m.textContent = text; m.className = "msg " + cls; }

function renderPacks() {
  $("#packs").innerHTML = AD_PACKAGES.map((p) => `<button type="button" class="pack" data-pack="${p.id}" aria-pressed="${p.id === placement}">
    <strong>${esc(p.name)}</strong><span class="price">${naira(p.price)}</span><span>${esc(p.desc)}</span></button>`).join("");
  const radio = placement === "ad_radio";
  $("#audioField").hidden = !radio;
  $("#imageField").querySelector(".label").textContent = radio ? "Cover art or logo (optional)" : "Logo or ad image";
  $("#submitBtn").textContent = `Continue to payment · ${naira(AD_PACKAGES.find((p) => p.id === placement).price)}`;
}
document.addEventListener("click", (e) => {
  const pack = e.target.closest("[data-pack]");
  if (pack) { placement = pack.dataset.pack; if (placement === "ad_radio" && kind === "product") setKind("music"); renderPacks(); return; }
  const k = e.target.closest("[data-kind]");
  if (k) setKind(k.dataset.kind);
});
function setKind(k) { kind = k; document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === k)); }

async function init() {
  renderPacks();
  const t = new Date(), today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  $("#start").min = today; $("#start").value = today;
  const pre = new URLSearchParams(location.search).get("pack"); if (pre && AD_PACKAGES.some((p) => p.id === pre)) { placement = pre; renderPacks(); }
  try { cfg = await (await fetch("/api/config", { cache: "no-store" })).json(); } catch (e) { cfg = {}; }
  if (!cfg.supabaseUrl) { say("Ads can't be booked right now. Please try again later.", "bad"); $("#submitBtn").disabled = true; return; }
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } });
}

async function upload(file, folder, maxBytes, types) {
  if (!file) return null;
  if (!types.includes(file.type)) throw new Error("That file type isn't allowed.");
  if (file.size > maxBytes) throw new Error(`That file is too big. The limit is ${Math.round(maxBytes / 1048576)} MB.`);
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "audio/mpeg": "mp3" }[file.type];
  const path = `submissions/${folder}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.${ext}`;
  const { error } = await sb.storage.from("ad-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Upload failed. Check your internet and try again.");
  return sb.storage.from("ad-media").getPublicUrl(path).data.publicUrl;
}

$("#adForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sb) return;
  const v = (id) => $(id).value.trim();
  const brand = v("#brand"), headline = v("#headline"), email = v("#email"), link = v("#link");
  const radio = placement === "ad_radio";
  if (!brand || !headline) return say("Add your brand name and the ad line.", "bad");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say("Add a working email so we can reach you.", "bad");
  if (link && !/^https?:\/\//i.test(link)) return say("Links should start with https://", "bad");
  const img = $("#image").files[0], aud = $("#audio").files[0];
  if (!radio && !img) return say("This package needs an image.", "bad");
  if (radio && !aud) return say("Add the MP3 for the radio.", "bad");
  const btn = $("#submitBtn"); btn.disabled = true;
  try {
    say("Uploading your files...");
    const imageUrl = await upload(img, "images", 2 * 1048576, ["image/png", "image/jpeg", "image/webp"]);
    const audioUrl = radio ? await upload(aud, "audio", 8 * 1048576, ["audio/mpeg"]) : null;
    say("Saving your ad...");
    const { data: adId, error } = await sb.rpc("submit_ad", {
      p_brand: brand, p_email: email, p_phone: v("#phone") || null, p_kind: kind, p_placement: placement, p_headline: headline, p_link: link || null,
      p_image: imageUrl, p_audio: audioUrl, p_artist: radio ? v("#artist") || brand : null, p_song: radio ? v("#song") || headline : null, p_starts: $("#start").value || null, p_device: deviceId(),
    });
    if (error || !adId) throw new Error("We couldn't save your ad. Please check the details and try again.");
    const pack = AD_PACKAGES.find((p) => p.id === placement);
    if (!cfg.paystackPublicKey) { say("Your ad is saved. Online payment isn't switched on yet, so we'll email you to arrange payment.", "good"); return; }
    await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://js.paystack.co/v1/inline.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const ref = `NSAD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.PaystackPop.setup({
      key: cfg.paystackPublicKey, email, amount: pack.price * 100, currency: "NGN", ref,
      metadata: { kind: "ad", ad_id: adId, item_id: placement, custom_fields: [{ display_name: "Ad package", variable_name: "package", value: pack.name }] },
      callback: (resp) => confirm(resp.reference),
      onClose: () => { say("Payment window closed. Your ad is saved but not paid yet.", "bad"); btn.disabled = false; },
    }).openIframe();
  } catch (err) { say(err.message || "Something went wrong.", "bad"); btn.disabled = false; }
});

async function confirm(reference) {
  say("Confirming your payment...");
  try {
    const r = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    say("Paid! We'll review your ad within 24 hours and email you when it's live.", "good");
    $("#adForm").reset();
  } catch (e) { say(`Payment received but not confirmed yet (${e.message || "network"}). Keep your Paystack reference: ${reference}`, "bad"); }
}

init();
