import { ITEMS, INCLUDES } from "./catalog.js";
import { createJazz } from "./jazz.js";

(() => {
"use strict";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// =====================================================================
// Small helpers
// =====================================================================
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function inRect(x, y, r, pad = 0) { return x >= r.x + pad && x <= r.x + r.w - pad && y >= r.y + pad && y <= r.y + r.h - pad; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function text(ctx, t, x, y, font, color, align = "center") { ctx.font = font; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(t, x, y); }

// =====================================================================
// Wardrobe and character drawing
// =====================================================================
const SKINS = ["#a46a3c", "#8d5524", "#7a4a26", "#6b3e1f", "#5c3519", "#4a2a17"];
const FABRIC = ["#e94b4b", "#ff8c42", "#ffb347", "#f5e663", "#2bd47d", "#1f9e6e", "#3ec1d3", "#2d6cdf", "#8e6cf0", "#ff7ab6", "#f4efe6", "#2b2b33", "#d4af37"];
const FREE_FABRIC = FABRIC.slice(0, 12);
const OUTFITS = [["agbada", "Agbada"], ["kaftan", "Kaftan"], ["senator", "Senator"], ["iro", "Iro & buba"], ["dress", "Ankara dress"], ["jersey", "Jersey"], ["hoodie", "Hoodie"], ["suit", "Suit"], ["owambe", "Owambe Agbada"], ["xmas", "Christmas Agbada"], ["goldagbada", "Gold Agbada"]];
const PATTERNS = [["plain", "Plain"], ["ankara", "Ankara"], ["adire", "Adire"], ["stripes", "Aso-oke"], ["zigzag", "Zigzag"], ["dots", "Polka"], ["lace", "Lace"], ["velvet", "Velvet"]];
const HATS = [["none", "None"], ["fila", "Fila"], ["gele", "Gele"], ["cap", "Cap"], ["bucket", "Bucket hat"], ["beanie", "Beanie"], ["igwe", "Red cap"], ["phones", "Headphones"], ["santa", "Santa fila"], ["crown", "Gold Crown"]];
const PETS = [["none", "No pet"], ["goat", "Goat"], ["chicken", "Chicken"], ["cat", "Cat"]];
const TAGS = [["none", "Plain"], ["gold", "Gold glow"], ["green", "Green glow"], ["pink", "Pink glow"]];
const BAGS = [["gmg", "Ghana Must Go"], ["designer", "Designer bag"], ["sack", "Bagco sack"], ["cooler", "Jollof cooler"]];
const TAG_COLOR = { gold: "#ffd34d", green: "#5cf0a0", pink: "#ff8ad0" };
const EMOTES = [["wave", "Wave", "Hello o!", null], ["shaku", "Shaku Shaku", "Shaku shaku!", "emotes_basic"], ["zanku", "Zanku", "Zanku! Leg work!", "emotes_basic"], ["sapa", "Sapa Cry", "Sapa don hold me...", "emotes_basic"], ["facepalm", "Facepalm", "Chai!", "emotes_basic"], ["odogwu", "Odogwu Pose", "Odogwu!", "emotes_basic"]];
// Which purchase unlocks which wardrobe option.
const PREMIUM = {
  "pattern:lace": "owambe_pack", "pattern:velvet": "owambe_pack", "outfit:owambe": "owambe_pack", "c1:#d4af37": "owambe_pack", "c2:#d4af37": "owambe_pack", "hatC:#d4af37": "owambe_pack",
  "outfit:xmas": "detty_pass", "hat:santa": "detty_pass", "outfit:goldagbada": "vip", "hat:crown": "vip",
  "pet:goat": "pet_pack", "pet:chicken": "pet_pack", "pet:cat": "pet_pack",
  "tag:gold": "nametag_glow", "tag:green": "nametag_glow", "tag:pink": "nametag_glow",
  "bag:designer": "luggage_pack", "bag:sack": "luggage_pack", "bag:cooler": "luggage_pack",
};
const HAIRS = [["lowcut", "Low cut"], ["afro", "Afro"], ["braids", "Braids"], ["bun", "Bun"], ["bald", "Bald"]];
const EYES = [["none", "None"], ["shades", "Shades"], ["glasses", "Glasses"]];
const NECKS = [["none", "None"], ["chain", "Gold chain"], ["coral", "Coral beads"]];
const DEFAULT_LOOK = { skin: SKINS[2], outfit: "agbada", pattern: "ankara", c1: "#ffb347", c2: "#2d6cdf", hat: "fila", hatC: "#2d6cdf", hair: "lowcut", eyes: "none", neck: "chain" };
function randomLook(rng = Math.random, c1) {
  const pk = (a) => a[Math.floor(rng() * a.length)];
  return { skin: pk(SKINS), outfit: pk(OUTFITS)[0], pattern: rng() < 0.35 ? "plain" : pk(PATTERNS)[0], c1: c1 || pk(FABRIC), c2: pk(FABRIC), hat: pk(HATS)[0], hatC: pk(FABRIC), hair: pk(HAIRS)[0], eyes: rng() < 0.7 ? "none" : pk(EYES)[0], neck: rng() < 0.6 ? "none" : pk(NECKS)[0] };
}
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16), c = (v) => clamp(v + amt, 0, 255); return "#" + ((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0"); }
function contrastOn(hex) { const n = parseInt(hex.slice(1), 16); return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255) > 150 ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.3)"; }
function garmentPath(ctx, outfit, b) {
  ctx.beginPath();
  switch (outfit) {
    case "agbada": case "owambe": case "xmas": case "goldagbada": ctx.moveTo(-13, -28 + b); ctx.lineTo(13, -28 + b); ctx.lineTo(21, -6 + b); ctx.quadraticCurveTo(0, -1 + b, -21, -6 + b); break;
    case "senator": ctx.moveTo(-11, -28 + b); ctx.lineTo(11, -28 + b); ctx.lineTo(12, -10 + b); ctx.lineTo(-12, -10 + b); break;
    case "iro": ctx.moveTo(-13, -28 + b); ctx.lineTo(13, -28 + b); ctx.lineTo(15, -16 + b); ctx.lineTo(-15, -16 + b); break;
    case "dress": ctx.moveTo(-10, -28 + b); ctx.lineTo(10, -28 + b); ctx.lineTo(18, -2 + b); ctx.quadraticCurveTo(0, 1 + b, -18, -2 + b); break;
    case "jersey": ctx.moveTo(-11, -28 + b); ctx.lineTo(11, -28 + b); ctx.lineTo(17, -23 + b); ctx.lineTo(14, -18 + b); ctx.lineTo(11, -20 + b); ctx.lineTo(11, -10 + b); ctx.lineTo(-11, -10 + b); ctx.lineTo(-11, -20 + b); ctx.lineTo(-14, -18 + b); ctx.lineTo(-17, -23 + b); break;
    case "hoodie": ctx.moveTo(-12, -28 + b); ctx.quadraticCurveTo(-16, -18 + b, -13, -8 + b); ctx.lineTo(13, -8 + b); ctx.quadraticCurveTo(16, -18 + b, 12, -28 + b); break;
    case "suit": ctx.moveTo(-12, -28 + b); ctx.lineTo(12, -28 + b); ctx.lineTo(12, -8 + b); ctx.lineTo(-12, -8 + b); break;
    default: ctx.moveTo(-11, -28 + b); ctx.lineTo(11, -28 + b); ctx.lineTo(12, -5 + b); ctx.lineTo(-12, -5 + b);
  }
  ctx.closePath();
}
function paintPattern(ctx, pattern, ink, top, bottom) {
  if (pattern === "plain") return;
  ctx.save(); ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
  if (pattern === "ankara") { for (let y = top; y < bottom; y += 8) for (let x = -24 + ((y / 8) % 2) * 4; x < 24; x += 8) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); } }
  else if (pattern === "adire") { for (let y = top; y < bottom + 4; y += 5) { ctx.beginPath(); for (let x = -24; x <= 24; x += 2) ctx.lineTo(x, y + Math.sin(x / 3 + y) * 1.6); ctx.stroke(); } }
  else if (pattern === "stripes") { for (let x = -24; x < 24; x += 7) ctx.fillRect(x, top, 2.6, bottom - top); ctx.fillStyle = "rgba(245,200,70,.7)"; for (let x = -21; x < 24; x += 7) ctx.fillRect(x, top, 0.8, bottom - top); }
  else if (pattern === "zigzag") { for (let y = top; y < bottom + 5; y += 6) { ctx.beginPath(); for (let x = -24, i = 0; x <= 24; x += 4, i++) ctx.lineTo(x, y + (i % 2 ? 2.5 : -2.5)); ctx.stroke(); } }
  else if (pattern === "lace") { ctx.globalAlpha = 0.75; for (let y = top; y < bottom; y += 7) for (let x = -24 + ((y / 7) % 2) * 3.5; x < 24; x += 7) { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.57) * 1.6, y + Math.sin(k * 1.57) * 1.6, 1.1, 0, Math.PI * 2); ctx.fill(); } } }
  else if (pattern === "velvet") { ctx.globalAlpha = 0.35; ctx.lineWidth = 3; for (let x = -40; x < 30; x += 9) { ctx.beginPath(); ctx.moveTo(x, bottom); ctx.lineTo(x + 20, top); ctx.stroke(); } }
  else if (pattern === "dots") { for (let y = top; y < bottom; y += 6) for (let x = -24 + ((y / 6) % 2) * 3; x < 24; x += 6) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}
function drawBag(ctx, x, y, kind = "gmg") {
  ctx.save(); ctx.translate(x, y);
  if (kind === "designer") {
    ctx.fillStyle = "#6b3a1e"; rr(ctx, 0, 1, 20, 14, 3); ctx.fill(); ctx.fillStyle = "#d4af37"; ctx.fillRect(8, 6, 4, 3);
    ctx.strokeStyle = "#3a1e0e"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(10, 1, 5, Math.PI, 0); ctx.stroke();
  } else if (kind === "sack") {
    ctx.fillStyle = "#e8e0c8"; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(18, 0); ctx.lineTo(21, 16); ctx.lineTo(-1, 16); ctx.fill();
    ctx.fillStyle = "#2d6cdf"; ctx.fillRect(2, 6, 16, 3); ctx.strokeStyle = "#888"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(16, 0); ctx.stroke();
  } else if (kind === "cooler") {
    ctx.fillStyle = "#e94b4b"; rr(ctx, 0, 2, 20, 14, 3); ctx.fill(); ctx.fillStyle = "#f4efe6"; ctx.fillRect(0, 2, 20, 4);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3, 2); ctx.lineTo(3, -2); ctx.lineTo(17, -2); ctx.lineTo(17, 2); ctx.stroke();
  } else {
    // A "Ghana Must Go" bag: checked red, blue and white.
    ctx.fillStyle = "#f4efe6"; ctx.fillRect(0, 0, 20, 15);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 20, 15); ctx.clip();
    ctx.fillStyle = "rgba(220,50,50,.75)"; for (let i = 0; i < 20; i += 6) ctx.fillRect(i, 0, 3, 15);
    ctx.fillStyle = "rgba(45,90,200,.6)"; for (let j = 0; j < 15; j += 6) ctx.fillRect(0, j, 20, 3);
    ctx.restore();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.strokeRect(0, 0, 20, 15);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(10, 0, 4, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
}
function drawPet(ctx, kind, bob) {
  const hop = Math.abs(Math.sin(bob * 0.8)) * 2;
  ctx.save(); ctx.translate(-24, -hop);
  if (kind === "goat") {
    ctx.fillStyle = "#e8e0d0"; ctx.beginPath(); ctx.ellipse(0, -8, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, -13, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7a6a50"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -17); ctx.lineTo(-13, -21); ctx.moveTo(-8, -17); ctx.lineTo(-7, -21); ctx.stroke();
    ctx.fillStyle = "#555"; [-5, 5].forEach((lx) => ctx.fillRect(lx - 1, -3, 2, 4));
  } else if (kind === "chicken") {
    ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.ellipse(0, -7, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-5, -12, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e94b4b"; ctx.fillRect(-6, -17, 3, 3);
    ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.moveTo(-8.5, -12); ctx.lineTo(-11, -11); ctx.lineTo(-8.5, -10); ctx.fill();
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(-1, 1); ctx.moveTo(2, -2); ctx.lineTo(2, 1); ctx.stroke();
  } else if (kind === "cat") {
    ctx.fillStyle = "#e8913a"; ctx.beginPath(); ctx.ellipse(0, -6, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-8, -11, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(-10, -18); ctx.lineTo(-8, -15); ctx.moveTo(-7, -15); ctx.lineTo(-5, -18); ctx.lineTo(-5, -13); ctx.fill();
    ctx.strokeStyle = "#e8913a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, -7); ctx.quadraticCurveTo(13, -14, 10, -18); ctx.stroke();
  }
  ctx.restore();
}
function drawLook(ctx, L, x, y, o = {}) {
  const s = o.scale || 1, f = o.facing || 1, mv = !!o.moving;
  const b = o.still ? 0 : Math.sin(o.bob || 0) * (mv ? 2 : 0.6), lb = mv ? b : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
  if (o.ghost) ctx.globalAlpha = 0.4;
  if (!o.seated) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 2, 15, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  const longSkirt = L.outfit === "iro" || L.outfit === "dress";
  if (!longSkirt) {
    ctx.fillStyle = L.outfit === "jersey" ? L.skin : L.outfit === "hoodie" ? "#2f4a7a" : L.outfit === "suit" ? shade(L.c1, -45) : shade(L.c1, -25);
    ctx.fillRect(-7, -10 + lb, 5, 10); ctx.fillRect(2, -10 - lb, 5, 10);
    if (L.outfit === "jersey") { ctx.fillStyle = L.c2; ctx.fillRect(-8, -12, 16, 5); }
  }
  ctx.fillStyle = "#16120e"; ctx.fillRect(-8, -1 + lb, 7, 3); ctx.fillRect(2, -1 - lb, 7, 3);
  if (L.outfit === "hoodie") { ctx.fillStyle = shade(L.c1, -18); ctx.beginPath(); ctx.ellipse(-2, -36 + b, 13, 12, 0, 0, Math.PI * 2); ctx.fill(); }
  const showHair = L.hat === "none" || L.hat === "phones";
  if (showHair && L.hair === "afro") { ctx.fillStyle = "#17100a"; ctx.beginPath(); ctx.arc(0, -40 + b, 14, 0, Math.PI * 2); ctx.fill(); }
  if (L.hair === "braids" && L.hat !== "beanie") { ctx.strokeStyle = "#17100a"; ctx.lineWidth = 2.4; for (const dx of [-9, -6, 6, 9]) { ctx.beginPath(); ctx.moveTo(dx, -38 + b); ctx.lineTo(dx * 1.1, -18 + b); ctx.stroke(); } }
  if (L.outfit === "iro") {
    ctx.beginPath(); ctx.moveTo(-13, -17 + b); ctx.lineTo(13, -17 + b); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath();
    ctx.fillStyle = L.c2; ctx.fill(); ctx.save(); ctx.clip(); paintPattern(ctx, L.pattern, contrastOn(L.c2), -18 + b, 1); ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, -17 + b); ctx.lineTo(3, 0); ctx.stroke();
  }
  garmentPath(ctx, L.outfit, b); ctx.fillStyle = L.c1; ctx.fill();
  ctx.save(); garmentPath(ctx, L.outfit, b); ctx.clip();
  paintPattern(ctx, L.pattern, L.pattern === "adire" ? contrastOn(L.c1) : (L.c2 === L.c1 ? contrastOn(L.c1) : L.c2), -30 + b, b);
  ctx.restore();
  ctx.lineWidth = 2;
  if (L.outfit === "agbada") { ctx.strokeStyle = L.c2 === L.c1 ? contrastOn(L.c1) : L.c2; ctx.strokeRect(-5, -27 + b, 10, 10); }
  if (L.outfit === "owambe") { ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 2.5; ctx.strokeRect(-6, -27 + b, 12, 12); ctx.beginPath(); ctx.moveTo(-19, -7 + b); ctx.quadraticCurveTo(0, -2 + b, 19, -7 + b); ctx.stroke(); ctx.lineWidth = 2; }
  if (L.outfit === "xmas") { ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.moveTo(-21, -6 + b); ctx.quadraticCurveTo(0, -1 + b, 21, -6 + b); ctx.lineTo(20, -10 + b); ctx.quadraticCurveTo(0, -5 + b, -20, -10 + b); ctx.fill(); ctx.fillRect(-4, -28 + b, 8, 4); ctx.fillStyle = "#2bd47d"; ctx.beginPath(); ctx.arc(0, -19 + b, 2, 0, Math.PI * 2); ctx.fill(); }
  if (L.outfit === "goldagbada") { ctx.save(); garmentPath(ctx, L.outfit, b); ctx.clip(); const t = (performance.now() / 600) % 2; ctx.fillStyle = "rgba(255,240,170,.45)"; ctx.beginPath(); ctx.moveTo(-30 + t * 40, 0 + b); ctx.lineTo(-22 + t * 40, -30 + b); ctx.lineTo(-16 + t * 40, -30 + b); ctx.lineTo(-24 + t * 40, 0 + b); ctx.fill(); ctx.restore(); ctx.strokeStyle = "#8a6a10"; ctx.strokeRect(-5, -27 + b, 10, 10); }
  if (L.outfit === "kaftan") { ctx.strokeStyle = L.c2; ctx.beginPath(); ctx.moveTo(0, -27 + b); ctx.lineTo(0, -15 + b); ctx.stroke(); ctx.fillStyle = L.c2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-3, -24 + i * 4 + b, 1, 0, Math.PI * 2); ctx.arc(3, -24 + i * 4 + b, 1, 0, Math.PI * 2); ctx.fill(); } }
  if (L.outfit === "senator") { ctx.fillStyle = L.c2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(5, -24 + i * 5 + b, 1.4, 0, Math.PI * 2); ctx.fill(); } ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.moveTo(-5, -28 + b); ctx.lineTo(0, -25 + b); ctx.lineTo(5, -28 + b); ctx.stroke(); }
  if (L.outfit === "jersey") { ctx.fillStyle = L.c2; ctx.fillRect(-11, -22 + b, 22, 3); ctx.strokeStyle = L.c2; ctx.beginPath(); ctx.arc(0, -28 + b, 4, 0, Math.PI); ctx.stroke(); }
  if (L.outfit === "hoodie") { ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(-7, -18 + b, 14, 6); ctx.strokeStyle = "#eee"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -27 + b); ctx.lineTo(-3, -21 + b); ctx.moveTo(3, -27 + b); ctx.lineTo(3, -21 + b); ctx.stroke(); }
  if (L.outfit === "suit") { ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.moveTo(-5, -28 + b); ctx.lineTo(5, -28 + b); ctx.lineTo(0, -17 + b); ctx.fill(); ctx.fillStyle = L.c2; ctx.beginPath(); ctx.moveTo(-1.5, -27 + b); ctx.lineTo(1.5, -27 + b); ctx.lineTo(2, -18 + b); ctx.lineTo(0, -16 + b); ctx.lineTo(-2, -18 + b); ctx.fill(); }
  if (L.outfit === "dress" || L.outfit === "iro") { ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.arc(0, -28 + b, 5, 0, Math.PI); ctx.stroke(); }
  if (L.neck === "chain") { ctx.strokeStyle = "#e8c547"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, -27 + b); ctx.quadraticCurveTo(0, -18 + b, 5, -27 + b); ctx.stroke(); ctx.fillStyle = "#e8c547"; ctx.beginPath(); ctx.arc(0, -21 + b, 2, 0, Math.PI * 2); ctx.fill(); }
  if (L.neck === "coral") { ctx.fillStyle = "#e0412c"; for (let i = 0; i <= 6; i++) { const t = i / 6; ctx.beginPath(); ctx.arc(-6 + 12 * t, -27 + Math.sin(t * Math.PI) * 6 + b, 1.7, 0, Math.PI * 2); ctx.fill(); } }
  if (o.bag) drawBag(ctx, 9, -20 + b, L.bag || "gmg");
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(0, -36 + b, 10, 0, Math.PI * 2); ctx.fill();
  if (showHair || L.hat === "cap" || L.hat === "fila") {
    ctx.fillStyle = "#17100a";
    if (L.hair === "lowcut" || L.hair === "braids") { ctx.beginPath(); ctx.arc(0, -37 + b, 10.3, Math.PI * 1.03, Math.PI * 1.97); ctx.fill(); }
    if (L.hair === "bun" && showHair) { ctx.beginPath(); ctx.arc(0, -37 + b, 10.3, Math.PI * 1.03, Math.PI * 1.97); ctx.fill(); ctx.beginPath(); ctx.arc(-3, -50 + b, 6, 0, Math.PI * 2); ctx.fill(); }
    if (L.hair === "afro" && showHair) { ctx.beginPath(); ctx.arc(0, -40 + b, 11, Math.PI, 0); ctx.fill(); }
  }
  ctx.fillStyle = "#120a05"; ctx.beginPath(); ctx.arc(2.5, -37 + b, 1.6, 0, Math.PI * 2); ctx.arc(7, -37 + b, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#120a05"; ctx.lineWidth = 1.2; ctx.beginPath();
  if (o.sad) ctx.arc(5, -30 + b, 2.2, Math.PI + 0.3, -0.3); else ctx.arc(5, -33 + b, 2.2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  if (L.eyes === "shades") { ctx.fillStyle = "#0c0c10"; ctx.fillRect(-1, -39.5 + b, 11, 4.5); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(1, -39 + b, 2, 1.2); }
  if (L.eyes === "glasses") { ctx.strokeStyle = "#d9d9d9"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(2.5, -37 + b, 2.8, 0, Math.PI * 2); ctx.moveTo(9.8, -37 + b); ctx.arc(7, -37 + b, 2.8, 0, Math.PI * 2); ctx.stroke(); }
  const hc = L.hatC; ctx.lineWidth = 2;
  switch (L.hat) {
    case "cap": ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -40 + b, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(0, -42 + b, 15, 3.5); break;
    case "fila": ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(-10.5, -40 + b); ctx.quadraticCurveTo(-9, -53 + b, 8, -51 + b); ctx.lineTo(13, -45 + b); ctx.quadraticCurveTo(2, -47 + b, -10.5, -40 + b); ctx.fill(); ctx.strokeStyle = contrastOn(hc); ctx.beginPath(); ctx.moveTo(-6, -45 + b); ctx.lineTo(9, -48 + b); ctx.stroke(); break;
    case "gele": ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(-14, -39 + b); ctx.quadraticCurveTo(-12, -62 + b, 2, -53 + b); ctx.quadraticCurveTo(16, -64 + b, 14, -39 + b); ctx.quadraticCurveTo(0, -45 + b, -14, -39 + b); ctx.fill(); ctx.strokeStyle = contrastOn(hc); ctx.beginPath(); ctx.moveTo(-9, -45 + b); ctx.quadraticCurveTo(0, -50 + b, 10, -45 + b); ctx.moveTo(2, -53 + b); ctx.lineTo(4, -44 + b); ctx.stroke(); break;
    case "bucket": ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -42 + b, 9.5, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -42 + b, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill(); break;
    case "beanie": ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -40 + b, 10.8, Math.PI, 0); ctx.fill(); ctx.fillRect(-11, -42 + b, 22, 4); ctx.beginPath(); ctx.arc(0, -51 + b, 3, 0, Math.PI * 2); ctx.fill(); break;
    case "igwe": ctx.fillStyle = "#c0182a"; ctx.beginPath(); ctx.moveTo(-9, -42 + b); ctx.lineTo(-8, -54 + b); ctx.lineTo(8, -54 + b); ctx.lineTo(9, -42 + b); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f5c542"; ctx.fillRect(-9, -44 + b, 18, 2); break;
    case "santa": ctx.fillStyle = "#d61f2c"; ctx.beginPath(); ctx.moveTo(-10, -41 + b); ctx.quadraticCurveTo(-2, -60 + b, 14, -52 + b); ctx.lineTo(10, -41 + b); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f4efe6"; ctx.fillRect(-11, -44 + b, 22, 5); ctx.beginPath(); ctx.arc(14, -52 + b, 3.5, 0, Math.PI * 2); ctx.fill(); break;
    case "crown": ctx.fillStyle = "#d4af37"; ctx.beginPath(); ctx.moveTo(-10, -42 + b); ctx.lineTo(-10, -54 + b); ctx.lineTo(-5, -48 + b); ctx.lineTo(0, -56 + b); ctx.lineTo(5, -48 + b); ctx.lineTo(10, -54 + b); ctx.lineTo(10, -42 + b); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#e94b4b"; ctx.beginPath(); ctx.arc(0, -46 + b, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2bd47d"; [-6, 6].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, -45 + b, 1.5, 0, Math.PI * 2); ctx.fill(); }); break;
    case "phones": ctx.strokeStyle = "#1b1b22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -38 + b, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.fillStyle = hc; ctx.fillRect(-14, -40 + b, 5, 8); ctx.fillRect(9, -40 + b, 5, 8); break;
  }
  if (L.pet && L.pet !== "none" && !o.seated && !o.noPet) drawPet(ctx, L.pet, o.bob || 0);
  ctx.restore();
  if (o.label) {
    ctx.font = "700 11px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.globalAlpha = o.ghost ? 0.5 : 1;
    const ly = y - (L.hat === "gele" || L.hat === "igwe" || L.hat === "crown" || L.hat === "santa" ? 70 : 62) * s;
    const glow = TAG_COLOR[L.tag];
    const label = L.vip ? `VIP ${o.label}` : o.label;
    ctx.strokeText(label, x, ly);
    ctx.fillStyle = o.labelColor && o.labelColor !== "#fff" ? o.labelColor : glow || (L.vip ? "#ffd34d" : "#fff");
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 8; }
    ctx.fillText(label, x, ly); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
}
function portrait(look, w = 44, h = 56, bag = false) {
  const c = document.createElement("canvas"), d = Math.min(2, devicePixelRatio || 1);
  c.width = w * d; c.height = h * d;
  const ctx = c.getContext("2d"); ctx.scale(d, d);
  drawLook(ctx, look, w / 2, h - 5, { scale: h / 76, still: true, bag });
  return c;
}

// =====================================================================
// Maps. Both are a central walkway with rooms off it, so the same path-finding works.
// =====================================================================
function makeRoom(name, x, y, w, h, side, floor, Y) {
  const cx = x + w / 2, cy = y + h / 2;
  let corr, inner, outer;
  if (side === "top") { corr = { x: cx - 30, y: y + h - 30, w: 60, h: Y.y - (y + h) + 60 }; inner = [cx, y + h - 15]; outer = [cx, Y.y + 15]; }
  if (side === "bottom") { corr = { x: cx - 30, y: Y.y + Y.h - 30, w: 60, h: y - (Y.y + Y.h) + 60 }; inner = [cx, y + 15]; outer = [cx, Y.y + Y.h - 15]; }
  if (side === "left") { corr = { x: x + w - 30, y: cy - 30, w: Y.x - (x + w) + 60, h: 60 }; inner = [x + w - 15, cy]; outer = [Y.x + 15, cy]; }
  if (side === "right") { corr = { x: Y.x + Y.w - 30, y: cy - 30, w: x - (Y.x + Y.w) + 60, h: 60 }; inner = [x + 15, cy]; outer = [Y.x + Y.w - 15, cy]; }
  return { name, x, y, w, h, side, floor, corr, inner, outer };
}
function buildMap(def) {
  const Y = def.yard, rooms = {};
  for (const [k, r] of Object.entries(def.roomDefs)) rooms[k] = makeRoom(r[0], r[1], r[2], r[3], r[4], r[5], r[6], Y);
  const m = { ...def, rooms };
  m.walk = [Y, ...Object.values(rooms), ...Object.values(rooms).map((r) => r.corr)];
  m.areaName = { courtyard: def.yardName, ...Object.fromEntries(Object.entries(rooms).map(([k, r]) => [k, r.name])) };
  m.spotIds = Object.keys(def.spots);
  return m;
}
const COMPOUND_Y = { x: 350, y: 330, w: 800, h: 470 };
const DANFO_Y = { x: 320, y: 330, w: 860, h: 140 };
const MAPS = {
  compound: buildMap({
    id: "compound", title: "Compound", tagline: "A Lagos face-me-I-face-you compound. 10 rooms around one big yard.",
    world: { w: 1500, h: 1130 }, yard: COMPOUND_Y, yardName: "Compound", center: { x: 750, y: 565 },
    roomDefs: {
      gen: ["Gen House", 360, 40, 240, 200, "top", "#3b3326"], bq: ["Boys' Quarters", 630, 40, 240, 200, "top", "#2f3448"], kitchen: ["Kitchen", 900, 40, 240, 200, "top", "#4a2f2a"],
      borehole: ["Borehole", 40, 340, 240, 200, "left", "#213a45"], bathroom: ["Bathroom", 40, 580, 240, 200, "left", "#2a4048"],
      office: ["Landlord's Office", 1220, 340, 240, 200, "right", "#3a2a44"], barber: ["Barber Shop", 1220, 580, 240, 200, "right", "#41303a"],
      gate: ["Gate", 360, 890, 240, 200, "bottom", "#2e3a2a"], shop: ["Provision Shop", 630, 890, 240, 200, "bottom", "#433b22"], mamaput: ["Mama Put", 900, 890, 240, 200, "bottom", "#4a3220"],
    },
    spots: {
      gen:      { area: "gen",       x: 420,  y: 110,  name: "Start the generator",     doing: "starting the gen",           type: "timing" },
      wires:    { area: "gen",       x: 550,  y: 170,  name: "Fix the light wires",     doing: "fixing the light wires",     type: "wires" },
      laundry:  { area: "bq",        x: 700,  y: 120,  name: "Fold the laundry",        doing: "folding laundry",            type: "match", v: "clothes" },
      jollof:   { area: "kitchen",   x: 960,  y: 110,  name: "Stir the jollof",         doing: "stirring the jollof",        type: "stir" },
      yam:      { area: "kitchen",   x: 1080, y: 170,  name: "Pound the yam",           doing: "pounding yam",               type: "pound", v: "yam" },
      borehole: { area: "borehole",  x: 100,  y: 400,  name: "Pump borehole water",     doing: "pumping water",              type: "hold", v: "tank" },
      scrub:    { area: "bathroom",  x: 110,  y: 700,  name: "Scrub the bathroom",      doing: "scrubbing the bathroom",     type: "sweep", v: "stain" },
      rent:     { area: "office",    x: 1390, y: 500,  name: "File the rent receipts",  doing: "filing rent receipts",       type: "order", v: "months" },
      clippers: { area: "barber",    x: 1400, y: 650,  name: "Charge the clippers",     doing: "charging the clippers",      type: "hold", v: "battery" },
      visitors: { area: "gate",      x: 420,  y: 1010, name: "Sign the visitors' book", doing: "signing the visitors' book", type: "order", v: "numbers" },
      fuel:     { area: "shop",      x: 760,  y: 1010, name: "Give exact change",       doing: "selling fuel",               type: "change", v: "fuel" },
      food:     { area: "mamaput",   x: 1060, y: 1010, name: "Collect money for food",  doing: "serving food",               type: "bill", v: "food" },
      sweep:    { area: "courtyard", x: 520,  y: 700,  name: "Sweep the compound",      doing: "sweeping the compound",      type: "sweep", v: "leaf" },
      danfo:    { area: "courtyard", x: 1010, y: 440,  name: "Wash the parked danfo",   doing: "washing the danfo",          type: "sweep", v: "mud" },
    },
    bell: { x: 1300, y: 380 }, fix: "gen",
    txt: { bellBtn: "Ring bell", bellIntro: "rang the landlord's bell", meetTitle: "Landlord's meeting", meetWhere: "Everybody sits down in the parlour.",
      lightsOff: "NEPA has taken light! Somebody start the gen.", lightsOn: "NEPA has restored light.", fixBtn: "Start the gen", fixYou: "You started the gen. Light don come!", fixBot: (n) => `${n} started the gen. Light don come.`, sabBtn: "Take light",
      eject: "sent packing from the compound", ejectNone: "Nobody was sent packing.", bellLines: ["Nobody's phone is missing. Who rang this bell?", "Is it about the light bill again?", "Abeg talk fast, my jollof is on fire.", "Landlord, if na rent matter, I never get money o."], place: "Compound 14, Surulere" },
    scene: "parlour", exit: "gate", spawnR: [120, 90],
  }),
  danfo: buildMap({
    id: "danfo", title: "Danfo", tagline: "A packed yellow danfo from Oshodi to CMS. Tight rows, nowhere to hide.",
    world: { w: 1500, h: 800 }, yard: DANFO_Y, yardName: "Aisle", center: { x: 750, y: 400 },
    roomDefs: {
      front: ["Front Row", 340, 110, 260, 190, "top", "#4a2f2a"], middle: ["Middle Row", 620, 110, 260, 190, "top", "#3f2a36"], back: ["Back Row", 900, 110, 260, 190, "top", "#2f3448"],
      door: ["Conductor's Door", 340, 500, 260, 190, "bottom", "#2e3a2a"], windows: ["Window Seats", 620, 500, 260, 190, "bottom", "#213a45"], last: ["Last Bench", 900, 500, 260, 190, "bottom", "#433b22"],
      driver: ["Driver's Cabin", 70, 230, 220, 340, "left", "#3b3326"], boot: ["Boot", 1210, 230, 220, 340, "right", "#41303a"],
    },
    spots: {
      engine:  { area: "driver",  x: 150,  y: 300, name: "Start the engine",        doing: "starting the engine",      type: "timing" },
      wiper:   { area: "driver",  x: 200,  y: 520, name: "Fix the wiper wires",     doing: "fixing the wiper",         type: "wires" },
      fares:   { area: "front",   x: 430,  y: 180, name: "Collect the fares",       doing: "collecting fares",         type: "bill", v: "fares" },
      change:  { area: "middle",  x: 750,  y: 180, name: "Give passengers change",  doing: "giving change",            type: "change", v: "fare" },
      seat:    { area: "back",    x: 1050, y: 180, name: "Fix the broken seat",     doing: "fixing a seat",            type: "pound", v: "seat" },
      stops:   { area: "door",    x: 420,  y: 600, name: "Call out the bus stops",  doing: "calling passengers",       type: "order", v: "stops" },
      glass:   { area: "windows", x: 700,  y: 600, name: "Clean the windows",       doing: "cleaning the windows",     type: "sweep", v: "glass" },
      sachets: { area: "last",    x: 1050, y: 600, name: "Pick up pure water sachets", doing: "picking up sachets",    type: "sweep", v: "sachet" },
      luggage: { area: "boot",    x: 1320, y: 300, name: "Arrange the luggage",     doing: "arranging luggage",        type: "match", v: "luggage" },
      tyre:    { area: "boot",    x: 1330, y: 500, name: "Pump the spare tyre",     doing: "pumping the tyre",         type: "hold", v: "tyre" },
      aisle:   { area: "courtyard", x: 900, y: 410, name: "Sweep the aisle",        doing: "sweeping the aisle",       type: "sweep", v: "dust" },
      radio:   { area: "front",   x: 540,  y: 240, name: "Tune the radio",          doing: "tuning the radio",         type: "stir", v: "radio" },
    },
    bell: { x: 110, y: 455 }, fix: "engine",
    txt: { bellBtn: "Press horn", bellIntro: "pressed the horn for an emergency meeting", meetTitle: "Danfo meeting", meetWhere: "Everybody sits down on the benches.",
      lightsOff: "The bus lights don off! Somebody restart the engine.", lightsOn: "The bus lights are back.", fixBtn: "Restart the engine", fixYou: "You restarted the engine. Light don come!", fixBot: (n) => `${n} restarted the engine.`, sabBtn: "Kill the lights",
      eject: "dropped at the next bus stop", ejectNone: "Nobody was dropped off.", bellLines: ["Why you press horn? Nobody's phone is missing.", "Driver, abeg face the road.", "Conductor, where my change?", "Oshodi don reach? Make we hurry."], place: "Danfo: Oshodi to CMS" },
    scene: "bus", exit: "busstop",
  }),
};
const MODES = ["compound", "danfo"];
let M = MAPS.compound;
const TASKS_EACH = 5;
const BOT_NAMES = ["Tunde", "Amaka", "Emeka", "Kemi", "Musa", "Ngozi", "Bayo", "Zainab", "Femi", "Ada", "Segun", "Halima", "Obinna", "Funke", "Uche", "Bisi", "Chidi", "Aisha", "Dayo", "Ifeoma", "Kunle", "Sade"];
const maxThieves = (n) => (n <= 6 ? 1 : n <= 8 ? 2 : 3);
const ROLES = {
  landlord:    { name: "Landlord", desc: "Your vote counts double, and once per game you can call a meeting from anywhere.", ability: "Call meeting", uses: 1 },
  worker:      { name: "9-5 Worker", desc: "Always rushing to work: you walk faster and have one chore fewer." },
  guard:       { name: "Mai Guard", desc: "The night watchman. When the light goes off, you can still see everything." },
  mamaput:     { name: "Mama Put", desc: "Everybody gists at your stall. Once per game, find out one person who is definitely NOT a thief.", ability: "Hear gist", uses: 1 },
  driver:      { name: "Driver", desc: "Hit the hard brake: everybody stumbles for 4 seconds and any steal in progress fails.", ability: "Hard brake", cd: 45 },
  conductor:   { name: "Bus Conductor", desc: "Count heads: see how many people are in each part of the bus right now.", ability: "Count heads", cd: 25 },
  evangelist:  { name: "Evangelist", desc: "Pray over the person next to you. For 40 seconds, any thief who tries their phone will fail.", ability: "Pray for them", cd: 50 },
  marketwoman: { name: "Market Woman", desc: "Nothing passes your eyes. Once per game, find out one person who is definitely NOT a thief.", ability: "Gossip", uses: 1 },
  pickpocket:  { name: "Pickpocket", desc: "Quick hands: you can steal again sooner than other thieves." },
  yahoo:       { name: "Yahoo Boy", desc: "Master of disguise: copy the look of the person next to you for 15 seconds, so witnesses blame them.", ability: "Disguise", cd: 40 },
  housemate:   { name: "Housemate", desc: "No special power. Do your chores and keep your eyes open." },
  passenger:   { name: "Passenger", desc: "No special power. Do your chores and keep your eyes open." },
};
const MODE_ROLES = { compound: ["landlord", "guard", "mamaput", "worker"], danfo: ["driver", "conductor", "evangelist", "marketwoman", "worker"] };
function assignRoles(n, thiefSet) {
  const roles = new Array(n);
  for (const i of thiefSet) roles[i] = Math.random() < 0.5 ? "yahoo" : "pickpocket";
  const crew = shuffle([...Array(n).keys()].filter((i) => !thiefSet.has(i)));
  const specials = MODE_ROLES[M.id];
  crew.forEach((i, k) => { roles[i] = k < specials.length ? specials[k] : Math.random() < 0.45 ? "worker" : M.id === "danfo" ? "passenger" : "housemate"; });
  return roles;
}
const VOICE_R = 80;
const CHATTER = {
  compound: ["This NEPA sef!", "Who finish my garri?", "Abeg I dey come.", "Na wa for this compound o.", "Has anybody seen my charger?", "Landlord wan increase rent again.", "This heat no be here o.", "Who dey fry plantain? E dey smell well."],
  danfo: ["Conductor, my change!", "Driver, slow down abeg!", "Owa o! Bus stop!", "Who get change for one thousand?", "Oshodi! Oshodi! Enter with your change!", "Shift small, abeg.", "This traffic no go kill person.", "Driver, you wan kill us?"],
};

function canStand(x, y) { return M.walk.some((r) => inRect(x, y, r, 12)); }
function areaOf(p) { for (const [k, r] of Object.entries(M.rooms)) if (inRect(p.x, p.y, r)) return k; return "courtyard"; }
function planPath(b, spot) {
  const a = areaOf(b), t = spot.area || areaOf(spot), pts = [];
  if (a !== t) {
    if (a !== "courtyard") { const r = M.rooms[a]; pts.push({ x: r.inner[0], y: r.inner[1] }, { x: r.outer[0], y: r.outer[1] }); }
    if (t !== "courtyard") { const r = M.rooms[t]; pts.push({ x: r.outer[0], y: r.outer[1] }, { x: r.inner[0], y: r.inner[1] }); }
  }
  pts.push({ x: spot.x + rand(-14, 14), y: spot.y + rand(10, 22) });
  return pts;
}
const yardPoint = () => ({ x: rand(M.yard.x + 40, M.yard.x + M.yard.w - 40), y: rand(M.yard.y + 30, M.yard.y + M.yard.h - 25), area: "courtyard" });
function spawnAt(i, n) {
  if (M.id === "danfo") return { x: 380 + (n > 1 ? i / (n - 1) : 0.5) * 740, y: 405 + (i % 2 ? 26 : -26) };
  const a = (i / n) * Math.PI * 2; return { x: M.center.x + Math.cos(a) * 120, y: M.center.y + Math.sin(a) * 90 };
}
function moveToward(b, tx, ty, speed, dt) {
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const s = Math.min(d, speed * dt);
  b.x += (dx / d) * s; b.y += (dy / d) * s;
  if (Math.abs(dx) > 0.5) b.facing = dx > 0 ? 1 : -1;
  b.moving = true; b.bob += dt * 12;
  return d - s < 2;
}

// ---------- Map drawing ----------
function drawRooms(ctx, map, wallColor = "#0b0d14", wall = 8) {
  for (const r of Object.values(map.rooms)) {
    ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 1;
    for (let x = r.x + 30; x < r.x + r.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
    ctx.strokeStyle = wallColor; ctx.lineWidth = wall; ctx.strokeRect(r.x - wall / 2, r.y - wall / 2, r.w + wall, r.h + wall);
    ctx.fillStyle = r.floor; const c = r.corr;
    if (r.side === "top") ctx.fillRect(c.x, r.y + r.h - 2, c.w, wall + 4);
    if (r.side === "bottom") ctx.fillRect(c.x, r.y - wall - 2, c.w, wall + 4);
    if (r.side === "left") ctx.fillRect(r.x + r.w - 2, c.y, wall + 4, c.h);
    if (r.side === "right") ctx.fillRect(r.x - wall - 2, c.y, wall + 4, c.h);
  }
}
function roomLabels(ctx, map) { for (const r of Object.values(map.rooms)) text(ctx, r.name.toUpperCase(), r.x + r.w / 2, r.y + 24, "13px Bungee, sans-serif", "rgba(255,255,255,.55)"); }
function drawCompound(ctx) {
  const m = MAPS.compound, W = m.world, Y = m.yard;
  ctx.fillStyle = "#1b2a1c"; ctx.fillRect(-600, -600, W.w + 1200, W.h + 1200);
  ctx.fillStyle = "#23361f"; for (let i = 0; i < 60; i++) { const x = (i * 263) % 2100 - 300, y = (i * 389) % 1700 - 280; ctx.beginPath(); ctx.arc(x, y, 14 + (i % 3) * 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#2a2a2e"; ctx.fillRect(-600, W.h + 30, W.w + 1200, 120);
  ctx.strokeStyle = "#e8d34a"; ctx.lineWidth = 4; ctx.setLineDash([30, 26]); ctx.beginPath(); ctx.moveTo(-600, W.h + 90); ctx.lineTo(W.w + 600, W.h + 90); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#5c5a55"; ctx.lineWidth = 10; ctx.strokeRect(14, 14, W.w - 28, W.h - 28);
  for (const r of Object.values(m.rooms)) { ctx.fillStyle = "#3d3a34"; ctx.fillRect(r.corr.x, r.corr.y, r.corr.w, r.corr.h); }
  ctx.fillStyle = "#4a463e"; ctx.fillRect(Y.x, Y.y, Y.w, Y.h);
  ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1;
  for (let x = Y.x; x < Y.x + Y.w; x += 50) { ctx.beginPath(); ctx.moveTo(x, Y.y); ctx.lineTo(x, Y.y + Y.h); ctx.stroke(); }
  for (let y = Y.y; y < Y.y + Y.h; y += 50) { ctx.beginPath(); ctx.moveTo(Y.x, y); ctx.lineTo(Y.x + Y.w, y); ctx.stroke(); }
  ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(400, 380); ctx.lineTo(610, 380); ctx.stroke();
  ["#e94b4b", "#3ec1d3", "#f5e663", "#8e6cf0", "#2bd47d"].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(412 + i * 40, 381, 22, 26); });
  ctx.fillStyle = "#2f6b2a"; ctx.beginPath(); ctx.arc(460, 560, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3f8a36"; ctx.beginPath(); ctx.arc(446, 548, 38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2a72e"; [[430, 560], [478, 534], [488, 580], [450, 590]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); });
  drawDanfoSide(ctx, 940, 360, 150, 62);
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(720, 600, 70, 50); ctx.fillStyle = "#f4efe6"; ctx.fillRect(728, 607, 54, 36);
  [["#e94b4b", 728, 607], ["#2bd47d", 755, 607], ["#f5e663", 728, 625], ["#2d6cdf", 755, 625]].forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.fillRect(x, y, 27, 18); });
  ctx.fillStyle = "#e94b4b"; [[705, 615], [805, 615], [755, 590], [755, 665]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "rgba(90,130,160,.45)"; ctx.beginPath(); ctx.ellipse(900, 720, 46, 16, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8a6a3a"; ctx.fillRect(510, 690, 4, 30); ctx.fillStyle = "#c9a26a"; ctx.fillRect(502, 716, 20, 10);
  drawBillboard(ctx, 840, 470, 170, 76);
  drawRooms(ctx, m);
  roomLabels(ctx, m);
  text(ctx, "COMPOUND 14, SURULERE", m.center.x, Y.y + Y.h - 16, "15px Bungee, sans-serif", "rgba(255,255,255,.3)");
  ctx.fillStyle = "#6b7a2a"; ctx.fillRect(390, 80, 60, 42); ctx.fillStyle = "#222"; ctx.fillRect(396, 86, 22, 12);
  ctx.fillStyle = "#333"; ctx.fillRect(560, 120, 20, 40); ["#e94b4b", "#2bd47d", "#f5e663", "#2d6cdf"].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(564 + i * 4, 120); ctx.lineTo(540 + i * 10, 70); ctx.stroke(); });
  ctx.fillStyle = "#5a4a7a"; ctx.fillRect(650, 70, 50, 80); ctx.fillStyle = "#e8d9b5"; ctx.fillRect(654, 74, 42, 30); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(760, 70, 80, 14); ["#e94b4b", "#3ec1d3", "#f5e663"].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(764 + i * 26, 84, 20, 22); });
  ctx.fillStyle = "#5a5a5a"; ctx.fillRect(940, 64, 44, 30); ctx.fillStyle = "#c43b12"; ctx.beginPath(); ctx.arc(962, 70, 14, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#6b4a2a"; ctx.beginPath(); ctx.ellipse(1080, 145, 18, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#8a643c"; ctx.fillRect(1078, 110, 5, 35);
  ctx.fillStyle = "#1f7fd1"; ctx.beginPath(); ctx.arc(90, 380, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#9bd8ff"; ctx.fillRect(84, 400, 12, 30);
  ctx.fillStyle = "#3b8bd6"; ctx.fillRect(170, 380, 60, 60); ctx.fillStyle = "#245f96"; ctx.fillRect(176, 386, 48, 6);
  ctx.fillStyle = "#cfd8dc"; ctx.fillRect(60, 620, 80, 60); ctx.fillStyle = "#e94b4b"; ctx.beginPath(); ctx.arc(190, 650, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2d6cdf"; ctx.beginPath(); ctx.arc(190, 700, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(1330, 460, 110, 40); ctx.fillStyle = "#e8d9b5"; ctx.fillRect(1380, 468, 30, 20);
  ctx.fillStyle = "#c9a227"; ctx.beginPath(); ctx.arc(m.bell.x, m.bell.y, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(m.bell.x - 14, m.bell.y, 28, 4);
  ctx.fillStyle = "#222"; ctx.fillRect(1260, 620, 40, 50); ctx.fillStyle = "#9bd8ff"; ctx.fillRect(1262, 600, 36, 18); ctx.fillStyle = "#e94b4b"; ctx.fillRect(1430, 610, 10, 60); ctx.fillStyle = "#f4efe6"; for (let i = 0; i < 4; i++) ctx.fillRect(1430, 615 + i * 15, 10, 5);
  ctx.strokeStyle = "#9aa"; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(380 + i * 14, 1050); ctx.lineTo(380 + i * 14, 1080); ctx.stroke(); }
  ctx.fillStyle = "#e8d9b5"; ctx.fillRect(400, 985, 32, 22); ctx.fillStyle = "#3a3f4a"; ctx.fillRect(520, 940, 50, 40);
  ctx.fillStyle = "#7a5a2a"; ctx.fillRect(700, 970, 120, 26); ["#e94b4b", "#f5e663", "#2bd47d", "#ff8c42"].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(710 + i * 26, 958, 16, 14); });
  ctx.fillStyle = "#3a3a3a"; ctx.fillRect(950, 960, 60, 30); ctx.fillStyle = "#c43b12"; ctx.beginPath(); ctx.arc(965, 960, 10, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.arc(995, 960, 10, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#2d6cdf"; ctx.fillRect(1040, 1040, 100, 8); ctx.fillStyle = "#e94b4b"; [1050, 1090, 1130].forEach((x) => { ctx.beginPath(); ctx.arc(x, 1060, 7, 0, Math.PI * 2); ctx.fill(); });
}
function drawDanfoSide(ctx, x, y, w, h) {
  ctx.fillStyle = "#f2c230"; rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x, y + h * 0.39, w, h * 0.1); ctx.fillRect(x, y + h * 0.61, w, h * 0.1);
  ctx.fillStyle = "#7fb4d6"; for (let i = 0; i < 5; i++) ctx.fillRect(x + 10 + i * (w - 20) / 5, y + 6, (w - 20) / 5 - 7, h * 0.22);
  ctx.fillStyle = "#111"; [[x + w * 0.17, y + h], [x + w * 0.83, y + h]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, h * 0.15, 0, Math.PI * 2); ctx.fill(); });
  drawWrapOnSide(ctx, x, y, w, h);
}
function drawDanfo(ctx) {
  const m = MAPS.danfo, Y = m.yard;
  ctx.fillStyle = "#1d1f24"; ctx.fillRect(-600, -600, m.world.w + 1200, m.world.h + 1200);
  ctx.fillStyle = "#8a8578"; ctx.fillRect(-600, -170, m.world.w + 1200, 60); ctx.fillRect(-600, m.world.h + 110, m.world.w + 1200, 60);
  ctx.strokeStyle = "#e8d34a"; ctx.lineWidth = 5; ctx.setLineDash([40, 30]);
  [-40, m.world.h + 40].forEach((yy) => { ctx.beginPath(); ctx.moveTo(-600, yy); ctx.lineTo(m.world.w + 600, yy); ctx.stroke(); });
  ctx.setLineDash([]);
  ctx.fillStyle = "#111"; [[260, 52], [1180, 52], [260, 748], [1180, 748]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#111"; });
  ctx.fillStyle = "#f2c230"; rr(ctx, 30, 50, 1440, 700, 70); ctx.fill();
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(90, 58, 1320, 10); ctx.fillRect(90, 732, 1320, 10);
  ctx.fillStyle = "#7fb4d6"; rr(ctx, 34, 200, 18, 400, 8); ctx.fill(); rr(ctx, 1448, 260, 18, 280, 8); ctx.fill();
  ctx.fillStyle = "#fff6b0"; [[40, 140], [40, 640]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#e94b4b"; [[1460, 140], [1460, 640]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); });
  const wad = wrapAd();
  text(ctx, wad ? (wad.headline || wad.brand_name).toUpperCase().slice(0, 44) : "OSHODI  •  OBALENDE  •  CMS", 760, 82, "14px Bungee, sans-serif", "#1b1b1b");
  text(ctx, wad ? wad.brand_name.toUpperCase().slice(0, 40) : "GOD'S TIME IS THE BEST", 760, 728, "14px Bungee, sans-serif", "#1b1b1b");
  if (wad) { const im = adImage(wad.image_url); if (im) { drawFit(ctx, im, 1190, 54, 130, 32); drawFit(ctx, im, 190, 714, 130, 32); } }
  ctx.fillStyle = "#2b2824"; rr(ctx, 58, 88, 1384, 624, 50); ctx.fill();
  ctx.fillStyle = "#3d3832"; ctx.fillRect(Y.x, Y.y, Y.w, Y.h);
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2; for (let x = Y.x; x < Y.x + Y.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, Y.y); ctx.lineTo(x, Y.y + Y.h); ctx.stroke(); }
  for (const r of Object.values(m.rooms)) { ctx.fillStyle = "#3d3832"; ctx.fillRect(r.corr.x, r.corr.y, r.corr.w, r.corr.h); }
  drawRooms(ctx, m, "#151310", 6);
  // seat benches in the seat rows
  for (const k of ["front", "middle", "back", "windows", "last"]) {
    const r = m.rooms[k];
    for (const by of k === "windows" || k === "last" ? [r.y + 90, r.y + 150] : [r.y + 40, r.y + 100]) {
      ctx.fillStyle = "#6b2f2a"; rr(ctx, r.x + 16, by, r.w - 32, 26, 6); ctx.fill();
      ctx.fillStyle = "#8a3e36"; rr(ctx, r.x + 16, by, r.w - 32, 9, 4); ctx.fill();
    }
  }
  // windows along the walls
  ctx.fillStyle = "#6fa6c9"; for (let x = 360; x < 1160; x += 90) { ctx.fillRect(x, 92, 60, 10); ctx.fillRect(x, 698, 60, 10); }
  // driver cabin
  const d = m.rooms.driver;
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(d.x + 6, d.y + 20, 26, d.h - 40);
  ctx.strokeStyle = "#111"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(110, 360, 28, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(82, 360); ctx.lineTo(138, 360); ctx.stroke();
  ctx.fillStyle = "#6b2f2a"; rr(ctx, 160, 330, 60, 70, 8); ctx.fill();
  ctx.fillStyle = "#c9a227"; ctx.beginPath(); ctx.arc(m.bell.x, m.bell.y, 13, 0, Math.PI * 2); ctx.fill(); text(ctx, "HORN", m.bell.x, m.bell.y + 4, "9px Bungee, sans-serif", "#1b1b1b");
  text(ctx, "NO SHAKING", 750, 395, "16px Bungee, sans-serif", "rgba(255,255,255,.18)");
  // conductor door opening
  ctx.fillStyle = "#111"; ctx.fillRect(400, 700, 140, 40); ctx.fillStyle = "#555"; ctx.fillRect(410, 712, 120, 8);
  // boot: luggage and spare tyre
  const bt = m.rooms.boot;
  [["#2d6cdf", 1240, 260], ["#e94b4b", 1290, 250], ["#2bd47d", 1380, 270], ["#f5e663", 1250, 330]].forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.fillRect(x, y, 36, 28); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x, y + 12, 36, 3); });
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(1380, 500, 32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#777"; ctx.beginPath(); ctx.arc(1380, 500, 12, 0, Math.PI * 2); ctx.fill();
  void bt;
  // radio and stickers
  ctx.fillStyle = "#222"; ctx.fillRect(520, 210, 40, 20); ctx.fillStyle = "#2bd47d"; ctx.fillRect(526, 216, 18, 6);
  ctx.fillStyle = "#f4efe6"; [[1040, 640], [1080, 610], [1010, 620]].forEach(([x, y]) => { ctx.fillRect(x, y, 10, 14); });
  roomLabels(ctx, m);
}
function drawMap(ctx, map) { if (map.id === "danfo") drawDanfo(ctx); else drawCompound(ctx); }
function drawBodyAt(ctx, look, name, x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 4, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = look.c1; ctx.beginPath(); ctx.ellipse(-2, -4, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(18, -6, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#120a05"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(15, -9); ctx.lineTo(18, -6); ctx.moveTo(18, -9); ctx.lineTo(15, -6); ctx.stroke();
  ctx.strokeStyle = "#ff5d5d"; ctx.lineWidth = 2.5; ctx.strokeRect(-6, -40, 12, 20); ctx.beginPath(); ctx.moveTo(-10, -44); ctx.lineTo(10, -16); ctx.stroke();
  ctx.restore();
  if (name) { ctx.font = "700 11px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.strokeText(`${name}: phone don miss`, x, y - 50); ctx.fillStyle = "#ffd0d0"; ctx.fillText(`${name}: phone don miss`, x, y - 50); }
}

// =====================================================================
// Saved data (brings look and friends over from earlier versions)
// =====================================================================
const KEY = "naija-sus-v1";
function loadData() {
  try {
    const cur = JSON.parse(localStorage.getItem(KEY)); if (cur) return cur;
    const old = JSON.parse(localStorage.getItem("who-be-thief-v1")) || JSON.parse(localStorage.getItem("who-be-ole-v2"));
    return old ? { name: old.name, look: old.look, friends: old.friends, settings: old.settings, rooms: old.rooms } : {};
  } catch (e) { return {}; }
}
let DATA = loadData();
DATA.name = typeof DATA.name === "string" ? DATA.name : "";
DATA.look = Object.assign({ ...DEFAULT_LOOK }, DATA.look || {});
DATA.settings = Object.assign({ sound: true, vibrate: true, difficulty: "normal", chores: "normal", talk: "normal", names: true, voice: true }, DATA.settings || {});
delete DATA.settings.housemates;
DATA.friends = Array.isArray(DATA.friends) ? DATA.friends : [];
DATA.rooms = Array.isArray(DATA.rooms) ? DATA.rooms.map((r) => ({ mode: "compound", ...r })) : [];
DATA.mode = MODES.includes(DATA.mode) ? DATA.mode : "compound";
DATA.look = Object.assign({ pet: "none", tag: "none", bag: "gmg" }, DATA.look);
DATA.deviceId = typeof DATA.deviceId === "string" && DATA.deviceId.length > 10 ? DATA.deviceId : (crypto.randomUUID ? crypto.randomUUID() : "d" + Date.now() + Math.random().toString(16).slice(2));
DATA.owned = Array.isArray(DATA.owned) ? DATA.owned : [];
DATA.email = typeof DATA.email === "string" ? DATA.email : "";
DATA.settings.radio = DATA.settings.radio !== false;
DATA.settings.music = DATA.settings.music !== false;
M = MAPS[DATA.mode];
function save() { try { localStorage.setItem(KEY, JSON.stringify(DATA)); } catch (e) { /* storage unavailable */ } }
save();
const S = () => DATA.settings;
const DIFF = { easy: { careful: 0.4, cd: 30, follow: 0.7 }, normal: { careful: 0.65, cd: 24, follow: 0.85 }, hard: { careful: 0.88, cd: 19, follow: 0.95 } };
const CHORE_MULT = { relaxed: 1.4, normal: 1, fast: 0.7 };
const TALK_MS = { slow: 2600, normal: 1800, fast: 900 };
const MEETING_SECONDS = 120;

// =====================================================================
// Sound + vibration
// =====================================================================
let AC = null;
function audio() { if (!S().sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch (e) { return null; } }
function tone(freq, start, dur, type = "sine", vol = 0.12, slide) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const SFX = {
  tap: () => tone(620, 0, 0.06, "triangle", 0.08),
  join: () => { tone(520, 0, 0.08, "triangle", 0.07); tone(780, 0.07, 0.1, "triangle", 0.07); },
  done: () => { tone(660, 0, 0.12, "triangle"); tone(990, 0.1, 0.18, "triangle"); },
  steal: () => tone(220, 0, 0.35, "sawtooth", 0.09, 70),
  bell: () => { for (let i = 0; i < 3; i++) { tone(1046, i * 0.28, 0.5, "triangle", 0.1); tone(1568, i * 0.28, 0.35, "sine", 0.05); } },
  horn: () => { tone(330, 0, 0.35, "square", 0.08); tone(415, 0, 0.35, "square", 0.06); tone(330, 0.45, 0.5, "square", 0.08); tone(415, 0.45, 0.5, "square", 0.06); },
  lights: () => tone(160, 0, 0.6, "square", 0.06, 40),
  vote: () => tone(440, 0, 0.08, "square", 0.05),
  door: () => { tone(200, 0, 0.15, "square", 0.05); tone(150, 0.15, 0.25, "square", 0.05); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, "triangle")),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.18, 0.35, "triangle")),
};
function sfx(n) { try { SFX[n] && SFX[n](); } catch (e) { /* audio unavailable */ } }
function buzz(p) { if (!S().vibrate) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* unsupported */ } }

// =====================================================================
// Menu background: a self-playing round on the selected map
// =====================================================================
const bg = $("#bg"), bgx = bg.getContext("2d");
let D = null, bgRunning = false, bgLast = 0;
function newDemo() {
  const used = new Set();
  const bots = BOT_NAMES.slice(0, 8).map((name, i) => {
    let c1 = FABRIC[(i * 5) % FABRIC.length]; while (used.has(c1)) c1 = pick(FABRIC); used.add(c1);
    return { name, look: i === 0 ? DATA.look : randomLook(Math.random, c1), ...spawnAt(i, 8), facing: 1, bob: rand(0, 6), moving: false, path: [], state: "idle", timer: rand(0.2, 2), hidden: false };
  });
  D = { map: M.id, bots, phase: "roam", phaseT: rand(8, 12), thief: 1 + randi(0, 6), target: null, body: null, follow: 0, followT: 7, cam: { ...M.center } };
}
function demoTick(dt) {
  const th = D.bots[D.thief];
  for (const b of D.bots) {
    if (b.hidden) continue;
    b.moving = false;
    if (b === th && D.phase === "chase") {
      const t = D.target;
      if (moveToward(b, t.x, t.y, 150, dt) || dist(b, t) < 30) { D.body = { x: t.x, y: t.y, look: t.look, name: t.name }; t.hidden = true; D.phase = "body"; D.phaseT = 2.6; b.path = planPath(b, M.spots[pick(M.spotIds)]); b.state = "walk"; }
      continue;
    }
    if (D.phase === "meeting") continue;
    if (b.state !== "walk") { b.timer -= dt; if (b.timer <= 0) { b.path = Math.random() < 0.35 ? planPath(b, yardPoint()) : planPath(b, M.spots[pick(M.spotIds)]); b.state = "walk"; } }
    else if (!b.path.length) { b.state = "work"; b.timer = rand(1.5, 4); }
    else if (moveToward(b, b.path[0].x, b.path[0].y, 120, dt)) b.path.shift();
  }
  D.phaseT -= dt;
  if (D.phase === "roam" && D.phaseT <= 0) {
    const t = D.bots.filter((x) => x !== th && !x.hidden && areaOf(x) === areaOf(th) && dist(x, th) < 340);
    if (t.length) { D.target = pick(t); D.phase = "chase"; D.follow = D.thief; } else D.phaseT = 1;
  } else if (D.phase === "body" && D.phaseT <= 0) { D.phase = "meeting"; D.phaseT = 2.4; }
  else if (D.phase === "meeting" && D.phaseT <= 0) {
    D.bots.forEach((b, i) => { Object.assign(b, spawnAt(i, 8)); b.hidden = false; b.path = []; b.state = "idle"; b.timer = rand(0.2, 2); });
    D.body = null; D.target = null; D.phase = "roam"; D.phaseT = rand(9, 14); D.thief = 1 + randi(0, 6); D.follow = randi(0, 7);
  }
  D.followT -= dt;
  if (D.followT <= 0 && D.phase === "roam") { D.followT = 7; D.follow = randi(0, 7); }
  const f = D.bots[D.follow], k = Math.min(1, dt * 1.5);
  D.cam.x += (f.x - D.cam.x) * k; D.cam.y += (f.y - 20 - D.cam.y) * k;
}
function drawDemo() {
  const w = innerWidth, h = innerHeight, d = Math.min(2, devicePixelRatio || 1);
  if (bg.width !== Math.round(w * d) || bg.height !== Math.round(h * d)) { bg.width = Math.round(w * d); bg.height = Math.round(h * d); }
  bgx.setTransform(d, 0, 0, d, 0, 0);
  let sc = Math.max(0.75, Math.min(1.3, h / 780)); if (w / sc > 1300) sc = w / 1300;
  bgx.save(); bgx.scale(sc, sc); bgx.translate(-(D.cam.x - w / sc / 2), -(D.cam.y - h / sc / 2.6));
  drawMap(bgx, M);
  if (D.body) drawBodyAt(bgx, D.body.look, D.body.name, D.body.x, D.body.y);
  [...D.bots].filter((b) => !b.hidden).sort((a, b) => a.y - b.y).forEach((b) => drawLook(bgx, b.look, b.x, b.y, { facing: b.facing, moving: b.moving, bob: b.bob, label: b.name }));
  bgx.restore();
  const g = bgx.createRadialGradient(w / 2, h * 0.38, Math.min(w, h) * 0.2, w / 2, h * 0.38, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(2,3,8,0)"); g.addColorStop(1, "rgba(2,3,8,.75)"); bgx.fillStyle = g; bgx.fillRect(0, 0, w, h);
  if (D.phase === "meeting") {
    bgx.fillStyle = "rgba(255,93,93,.18)"; bgx.fillRect(0, 0, w, h);
    bgx.font = `${Math.min(34, w / 12)}px Bungee, sans-serif`; bgx.textAlign = "center"; bgx.lineWidth = 6; bgx.strokeStyle = "#1a0505";
    bgx.strokeText("EMERGENCY MEETING!", w / 2, h * 0.33); bgx.fillStyle = "#ff5d5d"; bgx.fillText("EMERGENCY MEETING!", w / 2, h * 0.33);
  }
}
function bgLoop(ts) { if (!bgRunning) return; const dt = Math.min(0.05, (ts - bgLast) / 1000 || 0); bgLast = ts; if (!REDUCED) demoTick(dt); drawDemo(); requestAnimationFrame(bgLoop); }
function startBg() { bg.hidden = false; if (!D || D.map !== M.id) newDemo(); D.bots[0].look = DATA.look; D.bots[0].name = displayName(); if (!bgRunning) { bgRunning = true; bgLast = performance.now(); requestAnimationFrame(bgLoop); } }
function stopBg() { bgRunning = false; bg.hidden = true; }
addEventListener("resize", () => { if (bgRunning) drawDemo(); });

// =====================================================================
// Servers (simulated on this device)
// =====================================================================
const SERVER_NAMES = {
  compound: ["Surulere Night Shift", "Yaba Hostel Gang", "Ajegunle Kings", "Lekki Phase 1 Squad", "Ikeja No Wahala", "Moremi Hall Girls", "Festac Town Crew", "Ojuelegba Junction", "Abuja Big Boys", "Port Harcourt Garden City", "Enugu Coal City", "Benin Coral Squad", "Kano Sahel Squad", "Owerri Vibes", "Mushin Midnight", "Ibadan Amala Gang"],
  danfo: ["Oshodi Under Bridge", "Ojota Motor Park", "CMS Express", "Obalende Last Stop", "Yaba Tech Gate", "Berger Rush Hour", "Ikorodu Garage", "Mile 2 Madness", "Iyana Ipaja Loading", "Ketu Mile 12", "Agege Pen Cinema", "Costain Roundabout", "Ojodu Berger Hold-up", "Lekki Toll Gate", "Third Mainland Traffic", "Apapa Wharf Crew"],
};
const ICONS = {
  shirt: '<svg class="ico" viewBox="0 0 24 24"><path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-1 2-2.5 3-4 3S9 5 8 3Z"/></svg>',
  friends: '<svg class="ico" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3.3-6 6.5-6s6 2 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14c3 0 5 1.8 5.5 5"/></svg>',
  gear: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  bus: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="3"/><path d="M3 11h18M8 5v6M14 5v6"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/></svg>',
  person: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 4-7 8-7s7.3 2.5 8 7"/></svg>',
  filter: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 5h18M6 12h12M10 19h4"/></svg>',
  dice: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="16" r="1.2"/><circle cx="12" cy="12" r="1.2"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  refresh: '<svg class="ico" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
  bag: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
};
let SERVERS = [], serversMode = null, serverTimer = null;
const filters = { players: "any", thieves: "any", region: "any" };
let srvQuery = "", srvPage = 1;
const PAGE = 20;
function makeServers() {
  serversMode = DATA.mode;
  SERVERS = shuffle(SERVER_NAMES[DATA.mode]).slice(0, 14).map((name, i) => {
    const max = randi(5, 10), thieves = randi(1, maxThieves(max));
    return { id: "s" + i + "-" + Date.now(), name, host: pick(BOT_NAMES), max, thieves, players: Math.random() < 0.18 ? max : randi(1, max - 1), ping: randi(18, 140) };
  });
}
const filterCount = () => (NET.ready && !practice ? onlineFiltered().length : filteredServers().length);
function filteredServers() {
  return SERVERS.filter((s) => (filters.players === "any" || s.max === Number(filters.players)) && (filters.thieves === "any" || s.thieves === Number(filters.thieves)))
    .sort((a, b) => (a.players >= a.max) - (b.players >= b.max) || b.players / b.max - a.players / a.max);
}
function tickServers() {
  for (const s of SERVERS) if (Math.random() < 0.3) {
    if (s.players >= s.max) { if (Math.random() < 0.3) s.players = randi(1, 3); }
    else s.players = clamp(s.players + (Math.random() < 0.7 ? 1 : -1), 1, s.max);
  }
  const list = $("#serverList"); if (list && ov.hidden) list.innerHTML = serverRows();
}
function stopServerTicks() { clearInterval(serverTimer); serverTimer = null; }

// =====================================================================
// Rooms + walkable pre-game lobby
// =====================================================================
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randi(0, CODE_CHARS.length - 1)]).join("");
const fmtCode = (c) => c.slice(0, 3) + "-" + c.slice(3);
let ROOM = null, roomTimer = null;

// ---------- Online: Supabase realtime ----------
// One player in each room is the host (whoever joined first). The host runs the
// computer players, checks steals and votes, and sends everyone a snapshot a few
// times a second. Everybody else sends their own position and their actions.
const NET = { sb: null, ready: false, cfg: {}, ch: null, online: false, isHost: true, hostId: null, myId: DATA.deviceId, humans: [], beat: 0, ping: 0, waiting: false };
const AUTH = () => !NET.online || NET.isHost;
const myLook = () => ({ ...DATA.look, vip: owns("vip") });
const meMember = () => ({ name: displayName(), look: myLook(), you: true, netId: NET.myId });
function botMember(taken) { const name = pick(BOT_NAMES.filter((n) => !taken.has(n.toLowerCase()))) || "Guest" + randi(10, 99); taken.add(name.toLowerCase()); return { name, look: randomLook(), bot: true }; }
const takenNames = () => new Set([...ROOM.members, ...(ROOM.bots || [])].map((m) => m.name.toLowerCase()));
async function initNet() {
  try { const r = await fetch("/api/config", { cache: "no-store" }); if (!r.ok) return; NET.cfg = await r.json(); } catch (e) { return; }
  if (!NET.cfg.supabaseUrl || !NET.cfg.supabaseAnonKey) return;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    NET.sb = createClient(NET.cfg.supabaseUrl, NET.cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "naija-sus-auth" }, realtime: { params: { eventsPerSecond: 40 } } });
    NET.ready = true;
  } catch (e) { NET.ready = false; return; }
  loadIce();
  try { await initAuth(); } catch (e) { /* play as a guest */ }
}

// =====================================================================
// Accounts: sign up with email, log in, username, saved look and stats
// =====================================================================
const ACCT = { user: null, profile: null, view: "signup", msg: "", err: "", recovery: false, check: { name: "", ok: null } };
const isSignedIn = () => !!ACCT.user;
const USER_RE = /^[A-Za-z0-9_]{3,15}$/;
let lastUid = null, lookTimer = null, checkTimer = null;
async function initAuth() {
  NET.sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { ACCT.recovery = true; ACCT.err = ""; ACCT.msg = "Choose a new password for your account."; screen = "account"; }
    setTimeout(() => applySession(session, ev), 0);
  });
  const { data } = await NET.sb.auth.getSession();
  await applySession(data && data.session, "INITIAL");
}
async function applySession(session, ev) {
  const user = session ? session.user : null, uid = user ? user.id : null;
  ACCT.user = user;
  if (uid === lastUid && ev !== "INITIAL" && ev !== "USER_UPDATED" && ev !== "PASSWORD_RECOVERY") return;
  lastUid = uid;
  if (!user) { ACCT.profile = null; refreshAfterAuth(); return; }
  await loadProfile();
  try { await NET.sb.rpc("claim_purchases", { p_device: DATA.deviceId }); } catch (e) { /* try again next time */ }
  await loadPurchases().catch(() => {});
  tidyLook();
  if (ev === "SIGNED_IN" && screen === "account" && !ACCT.recovery) { ACCT.err = ""; ACCT.msg = ACCT.profile && ACCT.profile.username ? `Welcome, ${ACCT.profile.username}! Your stuff is saved to your account.` : "You're in. Pick a username to finish."; }
  refreshAfterAuth();
}
async function loadProfile() {
  if (!isSignedIn()) return;
  const { data } = await NET.sb.rpc("my_profile");
  const row = Array.isArray(data) ? data[0] : data;
  ACCT.profile = row || { username: null, look: {}, games_played: 0, wins: 0, thief_wins: 0 };
  if (row && row.look && Object.keys(row.look).length) { DATA.look = Object.assign({ ...DEFAULT_LOOK, pet: "none", tag: "none", bag: "gmg" }, row.look); }
  else saveLookSoon(0);
  if (ACCT.user.email) DATA.email = ACCT.user.email;
  save();
}
function refreshAfterAuth() { if (!G && screen !== "room") renderMenu(); else { syncMyLook(); } }
function saveLookSoon(ms = 1500) { if (!isSignedIn()) return; clearTimeout(lookTimer); lookTimer = setTimeout(() => NET.sb.rpc("save_look", { p_look: DATA.look }).then(() => {}, () => {}), ms); }
function acctSay(msg, err) { ACCT.msg = err ? "" : msg; ACCT.err = err ? msg : ""; renderMenu(); }
function niceAuthError(e) {
  const m = String((e && e.message) || e || "").toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("not confirmed")) return "Confirm your email first. Check your inbox (and spam) for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Log in instead.";
  if (m.includes("password") && m.includes("characters")) return "Your password needs at least 8 characters.";
  if (m.includes("rate") || m.includes("too many") || m.includes("security purposes")) return "Too many tries. Wait a minute and try again.";
  if (m.includes("email") && m.includes("invalid")) return "That email doesn't look right.";
  if (m.includes("fetch") || m.includes("network")) return "Couldn't reach the server. Check your internet.";
  return "Something went wrong. Please try again.";
}
function checkUsername(id) {
  const el = $("#" + id), out = $("#" + id + "Msg"); if (!el || !out) return;
  const v = el.value.trim(); clearTimeout(checkTimer);
  if (!v) { out.textContent = "3 to 15 letters, numbers or _"; out.style.color = ""; return; }
  if (!USER_RE.test(v)) { out.textContent = "Use 3 to 15 letters, numbers or _ (no spaces)."; out.style.color = "#ffc4c4"; return; }
  if (ACCT.profile && ACCT.profile.username && ACCT.profile.username.toLowerCase() === v.toLowerCase()) { out.textContent = "That's your username now."; out.style.color = ""; return; }
  out.textContent = "Checking..."; out.style.color = "";
  checkTimer = setTimeout(async () => {
    const { data } = await NET.sb.rpc("username_available", { p_username: v });
    if ($("#" + id) && $("#" + id).value.trim() === v) { out.textContent = data ? `${v} is free.` : `${v} is taken or not allowed. Try another.`; out.style.color = data ? "var(--green)" : "#ffc4c4"; }
  }, 350);
}
async function doSignup() {
  const username = $("#suName").value.trim(), email = $("#suEmail").value.trim(), password = $("#suPass").value;
  if (!USER_RE.test(username)) return acctSay("Pick a username: 3 to 15 letters, numbers or _.", true);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return acctSay("Add a working email address.", true);
  if (password.length < 8) return acctSay("Your password needs at least 8 characters.", true);
  const { data: free } = await NET.sb.rpc("username_available", { p_username: username });
  if (!free) return acctSay(`${username} is taken. Try another username.`, true);
  const { data, error } = await NET.sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + "/" } });
  if (error) return acctSay(niceAuthError(error), true);
  if (data.session) { DATA.name = username; save(); return; }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { ACCT.view = "login"; return acctSay("That email already has an account. Log in instead.", true); }
  ACCT.view = "login"; acctSay(`Almost done! We sent a link to ${email}. Tap it to confirm, then log in here.`);
}
async function doLogin() {
  const email = $("#liEmail").value.trim(), password = $("#liPass").value;
  if (!email || !password) return acctSay("Type your email and password.", true);
  const { error } = await NET.sb.auth.signInWithPassword({ email, password });
  if (error) return acctSay(niceAuthError(error), true);
  ACCT.msg = "Logging you in..."; ACCT.err = "";
}
async function doForgot() {
  const el = $("#liEmail"), email = el ? el.value.trim() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return acctSay("Type your email above first, then tap Forgot password.", true);
  const { error } = await NET.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
  if (error) return acctSay(niceAuthError(error), true);
  acctSay(`If ${email} has an account, a reset link is on its way. Check your inbox and spam.`);
}
async function doSetUsername() {
  const v = $("#unName").value.trim();
  if (!USER_RE.test(v)) return acctSay("Use 3 to 15 letters, numbers or _ (no spaces).", true);
  const { data, error } = await NET.sb.rpc("set_username", { p_username: v });
  if (error || data !== "ok") return acctSay(data === "taken" ? `${v} is taken. Try another.` : data === "invalid" ? "That username isn't allowed. Try another." : "Couldn't save your username. Try again.", true);
  await loadProfile(); DATA.name = v; save(); syncMyLook(); acctSay(`You're now ${v}.`);
}
async function doNewPassword() {
  const pw = $("#npPass").value;
  if (pw.length < 8) return acctSay("Your password needs at least 8 characters.", true);
  const { error } = await NET.sb.auth.updateUser({ password: pw });
  if (error) return acctSay(niceAuthError(error), true);
  ACCT.recovery = false; acctSay("Password changed. You're logged in.");
}
async function doSignout() {
  await NET.sb.auth.signOut().catch(() => {});
  ACCT.user = null; ACCT.profile = null; lastUid = null; ACCT.view = "login"; DATA.purchases = []; save();
  await loadPurchases().catch(() => {}); tidyLook(); acctSay("You've logged out. Your items stay on your account.");
}
function send(event, payload) { if (NET.ch) NET.ch.send({ type: "broadcast", event, payload }).catch(() => {}); }
// Things that happen in the game. The host decides them; everybody (host included) reacts.
function emit(type, data = {}) { if (NET.online) send("ev", { ...data, type }); applyEv(type, data); }
// Things a player wants to do. The host checks them before they happen.
function sendAct(type, data = {}) { if (!G || !me) return; if (AUTH()) handleAct(me.id, type, data); else send("act", { ...data, type, by: me.id }); }

let ONLINE_ROOMS = [], roomsErr = "", roomsLoaded = false;
async function fetchRooms() {
  if (!NET.ready) return;
  const t0 = performance.now();
  const { data, error } = await NET.sb.rpc("list_rooms", { p_mode: DATA.mode });
  NET.ping = Math.round(performance.now() - t0); roomsLoaded = true;
  if (error) roomsErr = "Couldn't reach the servers. Check your internet and try again."; else { roomsErr = ""; ONLINE_ROOMS = data || []; }
  const list = $("#serverList"); if (list && ov.hidden && screen === "servers") list.innerHTML = serverRows();
}
async function joinOnline(row) {
  await leaveRoom();
  if (row.mode !== DATA.mode) setMode(row.mode);
  ROOM = { online: true, id: row.id, code: row.code || null, name: row.name, mode: row.mode, max: row.max_players, thieves: row.thieves, kind: row.is_private ? "private" : "public",
    members: [meMember()], bots: [], countdown: null, youHost: false, meetSecs: row.meetSecs || 120, joinedAt: Date.now() };
  NET.online = true; NET.isHost = false; NET.humans = []; NET.waiting = false; NET.beat = 0;
  const ch = NET.sb.channel(`room:${row.id}`, { config: { presence: { key: NET.myId }, broadcast: { self: false } } });
  NET.ch = ch;
  ch.on("presence", { event: "sync" }, onPresence)
    .on("broadcast", { event: "lpos" }, ({ payload }) => onLobbyPos(payload))
    .on("broadcast", { event: "lobby" }, ({ payload }) => onLobbyState(payload))
    .on("broadcast", { event: "start" }, ({ payload }) => onStart(payload))
    .on("broadcast", { event: "pos" }, ({ payload }) => onPos(payload))
    .on("broadcast", { event: "st" }, ({ payload }) => onSnap(payload))
    .on("broadcast", { event: "ev" }, ({ payload }) => { if (G) applyEv(payload.type, payload); })
    .on("broadcast", { event: "act" }, ({ payload }) => { if (AUTH() && G && payload.by != null) handleAct(payload.by, payload.type, payload); })
    .on("broadcast", { event: "chat" }, ({ payload }) => onChat(payload))
    .on("broadcast", { event: "rtc" }, ({ payload }) => { if (payload.to === NET.myId) rtcSignal(payload); });
  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") { try { await ch.track(presenceState()); } catch (e) { /* retried on next sync */ } }
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && screen === "room") netNotice("Connection to the room is shaky. Reconnecting...");
  });
  go("room");
}
function presenceState() { return { id: NET.myId, name: displayName(), look: myLook(), joinedAt: ROOM ? ROOM.joinedAt : Date.now(), playing: !!(G && !G.ended) }; }
function retrack() { if (NET.online && NET.ch) NET.ch.track(presenceState()).catch(() => {}); }
async function leaveRoom() {
  rtcClose(); stopRadio();
  if (NET.ch) { const ch = NET.ch; NET.ch = null; try { await ch.untrack(); await NET.sb.removeChannel(ch); } catch (e) { /* already gone */ } }
  NET.online = false; NET.isHost = true; NET.humans = []; ROOM = null; clearRoomTimer();
}
function netNotice(msg) { const el = $("#lobbyPanel"); if (el) el.insertAdjacentHTML("afterbegin", `<p class="small" style="margin:0;color:#ffc4c4">${esc(msg)}</p>`); }
function onPresence() {
  if (!NET.ch || !ROOM) return;
  const list = Object.values(NET.ch.presenceState()).map((a) => a[0]).filter(Boolean).sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1));
  if (!list.length) return;
  const idx = list.findIndex((m) => m.id === NET.myId);
  if (idx >= ROOM.max && !G) { leaveRoom().then(() => { go("servers"); toastMenu("That room just filled up. Pick another one."); }); return; }
  const wasHost = NET.isHost;
  NET.humans = list; NET.hostId = list[0].id; NET.isHost = NET.hostId === NET.myId; ROOM.youHost = NET.isHost;
  ROOM.members = list.map((m) => ({ name: m.id === NET.myId ? displayName() : m.name, look: m.id === NET.myId ? myLook() : m.look, you: m.id === NET.myId, netId: m.id, host: m.id === NET.hostId, playing: m.playing }));
  if (LB) syncLobbyActors();
  if (screen === "room") renderLobbyPanel();
  if (G && !G.ended) {
    // Players who drop out of a game are played by the computer from then on.
    const present = new Set(list.map((m) => m.id));
    for (const p of P) if (p.netId && !p.you && !p.isBot && !present.has(p.netId)) { p.isBot = true; p.remote = false; p.state = "idle"; p.timer = 1; p.path = []; toast(`${p.name} left. The computer is playing for them.`); }
    if (NET.isHost && !wasHost) becomeHost();
  }
}
function becomeHost() {
  for (const p of P) if (p.isBot) { p.state = "idle"; p.timer = rand(0.3, 1.5); p.path = []; p.chase = null; if (p.tx != null) { p.x = p.tx; p.y = p.ty; } }
  const m = G.meeting;
  if (m && m.phase === "vote") { m.plan = botPlan(); const now = performance.now(); for (const id of Object.keys(m.plan)) if (m.cast[id] === undefined || m.cast[id] === true) { m.cast[id] = undefined; m.revealAt[id] = now + rand(500, 3000); } }
  toast("You are now the host of this room.");
}
function onLobbyPos(d) { if (!LB) return; const a = LB.actors.find((x) => x.m.netId === d.id); if (a && !a.m.you) { a.tx = d.x; a.ty = d.y; a.facing = d.f; a.net = true; if (d.em) a.emote = { id: d.em, until: performance.now() + 3000 }; } }
function onLobbyState(d) { if (!ROOM || NET.isHost) return; ROOM.bots = d.bots || []; ROOM.countdown = d.countdown; ROOM.meetSecs = d.meetSecs || ROOM.meetSecs; if (LB) syncLobbyActors(); renderLobbyPanel(); }
function roomTickOnline() {
  if (!ROOM || !ROOM.online || !NET.isHost) return;
  NET.beat--;
  if (NET.beat <= 0) { NET.beat = 8; NET.sb.rpc("room_heartbeat", { p_room: ROOM.id, p_count: NET.humans.length, p_status: G && !G.ended ? "playing" : "lobby", p_host_name: displayName() }).then(() => {}, () => {}); }
  if (screen !== "room") return;
  const total = NET.humans.length + ROOM.bots.length;
  if (ROOM.kind === "public") {
    if (ROOM.countdown == null) ROOM.countdown = total >= ROOM.max ? 5 : 45;
    else { if (total >= ROOM.max && ROOM.countdown > 5) ROOM.countdown = 5; ROOM.countdown--; }
    if (ROOM.countdown <= 0) { ROOM.countdown = null; hostStartOnline(); return; }
  } else if (ROOM.filling && total < ROOM.max) { const b = botMember(takenNames()); ROOM.bots.push(b); lobbyArrive(b); sfx("join"); }
  send("lobby", { bots: ROOM.bots, countdown: ROOM.countdown, meetSecs: ROOM.meetSecs });
  if (LB) syncLobbyActors();
  renderLobbyPanel();
}
function hostStartOnline() {
  const humans = NET.humans.slice(0, ROOM.max);
  const target = ROOM.kind === "public" ? ROOM.max : Math.max(5, humans.length + ROOM.bots.length);
  const taken = takenNames();
  while (humans.length + ROOM.bots.length < target) ROOM.bots.push(botMember(taken));
  const members = [...humans.map((h) => ({ name: h.id === NET.myId ? displayName() : h.name, look: h.id === NET.myId ? myLook() : h.look, netId: h.id, bot: false })), ...ROOM.bots.map((b) => ({ ...b, bot: true }))].slice(0, ROOM.max);
  const pack = buildRoster(members, ROOM.thieves);
  const payload = { roster: pack.roster, thieves: pack.thieves, roomName: ROOM.name, mode: ROOM.mode, meetSecs: ROOM.meetSecs || 120 };
  send("start", payload);
  onStart(payload);
}
function onStart(d) {
  if (!ROOM) return;
  if (d.mode !== DATA.mode) setMode(d.mode);
  ROOM.bots = []; ROOM.countdown = null;
  if (!d.roster.some((r) => r.netId === NET.myId)) { NET.waiting = true; renderLobbyPanel(); return; }
  NET.waiting = false;
  newGame({ roster: d.roster, thieves: d.thieves, roomName: d.roomName, meetSecs: d.meetSecs });
  retrack();
}
async function createOnlineRoom(cfg) {
  const { data, error } = await NET.sb.rpc("create_room", { p_name: cfg.name, p_mode: DATA.mode, p_max: cfg.max, p_thieves: cfg.thieves, p_private: true, p_host_name: displayName() });
  if (error || !data || !data[0]) return "Couldn't create the room. Check your internet and try again.";
  const r = { code: data[0].code, mode: DATA.mode, name: cfg.name, max: cfg.max, thieves: cfg.thieves, created: Date.now(), online: true };
  DATA.rooms = [r, ...DATA.rooms.filter((x) => x.code !== r.code)].slice(0, 6); save();
  await joinOnline({ id: data[0].id, code: r.code, name: cfg.name, mode: DATA.mode, max_players: cfg.max, thieves: cfg.thieves, is_private: true, meetSecs: cfg.meetSecs });
  return null;
}
async function joinOnlineByCode(raw) {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) return "Codes are 6 letters and numbers, like K7Q-X2M.";
  const { data, error } = await NET.sb.rpc("find_room", { p_code: code });
  if (error) return "Couldn't reach the servers. Check your internet.";
  if (!data || !data[0]) return "No room has that code. Check it with your friend.";
  const row = data[0];
  if (row.player_count >= row.max_players) return "That room is full.";
  await joinOnline(row);
  return null;
}

// ---------- Offline practice (computer players only) ----------
function enterPublic(server) {
  const taken = new Set([displayName().toLowerCase(), server.host.toLowerCase()]);
  const members = [{ name: server.host, look: randomLook(), host: true }];
  for (let i = 1; i < Math.min(server.players, server.max - 1); i++) members.push(botMember(taken));
  members.push(meMember());
  ROOM = { online: false, mode: DATA.mode, kind: "public", name: server.name, max: server.max, thieves: server.thieves, members, bots: [], youHost: false, countdown: null };
  go("room");
}
function hostRoom(r) {
  if (r.mode && r.mode !== DATA.mode) setMode(r.mode);
  ROOM = { online: false, mode: DATA.mode, kind: "private", code: r.code, name: r.name, max: r.max, thieves: r.thieves, members: [{ ...meMember(), host: true }], bots: [], youHost: true, countdown: null, meetSecs: r.meetSecs || 120, pendingFriends: DATA.friends.filter((f) => f.invited).slice(0, r.max - 1) };
  go("room");
}
function createPrivate(cfg) {
  const r = { code: newCode(), mode: DATA.mode, name: cfg.name, max: cfg.max, thieves: cfg.thieves, meetSecs: cfg.meetSecs, created: Date.now() };
  DATA.rooms = [r, ...DATA.rooms].slice(0, 6); save(); hostRoom(r);
}
function joinByCode(raw) {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) return "Codes are 6 letters and numbers, like K7Q-X2M.";
  const mine = DATA.rooms.find((r) => r.code === code && !r.online);
  if (mine) { hostRoom(mine); return null; }
  const rng = seeded(code), max = 5 + Math.floor(rng() * 6), thieves = 1 + Math.floor(rng() * maxThieves(max));
  setMode(rng() < 0.5 ? "compound" : "danfo");
  const hostName = BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];
  const taken = new Set([displayName().toLowerCase(), hostName.toLowerCase()]);
  const members = [{ name: hostName, look: randomLook(rng), host: true }];
  const already = 1 + Math.floor(rng() * (max - 3));
  for (let i = 0; i < already; i++) members.push(botMember(taken));
  members.push(meMember());
  ROOM = { online: false, mode: DATA.mode, kind: "private", code, name: `${hostName}'s room`, max, thieves, members, bots: [], youHost: false, countdown: null };
  go("room"); return null;
}
function roomTick() {
  if (!ROOM) return;
  if (ROOM.online) return roomTickOnline();
  if (screen !== "room") return;
  const full = () => ROOM.members.length >= ROOM.max;
  if (ROOM.countdown != null) { ROOM.countdown--; if (ROOM.countdown <= 0) { clearRoomTimer(); startFromRoom(); return; } }
  else if (!full()) {
    let joined = null;
    if (ROOM.pendingFriends && ROOM.pendingFriends.length) { const f = ROOM.pendingFriends.shift(); joined = { name: f.name, look: friendLook(f), friend: true }; }
    else if (ROOM.filling || (!ROOM.youHost && Math.random() < 0.6)) joined = botMember(takenNames());
    if (joined) { ROOM.members.push(joined); lobbyArrive(joined); sfx("join"); }
  }
  if (ROOM.countdown == null && full() && !ROOM.youHost) ROOM.countdown = 6;
  renderLobbyPanel();
}
function clearRoomTimer() { clearInterval(roomTimer); roomTimer = null; }
function startFromRoom() {
  if (ROOM.online) { hostStartOnline(); return; }
  stopLobby(); const r = ROOM;
  newGame({ members: r.members.map((m) => ({ ...m, bot: !m.you })), thieves: Math.min(r.thieves, maxThieves(r.members.length)), roomName: r.name, meetSecs: r.meetSecs || 120 });
}

// ---------- Lobby world: a small yard (or motor park) to walk around before the game ----------
const LOBBY = { w: 900, h: 560, walk: { x: 40, y: 175, w: 820, h: 345 }, mirror: { x: 150, y: 215 }, gate: { x: 900, y: 360 } };
let LB = null;
function lobbyMembers() { return [...ROOM.members, ...(ROOM.online ? ROOM.bots : [])]; }
function startLobby() {
  stopLobby();
  LB = { actors: [], running: true, last: performance.now(), cv: $("#lv"), cam: { x: 450, y: 350 }, sendT: 0 };
  LB.ctx = LB.cv.getContext("2d");
  lobbyMembers().forEach((m) => LB.actors.push(lobbyActor(m, m.you ? { x: 450, y: 380 } : { x: rand(120, 800), y: rand(230, 500) })));
  bindPad(LB.cv);
  lobbyResize();
  if (M.id === "danfo") startRadio();
  requestAnimationFrame(lobbyFrame);
}
function stopLobby() { if (LB) LB.running = false; LB = null; }
function lobbyActor(m, at) { return { m, x: at.x, y: at.y, facing: 1, bob: rand(0, 6), moving: false, tx: null, ty: null, timer: rand(0.5, 3) }; }
function lobbyArrive(m) { if (!LB) return; const a = lobbyActor(m, { x: LOBBY.gate.x, y: LOBBY.gate.y }); a.tx = rand(500, 800); a.ty = rand(250, 480); LB.actors.push(a); }
function syncLobbyActors() {
  if (!LB || !ROOM) return;
  const want = lobbyMembers();
  const key = (m) => m.netId || "bot:" + m.name;
  const have = new Map(LB.actors.map((a) => [key(a.m), a]));
  LB.actors = want.map((m) => { const a = have.get(key(m)); if (a) { a.m = m; return a; } const n = lobbyActor(m, m.you ? { x: 450, y: 380 } : { x: LOBBY.gate.x, y: LOBBY.gate.y }); if (!m.you) { n.tx = rand(500, 800); n.ty = rand(250, 480); } return n; });
}
function lobbyResize() { if (!LB) return; const r = LB.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); LB.cssW = r.width; LB.cssH = r.height; LB.cv.width = Math.round(r.width * d); LB.cv.height = Math.round(r.height * d); LB.view = r.width < 600 ? 520 : 900; LB.scale = r.width / LB.view; LB.ctx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener("resize", lobbyResize);
const nearMirror = () => { if (!LB) return false; const me2 = LB.actors.find((a) => a.m.you); return me2 && dist(me2, LOBBY.mirror) < 75; };
function lobbyFrame(ts) {
  if (!LB || !LB.running) return;
  const dt = Math.min(0.05, (ts - LB.last) / 1000 || 0); LB.last = ts;
  const wr = LOBBY.walk;
  for (const a of LB.actors) {
    a.moving = false;
    if (a.m.you) {
      if (!ov.hidden) continue;
      const [vx, vy] = inputVector();
      if (vx || vy) {
        a.x = clamp(a.x + vx * 160 * dt, wr.x, wr.x + wr.w); a.y = clamp(a.y + vy * 160 * dt, wr.y, wr.y + wr.h);
        if (Math.abs(vx) > 0.1) a.facing = vx > 0 ? 1 : -1; a.moving = true; a.bob += dt * 12;
      }
      continue;
    }
    if (a.net) { if (a.tx != null) { const k = Math.min(1, dt * 8), d = Math.hypot(a.tx - a.x, a.ty - a.y); a.x += (a.tx - a.x) * k; a.y += (a.ty - a.y) * k; a.moving = d > 2; if (a.moving) a.bob += dt * 12; } continue; }
    if (a.tx == null) { a.timer -= dt; if (a.timer <= 0) { a.tx = rand(wr.x + 20, wr.x + wr.w - 20); a.ty = rand(wr.y + 20, wr.y + wr.h - 10); } }
    else if (moveToward(a, a.tx, a.ty, 75, dt)) { a.tx = null; a.timer = rand(1.5, 5); }
  }
  const me2 = LB.actors.find((a) => a.m.you);
  if (!me2) { requestAnimationFrame(lobbyFrame); return; }
  if (ROOM && ROOM.online) { LB.sendT -= dt; if (LB.sendT <= 0) { LB.sendT = 0.16; send("lpos", { id: NET.myId, x: Math.round(me2.x), y: Math.round(me2.y), f: me2.facing, em: me2.emote && me2.emote.until > performance.now() ? me2.emote.id : null }); } }
  const viewH = LB.cssH / LB.scale;
  LB.cam.x = clamp(me2.x - LB.view / 2, -40, LOBBY.w - LB.view + 40); LB.cam.y = clamp(me2.y - 30 - viewH / 2, -40, LOBBY.h - viewH + 40);
  if (LB.view >= LOBBY.w) LB.cam.x = (LOBBY.w - LB.view) / 2;
  const ctx = LB.ctx;
  ctx.clearRect(0, 0, LB.cssW, LB.cssH);
  ctx.save(); ctx.scale(LB.scale, LB.scale); ctx.translate(-LB.cam.x, -LB.cam.y);
  drawLobby(ctx, ts);
  [...LB.actors].sort((a, b) => a.y - b.y).forEach((a) => {
    const em = a.emote && a.emote.until > performance.now() ? EMOTES.find((e) => e[0] === a.emote.id) : null;
    drawLook(ctx, a.m.look, a.x, a.y, { facing: a.facing, moving: a.moving || !!em, bob: em ? ts / 50 : a.bob, label: a.m.you ? "You" : a.m.name, labelColor: a.m.host ? "#ffb347" : a.m.friend ? "#7ff0b0" : "#fff" });
    if (em) bubble(ctx, a.x, a.y - 76, em[2]);
  });
  ctx.restore();
  drawJoy(ctx);
  const btn = $("#wardrobeBtn"); if (btn) { const near = nearMirror(); if (btn.dataset.near !== String(near)) { btn.dataset.near = near; btn.textContent = near ? "Change clothes" : "Walk to the mirror to change"; btn.disabled = !near; } }
  requestAnimationFrame(lobbyFrame);
}
// =====================================================================
// Brand ads: billboard, danfo wrap, danfo radio and round sponsor
// =====================================================================
const ADS = { ad_loading: [], ad_radio: [], ad_billboard: [], ad_wrap: [] };
const IMG = new Map();
async function loadAds() {
  if (!NET.ready) return;
  const { data } = await NET.sb.rpc("live_ads");
  if (!Array.isArray(data)) return;
  for (const k of Object.keys(ADS)) ADS[k] = data.filter((a) => a.placement === k);
}
function adImage(url) {
  if (!url) return null;
  let im = IMG.get(url);
  if (!im) { im = new Image(); im.crossOrigin = "anonymous"; im.src = url; IMG.set(url, im); }
  return im.complete && im.naturalWidth ? im : null;
}
// Ads take turns, 20 seconds each.
function currentAd(kind) { const list = ADS[kind]; return list && list.length ? list[Math.floor(Date.now() / 20000) % list.length] : null; }
function drawFit(ctx, im, x, y, w, h) { const r = Math.min(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * r, ih = im.naturalHeight * r; ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
function drawBillboard(ctx, x, y, w, h) {
  ctx.fillStyle = "#555"; ctx.fillRect(x + 14, y + h, 6, 40); ctx.fillRect(x + w - 20, y + h, 6, 40);
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  const ad = currentAd("ad_billboard");
  if (ad) {
    ctx.fillStyle = "#f4efe6"; ctx.fillRect(x, y, w, h);
    const im = adImage(ad.image_url);
    if (im) drawFit(ctx, im, x, y, w, h - 16);
    ctx.fillStyle = "rgba(20,16,8,.85)"; ctx.fillRect(x, y + h - 16, w, 16);
    text(ctx, (ad.headline || ad.brand_name).slice(0, 34), x + w / 2, y + h - 5, "700 10px Rubik, sans-serif", "#ffb347");
    text(ctx, "AD", x + w - 10, y + 10, "800 8px Rubik, sans-serif", "#141008");
  } else {
    ctx.fillStyle = "#2bd47d"; ctx.fillRect(x, y, w, h);
    text(ctx, "YOUR BRAND HERE", x + w / 2, y + h / 2 - 4, `${Math.round(h / 5)}px Bungee, sans-serif`, "#04150b");
    text(ctx, "Advertise on Naija Sus", x + w / 2, y + h / 2 + 14, "700 10px Rubik, sans-serif", "#04150b");
  }
}
function wrapAd() { return currentAd("ad_wrap"); }
function drawWrapOnSide(ctx, x, y, w, h) {
  const ad = wrapAd(); if (!ad) return;
  const im = adImage(ad.image_url);
  ctx.fillStyle = "#f4efe6"; ctx.fillRect(x + w * 0.08, y + h * 0.36, w * 0.84, h * 0.46);
  if (im) drawFit(ctx, im, x + w * 0.1, y + h * 0.38, w * 0.3, h * 0.42);
  text(ctx, (ad.headline || ad.brand_name).slice(0, 22), x + w * 0.66, y + h * 0.64, `700 ${Math.max(8, Math.round(h / 7))}px Rubik, sans-serif`, "#141008");
}
function sponsorHTML(where) {
  const ad = currentAd("ad_loading");
  if (!ad) return where === "menu" ? `<a class="sponsor empty" href="/advertise.html">Advertise your brand, business or music here</a>` : "";
  return `<a class="sponsor" href="${esc(ad.link_url || "/advertise.html")}" target="_blank" rel="noopener sponsored">${ad.image_url ? `<img src="${esc(ad.image_url)}" alt="">` : ""}<span><small>${where === "round" ? "This round is sponsored by" : "Sponsored"}</small><b>${esc(ad.brand_name)}</b>${esc(ad.headline)}</span></a>`;
}
// The danfo radio plays songs and jingles that musicians and brands paid for.
const RADIO = { el: null, idx: 0, on: false, cur: null };
function startRadio() {
  if (RADIO.on || !S().sound || !S().radio) return;
  const list = ADS.ad_radio.filter((a) => a.audio_url); if (!list.length) return;
  RADIO.on = true; playNextSong();
}
function playNextSong() {
  if (!RADIO.on) return;
  const list = ADS.ad_radio.filter((a) => a.audio_url); if (!list.length) return;
  const a = list[RADIO.idx++ % list.length]; RADIO.cur = a;
  if (!RADIO.el) { RADIO.el = new Audio(); RADIO.el.addEventListener("ended", playNextSong); RADIO.el.addEventListener("error", () => setTimeout(playNextSong, 3000)); }
  RADIO.el.src = a.audio_url; RADIO.el.volume = 0.28; RADIO.el.play().catch(() => {});
  toast(`Now playing on the radio: ${a.artist ? a.artist + " - " : ""}${a.song_title || a.headline} (sponsored)`);
}
function stopRadio() { RADIO.on = false; RADIO.cur = null; if (RADIO.el) RADIO.el.pause(); }

// =====================================================================
// Shop: in-game purchases paid with Paystack
// =====================================================================
const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
function priceOf(id) { const it = ITEMS.find((i) => i.id === id); return it ? naira(it.price) : ""; }
function owns(id) {
  const now = Date.now();
  return (DATA.purchases || []).some(({ item, at }) => {
    if (item === "vip") return true;
    if (item === id) return id !== "pro_rooms" || now - new Date(at).getTime() < 30 * 864e5;
    return (INCLUDES[item] || []).includes(id) && id !== "pro_rooms";
  });
}
async function loadPurchases() {
  if (!NET.ready) return;
  const { data } = await NET.sb.rpc("my_purchases", { p_device: DATA.deviceId });
  if (Array.isArray(data)) { DATA.purchases = data.map((r) => ({ item: r.item_id, at: r.created_at })); save(); }
}
// If something you equipped is no longer yours (for example Pro expired), put the free version back.
function tidyLook() {
  for (const [k, v] of Object.entries(DATA.look)) { const item = PREMIUM[`${k}:${v}`]; if (item && !owns(item)) DATA.look[k] = DEFAULT_LOOK[k] || (k === "pet" || k === "tag" ? "none" : k === "bag" ? "gmg" : FREE_FABRIC[0]); }
  save();
}
let shopFocus = null, shopMsg = "";
function openShop(id) { shopFocus = id || null; shopMsg = ""; closeModal(); if (G) { toast("Open the shop from the main menu after this round."); return; } go("shop"); }
function shopHTML() {
  const payReady = !!NET.cfg.paystackPublicKey;
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">Shop</h2></div>
    <p class="small muted" style="margin:0">Everything here is for style or hosting. Nothing you buy makes you win, so the game stays fair.</p>
    ${payReady ? `<div><label class="label" for="payEmail">Email for your receipt</label><input class="field" id="payEmail" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(DATA.email)}"></div>`
      : `<p class="sim-note">Payments aren't switched on yet. The shop opens as soon as the Paystack keys are added.</p>`}
    <p class="small" id="shopMsg" role="status" style="margin:0;color:var(--green)">${esc(shopMsg)}</p>
    <div class="shop-list">${ITEMS.map((it) => { const have = owns(it.id); return `<article class="shop-item ${shopFocus === it.id ? "focus" : ""}" id="item-${it.id}">
      <div><span class="chip ${it.id === "vip" ? "gold" : it.id === "mega_bundle" ? "green" : ""}">${esc(it.tag)}</span><strong>${esc(it.name)}</strong><p class="small muted" style="margin:0">${esc(it.desc)}</p></div>
      <button class="btn ${have ? "btn-ghost" : ""}" data-buy="${it.id}" ${have || !payReady ? "disabled" : ""}>${have ? "Owned" : naira(it.price)}</button></article>`; }).join("")}</div>
    ${isSignedIn() ? `<p class="tiny muted" style="margin:0">Signed in as ${esc(displayName())}. Everything you buy is saved to your account.</p><button class="linkish" data-act="restore">Refresh my items</button>` : `<p class="tiny muted" style="margin:0">${NET.ready ? `<button class="linkish" data-go="account" style="padding:0">Sign up or log in</button> so your items follow you to any phone.` : ""}</p><button class="linkish" data-act="restore">Bought something on this phone before? Refresh my items</button>`}
    <a class="sponsor empty" href="/advertise.html">Own a brand, business or song? Advertise inside the game from ₦10,000 a week</a>
  </section>`;
}
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function buy(id) {
  const it = ITEMS.find((i) => i.id === id); if (!it) return;
  const msg = (t, bad) => { const el = $("#shopMsg"); if (el) { el.textContent = t; el.style.color = bad ? "#ffc4c4" : "var(--green)"; } };
  const email = ($("#payEmail") || {}).value || "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg("Add your email so Paystack can send your receipt.", true); $("#payEmail") && $("#payEmail").focus(); return; }
  DATA.email = email.trim(); save();
  try { await loadScript("https://js.paystack.co/v1/inline.js"); } catch (e) { msg("Couldn't load Paystack. Check your internet.", true); return; }
  const ref = `NS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const handler = window.PaystackPop.setup({
    key: NET.cfg.paystackPublicKey, email: DATA.email, amount: it.price * 100, currency: "NGN", ref,
    metadata: { kind: "item", item_id: it.id, device_id: DATA.deviceId, user_id: isSignedIn() ? ACCT.user.id : null, custom_fields: [{ display_name: "Item", variable_name: "item", value: it.name }] },
    callback: (resp) => { verifyPayment(resp.reference, it, msg); },
    onClose: () => msg("Payment window closed. You were not charged.", true),
  });
  handler.openIframe();
}
async function verifyPayment(reference, it, msg) {
  msg("Confirming your payment...");
  try {
    const r = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) });
    const j = await r.json();
    if (!j.ok) { msg(j.error || "We couldn't confirm the payment yet. Tap refresh in a minute.", true); return; }
    await loadPurchases();
    if (!owns(it.id)) DATA.purchases = [...(DATA.purchases || []), { item: it.id, at: new Date().toISOString() }];
    save(); sfx("win"); shopMsg = `${it.name} is yours. Enjoy!`; shopFocus = it.id; renderMenu();
  } catch (e) { msg("Payment went through but we couldn't confirm it. Tap refresh in a minute.", true); }
}

// =====================================================================
// Proximity voice between real players (WebRTC, signalled through the room)
// =====================================================================
const RTC = { peers: new Map(), stream: null, ac: null };
// STUN by default. /api/ice adds a relay (TURN) server when one is set up, so
// players on strict mobile networks can still hear each other.
let ICE = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
async function loadIce() { try { const r = await fetch("/api/ice", { cache: "no-store" }); if (r.ok) { const j = await r.json(); if (Array.isArray(j.iceServers) && j.iceServers.length) ICE = j.iceServers; } } catch (e) { /* keep STUN */ } }
// Mic settings tuned for talking: one channel, echo and background noise removed, level evened out.
const MIC_CONSTRAINTS = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000, sampleSize: 16 } };
// Ask Opus (the voice codec) to fill in lost packets, stay mono, and use enough bits for clear speech.
// 28 kbps is clear for voice and light enough to send to 14 other players on mobile data. Silence costs almost nothing (DTX).
function tuneSdp(sdp) {
  const m = sdp.match(/a=rtpmap:(\d+) opus\/48000[^\r\n]*/i); if (!m) return sdp;
  const pt = m[1], want = { useinbandfec: "1", usedtx: "1", stereo: "0", "sprop-stereo": "0", maxaveragebitrate: "28000", maxplaybackrate: "48000", minptime: "10" };
  const re = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  if (re.test(sdp)) return sdp.replace(re, (_, params) => {
    const cur = Object.fromEntries(params.split(";").map((s) => s.trim()).filter(Boolean).map((s) => s.split("=")));
    return `a=fmtp:${pt} ` + Object.entries({ ...cur, ...want }).map(([k, v]) => `${k}=${v}`).join(";");
  });
  return sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ` + Object.entries(want).map(([k, v]) => `${k}=${v}`).join(";"));
}
async function tuneSenders(pc) {
  for (const s of pc.getSenders()) {
    if (!s.track || s.track.kind !== "audio") continue;
    try { const prm = s.getParameters(); if (!prm.encodings || !prm.encodings.length) prm.encodings = [{}]; prm.encodings.forEach((e) => { e.maxBitrate = 28000; e.priority = "high"; e.networkPriority = "high"; }); await s.setParameters(prm); } catch (e) { /* browser keeps its defaults */ }
  }
}
function addMic(pc, stream) {
  const senders = pc.getSenders();
  for (const t of stream.getAudioTracks()) {
    const free = senders.find((s) => !s.track);
    if (senders.some((s) => s.track === t)) continue;
    if (free) free.replaceTrack(t).catch(() => {}); else pc.addTrack(t, stream);
  }
  tuneSenders(pc);
}
function rtcPeer(id) {
  let p = RTC.peers.get(id);
  if (p) return p;
  const pc = new RTCPeerConnection({ iceServers: ICE, bundlePolicy: "max-bundle" });
  p = { pc, polite: NET.myId > id, makingOffer: false, ignore: false, audio: null, vol: 0, an: null, buf: null, talkingAt: 0 };
  RTC.peers.set(id, p);
  pc.onicecandidate = ({ candidate }) => { if (candidate) send("rtc", { from: NET.myId, to: id, cand: candidate.toJSON() }); };
  pc.onnegotiationneeded = async () => {
    try {
      p.makingOffer = true;
      const offer = await pc.createOffer(); if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription({ type: "offer", sdp: tuneSdp(offer.sdp) });
      send("rtc", { from: NET.myId, to: id, desc: pc.localDescription.toJSON() });
    } catch (e) { /* retried on next change */ } finally { p.makingOffer = false; }
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") tuneSenders(pc);
    if (pc.connectionState === "failed") { try { pc.restartIce(); } catch (e) { /* no voice with this player */ } }
  };
  pc.ontrack = ({ streams }) => {
    if (!p.audio) { p.audio = new Audio(); p.audio.autoplay = true; p.audio.playsInline = true; }
    p.audio.srcObject = streams[0]; p.audio.volume = 0; p.audio.play().catch(() => {});
    // A level meter so we can show who is talking.
    try { const ac = audioCtx(); const an = ac.createAnalyser(); an.fftSize = 256; ac.createMediaStreamSource(streams[0]).connect(an); p.an = an; p.buf = new Uint8Array(an.fftSize); } catch (e) { /* no meter */ }
  };
  if (RTC.stream && me && me.alive) addMic(pc, RTC.stream);
  return p;
}
function audioCtx() { if (!RTC.ac) RTC.ac = new (window.AudioContext || window.webkitAudioContext)(); if (RTC.ac.state === "suspended") RTC.ac.resume().catch(() => {}); return RTC.ac; }
// Phones block sound until the player taps something. Every tap retries playback.
function unlockVoice() { for (const p of RTC.peers.values()) if (p.audio && p.audio.paused) p.audio.play().catch(() => {}); if (RTC.ac && RTC.ac.state === "suspended") RTC.ac.resume().catch(() => {}); }
async function rtcSignal({ from, desc, cand }) {
  if (!NET.online) return;
  const p = rtcPeer(from), pc = p.pc;
  try {
    if (desc) {
      const collision = desc.type === "offer" && (p.makingOffer || pc.signalingState !== "stable");
      p.ignore = !p.polite && collision; if (p.ignore) return;
      await pc.setRemoteDescription(desc);
      if (desc.type === "offer") {
        const ans = await pc.createAnswer();
        await pc.setLocalDescription({ type: "answer", sdp: tuneSdp(ans.sdp) });
        send("rtc", { from: NET.myId, to: from, desc: pc.localDescription.toJSON() });
      }
    } else if (cand) { try { await pc.addIceCandidate(cand); } catch (e) { if (!p.ignore) throw e; } }
  } catch (e) { /* a failed connection just means no voice with that player */ }
}
function rtcStart(stream) {
  RTC.stream = stream;
  if (!NET.online || !G) return;
  for (const p of P) if (p.netId && !p.you && !p.isBot) addMic(rtcPeer(p.netId).pc, stream);
}
// Stop sending our voice to everyone (the connections stay up so we can still listen).
function rtcMute() { for (const p of RTC.peers.values()) for (const s of p.pc.getSenders()) if (s.track && s.track.kind === "audio") s.replaceTrack(null).catch(() => {}); }
function rtcClose() { for (const p of RTC.peers.values()) { try { p.pc.close(); if (p.audio) { p.audio.pause(); p.audio.srcObject = null; } } catch (e) { /* ignore */ } } RTC.peers.clear(); RTC.stream = null; }
// Full volume up close, fading smoothly to nothing at the edge of the circle.
// Walls block it. Players who are out of the round can't be heard at all.
function voiceLevel(d) { const near = VOICE_R * 0.35; if (d <= near) return 1; if (d >= VOICE_R) return 0; const x = 1 - (d - near) / (VOICE_R - near); return x * x * (3 - 2 * x); }
function rtcVolumes() {
  if (!RTC.peers.size || !G || !me) return;
  const now = performance.now();
  for (const [id, peer] of RTC.peers) {
    if (!peer.audio) continue;
    const sp = P.find((p) => p.netId === id);
    let v = 0;
    if (sp && sp.alive && S().voice) {
      if (G.mode === "meeting") v = 1;
      else if (areaOf(sp) === areaOf(me)) v = voiceLevel(dist(me, sp));
    }
    peer.vol += (v - peer.vol) * 0.25; if (Math.abs(peer.vol - v) < 0.01) peer.vol = v;
    peer.audio.volume = clamp(peer.vol, 0, 1);
    if (peer.an && sp) {
      peer.an.getByteTimeDomainData(peer.buf); let sum = 0; for (const b of peer.buf) { const x = (b - 128) / 128; sum += x * x; }
      if (Math.sqrt(sum / peer.buf.length) > 0.04 && v > 0.05) sp.talkingAt = now;
    }
  }
}
// Once you're out (phone stolen or voted out) your mic is off for the rest of the round.
function silenceTheOut() {
  if (!G || !me || me.alive) return;
  if (G.mic || RTC.stream) { stopMic(); rtcMute(); lastActionsKey = ""; toast("You're out of the round, so your mic is off until the next one.", "bad"); }
}

function drawLobby(ctx, ts) {
  const L = LOBBY, park = M.id === "danfo";
  ctx.fillStyle = "#1b2a1c"; ctx.fillRect(-300, -300, L.w + 600, L.h + 600);
  ctx.fillStyle = park ? "#34343a" : "#4a463e"; ctx.fillRect(20, 20, L.w - 40, L.h - 40);
  if (park) {
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3; for (let x = 120; x < 860; x += 140) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 520); ctx.stroke(); }
    drawDanfoSide(ctx, 300, 40, 380, 110);
    text(ctx, "LOADING: OSHODI - CMS", 490, 30, "14px Bungee, sans-serif", "#ffb347");
    ctx.fillStyle = "#6b4a2a"; ctx.fillRect(700, 190, 90, 40); text(ctx, "MAI SHAYI", 745, 215, "11px Bungee, sans-serif", "#f4efe6");
  } else {
    ctx.fillStyle = "#c9b28a"; ctx.fillRect(20, 20, L.w - 40, 130);
    ctx.fillStyle = "#6b4a2a"; ctx.fillRect(400, 60, 80, 90);
    ctx.fillStyle = "#7fb4d6"; [[300, 60], [540, 60], [660, 60]].forEach(([x, y]) => { ctx.fillRect(x, y, 60, 46); ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 4; ctx.strokeRect(x, y, 60, 46); });
    text(ctx, "COMPOUND 14", 440, 48, "14px Bungee, sans-serif", "#6b3a06");
    ctx.fillStyle = "#e94b4b"; [[640, 260], [690, 260]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); });
    drawBillboard(ctx, 712, 168, 140, 64);
    ctx.fillStyle = "#2d6cdf"; ctx.fillRect(630, 280, 75, 30);
  }
  // fence + entrance gate on the right
  ctx.strokeStyle = "#5c5a55"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(L.w - 20, 20); ctx.lineTo(L.w - 20, 320); ctx.moveTo(L.w - 20, 400); ctx.lineTo(L.w - 20, L.h - 20); ctx.lineTo(20, L.h - 20); ctx.lineTo(20, 20); ctx.stroke();
  // notice board with the room code
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(560, 160, 120, 4); ctx.fillStyle = "#3a2a1a"; ctx.fillRect(555, 168, 130, 62); ctx.fillStyle = "#f4efe6"; ctx.fillRect(561, 174, 118, 50);
  text(ctx, ROOM && ROOM.code ? "ROOM CODE" : "ROOM", 620, 192, "10px Bungee, sans-serif", "#6b3a06");
  text(ctx, ROOM ? (ROOM.code ? fmtCode(ROOM.code) : `${ROOM.members.length}/${ROOM.max} PLAYERS`) : "", 620, 214, "13px Bungee, sans-serif", "#1b1b1b");
  // tailor stall with mirror
  ctx.fillStyle = "#8a3e36"; ctx.fillRect(60, 40, 200, 26); ctx.fillStyle = "#f4efe6"; text(ctx, park ? "OKRIKA STAND" : "MAMA TAILOR", 160, 59, "12px Bungee, sans-serif", "#f4efe6");
  ctx.fillStyle = "#5a4030"; ctx.fillRect(64, 66, 8, 110); ctx.fillRect(248, 66, 8, 110);
  ctx.strokeStyle = "#999"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, 90); ctx.lineTo(250, 90); ctx.stroke();
  ["#e94b4b", "#2bd47d", "#f5e663", "#8e6cf0", "#3ec1d3", "#ff7ab6"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(90 + i * 26, 92); ctx.lineTo(108 + i * 26, 92); ctx.lineTo(112 + i * 26, 125); ctx.lineTo(86 + i * 26, 125); ctx.fill(); });
  const glow = REDUCED ? 0.5 : 0.5 + Math.sin(ts / 300) * 0.25;
  ctx.fillStyle = `rgba(255,179,71,${0.18 * glow + 0.1})`; ctx.beginPath(); ctx.ellipse(L.mirror.x, L.mirror.y + 14, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c9a26a"; ctx.fillRect(L.mirror.x - 22, 128, 44, 64); ctx.fillStyle = "#b9e3f5"; ctx.fillRect(L.mirror.x - 17, 133, 34, 54);
  ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(L.mirror.x - 12, 138, 5, 30);
  text(ctx, "MIRROR", L.mirror.x, L.mirror.y + 38, "10px Bungee, sans-serif", "#ffb347");
  text(ctx, "ENTRANCE", L.w - 60, 395, "10px Bungee, sans-serif", "rgba(255,255,255,.5)");
}

// =====================================================================
// Joystick + keyboard (shared by lobby and game)
// =====================================================================
const keys = new Set();
let joy = null;
function bindPad(canvas) {
  canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); const r = canvas.getBoundingClientRect(); joy = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX - r.left, y: e.clientY - r.top }; });
  canvas.addEventListener("pointermove", (e) => { if (!joy || joy.id !== e.pointerId) return; const r = canvas.getBoundingClientRect(); joy.x = e.clientX - r.left; joy.y = e.clientY - r.top; });
  const end = (e) => { if (joy && joy.id === e.pointerId) joy = null; };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
}
function inputVector() {
  let vx = 0, vy = 0;
  if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
  if (keys.has("arrowright") || keys.has("d")) vx += 1;
  if (keys.has("arrowup") || keys.has("w")) vy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vy += 1;
  if (joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy); if (l > 8) { const m = Math.min(1, l / 45); vx = (dx / l) * m; vy = (dy / l) * m; } }
  const l = Math.hypot(vx, vy); if (l > 1) { vx /= l; vy /= l; }
  return [vx, vy];
}
function drawJoy(ctx) {
  if (!joy) return;
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 45, 0, Math.PI * 2); ctx.stroke();
  const dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy), m = Math.min(45, l);
  ctx.fillStyle = "rgba(255,179,71,.7)"; ctx.beginPath(); ctx.arc(joy.ox + (l ? dx / l * m : 0), joy.oy + (l ? dy / l * m : 0), 18, 0, Math.PI * 2); ctx.fill();
}
const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const inLobby = LB && screen === "room" && ov.hidden;
  const inGame = G && G.mode === "play" && !G.paused;
  if (!inLobby && !inGame) return;
  if (e.target.tagName === "INPUT") return;
  if (MOVE_KEYS.includes(k)) { keys.add(k); e.preventDefault(); }
  if (inLobby && k === "e" && nearMirror()) wardrobeModal();
  if (inGame) { if (k === "e") doUse(); if (k === "r") doReport(); if (k === "q") doSteal(); if (k === "l") doLights(); if (k === "f") doFake(); if (k === "g") doAbility(); }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

// =====================================================================
// Menu screens
// =====================================================================
const root = $("#root");
let screen = "menu", custTab = "outfit", resetArmed = false, practice = false, menuMsg = "";
const priv = { name: "", max: 8, thieves: 2, err: "", meet: 120 };
function toastMenu(msg) { menuMsg = msg; if (screen === "servers" || screen === "menu") renderMenu(); }
function displayName() { return (ACCT.profile && ACCT.profile.username) || DATA.name.trim() || "Player"; }
function setMode(id) { DATA.mode = id; M = MAPS[id]; save(); if (serversMode !== id) SERVERS = []; }
function go(s) {
  if (s !== "room") { if (!(ROOM && ROOM.online)) clearRoomTimer(); stopLobby(); stopRadio(); }
  if (s !== "servers") stopServerTicks();
  screen = s;
  if (s === "room") renderLobbyScreen(); else renderMenu();
  window.scrollTo(0, 0);
}
function renderMenu() {
  G = null; stopGameLoop(); startBg();
  const views = { menu: menuHTML, modes: modesHTML, servers: serversHTML, private: privateHTML, customize: customizeHTML, friends: friendsHTML, settings: settingsHTML, shop: shopHTML, account: accountHTML };
  root.innerHTML = `<div class="menu-shell"><div class="menu">${(views[screen] || menuHTML)()}</div></div>`;
  if (screen === "menu") $("#mePic").appendChild(portrait(DATA.look, 56, 70));
  if (screen === "account" && $("#acctPic")) $("#acctPic").appendChild(portrait(myLook(), 84, 104));
  if (screen === "modes") fillModes();
  if (screen === "customize") fillCustomize();
  if (screen === "friends") fillFriends();
  if (screen === "servers" && !serverTimer) serverTimer = setInterval(() => (NET.ready && !practice ? fetchRooms() : tickServers()), NET.ready && !practice ? 5000 : 2500);
  if (screen === "servers" && NET.ready && !practice && !roomsLoaded) fetchRooms();
  if (screen === "shop" && shopFocus) { const el = $(`#item-${shopFocus}`); if (el) el.scrollIntoView({ block: "center" }); }
  menuMsg = "";
}
function menuHTML() {
  const invited = DATA.friends.filter((f) => f.invited).length;
  return `<header class="logo"><p class="eyebrow">Somebody among us is stealing phones</p><h1 class="display">Naija <span>Sus</span></h1><p>Find the thief before your phone don miss.</p></header>
    <div class="me-card"><div id="mePic" aria-hidden="true"></div>
      <div><strong>${esc(displayName())}</strong><span class="small muted">${isSignedIn() ? `Signed in${ACCT.profile && ACCT.profile.games_played ? ` · ${plural(ACCT.profile.games_played, "game", "games")}` : ""}` : NET.ready ? "Guest · sign up to keep your stuff" : invited ? `${plural(invited, "friend", "friends")} invited` : "Ready to play"}</span></div>
      <div class="me-btns"><button class="btn btn-ghost btn-sm" data-go="customize">Edit</button>${NET.ready ? `<button class="btn btn-sm ${isSignedIn() ? "btn-ghost" : ""}" data-go="account">${isSignedIn() ? "Account" : "Sign up"}</button>` : ""}</div></div>
    <button class="btn btn-block play-btn" data-go="servers"><b>Play</b><small>${NET.ready ? "Online" : "Offline practice"} · ${esc(M.title)}</small></button>
    <nav class="menu-grid" aria-label="Main menu">
      <button class="tile" data-go="modes">${ICONS.bus}Game modes</button>
      <button class="tile" data-go="customize">${ICONS.shirt}Customize</button>
      <button class="tile shop-tile" data-go="shop">${ICONS.bag}Shop</button>
      <button class="tile" data-go="friends">${ICONS.friends}Friends</button>
    </nav>
    ${sponsorHTML("menu")}
    <p class="foot" style="margin:0"><button class="linkish" data-act="music" aria-pressed="${S().music}">${S().music ? "Music on" : "Music off"}</button> · <button class="linkish" data-act="how">How to play</button> · <button class="linkish" data-go="settings">Settings</button>${NET.ready ? ` · <button class="linkish" data-go="account">${isSignedIn() ? "Account" : "Log in"}</button>` : ""} · <a class="linkish" href="/advertise.html">Advertise</a></p>`;
}
function modesHTML() {
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">Game modes</h2></div>
    ${MODES.map((id) => { const m = MAPS[id]; return `<div class="mode-card" aria-pressed="${DATA.mode === id}"><span data-mpic="${id}"></span>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><strong>${m.title}</strong>${DATA.mode === id ? `<span class="chip gold">Selected</span>` : ""}</div>
      <p class="small muted" style="margin:0">${m.tagline} ${Object.keys(m.rooms).length} areas, ${m.spotIds.length} chores.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-ghost" data-mode="${id}">${DATA.mode === id ? "Selected" : "Select"}</button><button class="btn" data-modeplay="${id}">Play ${m.title}</button></div></div>`; }).join("")}
  </section>`;
}
function fillModes() {
  document.querySelectorAll("[data-mpic]").forEach((el) => {
    const m = MAPS[el.dataset.mpic], c = document.createElement("canvas"), d = Math.min(2, devicePixelRatio || 1), w = 480, h = 270;
    c.width = w * d; c.height = h * d;
    const ctx = c.getContext("2d"), sc = Math.min(w / (m.world.w + 80), h / (m.world.h + 80));
    ctx.scale(d, d); ctx.fillStyle = "#0d1018"; ctx.fillRect(0, 0, w, h);
    ctx.translate((w - m.world.w * sc) / 2, (h - m.world.h * sc) / 2); ctx.scale(sc, sc);
    const prev = M; M = m; drawMap(ctx, m); M = prev;
    el.replaceWith(c);
  });
}
function onlineRows() {
  if (roomsErr) return `<p class="small" style="margin:6px 0;color:#ffc4c4">${esc(roomsErr)}</p><button class="btn btn-ghost btn-block" data-act="practice">Play offline practice instead</button>`;
  if (!roomsLoaded) return `<p class="small muted" style="text-align:center;margin:10px 0">Finding servers...</p>`;
  const list = onlineFiltered();
  if (!list.length) return `<p class="small muted" style="margin:6px 0;text-align:center">No servers match${srvQuery ? ` "${esc(srvQuery)}"` : " your filters"}.</p><button class="btn btn-ghost btn-block" data-act="clearfilters">Clear search and filters</button>`;
  const shown = list.slice(0, srvPage * PAGE), busy = ONLINE_ROOMS.filter((r) => r.player_count > 0).length;
  return `<p class="tiny muted" style="margin:0">${plural(list.length, "server", "servers")}${list.length !== ONLINE_ROOMS.length ? ` of ${ONLINE_ROOMS.length}` : ""} · ${busy ? `${plural(busy, "has", "have")} players right now` : "be the first to start one"}</p>` + shown.map((r) => {
    const full = r.player_count >= r.max_players, playing = r.status === "playing";
    return `<article class="server"><div style="min-width:0"><strong>${esc(r.name)}</strong>
      <div class="meta"><span>${r.player_count ? `Host: ${esc(r.host_name || "someone")}` : "Empty, be the first"}</span><span>${esc(r.region || "Players")}</span><span>${NET.ping} ms</span>${r.is_official ? "" : "<span>Player room</span>"}</div>
      <div class="chips"><span class="chip red">${plural(r.thieves, "thief", "thieves")}</span><span class="chip">${r.max_players} players</span>${playing ? `<span class="chip gold">In a round</span>` : ""}</div></div>
      <div class="server-right"><span class="count ${full ? "full" : ""}" aria-label="${r.player_count} of ${r.max_players} real players inside">${ICONS.person}${r.player_count}/${r.max_players}</span>
      <button class="btn btn-sm ${full ? "" : "btn-green"}" data-join="${r.id}" ${full ? "disabled" : ""}>${full ? "Full" : playing ? "Wait" : "Join"}</button></div></article>`;
  }).join("") + (list.length > shown.length ? `<button class="btn btn-ghost btn-block" data-act="more">Show more servers (${list.length - shown.length} left)</button>` : "");
}
function onlineFiltered() {
  const q = srvQuery.trim().toLowerCase();
  return ONLINE_ROOMS.filter((r) => (filters.players === "any" || r.max_players === Number(filters.players)) && (filters.thieves === "any" || r.thieves === Number(filters.thieves))
    && (filters.region === "any" || (r.region || "Players") === filters.region) && (!q || r.name.toLowerCase().includes(q) || (r.region || "").toLowerCase().includes(q)));
}
function serverRows() {
  if (NET.ready && !practice) return onlineRows();
  const list = filteredServers();
  if (!list.length) return `<p class="small muted" style="margin:6px 0;text-align:center">No servers match your filters.</p><button class="btn btn-ghost btn-block" data-act="clearfilters">Clear filters</button>`;
  return list.map((s) => {
    const full = s.players >= s.max;
    return `<article class="server"><div style="min-width:0"><strong>${esc(s.name)}</strong>
      <div class="meta"><span>Host: ${esc(s.host)}</span><span>${s.ping} ms</span></div>
      <div class="chips"><span class="chip red">${plural(s.thieves, "thief", "thieves")}</span><span class="chip">${s.max} players</span></div></div>
      <div class="server-right"><span class="count ${full ? "full" : ""}" aria-label="${s.players} of ${s.max} players inside">${ICONS.person}${s.players}/${s.max}</span>
      <button class="btn btn-sm ${full ? "" : "btn-green"}" data-join="${s.id}" ${full ? "disabled" : ""}>${full ? "Full" : "Join"}</button></div></article>`;
  }).join("");
}
function serversHTML() {
  const online = NET.ready && !practice;
  if (!online && (!SERVERS.length || serversMode !== DATA.mode)) makeServers();
  const active = (filters.players !== "any") + (filters.thieves !== "any") + (filters.region !== "any");
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">${esc(M.title)} ${online ? "servers" : "practice"}</h2><button class="back" data-act="refresh" aria-label="Refresh servers">${ICONS.refresh}</button></div>
    ${menuMsg ? `<p class="small" style="margin:0;color:#ffc4c4">${esc(menuMsg)}</p>` : ""}
    <div class="server-actions">
      <button class="btn" data-act="quick">${ICONS.dice}Quick join</button>
      <button class="btn btn-ghost ${active ? "filter-on" : ""}" data-act="filter">${ICONS.filter}Filter${active ? ` (${active})` : ""}</button>
      <button class="btn btn-ghost" data-go="private">${ICONS.lock}Private</button>
    </div>
    <p class="sim-note">${online ? `Live servers. The count shows real players inside. Empty seats are filled by computer players when a round starts. <button class="linkish" data-act="practice" style="padding:0">Practice offline</button>`
      : `${NET.ready ? "Offline practice: everyone here is a computer player." : "You're offline, so this is practice with computer players."} ${NET.ready ? `<button class="linkish" data-act="online" style="padding:0">Back to online servers</button>` : ""}`} · <button class="linkish" data-go="modes" style="padding:0">Change mode</button></p>
    ${online ? `<div><label for="srvSearch" class="sr">Search servers</label><input class="field" id="srvSearch" type="search" autocomplete="off" placeholder="Search by area or route, e.g. Yaba, Oshodi" value="${esc(srvQuery)}"></div>` : ""}
    <div class="server-list" id="serverList">${serverRows()}</div>
  </section>`;
}
function filterModal() {
  const row = (key, opts) => `<div class="chips-row" role="group">${opts.map((v) => `<button class="pick" aria-pressed="${String(filters[key]) === String(v)}" data-filter="${key}" data-v="${v}">${v === "any" ? "Any" : v}</button>`).join("")}</div>`;
  openModal(`<div class="modal-head"><h2 class="display" id="mtitle">Filter servers</h2><button class="x" data-act="close" aria-label="Close">✕</button></div>
    <div><p class="label">Number of players</p>${row("players", ["any", 5, 6, 7, 8, 9, 10, 12])}</div>
    <div><p class="label">Number of thieves</p>${row("thieves", ["any", 1, 2, 3])}</div>
    ${NET.ready && !practice ? `<div><p class="label">Area</p>${row("region", ["any", ...[...new Set(ONLINE_ROOMS.map((r) => r.region || "Players"))].sort()])}</div>` : ""}
    <p class="small muted" style="margin:0" id="fcount">${plural(filterCount(), "server matches", "servers match")}.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-ghost" data-act="clearfilters">Clear</button><button class="btn" data-act="applyfilters" data-focus>Show servers</button></div>`);
}
function privateHTML() {
  if (!priv.name) priv.name = `${displayName()}'s room`;
  const pro = owns("pro_rooms");
  if (!pro) { priv.max = Math.min(priv.max, 10); priv.meet = 120; }
  priv.thieves = Math.min(priv.thieves, maxThieves(priv.max));
  const inv = DATA.friends.filter((f) => f.invited), online = NET.ready && !practice;
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="servers" aria-label="Back">←</button><h2 class="display">Private room</h2></div>
    <h3 class="eyebrow">Create a room for your friends</h3>
    <div><p class="label">Mode</p><div class="chips-row">${MODES.map((id) => `<button class="pick" aria-pressed="${DATA.mode === id}" data-pmode="${id}">${MAPS[id].title}</button>`).join("")}</div></div>
    <div><label class="label" for="pname">Room name</label><input class="field" id="pname" maxlength="24" value="${esc(priv.name)}"></div>
    <div><p class="label">Players</p><div class="chips-row">${[5, 6, 7, 8, 9, 10, 12, 15].map((n) => n > 10 && !pro ? `<button class="pick" data-lockpick="pro_rooms">${n} · Pro</button>` : `<button class="pick" aria-pressed="${priv.max === n}" data-priv="max" data-v="${n}">${n}</button>`).join("")}</div></div>
    <div><p class="label">Meeting length</p><div class="chips-row"><button class="pick" aria-pressed="${priv.meet === 120}" data-priv="meet" data-v="120">2 minutes</button>${pro ? `<button class="pick" aria-pressed="${priv.meet === 180}" data-priv="meet" data-v="180">3 minutes</button>` : `<button class="pick" data-lockpick="pro_rooms">3 minutes · Pro</button>`}</div></div>
    <div><p class="label">Thieves</p><div class="chips-row">${[1, 2, 3].map((n) => `<button class="pick" aria-pressed="${priv.thieves === n}" data-priv="thieves" data-v="${n}" ${n > maxThieves(priv.max) ? "disabled" : ""}>${n}</button>`).join("")}</div>
      <p class="tiny muted" style="margin:6px 0 0">${priv.max <= 6 ? "5 to 6 players allow 1 thief." : priv.max <= 8 ? "7 to 8 players allow up to 2 thieves." : "9 to 10 players allow up to 3 thieves."}</p></div>
    <p class="small muted" style="margin:0">${online ? "You'll get a code to send your friends on WhatsApp. They type it in here to join you." : inv.length ? `Invited friends joining: ${inv.map((f) => esc(f.name)).join(", ")}.` : "No friends invited yet. You can invite them from the Friends menu."}</p>
    <p class="small" style="margin:0;color:#ffc4c4">${esc(priv.err)}</p>
    <button class="btn btn-block" data-act="create">Create room and get code</button>
    <div class="divider"></div>
    <h3 class="eyebrow">Join with a code</h3>
    <form id="codeForm" class="add-row" autocomplete="off"><label for="codeIn" class="sr">Room code</label><input class="field" id="codeIn" maxlength="7" placeholder="K7Q-X2M" style="text-transform:uppercase;letter-spacing:2px"><button class="btn" type="submit">Join</button></form>
    <p class="small" id="codeErr" role="status" style="margin:-6px 0 0;color:#ffc4c4"></p>
    ${DATA.rooms.length ? `<div><p class="label">Your rooms</p><div class="chips-row">${DATA.rooms.map((r) => `<button class="pick" data-recent="${r.code}">${fmtCode(r.code)} · ${MAPS[r.mode] ? MAPS[r.mode].title : "Compound"} · ${r.max}p</button>`).join("")}</div></div>` : ""}
  </section>`;
}

// ---------- Lobby screen ----------
function renderLobbyScreen() {
  G = null; stopGameLoop(); stopBg();
  const r = ROOM;
  root.innerHTML = `<div class="wrap">
    <div class="lobby-head"><button class="back" data-act="leave" aria-label="Leave room">←</button><h2 class="display">${esc(r.name)}</h2></div>
    <div class="chips-row"><span class="chip gold">${esc(M.title)}</span><span class="chip">${r.kind === "private" ? "Private" : "Public"}</span><span class="chip">${r.max} players</span><span class="chip red">${plural(r.thieves, "thief", "thieves")}</span><span class="chip green">Roles are random</span></div>
    <div class="stage short"><canvas id="lv" aria-label="Lobby. Drag to walk around."></canvas><div class="hint">Drag to walk. Visit the mirror to change your clothes.</div></div>
    <div class="actions"><button class="btn" id="wardrobeBtn" data-act="wardrobe" disabled>Walk to the mirror to change</button><button class="btn btn-ghost" data-act="emote">Emote</button></div>
    <div class="panel" id="lobbyPanel"></div>
    ${r.code ? `<div class="code"><div><p class="tiny muted" style="margin:0">Room code</p><b>${fmtCode(r.code)}</b></div><div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" data-act="copyroom">Copy</button>${r.online ? `<button class="btn btn-green btn-sm" data-act="share">Share</button>` : ""}</div></div><p class="tiny muted" id="copyMsg" role="status" style="margin:-8px 0 0"></p>` : ""}
    <p class="sim-note">${r.online ? "Live room. Everyone you see with a name in white or gold is a real player. Computer players fill empty seats when the round starts." : "Offline practice: everyone here is a computer player."}</p>
  </div>`;
  startLobby();
  renderLobbyPanel();
  if (!roomTimer) roomTimer = setInterval(roomTick, 1000);
}
function renderLobbyPanel() {
  const r = ROOM, el = $("#lobbyPanel"); if (!el || !r) return;
  const all = lobbyMembers(), n = all.length, full = n >= r.max;
  let status;
  if (r.online && NET.waiting) status = `<p class="status">A round is going on in this room.</p><p class="tiny muted" style="margin:0;text-align:center">You'll play in the next round. Walk around and get dressed while you wait.</p>`;
  else if (r.countdown != null) status = `<p class="status go">Starting in ${r.countdown}...</p>${r.online && r.kind === "public" ? `<p class="tiny muted" style="margin:0;text-align:center">${NET.humans.length} real ${NET.humans.length === 1 ? "player" : "players"} here. Computer players will fill the empty seats.</p>` : ""}`;
  else if (r.youHost) status = `<p class="status">${n}/${r.max} in the room${r.online ? ` · ${NET.humans.length} real` : ""}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-ghost" data-act="fill" ${full || r.filling ? "disabled" : ""}>${r.filling && !full ? "Filling..." : "Fill with computer players"}</button>
        <button class="btn btn-green" data-act="hoststart" ${r.online || n >= 5 ? "" : "disabled"}>Start game</button></div>
      <p class="tiny muted" style="margin:0;text-align:center">${r.online ? "You're the host. Start when your friends are in. Empty seats up to 5 get computer players." : n < 5 ? "You need at least 5 players to start." : ""}</p>`;
  else status = `<p class="status">Waiting for ${r.online ? "the host to start" : "players"} (${n}/${r.max})</p><p class="tiny muted" style="margin:0;text-align:center">${r.online ? "Only the host can start the round." : "The host starts when the room is full."}</p>`;
  const names = all.map((m) => `<span class="chip ${m.you ? "gold" : m.friend ? "green" : ""}">${esc(m.you ? "You" : m.name)}${m.host ? " · host" : ""}${r.online && m.bot ? " · computer" : ""}</span>`).join("");
  el.innerHTML = `${status}<div class="chips-row">${names}</div>`;
}
function wardrobeModal() {
  openModal(`<div class="modal-head"><h2 class="display" id="mtitle">Wardrobe</h2><button class="x" data-act="closewardrobe" aria-label="Close">✕</button></div>${wardrobeHTML()}<button class="btn btn-block" data-act="closewardrobe">Done</button>`);
  fillCustomize();
}

// ---------- Customize ----------
function wardrobeHTML() {
  const tabs = [["outfit", "Outfit"], ["pattern", "Pattern"], ["colours", "Colours"], ["head", "Headwear"], ["hair", "Hair"], ["extras", "Extras"], ["pets", "Pets"], ["tag", "Name tag"], ["bag", "Exit bag"], ["skin", "Skin"]];
  return `<div class="dressing"><div class="mirror" id="mirror" aria-label="Your character preview"></div>
      <div style="display:flex;flex-direction:column;gap:8px">${isSignedIn() && ACCT.profile && ACCT.profile.username
      ? `<p class="label" style="margin:0">Your username</p><strong style="font-size:18px">${esc(ACCT.profile.username)}</strong><span class="tiny muted">Change it in your account.</span>`
      : `<label class="label" for="nm" style="margin:0">Your name</label><input class="field" id="nm" maxlength="12" autocomplete="off" placeholder="Player" value="${esc(DATA.name)}">`}<button class="btn btn-ghost btn-sm" data-act="randomize">Surprise me</button></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${custTab === k}" data-tab="${k}">${l}</button>`).join("")}</div>
    <div id="opts"></div>`;
}
function customizeHTML() {
  return `<section class="sheet"><div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">Wardrobe</h2></div>${wardrobeHTML()}<button class="btn btn-block" data-go="menu">Done</button></section>`;
}
const lockOf = (key, v) => { const item = PREMIUM[`${key}:${v}`]; return item && !owns(item) ? item : null; };
const optGrid = (key, list) => `<div class="options">${list.map(([v, l]) => { const lock = lockOf(key, v); return `<button class="opt ${lock ? "locked" : ""}" aria-pressed="${DATA.look[key] === v}" data-set="${key}" data-v="${v}" ${lock ? `data-lock="${lock}"` : ""}><span data-pic="${key}:${v}"></span>${l}${lock ? `<span class="lock">${esc(priceOf(lock))}</span>` : ""}</button>`; }).join("")}</div>`;
const swatchRow = (key, list, label) => `<p class="label">${label}</p><div class="swatches" role="group" aria-label="${label}">${list.map((c, i) => { const lock = lockOf(key, c); return `<button class="sw ${lock ? "locked" : ""}" style="--c:${c}" aria-label="${label} ${i + 1}${lock ? " (locked)" : ""}" aria-pressed="${DATA.look[key] === c}" data-set="${key}" data-v="${c}" ${lock ? `data-lock="${lock}"` : ""}></button>`; }).join("")}</div>`;
function fillCustomize() {
  const m = $("#mirror"); if (!m) return; m.innerHTML = ""; m.appendChild(portrait(DATA.look, 120, 160));
  let html = "";
  if (custTab === "outfit") html = optGrid("outfit", OUTFITS);
  if (custTab === "pattern") html = optGrid("pattern", PATTERNS);
  if (custTab === "head") html = optGrid("hat", HATS) + `<div style="margin-top:14px">${swatchRow("hatC", FABRIC, "Headwear colour")}</div>`;
  if (custTab === "hair") html = optGrid("hair", HAIRS) + `<p class="tiny muted" style="margin:8px 0 0">Big hats cover most hairstyles. Try "None" or headphones to show it off.</p>`;
  if (custTab === "extras") html = `<p class="label">Eyes</p>${optGrid("eyes", EYES)}<p class="label" style="margin-top:14px">Neck</p>${optGrid("neck", NECKS)}`;
  if (custTab === "colours") html = `${swatchRow("c1", FABRIC, "Main fabric")}<div style="margin-top:14px">${swatchRow("c2", FABRIC, "Accent and pattern")}</div>`;
  if (custTab === "pets") html = optGrid("pet", PETS) + `<p class="tiny muted" style="margin:8px 0 0">Your pet follows you everywhere. Part of Compound Pets.</p>`;
  if (custTab === "tag") html = optGrid("tag", TAGS) + `<p class="tiny muted" style="margin:8px 0 0">Make your name glow above your head. Part of the Glow Name Tag.</p>`;
  if (custTab === "bag") html = optGrid("bag", BAGS) + `<p class="tiny muted" style="margin:8px 0 0">The bag you carry out when you get voted out. Part of Exit Bags.</p>`;
  if (custTab === "skin") html = `<div class="swatches" role="group" aria-label="Skin tone">${SKINS.map((c, i) => `<button class="sw" style="--c:${c};width:50px;height:50px" aria-label="Skin tone ${i + 1}" aria-pressed="${DATA.look.skin === c}" data-set="skin" data-v="${c}"></button>`).join("")}</div>`;
  $("#opts").innerHTML = html;
  $("#opts").querySelectorAll("[data-pic]").forEach((el) => { const [k, v] = el.dataset.pic.split(":"); el.replaceWith(portrait({ ...DATA.look, [k]: v, vip: false, tag: "none" }, 60, 76, k === "bag")); });
}
function syncMyLook() {
  if (D) D.bots[0].look = DATA.look;
  if (ROOM) ROOM.members.forEach((m) => { if (m.you) { m.look = myLook(); m.name = displayName(); } });
  if (LB) LB.actors.forEach((a) => { if (a.m.you) a.m.look = myLook(); });
  retrack();
}

// ---------- Friends ----------
function friendsHTML() {
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">Friends</h2></div>
    <form id="addF" class="add-row" autocomplete="off"><label for="fname" class="sr">Friend's name</label><input class="field" id="fname" maxlength="12" placeholder="Friend's name"><button class="btn" type="submit">Add</button></form>
    <p class="tiny muted" id="fmsg" role="status" style="margin:-6px 0 0"></p>
    <div id="flist"></div>
    <p class="sim-note">Invited friends join the private rooms you create, wearing their own outfits. In this preview they're played by the computer.</p>
  </section>`;
}
const friendLook = (f) => randomLook(seeded(f.name.toLowerCase()));
function fillFriends() {
  const list = $("#flist");
  if (!DATA.friends.length) { list.innerHTML = `<p class="small muted" style="margin:0">No friends yet. Add your first one above.</p>`; return; }
  list.innerHTML = DATA.friends.map((f, i) => `<div class="friend"><span data-fpic="${i}"></span><div><strong>${esc(f.name)}</strong><div class="tiny muted">${f.invited ? "Joins your private rooms" : "Not invited"}</div></div>
    <label class="invite"><input type="checkbox" data-inv="${i}" ${f.invited ? "checked" : ""}>Invite</label><button class="xbtn" data-rmf="${i}" aria-label="Remove ${esc(f.name)}">✕</button></div>`).join("");
  list.querySelectorAll("[data-fpic]").forEach((el) => el.replaceWith(portrait(friendLook(DATA.friends[Number(el.dataset.fpic)]), 40, 50)));
}

// ---------- Account ----------
function accountHTML() {
  const title = ACCT.recovery ? "New password" : isSignedIn() ? "Your account" : ACCT.view === "login" ? "Log in" : "Sign up";
  const head = `<div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">${title}</h2></div>`;
  if (!NET.ready) return `<section class="sheet">${head}<p class="sim-note">Accounts need the internet. You're playing offline right now.</p></section>`;
  const note = ACCT.err ? `<p class="small" role="alert" style="margin:0;color:#ffc4c4">${esc(ACCT.err)}</p>` : ACCT.msg ? `<p class="small" role="status" style="margin:0;color:var(--green)">${esc(ACCT.msg)}</p>` : "";
  if (ACCT.recovery && isSignedIn()) return `<section class="sheet">${head}${note}
    <form id="npForm" class="auth-form" autocomplete="on"><div><label class="label" for="npPass">New password</label><input class="field" id="npPass" type="password" minlength="8" autocomplete="new-password" required></div>
    <button class="btn btn-block" type="submit">Save new password</button></form></section>`;
  if (!isSignedIn()) {
    const tabs = `<div class="seg" role="tablist"><button role="tab" aria-pressed="${ACCT.view !== "login"}" data-acctview="signup">Sign up</button><button role="tab" aria-pressed="${ACCT.view === "login"}" data-acctview="login">Log in</button></div>`;
    const form = ACCT.view === "login"
      ? `<form id="liForm" class="auth-form" autocomplete="on">
          <div><label class="label" for="liEmail">Email</label><input class="field" id="liEmail" type="email" autocomplete="email" value="${esc(DATA.email)}" required></div>
          <div><label class="label" for="liPass">Password</label><input class="field" id="liPass" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-block" type="submit">Log in</button>
          <button class="linkish" type="button" data-act="forgot">Forgot password?</button></form>`
      : `<form id="suForm" class="auth-form" autocomplete="on">
          <div><label class="label" for="suName">Username</label><input class="field" id="suName" maxlength="15" autocomplete="username" autocapitalize="off" spellcheck="false" value="${esc(USER_RE.test(DATA.name) ? DATA.name : "")}" required><p class="tiny muted" id="suNameMsg" style="margin:4px 0 0">3 to 15 letters, numbers or _</p></div>
          <div><label class="label" for="suEmail">Email</label><input class="field" id="suEmail" type="email" autocomplete="email" value="${esc(DATA.email)}" required></div>
          <div><label class="label" for="suPass">Password</label><input class="field" id="suPass" type="password" minlength="8" autocomplete="new-password" required><p class="tiny muted" style="margin:4px 0 0">At least 8 characters.</p></div>
          <button class="btn btn-block" type="submit">Create my account</button></form>`;
    return `<section class="sheet">${head}
      <p class="small muted" style="margin:0">An account keeps your username, outfit, stats and everything you buy, on any phone or laptop.</p>
      ${tabs}${note}${form}
      <p class="tiny muted" style="margin:0">You can still play as a guest. Guests keep their stuff on this device only.</p></section>`;
  }
  const pr = ACCT.profile || {};
  if (!pr.username) return `<section class="sheet">${head}${note}
    <p class="small" style="margin:0">Pick the username everybody will see in the game.</p>
    <form id="unForm" class="auth-form" autocomplete="off"><div><label class="label" for="unName">Username</label><input class="field" id="unName" maxlength="15" autocapitalize="off" spellcheck="false" required><p class="tiny muted" id="unNameMsg" style="margin:4px 0 0">3 to 15 letters, numbers or _</p></div>
    <button class="btn btn-block" type="submit">Save username</button></form>
    <button class="btn btn-ghost btn-block" data-act="signout">Log out</button></section>`;
  const owned = ITEMS.filter((it) => owns(it.id));
  const since = pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" }) : "";
  return `<section class="sheet">${head}${note}
    <div class="acct-top"><div id="acctPic" aria-hidden="true"></div><div style="min-width:0"><strong class="acct-name">${esc(pr.username)}</strong>${owns("vip") ? ` <span class="chip gold">VIP</span>` : ""}
      <p class="tiny muted" style="margin:2px 0 0;overflow-wrap:anywhere">${esc(ACCT.user.email || "")}${since ? ` · joined ${esc(since)}` : ""}</p></div></div>
    <div class="stats"><div><b>${pr.games_played || 0}</b><span>Online games</span></div><div><b>${pr.wins || 0}</b><span>Wins</span></div><div><b>${pr.thief_wins || 0}</b><span>Thief wins</span></div></div>
    <div><p class="label">Your items</p>${owned.length ? `<div class="chips-row">${owned.map((it) => `<span class="chip">${esc(it.name)}</span>`).join("")}</div>` : `<p class="small muted" style="margin:0">Nothing yet. <button class="linkish" data-go="shop" style="padding:0">Visit the shop</button></p>`}</div>
    <div class="divider"></div>
    <form id="unForm" class="auth-form" autocomplete="off"><div><label class="label" for="unName">Change username</label><input class="field" id="unName" maxlength="15" autocapitalize="off" spellcheck="false" value="${esc(pr.username)}"><p class="tiny muted" id="unNameMsg" style="margin:4px 0 0">3 to 15 letters, numbers or _</p></div>
    <button class="btn btn-ghost btn-block" type="submit">Save username</button></form>
    <button class="btn btn-ghost btn-block" data-act="pwlink">Email me a link to change my password</button>
    <button class="btn btn-ghost btn-block" data-act="signout">Log out</button></section>`;
}

// ---------- Settings ----------
const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button aria-pressed="${String(S()[key]) === String(v)}" data-setting="${key}" data-v="${v}">${l}</button>`).join("")}</div>`;
const swt = (key, label) => `<button class="switch" role="switch" aria-checked="${!!S()[key]}" data-toggle="${key}" aria-label="${label}"></button>`;
function settingsHTML() {
  return `<section class="sheet">
    <div class="sheet-head"><button class="back" data-go="menu" aria-label="Back">←</button><h2 class="display">Settings</h2></div>
    <div class="setting"><div class="setting-top"><strong>Sound effects</strong>${swt("sound", "Sound effects")}</div></div>
    <div class="setting"><div class="setting-top"><strong>Vibration</strong>${swt("vibrate", "Vibration")}</div><span class="tiny muted">On phones that support it.</span></div>
    <div class="setting"><div class="setting-top"><strong>Names on the map</strong>${swt("names", "Names on the map")}</div></div>
    <div class="setting"><div class="setting-top"><strong>Menu music</strong>${swt("music", "Menu music")}</div><span class="tiny muted">Smooth jazz on the menus. It stops when you join a room.</span></div>
    <div class="setting"><div class="setting-top"><strong>Danfo radio music</strong>${swt("radio", "Danfo radio music")}</div><span class="tiny muted">Songs from Nigerian artists and brands play on the danfo radio.</span></div>
    <div class="setting"><div class="setting-top"><strong>Proximity voice chat</strong>${swt("voice", "Proximity voice chat")}</div><span class="tiny muted">In online games you hear real players only when they stand right next to you, and only in the same room. Computer players talk out loud with your device's voice.</span></div>
    <div class="setting"><strong>Difficulty</strong>${seg("difficulty", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]])}<span class="tiny muted">How careful the computer thieves are, and how sharp everyone votes.</span></div>
    <div class="setting"><strong>Chore speed</strong>${seg("chores", [["relaxed", "Relaxed"], ["normal", "Normal"], ["fast", "Fast"]])}<span class="tiny muted">How fast computer players finish chores. Relaxed gives thieves more time.</span></div>
    <div class="setting"><strong>Meeting chat speed</strong>${seg("talk", [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]])}</div>
    <div class="setting"><button class="btn btn-ghost btn-block" data-act="reset">${resetArmed ? "Tap again to erase everything" : "Reset look, friends and settings"}</button></div>
  </section>`;
}
function howModal() {
  openModal(`<div class="modal-head"><h2 class="display" id="mtitle">How to play</h2><button class="x" data-act="close" aria-label="Close">✕</button></div>
    <ul class="how-list">
      <li><strong>Play online</strong> with real people on live servers, or make a private room and send the code to your friends. Empty seats are filled by computer players.</li>
      <li><strong>Roles are random.</strong> Most players are housemates (or passengers). 1 to 3 are secretly thieves.</li>
      <li><strong>Two modes:</strong> the Compound, or a packed Danfo from Oshodi to CMS.</li>
      <li><strong>Before the game</strong> you wait in a lobby you can walk around. Visit the mirror to change clothes.</li>
      <li><strong>Move:</strong> drag anywhere on the map, or use arrow keys / WASD.</li>
      <li><strong>Everyone else:</strong> finish your chores (the ! marks), report anyone whose phone is missing, and vote the thieves out.</li>
      <li><strong>Thieves:</strong> steal phones when nobody is watching. Kill the lights so nobody can see. Fake chores in public so people defend you.</li>
      <li><strong>Roles:</strong> everyone also gets a character. Compound has the Landlord (double vote, can call a meeting anywhere), 9-5 Worker (faster), Mai Guard (sees in the dark) and Mama Put (learns one innocent person). Danfo has the Driver (hard brake), Bus Conductor (counts heads), Evangelist (prays to protect someone), Market Woman (learns one innocent) and 9-5 Worker. Thieves are a Pickpocket (steals sooner) or a Yahoo Boy (copies someone's look).</li>
      <li><strong>Proximity voice:</strong> in online games, turn your mic on to talk. You only hear people standing right next to you (the dotted circle), and walls block sound. In meetings everybody can hear everybody.</li>
      <li><strong>Meetings</strong> last up to 2 minutes. Everybody sits down, talks, then votes. Whoever gets the most votes packs their bag and leaves.</li>
      <li>Keys: E use, R report, Q steal, F fake chore, L lights, G role power.</li>
    </ul>
    <button class="btn btn-block" data-act="close" data-focus>Got it</button>`);
}

// =====================================================================
// Game
// =====================================================================
let G = null, P = [], me = null, lastRoom = null;
// Decide thieves, roles and chores for everyone. Real players keep their own colours first.
function buildRoster(members, thieves) {
  const n = members.length, T = Math.max(1, Math.min(thieves, maxThieves(n)));
  const thiefSet = new Set(shuffle([...Array(n).keys()]).slice(0, T));
  const roles = assignRoles(n, thiefSet), used = new Set(), looks = members.map((m) => ({ ...m.look }));
  [...members.keys()].sort((a, b) => (members[a].bot ? 1 : 0) - (members[b].bot ? 1 : 0)).forEach((i) => {
    if (used.has(looks[i].c1)) { const free = FREE_FABRIC.filter((c) => !used.has(c)); if (free.length) looks[i].c1 = pick(free); }
    used.add(looks[i].c1);
  });
  const roster = members.map((m, i) => ({ name: m.name, look: looks[i], bot: !!m.bot, netId: m.netId || null, you: !!m.you, isThief: thiefSet.has(i), role: roles[i],
    tasks: thiefSet.has(i) ? [] : shuffle(M.spotIds).slice(0, roles[i] === "worker" ? TASKS_EACH - 1 : TASKS_EACH) }));
  return { roster, thieves: T };
}
function newGame(cfg) {
  lastRoom = cfg.roster ? null : cfg;
  stopBg(); stopServerTicks(); stopLobby(); if (!NET.online) clearRoomTimer();
  const pack = cfg.roster ? { roster: cfg.roster, thieves: cfg.thieves } : buildRoster(cfg.members, cfg.thieves);
  const n = pack.roster.length;
  P = pack.roster.map((r, i) => {
    const you = NET.online ? r.netId === NET.myId : r.you;
    return {
      id: i, netId: r.netId, you, name: you ? displayName() : r.name, look: r.look, isBot: r.bot, remote: !r.bot && !you, isThief: r.isThief,
      ...spawnAt(i, n), tx: null, ty: null, netMoving: false, alive: true, ejected: false, facing: 1, moving: false, bob: rand(0, 6),
      role: r.role, abil: { uses: ROLES[r.role].uses || 0, cd: 8 }, shieldUntil: 0, disguise: null, knows: null, sayUntil: 0, sayText: "", sayT: rand(3, 10), pitch: rand(0.8, 1.3),
      tasks: r.tasks.slice(), done: [], mini: null, emote: null,
      path: [], state: "idle", timer: rand(0.5, 2.5), goal: null, seen: {}, vouch: {}, witness: null, chase: null, chaseT: 0, fakeT: 0, cd: r.bot ? rand(16, 24) : 15,
    };
  });
  me = P.find((p) => p.you);
  const dif = DIFF[S().difficulty] || DIFF.normal;
  G = { mode: "play", t: 0, bodies: [], lightsOut: 0, fixer: null, stealCd: 15, sabCd: 30, sabBot: rand(40, 60), bellUsed: false, meetings: 0, steals: 0, thieves: pack.thieves,
    playerWitness: null, seenTick: 0, hudT: 0, mini: null, paused: true, ended: false, dif, choreMult: CHORE_MULT[S().chores] || 1,
    brakeT: 0, knownInnocent: null, headcount: null, headcountUntil: 0, mic: null, meetSecs: cfg.meetSecs || MEETING_SECONDS, posT: 0, snapT: 0, roomName: cfg.roomName };
  screen = "game";
  renderGame(); showReveal();
  if (M.id === "danfo") startRadio();
}
const totalTasks = () => P.reduce((s, p) => s + (p.isThief ? 0 : p.tasks.length), 0);
const doneTasks = () => P.reduce((s, p) => s + (p.isThief ? 0 : p.done.length), 0);
const crewAlive = () => P.filter((p) => !p.isThief && p.alive).length;
const thievesAlive = () => P.filter((p) => p.isThief && p.alive).length;
const thiefList = () => P.filter((p) => p.isThief);
const nm = (p) => (p === me ? "you" : p.name);
const Nm = (p) => (p === me ? "You" : p.name);
const crewWord = () => (M.id === "danfo" ? "passengers" : "housemates");
const visionR = (p) => (p.isThief ? 230 : G.lightsOut > 0 && p.role !== "guard" ? 90 : 195);
function canSee(a, b) { return dist(a, b) < visionR(a) && areaOf(a) === areaOf(b); }
function doingNow(p) {
  if (p === me) { if (G.mini) return M.spots[G.mini].doing; if (me.fakeT > 0 && me.fakeSpot) return M.spots[me.fakeSpot].doing; return null; }
  if (p.remote) { if (p.mini && M.spots[p.mini]) return M.spots[p.mini].doing; if (p.fakeT > 0 && p.fakeSpot) return M.spots[p.fakeSpot].doing; return null; }
  return p.state === "work" && p.goal && p.goal.kind === "task" ? M.spots[p.goal.id].doing : null;
}

// ---------- Canvas ----------
let cv, ctx, cssW = 0, cssH = 0, scale = 1, viewW = 520, viewH = 400, cam = { x: 0, y: 0 }, gameRunning = false, last = 0;
function resize() {
  if (!cv || !G) return;
  const r = cv.getBoundingClientRect(); cssW = r.width; cssH = r.height;
  const d = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(cssW * d); cv.height = Math.round(cssH * d);
  viewW = cssW < 600 ? 500 : 820; scale = cssW / viewW; viewH = cssH / scale;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener("resize", resize);

// ---------- Simulation ----------
function botChooseNext(b) {
  if (Math.random() < 0.35) { b.goal = { kind: "wander" }; b.path = planPath(b, yardPoint()); return; }
  const left = b.tasks.filter((t) => !b.done.includes(t));
  const id = !b.isThief && left.length ? pick(left) : pick(M.spotIds);
  b.goal = { kind: "task", id }; b.path = planPath(b, M.spots[id]);
}
function stealPhone(thief, victim) {
  const cdMul = thief.role === "pickpocket" ? 0.7 : 1;
  if (victim.shieldUntil > G.t) { thief.cd = 10; emit("blocked", { thief: thief.id, victim: victim.id }); return; }
  if (G.brakeT > 0 && thief.role !== "driver") { thief.cd = 6; emit("tripped", { thief: thief.id }); return; }
  const shown = thief.disguise && thief.disguise.until > G.t ? P[thief.disguise.as] : thief;
  const count = P.filter((p) => p.alive && areaOf(p) === areaOf(victim)).length;
  victim.alive = false;
  const body = { x: Math.round(victim.x), y: Math.round(victim.y), victim: victim.id, t: G.t, area: areaOf(victim), thief: thief.id, count };
  G.bodies.push(body); G.steals++;
  for (const b of P) if (b.isBot && b.alive && !b.isThief && b !== victim && dist(b, victim) < 220 && areaOf(b) === body.area) b.witness = { culprit: shown.id, victim: victim.id };
  thief.cd = (thief.isBot ? rand(G.dif.cd - 4, G.dif.cd + 4) : G.dif.cd) * cdMul;
  emit("steal", { thief: thief.id, victim: victim.id, shown: shown.id, body: { x: body.x, y: body.y, victim: body.victim, area: body.area } });
  checkEnd();
}
function onStealEvent(d) {
  const th = P[d.thief], v = P[d.victim], shown = P[d.shown];
  if (!AUTH()) { v.alive = false; if (!G.bodies.some((b) => b.victim === v.id)) G.bodies.push({ ...d.body, reported: false }); G.steals++; }
  if (th === me) { sfx("steal"); buzz(60); G.stealCd = G.dif.cd * (me.role === "pickpocket" ? 0.7 : 1); toast(`You collected ${v.name}'s phone.${shown !== me ? ` Anyone watching thinks it was ${shown.name}.` : " Waka comot before anybody see you."}`, "bad"); }
  else if (v === me) { sfx("steal"); buzz([80, 40, 80]); youGotRobbed(th); }
  else if (me.alive && dist(me, v) < (G.lightsOut > 0 && !me.isThief && me.role !== "guard" ? 110 : 420) && areaOf(me) === d.body.area) {
    if (me.isThief) toast(`Your partner ${th.name} collected ${v.name}'s phone.`);
    else { G.playerWitness = { culprit: shown.id, victim: v.id }; sfx("steal"); buzz(60); toast(`You saw ${shown === me ? "someone dressed like you" : shown.name} collect ${v.name}'s phone!`, "bad"); }
  }
}
function brake(by) { by.abil.cd = ROLES.driver.cd; for (const p of P) if (p.isThief) p.chase = null; emit("brake", { by: by.id }); }
function say(p, line) {
  p.sayText = line; p.sayUntil = G.t + 3.4;
  if (!S().voice || !S().sound) return;
  try {
    const synth = window.speechSynthesis; if (!synth || synth.speaking) return;
    const u = new SpeechSynthesisUtterance(line), voices = synth.getVoices();
    u.volume = clamp(1 - dist(me, p) / (VOICE_R + 20), 0.15, 1); u.pitch = p.pitch; u.rate = 1.05;
    const v = voices.find((x) => /en[-_]NG/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang)); if (v) u.voice = v;
    synth.speak(u);
  } catch (e) { /* speech not available */ }
}
function hush() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
function voiceTick(dt) {
  if (!S().voice || !me.alive) return;
  micLevel();
  for (const b of P) {
    if (!b.isBot || !b.alive) continue;
    b.sayT -= dt; if (b.sayT > 0) continue;
    b.sayT = rand(7, 15);
    if (dist(b, me) > VOICE_R || areaOf(b) !== areaOf(me)) continue;
    let line = pick(CHATTER[M.id]);
    if (b.witness && P[b.witness.culprit].alive) line = pick(["I see wetin happen o! Make una gather.", `Hmm. ${P[b.witness.culprit] === me ? "You" : P[b.witness.culprit].name}, I dey watch you.`]);
    else if (b.isThief && Math.random() < 0.4) line = pick(["Why you dey look me like that?", "I was just passing, abeg.", "Make I go check my chores."]);
    else if (G.mic && G.mic.talkingAt > G.t - 2.5) line = pick(["I hear you o.", "Talk am well, I dey listen.", "Wetin you talk? Say am again."]);
    say(b, line);
  }
}
async function toggleMic() {
  if (!me.alive) { toast("You're out of the round. Your mic stays off until the next one.", "bad"); return; }
  if (G.mic) { stopMic(); rtcMute(); toast("Mic off."); lastActionsKey = ""; return; }
  try {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS); } catch (e) { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    if (!G || !me.alive) { stream.getTracks().forEach((t) => t.stop()); return; }
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(an);
    if (!G) { stream.getTracks().forEach((t) => t.stop()); return; }
    G.mic = { stream, ac, an, buf: new Uint8Array(an.fftSize), talkingAt: -10 };
    rtcStart(stream);
    toast(NET.online ? "Mic on. Only players standing right next to you can hear you." : "Mic on. In practice games only the computer players react.", "good");
  } catch (e) { toast("Your microphone isn't available here. Check this page's permissions.", "bad"); }
  lastActionsKey = "";
}
function stopMic() { const m = G && G.mic; if (!m) return; try { m.stream.getTracks().forEach((t) => t.stop()); m.ac.close(); } catch (e) { /* ignore */ } G.mic = null; RTC.stream = null; }
function micLevel() {
  const m = G.mic; if (!m) return;
  m.an.getByteTimeDomainData(m.buf); let sum = 0; for (const v of m.buf) { const x = (v - 128) / 128; sum += x * x; }
  if (Math.sqrt(sum / m.buf.length) > 0.05) { m.talkingAt = G.t; me.talkingAt = performance.now(); }
}
function bubble(c, x, y, msg) {
  c.font = "600 11px Rubik, sans-serif";
  const t = msg.length > 34 ? msg.slice(0, 33) + "…" : msg, w = c.measureText(t).width + 14;
  c.fillStyle = "rgba(244,239,230,.96)"; rr(c, x - w / 2, y - 20, w, 18, 8); c.fill();
  c.beginPath(); c.moveTo(x - 4, y - 2); c.lineTo(x + 4, y - 2); c.lineTo(x, y + 4); c.fill();
  text(c, t, x, y - 7, "600 11px Rubik, sans-serif", "#141008");
}
function lightsOut() {
  const crew = P.filter((p) => p.isBot && p.alive && !p.isThief);
  if (crew.length) G.fixer = crew.sort((a, b) => dist(a, M.spots[M.fix]) - dist(b, M.spots[M.fix]))[0].id;
  emit("lights", { on: false });
}
function localTimers(dt) {
  G.t += dt;
  if (me.isThief) { G.stealCd = Math.max(0, G.stealCd - dt); G.sabCd = Math.max(0, G.sabCd - dt); }
  me.fakeT = Math.max(0, me.fakeT - dt);
  if (G.brakeT > 0) G.brakeT = Math.max(0, G.brakeT - dt);
  for (const p of P) { if (p.abil.cd > 0) p.abil.cd = Math.max(0, p.abil.cd - dt); if (p.disguise && p.disguise.until <= G.t) p.disguise = null; if (p.fakeT > 0 && p !== me) p.fakeT -= dt; }
}
function movePlayer(dt) {
  const [vx, vy] = inputVector();
  me.moving = false;
  if (!ov.hidden || G.mini || (G.brakeT > 0 && me.role !== "driver")) return;
  if (vx || vy) {
    const sp = 175 * dt * (me.role === "worker" ? 1.25 : 1), nx = me.x + vx * sp, ny = me.y + vy * sp;
    if (canStand(nx, me.y) || !me.alive) me.x = clamp(nx, 0, M.world.w);
    if (canStand(me.x, ny) || !me.alive) me.y = clamp(ny, 0, M.world.h);
    if (Math.abs(vx) > 0.1) me.facing = vx > 0 ? 1 : -1;
    me.moving = true; me.bob += dt * 12; me.fakeT = 0;
  }
}
// Smoothly move people whose position comes over the network.
function interpRemote(dt) {
  const k = Math.min(1, dt * 10);
  for (const p of P) {
    if (p === me || (AUTH() && p.isBot) || p.tx == null) continue;
    const d = Math.hypot(p.tx - p.x, p.ty - p.y);
    if (d > 220) { p.x = p.tx; p.y = p.ty; } else { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
    p.moving = p.netMoving || d > 3; if (p.moving) p.bob += dt * 12;
  }
}
function netTick(dt) {
  if (!NET.online || !NET.ch) return;
  G.posT -= dt;
  if (G.posT <= 0) { G.posT = 0.12; send("pos", { id: me.id, x: Math.round(me.x), y: Math.round(me.y), f: me.facing, m: me.moving ? 1 : 0, mi: G.mini, em: me.emote && me.emote.until > G.t ? [me.emote.id, +(me.emote.until - G.t).toFixed(1)] : null, fk: me.fakeT > 0 ? me.fakeSpot : null }); }
  if (NET.isHost) { G.snapT -= dt; if (G.snapT <= 0) { G.snapT = 0.16; send("st", snapshot()); } }
}
function snapshot() {
  return {
    b: P.filter((p) => p.isBot && !p.ejected).map((p) => [p.id, Math.round(p.x), Math.round(p.y), p.facing, p.moving ? 1 : 0]),
    al: P.map((p) => (p.alive ? 1 : 0) + (p.ejected ? 2 : 0) + (p.isBot ? 4 : 0)).join(","),
    lo: +G.lightsOut.toFixed(1), br: +G.brakeT.toFixed(1),
    sh: P.filter((p) => p.shieldUntil > G.t).map((p) => [p.id, +(p.shieldUntil - G.t).toFixed(1)]),
    dg: P.filter((p) => p.disguise && p.disguise.until > G.t).map((p) => [p.id, p.disguise.as, +(p.disguise.until - G.t).toFixed(1)]),
    dn: P.map((p) => p.done.length), bd: G.bodies.map((b) => [b.victim, b.x, b.y, b.reported ? 1 : 0, b.area]),
  };
}
function onSnap(s) {
  if (!G || AUTH() || G.ended) return;
  for (const [id, x, y, f, m] of s.b) { const p = P[id]; if (!p || p === me) continue; p.tx = x; p.ty = y; p.facing = f; p.netMoving = !!m; }
  s.al.split(",").forEach((c, i) => { const p = P[i]; if (!p) return; const v = Number(c); p.alive = !!(v & 1); p.ejected = !!(v & 2); if (p !== me) { p.isBot = !!(v & 4); p.remote = !p.isBot; } });
  if (G.mode === "play") { G.lightsOut = s.lo; G.brakeT = s.br; }
  P.forEach((p) => (p.shieldUntil = 0)); s.sh.forEach(([id, rem]) => { if (P[id]) P[id].shieldUntil = G.t + rem; });
  P.forEach((p) => (p.disguise = null)); s.dg.forEach(([id, as, rem]) => { if (P[id]) P[id].disguise = { as, until: G.t + rem }; });
  s.dn.forEach((c, i) => { const p = P[i]; if (p && p !== me && p.done.length !== c) p.done = Array(c).fill("?"); });
  G.bodies = s.bd.map(([victim, x, y, r, area]) => ({ victim, x, y, reported: !!r, area }));
}
function onPos(d) {
  if (!G) return;
  const p = P[d.id]; if (!p || p === me) return;
  p.tx = d.x; p.ty = d.y; p.facing = d.f; p.netMoving = !!d.m; p.mini = d.mi || null;
  if (d.fk) { p.fakeT = 1; p.fakeSpot = d.fk; }
  if (d.em) p.emote = { id: d.em[0], until: G.t + d.em[1] };
}
function clientTick(dt) {
  localTimers(dt);
  if (G.lightsOut > 0) G.lightsOut = Math.max(0, G.lightsOut - dt);
  movePlayer(dt); interpRemote(dt); voiceTick(dt); netTick(dt);
}
function tick(dt) {
  if (!AUTH()) return clientTick(dt);
  localTimers(dt);
  if (G.lightsOut > 0) { G.lightsOut -= dt; if (G.lightsOut <= 0) { G.lightsOut = 0; G.fixer = null; emit("lights", { on: true }); } }
  for (const p of P) if (!p.isBot && p.isThief && p.cd > 0) p.cd -= dt;
  movePlayer(dt);
  interpRemote(dt);
  for (const b of P) {
    if (!b.isBot || b.ejected) continue;
    b.moving = false;
    if (G.brakeT > 0 && b.role !== "driver") { b.chase = null; continue; }
    if (G.lightsOut > 0 && G.fixer === b.id && b.alive) {
      if (!b.fixPath) b.fixPath = planPath(b, M.spots[M.fix]);
      if (b.fixPath.length) { if (moveToward(b, b.fixPath[0].x, b.fixPath[0].y, 130, dt)) b.fixPath.shift(); }
      else { G.lightsOut = 0; G.fixer = null; b.fixPath = null; emit("lights", { on: true, by: b.id }); }
      continue;
    }
    b.fixPath = null;
    if (b.isThief && b.alive) {
      b.cd -= dt;
      if (b.chase != null) {
        const t = P[b.chase]; b.chaseT -= dt;
        if (!t.alive || b.chaseT <= 0 || areaOf(t) !== areaOf(b)) { b.chase = null; botChooseNext(b); b.state = "walk"; }
        else if (moveToward(b, t.x, t.y, 140, dt) || dist(b, t) < 34) { b.chase = null; stealPhone(b, t); if (G.mode !== "play") return; botChooseNext(b); b.state = "walk"; }
        continue;
      }
      if (b.cd <= 0 && (b.scanT = (b.scanT ?? 0) - dt) <= 0) {
        b.scanT = 0.8;
        const careful = Math.random() < G.dif.careful;
        const targets = P.filter((t) => t !== b && t.alive && !t.isThief && areaOf(t) === areaOf(b) && dist(t, b) < 250);
        for (const t of targets) {
          // A careless thief sometimes ignores you watching, so you can catch them in the act.
          const watchers = P.filter((w) => w !== t && w !== b && w.alive && !w.isThief && !(w === me && !careful) && dist(w, t) < 270 && areaOf(w) === areaOf(t));
          if (!watchers.length) {
            b.chase = t.id; b.chaseT = 4;
            if (b.role === "yahoo" && b.abil.cd <= 0 && Math.random() < 0.6) { const pool = P.filter((x) => x.alive && !x.isThief && x !== t); if (pool.length) { b.disguise = { as: pick(pool).id, until: G.t + 15 }; b.abil.cd = ROLES.yahoo.cd; } }
            break;
          }
        }
      }
    }
    if (b.state === "work") {
      b.timer -= dt;
      if (b.timer <= 0) {
        if (b.goal && b.goal.kind === "task" && !b.isThief && b.tasks.includes(b.goal.id) && !b.done.includes(b.goal.id)) { b.done.push(b.goal.id); if (checkEnd()) return; }
        b.state = "idle"; b.timer = rand(0.3, 1.5);
      }
    } else if (b.state === "idle") { b.timer -= dt; if (b.timer <= 0) { botChooseNext(b); b.state = "walk"; } }
    else if (b.state === "walk") {
      if (!b.path.length) { b.state = b.goal && b.goal.kind === "task" ? "work" : "idle"; b.timer = b.state === "work" ? (b.alive ? rand(16, 24) : rand(24, 32)) * G.choreMult : rand(1, 3); }
      else if (moveToward(b, b.path[0].x, b.path[0].y, (b.alive ? 120 : 150) * (b.role === "worker" ? 1.25 : 1), dt)) b.path.shift();
    }
  }
  G.seenTick -= dt;
  if (G.seenTick <= 0) {
    G.seenTick = 0.4;
    for (const b of P) {
      if (!b.isBot || !b.alive) continue;
      for (const o of P) if (o !== b && o.alive && canSee(b, o)) { b.seen[o.id] = { area: areaOf(o), t: G.t }; const doing = doingNow(o); if (doing) b.vouch[o.id] = doing; }
      if (b.role === "evangelist" && b.abil.cd <= 0) { const t = P.find((o) => o !== b && o.alive && dist(o, b) < 90); if (t) { t.shieldUntil = G.t + 40; b.abil.cd = ROLES.evangelist.cd; } }
      if (b.role === "driver" && b.abil.cd <= 0 && P.some((o) => o.isThief && o.alive && o.chase != null && canSee(b, o))) brake(b);
      if ((b.role === "mamaput" || b.role === "marketwoman") && b.abil.uses > 0 && G.t > 20) { const pool = P.filter((o) => o !== b && !o.isThief); if (pool.length) { b.knows = pick(pool).id; b.abil.uses = 0; } }
      if (!b.isThief) { const body = G.bodies.find((x) => !x.reported && dist(b, x) < visionR(b) && areaOf(b) === x.area); if (body) { startMeeting(b, body); return; } }
    }
  }
  voiceTick(dt);
  if (P.some((p) => p.isThief && p.isBot && p.alive) && G.lightsOut === 0) { G.sabBot -= dt; if (G.sabBot <= 0) { G.sabBot = rand(50, 75); lightsOut(); } }
  netTick(dt);
}
function gameFrame(ts) {
  if (!gameRunning || !G) return;
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (G.mode === "play" && (!G.paused || NET.online)) tick(dt);
  if (G && me) { silenceTheOut(); if (G.mic) micLevel(); rtcVolumes(); }
  if (G) { draw(ts); G.hudT -= dt; if (G.hudT <= 0) { G.hudT = 0.2; updateHud(); } }
  requestAnimationFrame(gameFrame);
}
function stopGameLoop() { gameRunning = false; if (G && G.meetIv) clearInterval(G.meetIv); stopRadio(); }
function draw(ts) {
  if (!ctx) return;
  ctx.clearRect(0, 0, cssW, cssH);
  cam.x = clamp(me.x - viewW / 2, -80, M.world.w - viewW + 80);
  cam.y = clamp(me.y - 20 - viewH / 2, -80, M.world.h - viewH + 160);
  if (viewH > M.world.h + 160) cam.y = (M.world.h - viewH) / 2;
  ctx.save(); ctx.scale(scale, scale); ctx.translate(-cam.x, -cam.y);
  drawMap(ctx, M);
  if (!me.isThief) for (const id of me.tasks) if (!me.done.includes(id)) {
    const s = M.spots[id], pulse = REDUCED ? 0 : Math.sin(ts / 250) * 2;
    ctx.fillStyle = "rgba(255,179,71,.28)"; ctx.beginPath(); ctx.arc(s.x, s.y, 20 + pulse, 0, Math.PI * 2); ctx.fill();
    text(ctx, "!", s.x, s.y + 6, "16px Bungee, sans-serif", "#ffb347");
  }
  if (G.lightsOut > 0 && !me.isThief && me.alive) { const f = M.spots[M.fix]; ctx.strokeStyle = "#ff5d5d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, Math.PI * 2); ctx.stroke(); }
  const dark = G.lightsOut > 0 && !me.isThief && me.alive && me.role !== "guard";
  if (S().voice && me.alive) {
    const talking = G.mic && G.mic.talkingAt > G.t - 0.4;
    ctx.setLineDash([6, 6]); ctx.strokeStyle = talking ? "rgba(43,212,125,.8)" : "rgba(255,255,255,.22)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(me.x, me.y - 6, VOICE_R, VOICE_R * 0.75, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  const seeR = dark ? visionR(me) + 20 : Infinity;
  for (const b of G.bodies) if (!dark || dist(me, b) < seeR + 10) drawBodyAt(ctx, P[b.victim].look, P[b.victim].name, b.x, b.y);
  const visible = P.filter((p) => p === me || (p.alive && (!dark || dist(me, p) < seeR))).sort((a, b) => a.y - b.y);
  for (const p of visible) {
    const dis = p.disguise && p.disguise.until > G.t ? P[p.disguise.as] : null;
    const look = dis ? dis.look : p.look;
    const label = S().names || p === me ? (p === me ? (dis ? `You (as ${dis.name})` : "You") : dis ? dis.name : p.name) : "";
    if (p.shieldUntil > G.t) { ctx.strokeStyle = "rgba(255,215,90,.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y - 26, 24, 36, 0, 0, Math.PI * 2); ctx.stroke(); }
    const em = p.emote && p.emote.until > G.t ? EMOTES.find((e) => e[0] === p.emote.id) : null;
    drawLook(ctx, look, p.x, p.y, { facing: p.facing, moving: p.moving || !!em, bob: em ? ts / 50 : p.bob, label, ghost: p === me && !me.alive, labelColor: me.isThief && p.isThief ? "#ff8a8a" : "#fff" });
    if (em) bubble(ctx, p.x, p.y - 76, em[2]);
    if (p === me && me.fakeT > 0) text(ctx, "pretending...", p.x, p.y + 16, "700 11px Rubik, sans-serif", "#ffb347");
    if (!em && p.isBot && p.sayUntil > G.t && S().voice) bubble(ctx, p.x, p.y - 76, p.sayText);
    if (p.alive && ((p === me && G.mic && G.mic.talkingAt > G.t - 0.4) || (p !== me && p.talkingAt > performance.now() - 400))) { ctx.strokeStyle = "#2bd47d"; ctx.lineWidth = 2; for (const r2 of [8, 14]) { ctx.beginPath(); ctx.arc(p.x + 14, p.y - 40, r2, -0.6, 0.6); ctx.stroke(); } }
  }
  ctx.restore();
  if (dark) {
    const r = visionR(me) * scale, sx = (me.x - cam.x) * scale, sy = (me.y - 20 - cam.y) * scale;
    const g = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r);
    g.addColorStop(0, "rgba(2,3,8,0)"); g.addColorStop(1, "rgba(2,3,8,.95)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
  }
  if (G.brakeT > 0) { ctx.fillStyle = "rgba(255,93,93,.15)"; ctx.fillRect(0, 0, cssW, cssH); text(ctx, "HARD BRAKE!", cssW / 2, 60, "24px Bungee, sans-serif", "#ff5d5d"); }
  drawJoy(ctx);
}

// ---------- Player actions ----------
const nearTask = () => (me.isThief ? null : me.tasks.find((id) => !me.done.includes(id) && dist(me, M.spots[id]) < 55) || null);
const nearAnySpot = () => M.spotIds.find((id) => dist(me, M.spots[id]) < 55) || null;
const nearFix = () => G.lightsOut > 0 && !me.isThief && me.alive && dist(me, M.spots[M.fix]) < 60;
const nearBell = () => me.alive && !G.bellUsed && dist(me, M.bell) < 60;
const nearBody = () => (me.alive ? G.bodies.find((b) => !b.reported && dist(me, b) < 85) : null);
function stealTarget() { if (!me.isThief || !me.alive || G.stealCd > 0) return null; return P.filter((p) => p !== me && p.alive && !p.isThief && dist(me, p) < 78).sort((a, b) => dist(me, a) - dist(me, b))[0] || null; }
const canAct = () => G && G.mode === "play" && (!G.paused || NET.online) && ov.hidden;
function doUse() {
  if (!canAct()) return;
  if (nearFix()) { sendAct("fix"); return; }
  if (nearBell()) { sendAct("bell"); return; }
  const t = nearTask(); if (t) openMini(t);
}
function doReport() { const b = nearBody(); if (b && canAct()) sendAct("report", { victim: b.victim }); }
function doSteal() { const t = stealTarget(); if (t && canAct()) { G.stealCd = Math.max(G.stealCd, 1); sendAct("steal", { target: t.id }); } }
function doLights() { if (canAct() && me.isThief && me.alive && G.sabCd <= 0 && G.lightsOut === 0) { G.sabCd = 45; sendAct("lights"); } }
function abilityReady() { const r = ROLES[me.role]; if (!r.ability || !me.alive) return false; return r.uses ? me.abil.uses > 0 : me.abil.cd <= 0; }
function doAbility() {
  if (!canAct() || !abilityReady()) return;
  const r = ROLES[me.role];
  if (r.uses) me.abil.uses = 0; else me.abil.cd = r.cd;
  sendAct("ability");
  lastActionsKey = "";
}
function doFake() { if (!me.isThief || !me.alive) return; const s = nearAnySpot(); if (!s) return; me.fakeT = 6; me.fakeSpot = s; sfx("tap"); sendAct("fake", { spot: s }); toast(`You pretend to be ${M.spots[s].doing}. Anyone watching will remember.`); }
function doEmote(id) { if (!G || !me) return; me.emote = { id, until: G.t + 3 }; sfx("tap"); closeModal(); }
function emoteModal() {
  openModal(`<div class="modal-head"><h2 class="display" id="mtitle">Emotes</h2><button class="x" data-act="close" aria-label="Close">✕</button></div>
    <div class="grid">${EMOTES.map(([id, name, , item]) => { const lock = item && !owns(item); return `<button data-emote="${id}" ${lock ? `data-lock="${item}"` : ""}>${esc(name)}${lock ? `<small style="display:block;font-size:11px;color:var(--lantern)">${priceOf(item)}</small>` : ""}</button>`; }).join("")}</div>
    <p class="tiny muted" style="margin:0">Wave is free. The rest come with Gbedu Emotes.</p>`);
}

// ---------- Host: check what players ask to do ----------
function handleAct(by, type, d) {
  const p = P[by]; if (!p || !G || G.ended) return;
  const playing = G.mode === "play";
  switch (type) {
    case "steal": { const t = P[d.target]; if (!playing || !p.isThief || !p.alive || !t || !t.alive || t.isThief || p.cd > 0.5 || dist(p, t) > 100) return; stealPhone(p, t); break; }
    case "report": { if (!playing || !p.alive) return; const b = G.bodies.find((x) => !x.reported && x.victim === d.victim && dist(p, x) < 130); if (b) startMeeting(p, b); break; }
    case "bell": { if (!playing || !p.alive || G.bellUsed) return; G.bellUsed = true; startMeeting(p, null); break; }
    case "done": { if (p.tasks.includes(d.task) && !p.done.includes(d.task)) { p.done.push(d.task); emit("done", { by, task: d.task }); } checkEnd(); break; }
    case "fix": { if (G.lightsOut > 0) { G.lightsOut = 0; G.fixer = null; emit("lights", { on: true, by }); } break; }
    case "lights": { if (playing && p.isThief && p.alive && G.lightsOut === 0) lightsOut(); break; }
    case "fake": { p.fakeT = 6; p.fakeSpot = d.spot; break; }
    case "ability": { if (playing && p.alive) applyAbility(p); break; }
    case "vote": hostVote(by, d.target); break;
    case "startvote": if (G.meeting && G.meeting.phase === "talk") openVoting(); break;
  }
}
function applyAbility(p) {
  const r = ROLES[p.role]; if (!r.ability) return;
  const priv = (kind, data = {}) => emit("private", { to: p.id, kind, ...data });
  if (p.role === "landlord") { if (p.landlordUsed) return; p.landlordUsed = true; startMeeting(p, null, true); return; }
  if (p.role === "mamaput" || p.role === "marketwoman") { if (p.gossipUsed) return; p.gossipUsed = true; const x = pick(P.filter((o) => o !== p && !o.isThief)); priv("gossip", { x: x.id }); return; }
  if (p.role === "driver") { brake(p); return; }
  if (p.role === "conductor") { const counts = {}; P.filter((o) => o.alive && o !== p).forEach((o) => { const a = M.areaName[areaOf(o)]; counts[a] = (counts[a] || 0) + 1; }); priv("headcount", { list: Object.entries(counts).sort((a, b) => b[1] - a[1]) }); return; }
  if (p.role === "evangelist") { const t = P.filter((o) => o !== p && o.alive && dist(o, p) < 90).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!t) { priv("nobody", { what: "pray" }); return; } t.shieldUntil = G.t + 40; priv("prayed", { x: t.id }); return; }
  if (p.role === "yahoo") { const t = P.filter((o) => o !== p && o.alive && dist(o, p) < 120).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!t) { priv("nobody", { what: "copy" }); return; } p.disguise = { as: t.id, until: G.t + 15 }; priv("disguised", { x: t.id }); }
}
// ---------- Everyone: react to what the host decided ----------
function applyEv(type, d) {
  if (!G || !me) return;
  switch (type) {
    case "steal": onStealEvent(d); break;
    case "blocked": { const th = P[d.thief], v = P[d.victim]; if (th === me) { G.stealCd = 10; toast(`${v.name} is covered by prayer. Your hand no fit touch am!`, "bad"); } else if (me.alive && dist(me, v) < 300) toast(`Somebody tried ${v === me ? "your" : v.name + "'s"} phone, but the prayer covered it!`, "good"); break; }
    case "tripped": if (P[d.thief] === me) toast("The bus is braking. You lost your balance!", "bad"); break;
    case "lights":
      if (!d.on) { G.lightsOut = 22; sfx("lights"); toast(M.txt.lightsOff, "bad"); }
      else { G.lightsOut = 0; G.fixer = null; if (d.by == null) toast(M.txt.lightsOn, "good"); else if (P[d.by] === me) { sfx("done"); toast(M.txt.fixYou, "good"); } else toast(M.txt.fixBot(P[d.by].name), "good"); }
      break;
    case "brake": G.brakeT = 4; sfx("horn"); buzz(200); toast(`${Nm(P[d.by])} hit the hard brake! Everybody stumbles.`, "bad"); break;
    case "done": { const p = P[d.by]; if (p && p !== me && !p.done.includes(d.task)) p.done.push(d.task); break; }
    case "private": {
      if (P[d.to] !== me) break;
      if (d.kind === "gossip") { G.knownInnocent = d.x; sfx("done"); toast(`Gist: ${P[d.x].name} is NOT a thief. You fit trust am.`, "good"); }
      if (d.kind === "headcount") { G.headcount = d.list; G.headcountUntil = G.t + 12; sfx("tap"); toast("Heads counted. Check the list under the map.", "good"); }
      if (d.kind === "prayed") { sfx("done"); toast(`You prayed for ${P[d.x].name}. No thief can touch their phone for 40 seconds.`, "good"); }
      if (d.kind === "disguised") { sfx("tap"); toast(`You now look like ${P[d.x].name} for 15 seconds.`); }
      if (d.kind === "nobody") { me.abil.cd = 0; toast(d.what === "pray" ? "Stand next to someone to pray for them." : "Stand near someone to copy their look.", "bad"); }
      lastActionsKey = ""; break;
    }
    case "meeting": beginMeeting(d); break;
    case "voteopen": if (G.meeting && G.meeting.phase === "talk") enterVotePhase(); break;
    case "voted": if (G.meeting) { if (G.meeting.cast[d.by] === undefined) G.meeting.cast[d.by] = true; markVoted(d.by); } break;
    case "result": showResult(d); break;
    case "resume": closeModal(); afterMeeting(); break;
    case "end": showEnd(d); break;
  }
}
// ---------- Game screen ----------
function renderGame() {
  root.innerHTML = `<div class="wrap">
    <div class="hud"><span class="role" id="role">Housemate</span><div class="taskbar"><span id="tlabel">Chores</span><i><b id="tfill"></b></i></div><span class="alive" id="alive"></span></div>
    <div class="stage"><canvas id="cv" aria-label="Map. Drag to move."></canvas><div class="toasts" id="toasts" aria-live="polite"></div><div class="hint" id="hint">Drag on the map to walk</div></div>
    <div class="actions" id="actions"></div>
    <section class="panel" id="side"></section>
    <p class="foot"><button class="btn btn-ghost btn-sm" data-act="quit">Quit to menu</button></p>
  </div>`;
  cv = $("#cv"); ctx = cv.getContext("2d"); lastActionsKey = "";
  resize(); bindPad(cv);
  gameRunning = true; last = performance.now(); requestAnimationFrame(gameFrame);
}
let lastActionsKey = "";
function updateHud() {
  if (!G || !$("#role")) return;
  const role = $("#role"), crewName = M.id === "danfo" ? "Passenger" : "Housemate";
  role.className = "role" + (me.isThief ? " thief" : "") + (!me.alive ? " ghost" : "");
  void crewName; role.textContent = !me.alive ? (me.ejected ? "Kicked out" : "Phoneless ghost") : me.isThief ? `Thief · ${ROLES[me.role].name}` : ROLES[me.role].name;
  const pct = Math.round((doneTasks() / totalTasks()) * 100);
  $("#tfill").style.width = pct + "%"; $("#tlabel").textContent = `${M.title} chores ${pct}%`;
  $("#alive").innerHTML = `${P.filter((p) => p.alive).length} with phones<br>${plural(G.thieves, "thief", "thieves")} in game`;
  const acts = [];
  if (me.isThief && me.alive) {
    const t = stealTarget();
    acts.push(`<button class="btn btn-red" data-act="steal" ${t ? "" : "disabled"}>${G.stealCd > 0 ? `Steal (${Math.ceil(G.stealCd)})` : t ? `Steal ${esc(t.name)}'s phone` : "Steal phone"}</button>`);
    acts.push(`<button class="btn" data-act="fake" ${nearAnySpot() && me.fakeT <= 0 ? "" : "disabled"}>${me.fakeT > 0 ? "Faking..." : "Fake chore"}</button>`);
    acts.push(`<button class="btn" data-act="lights" ${G.sabCd <= 0 && G.lightsOut === 0 ? "" : "disabled"}>${G.sabCd > 0 ? `${M.txt.sabBtn} (${Math.ceil(G.sabCd)})` : M.txt.sabBtn}</button>`);
  } else {
    const t = nearTask();
    acts.push(`<button class="btn btn-green" data-act="use" ${t || nearFix() ? "" : "disabled"}>${nearFix() ? M.txt.fixBtn : t ? esc(M.spots[t].name) : "Do chore"}</button>`);
  }
  if (me.alive) { acts.push(`<button class="btn btn-red" data-act="report" ${nearBody() ? "" : "disabled"}>Report</button>`); if (nearBell()) acts.push(`<button class="btn" data-act="bell">${M.txt.bellBtn}</button>`); }
  const rd = ROLES[me.role];
  if (rd.ability && me.alive) acts.push(`<button class="btn btn-ghost" data-act="ability" ${abilityReady() ? "" : "disabled"}>${esc(rd.ability)}${rd.uses ? (me.abil.uses > 0 ? "" : " (used)") : me.abil.cd > 0 ? ` (${Math.ceil(me.abil.cd)})` : ""}</button>`);
  if (S().voice && me.alive) acts.push(`<button class="btn btn-ghost" data-act="mic" aria-pressed="${!!G.mic}">${G.mic ? "Mic on" : "Mic off"}</button>`);
  else if (S().voice && NET.online) acts.push(`<button class="btn btn-ghost" disabled aria-label="Your mic is off because you're out of the round">Mic off · you're out</button>`);
  if (me.alive) acts.push(`<button class="btn btn-ghost" data-act="emote">Emote</button>`);
  const key = acts.join("");
  if (key !== lastActionsKey) { $("#actions").innerHTML = key; lastActionsKey = key; }
  let side;
  const roleInfo = `<p class="small" style="margin:0"><strong style="color:var(--lantern)">${esc(rd.name)}:</strong> ${esc(rd.desc)}</p>`
    + (G.knownInnocent != null ? `<p class="small" style="margin:0;color:#b9f5d4">Your gist: ${esc(P[G.knownInnocent].name)} is NOT a thief.</p>` : "")
    + (G.headcount && G.headcountUntil > G.t ? `<p class="small" style="margin:0">Head count: ${G.headcount.map(([a, n2]) => `${esc(a)} ${n2}`).join(" · ")}</p>` : "")
    + (RADIO.cur ? `<p class="tiny muted" style="margin:0">Now playing on the radio: ${esc((RADIO.cur.artist ? RADIO.cur.artist + " - " : "") + (RADIO.cur.song_title || RADIO.cur.headline))} · sponsored${RADIO.cur.link_url ? ` · <a href="${esc(RADIO.cur.link_url)}" target="_blank" rel="noopener sponsored" style="color:var(--lantern)">Listen</a>` : ""}</p>` : "");
  if (me.isThief) {
    const partners = thiefList().filter((p) => p !== me);
    side = `<h3>Your mission</h3><p class="small" style="margin:0">Steal phones until thieves equal the ${crewWord()} who still have phones. Don't let anybody see you.</p>
      ${partners.length ? `<p class="small" style="margin:0;color:#ffc4c4">Your partner${partners.length > 1 ? "s" : ""}: ${partners.map((p) => esc(p.name) + (p.alive ? "" : " (out)")).join(", ")}</p>` : ""}
      <p class="small muted" style="margin:0">Fake chores where people can see you: at meetings they'll defend you. If the chore bar fills up, you lose.</p>`;
  } else side = `<h3>${me.alive ? "Your chores" : "Your chores (you can still help as a ghost)"}</h3><ul class="tasks">${me.tasks.map((id) => `<li class="${me.done.includes(id) ? "done" : ""}">${esc(M.spots[id].name)} <span class="tiny muted">· ${esc(M.areaName[M.spots[id].area])}</span></li>`).join("")}</ul>${G.playerWitness ? `<p class="small" style="margin:0;color:#ffd0d0">You saw ${esc(P[G.playerWitness.culprit].name)} collect ${esc(P[G.playerWitness.victim].name)}'s phone. Report it!</p>` : ""}`;
  side = roleInfo + side;
  if ($("#side").dataset.k !== side) { $("#side").innerHTML = side; $("#side").dataset.k = side; }
  const hint = $("#hint"); if (hint && G.t > 6) hint.remove();
}
function toast(msg, kind = "") {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div"); el.className = "toast " + kind; el.textContent = msg;
  box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}

// ---------- Overlays ----------
const ov = $("#ov"), modal = $("#modal");
function openModal(html, wide = false) { modal.className = "modal" + (wide ? " wide" : ""); modal.innerHTML = html; ov.hidden = false; modal.scrollTop = 0; joy = null; keys.clear(); const f = modal.querySelector("[data-focus]") || modal.querySelector("button"); if (f) f.focus({ preventScroll: true }); }
function closeModal() { ov.hidden = true; modal.innerHTML = ""; modal.className = "modal"; }
function showReveal() {
  G.paused = true;
  const partners = me.isThief ? thiefList().filter((p) => p !== me) : [], n = P.length - 1, crewName = M.id === "danfo" ? "Passenger" : "Housemate";
  openModal(`<div class="reveal modal" style="border:0;padding:0;background:none">
    <p class="eyebrow">${esc(M.txt.place)}</p><p class="tiny muted" style="margin:-6px 0 0">Your role was chosen at random</p><div id="revPic"></div>
    <h2 class="display big-role" id="mtitle" style="color:${me.isThief ? "var(--red)" : "var(--green)"}">${me.isThief ? "You be Thief" : ROLES[me.role].name}</h2>
    <p style="margin:0"><span class="chip ${me.isThief ? "red" : "green"}">${me.isThief ? `Thief type: ${esc(ROLES[me.role].name)}` : `On the ${M.id === "danfo" ? "passengers'" : "housemates'"} side`}</span></p>
    <p style="margin:0"><strong>Your power:</strong> ${esc(ROLES[me.role].desc)}</p>
    <p>${me.isThief ? `Steal phones without being seen. Fake chores in public, kill the lights to cause wahala, and lie with confidence at meetings.` : `${G.thieves === 1 ? "One of the" : `${G.thieves} of the`} ${n} people with you ${G.thieves === 1 ? "is a thief" : "are thieves"}. Finish your chores, watch your back, and vote the thieves out.`}</p>
    ${partners.length ? `<p class="small" style="margin:0;color:#ffc4c4">Your partner${partners.length > 1 ? "s" : ""} in crime:</p><div class="partners" id="partners"></div>` : ""}
    ${sponsorHTML("round")}
    <button class="btn btn-block" data-act="enter" data-focus>Let's go</button></div>`);
  $("#revPic").appendChild(portrait(me.look, 96, 122));
  const box = $("#partners"); if (box) partners.forEach((p) => { const f = document.createElement("figure"); f.appendChild(portrait(p.look, 56, 70)); f.insertAdjacentHTML("beforeend", esc(p.name)); box.appendChild(f); });
}
function youGotRobbed(thief) {
  G.paused = true;
  openModal(`<div class="modal-head"><h2 class="display" id="mtitle" style="color:var(--red)">Your phone don miss!</h2></div>
    <p>${esc(thief.name)} crept up and collected your phone. You are now a phoneless ghost: nobody can see you and you can't vote, but you can still finish your chores to help your side win.</p>
    <p class="small muted">Now you know one of the thieves. Watch how they lie at the next meeting.</p>
    <button class="btn btn-block" data-act="resume" data-focus>Continue as a ghost</button>`);
}

// ---------- Chore mini-games (longer than before) ----------
let miniToken = 0;
const SWEEP_V = {
  leaf:   { n: 10, bg: "#4a463e", color: "#7cbf3a", radius: "50% 0", text: "Sweep every leaf off the compound.", left: "leaves left", label: "Leaf" },
  stain:  { n: 10, bg: "#cfd8dc", color: "#8a7a4a", radius: "45% 55% 50% 40%", text: "Scrub off every stain.", left: "stains left", label: "Stain" },
  mud:    { n: 10, bg: "#f2c230", color: "#6b4a2a", radius: "40% 60% 55% 45%", text: "Wash the mud off the danfo.", left: "mud spots left", label: "Mud" },
  glass:  { n: 10, bg: "#9fd0ea", color: "#8a7a5a", radius: "45% 55% 50% 40%", text: "Wipe every dirty spot off the windows.", left: "spots left", label: "Dirty spot" },
  sachet: { n: 10, bg: "#3d3832", color: "#e8f4ff", radius: "4px", text: "Pick up every empty pure water sachet.", left: "sachets left", label: "Sachet" },
  dust:   { n: 10, bg: "#3d3832", color: "#9a8a6a", radius: "50%", text: "Sweep the dust out of the aisle.", left: "dust piles left", label: "Dust" },
};
const ORDER_V = {
  numbers: { items: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], text: "Tick the visitors in order, 1 to 9." },
  months: { items: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"], text: "File the receipts in order, January to September." },
  stops: { items: ["Oshodi", "Anthony", "Obanikoro", "Palmgrove", "Onipan", "Fadeyi", "Jibowu", "Yaba", "CMS"], text: "Call the bus stops in order, from Oshodi to CMS." },
};
function openMini(id) {
  const s = M.spots[id]; G.mini = id; const tok = ++miniToken;
  const head = `<div class="modal-head"><h2 class="display" id="mtitle" style="font-size:20px">${esc(s.name)}</h2><button class="x" data-act="closemini" aria-label="Close">✕</button></div>`;
  const done = () => { if (tok !== miniToken) return; miniToken++; me.done.push(id); G.mini = null; closeModal(); sfx("done"); buzz(30); toast(`Chore done: ${s.name}`, "good"); sendAct("done", { task: id }); };
  const wrong = (el) => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
  if (s.type === "timing") {
    const goal = 5;
    openModal(head + `<p class="small muted" style="margin:0">Pull the starter when the needle is in the green. ${goal} good pulls. A miss costs you one.</p><div class="meter"><div class="zone" id="zone"></div><div class="needle" id="needle"></div></div><p id="hits" class="small" style="margin:0">Good pulls: 0/${goal}</p><button class="btn btn-block" id="pull" data-focus>Pull</button>`);
    let hits = 0, pos = 0, dir = 1, z = rand(0.25, 0.7), lt = performance.now();
    const zone = $("#zone"), needle = $("#needle"), setZone = () => { zone.style.left = z * 100 + "%"; zone.style.width = "15%"; }; setZone();
    const loop = (t) => { if (tok !== miniToken) return; const d = (t - lt) / 1000; lt = t; pos += dir * d * (0.9 + hits * 0.22); if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } needle.style.left = pos * 100 + "%"; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    $("#pull").onclick = () => { if (pos >= z && pos <= z + 0.15) { hits++; sfx("tap"); z = rand(0.08, 0.8); setZone(); } else { hits = Math.max(0, hits - 1); wrong($("#pull")); } $("#hits").textContent = `Good pulls: ${hits}/${goal}`; if (hits >= goal) done(); };
  } else if (s.type === "hold") {
    const v = s.v, secs = 4.5;
    const vis = v === "battery" ? `<div class="battery"><b id="fillEl" style="width:0%"></b></div>` : v === "tyre" ? `<div class="tyre" id="tyreEl"><b id="psi">0 psi</b></div>` : `<div class="tank"><b id="fillEl" style="height:0%"></b></div>`;
    const msg = v === "battery" ? "Press and hold to charge the clippers to full." : v === "tyre" ? "Press and hold to pump the tyre to 35 psi." : "Press and hold to pump until the tank is full.";
    openModal(head + `<p class="small muted" style="margin:0">${msg} Let go and it drains.</p>${vis}<button class="btn btn-block" id="pump" data-focus style="touch-action:none">Hold to ${v === "battery" ? "charge" : "pump"}</button>`);
    let fill = 0, holding = false, lt = performance.now();
    const btn = $("#pump");
    btn.addEventListener("pointerdown", (e) => { holding = true; btn.setPointerCapture(e.pointerId); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => btn.addEventListener(ev, () => (holding = false)));
    btn.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { holding = true; e.preventDefault(); } });
    btn.addEventListener("keyup", () => (holding = false));
    const loop = (t) => {
      if (tok !== miniToken) return; const d = (t - lt) / 1000; lt = t;
      fill = clamp(fill + (holding ? d / secs : -d / 6), 0, 1);
      if (v === "tyre") { $("#psi").textContent = `${Math.round(fill * 35)} psi`; $("#tyreEl").style.transform = `scale(${0.85 + fill * 0.15})`; }
      else $("#fillEl").style[v === "battery" ? "width" : "height"] = fill * 100 + "%";
      if (fill >= 1) return done(); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } else if (s.type === "stir") {
    const radio = s.v === "radio", goal = 25;
    openModal(head + `<p class="small muted" style="margin:0">${radio ? "Turn the knob until the station comes in clear. Tap 25 times." : "Stir fast before the jollof burns. Tap 25 times."}</p>${radio ? `<div class="tyre" id="knob" style="width:120px;height:120px;background:#333"><b id="stirs" style="background:#2bd47d;width:70px;height:70px">0/${goal}</b></div>` : `<div class="pot-vis"><b id="jol"></b></div><p class="pot" id="stirs">0/${goal} stirs</p>`}<button class="btn btn-block" id="stir" data-focus>${radio ? "Turn" : "Stir"}</button>`);
    let n = 0;
    $("#stir").onclick = () => { n++; sfx("tap"); if (radio) { $("#stirs").textContent = `${n}/${goal}`; $("#knob").style.transform = `rotate(${n * 22}deg)`; } else { $("#stirs").textContent = `${n}/${goal} stirs`; $("#jol").style.filter = `hue-rotate(${n * 3}deg) brightness(${1 + n * 0.012})`; } if (n >= goal) done(); };
  } else if (s.type === "pound") {
    const goal = 20, seat = s.v === "seat";
    openModal(head + `<p class="small muted" style="margin:0">${seat ? "Hammer the left screw, then the right, then the left." : "Pound left, then right, then left."} ${goal} good hits. Don't hit the same side twice.</p><div class="mortar" id="mortar" ${seat ? 'style="background:#6b2f2a;border-radius:10px;border-top-color:#8a3e36"' : ""}>0/${goal}</div><div class="pound"><button class="btn" id="pl" data-focus>Left</button><button class="btn" id="pr">Right</button></div>`);
    let n = 0, lastSide = null;
    const hit = (side, el) => { if (side === lastSide) { wrong(el); n = Math.max(0, n - 1); $("#mortar").textContent = `${n}/${goal}`; return; } lastSide = side; n++; sfx("tap"); $("#mortar").textContent = `${n}/${goal}`; if (n >= goal) done(); };
    $("#pl").onclick = (e) => hit("l", e.currentTarget); $("#pr").onclick = (e) => hit("r", e.currentTarget);
  } else if (s.type === "order") {
    const v = ORDER_V[s.v], items = v.items;
    openModal(head + `<p class="small muted" style="margin:0">${v.text} A wrong tap starts you over.</p><div class="grid ${s.v === "stops" ? "small" : ""}" id="grid">${shuffle(items).map((x) => `<button data-v="${x}">${x}</button>`).join("")}</div>`);
    let next = 0;
    $("#grid").onclick = (e) => {
      const b = e.target.closest("button"); if (!b || b.classList.contains("ok")) return;
      if (b.dataset.v === items[next]) { b.classList.add("ok"); sfx("tap"); next++; if (next === items.length) setTimeout(done, 200); }
      else { next = 0; $("#grid").querySelectorAll("button").forEach((x) => x.classList.remove("ok")); b.classList.add("bad"); setTimeout(() => b.classList.remove("bad"), 300); }
    };
  } else if (s.type === "change") {
    const fare = s.v === "fare", rounds = 3; let round = 0;
    const ask = () => {
      const paid = fare ? 1000 : 2000, price = fare ? 50 * randi(3, 17) : 50 * randi(22, 38), ch = paid - price, opts = shuffle([ch, ch + 100, Math.max(50, ch - 50)]);
      openModal(head + `<p class="round">Customer ${round + 1} of ${rounds}</p><p style="margin:0">${fare ? "Fare is" : "Fuel costs"} <strong>₦${price.toLocaleString()}</strong>. They gave you <strong>₦${paid.toLocaleString()}</strong>. How much change?</p><div class="grid" id="grid">${opts.map((x) => `<button data-v="${x}">₦${x}</button>`).join("")}</div>`);
      $("#grid").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; if (Number(b.dataset.v) === ch) { b.classList.add("ok"); sfx("tap"); round++; setTimeout(() => (round >= rounds ? done() : ask()), 250); } else { toast(fare ? "Passenger: Conductor, count am well!" : "Wrong change. The customer is shouting.", "bad"); ask(); } };
    };
    ask();
  } else if (s.type === "bill") {
    const MENUS = { food: [["Jollof rice", 500], ["Beans", 300], ["Dodo", 200], ["Beef", 400], ["Fish", 500], ["Eba", 300], ["Egg", 150], ["Moi moi", 250]],
      fares: [["Oshodi to Yaba", 300], ["Oshodi to CMS", 500], ["Anthony to Fadeyi", 200], ["Obanikoro to CMS", 400], ["Jibowu to CMS", 250], ["Palmgrove to Yaba", 150]] };
    const rounds = 2; let round = 0;
    const ask = () => {
      const order = shuffle(MENUS[s.v]).slice(0, 4), total = order.reduce((a, [, p]) => a + p, 0), opts = shuffle([total, total + 100, total - 50]);
      openModal(head + `<p class="round">${s.v === "fares" ? "Row" : "Customer"} ${round + 1} of ${rounds}</p><p style="margin:0">${s.v === "fares" ? "These passengers owe:" : "A customer wants:"}</p><div class="receipt">${order.map(([n2, p]) => `<div><span>${n2}</span><span>₦${p}</span></div>`).join("")}</div><p style="margin:0">What's the total?</p><div class="grid" id="grid">${opts.map((x) => `<button data-v="${x}">₦${x.toLocaleString()}</button>`).join("")}</div>`);
      $("#grid").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; if (Number(b.dataset.v) === total) { b.classList.add("ok"); sfx("tap"); round++; setTimeout(() => (round >= rounds ? done() : ask()), 250); } else { toast(s.v === "fares" ? "Driver: Conductor, you dey whine me?" : "Mama Put says: count am again!", "bad"); ask(); } };
    };
    ask();
  } else if (s.type === "match") {
    const lug = s.v === "luggage", cols = ["#e94b4b", "#2d6cdf", "#2bd47d", "#f5e663", "#8e6cf0", "#ff8c42"], items = shuffle([...cols, ...cols]);
    const shape = lug ? "--shape: inset(10% 0 0 0 round 6px)" : "";
    openModal(head + `<p class="small muted" style="margin:0">${lug ? "Tap two bags of the same colour to stack them." : "Tap two clothes of the same colour to fold them together."} 6 pairs.</p><div class="grid four" id="grid">${items.map((c, i) => `<button class="cloth" data-c="${c}" aria-label="${lug ? "Bag" : "Cloth"} ${i + 1}" style="${shape}"><i style="--c:${c}"></i></button>`).join("")}</div>`);
    let sel = null, pairs = 0;
    $("#grid").onclick = (e) => {
      const b = e.target.closest("button"); if (!b || b.classList.contains("ok")) return;
      if (!sel) { sel = b; b.classList.add("sel"); return; }
      if (sel === b) { b.classList.remove("sel"); sel = null; return; }
      if (sel.dataset.c === b.dataset.c) { sel.classList.remove("sel"); sel.classList.add("ok"); b.classList.add("ok"); sel = null; pairs++; sfx("tap"); if (pairs === 6) setTimeout(done, 200); }
      else { const a = sel; a.classList.remove("sel"); sel = null; wrong(b); wrong(a); }
    };
  } else if (s.type === "wires") {
    const cols = [["#e94b4b", "Red"], ["#2d6cdf", "Blue"], ["#2bd47d", "Green"], ["#f5e663", "Yellow"], ["#8e6cf0", "Purple"], ["#ff8c42", "Orange"]];
    openModal(head + `<p class="small muted" style="margin:0">Tap a wire on the left, then the matching colour on the right. 6 wires.</p>
      <div class="wires"><div id="wl">${shuffle(cols).map(([c, n2]) => `<button class="wire" data-c="${c}"><i style="--c:${c}"></i>${n2}</button>`).join("")}</div><div id="wr">${shuffle(cols).map(([c, n2]) => `<button class="wire" data-c="${c}"><i style="--c:${c}"></i>${n2}</button>`).join("")}</div></div>`);
    let sel = null, ok = 0;
    $("#wl").onclick = (e) => { const b = e.target.closest("button"); if (!b || b.classList.contains("ok")) return; if (sel) sel.classList.remove("sel"); sel = b; b.classList.add("sel"); };
    $("#wr").onclick = (e) => {
      const b = e.target.closest("button"); if (!b || b.classList.contains("ok") || !sel) return;
      if (b.dataset.c === sel.dataset.c) { b.classList.add("ok"); sel.classList.remove("sel"); sel.classList.add("ok"); sel = null; ok++; sfx("tap"); if (ok === 6) setTimeout(done, 200); }
      else wrong(b);
    };
  } else if (s.type === "sweep") {
    const v = SWEEP_V[s.v] || SWEEP_V.leaf;
    openModal(head + `<p class="small muted" style="margin:0">${v.text}</p><div class="yard" id="yard" style="background:${v.bg}"></div><p class="small" id="left" style="margin:0">${v.n} ${v.left}</p>`);
    const yard = $("#yard"); let left = v.n;
    for (const c of shuffle([...Array(15).keys()]).slice(0, v.n)) {
      const b = document.createElement("button"); b.className = "spec"; b.setAttribute("aria-label", v.label);
      b.style.background = v.color; b.style.borderRadius = v.radius;
      b.style.left = `calc(${(c % 5) * 20 + 2}% + ${rand(0, 6)}px)`; b.style.top = `calc(${Math.floor(c / 5) * 33 + 2}% + ${rand(0, 10)}px)`; b.style.setProperty("--r", rand(0, 360) + "deg");
      b.onclick = () => { b.remove(); sfx("tap"); left--; $("#left").textContent = `${left} ${v.left}`; if (!left) done(); };
      yard.appendChild(b);
    }
  }
}

// =====================================================================
// Emergency meeting: everybody sits down, talks, then votes. Up to 2 minutes.
// =====================================================================
// Host: build what the computer players will say, then tell everyone the meeting has started.
function startMeeting(reporter, body, special) {
  if (!AUTH() || G.mode !== "play") return;
  G.mode = "meeting"; G.paused = true;
  G.bodies.forEach((b) => (b.reported = true));
  const alive = P.filter((p) => p.alive);
  const accused = {}, add = (id, v) => (accused[id] = (accused[id] || 0) + v);
  const lines = [], say = (p, msg) => lines.push({ p, text: msg });
  const where = body ? M.areaName[body.area] : null;
  const intro = body ? `${Nm(reporter)} found ${P[body.victim].name} without a phone in the ${where}.` : special ? `${Nm(reporter)} used the Landlord's power and called everybody to the parlour.` : `${Nm(reporter)} ${M.txt.bellIntro}.`;
  const speakers = [reporter, ...shuffle(alive.filter((p) => p !== reporter))].filter((p) => p.isBot && p.alive);
  const witnesses = [], areas = Object.values(M.rooms).map((r) => r.name);
  // Lines are written from each listener's point of view later, so use names here (not "you").
  const nmx = (p) => p.name;
  for (const b of speakers) {
    if (b.isThief) {
      const accuser = witnesses.find((w) => P[w.witness.culprit].isThief);
      if (accuser) { const c = P[accuser.witness.culprit]; say(b, c === b ? `Lie lie! ${accuser.name} is the one. I was in the ${pick(areas)} the whole time.` : `Wait o. ${accuser.name}, are you sure? It was dark. I think ${accuser.name} is lying.`); add(accuser.id, 1.2); continue; }
      const others = alive.filter((p) => p !== b && p !== reporter && !p.isThief);
      if (body && Math.random() < 0.55 && others.length) { const x = pick(others); say(b, `I saw ${nmx(x)} around the ${where} o. I'm just saying.`); add(x.id, 1.1); }
      else say(b, body ? `I was busy with my chores in the ${pick(areas)}. No look me.` : pick(M.txt.bellLines));
      continue;
    }
    if (b.witness && P[b.witness.culprit].alive) {
      const c = P[b.witness.culprit], first = !witnesses.some((w) => w.witness.culprit === c.id);
      say(b, first ? `I SAW AM! ${c.name} collected ${P[b.witness.victim].name}'s phone. ${c.name} be thief!` : pick([`Na true! I saw ${nmx(c)} too, with my two eyes.`, `I was right there. Na ${nmx(c)} o.`, `I fit swear. Na ${nmx(c)}.`]));
      add(c.id, 3.2); witnesses.push(b); continue;
    }
    if (body) {
      const near = Object.entries(b.seen).filter(([id, s]) => s.area === body.area && Math.abs(s.t - body.t) < 22 && P[id].alive && Number(id) !== b.id).map(([id]) => P[id]);
      if (near.length) { const x = pick(near); say(b, `I saw ${nmx(x)} near the ${where} before the phone missed.`); add(x.id, 1.3); }
      else say(b, pick([`I was in the ${M.areaName[areaOf(b)]}. I no see anything.`, "I no know anything o. Make we skip if no evidence.", `Nobody pass me for the ${M.areaName[areaOf(b)]}.`]));
    } else say(b, pick(M.txt.bellLines));
  }
  for (const b of speakers) {
    if (b.isThief) continue;
    if (b.knows != null && (accused[b.knows] || 0) > 0 && P[b.knows].alive) { say(b, `${ROLES[b.role].name} talking: I know for sure ${nmx(P[b.knows])} is NOT a thief. Leave am.`); accused[b.knows] -= 2.5; }
    if (b.role === "conductor" && body) say(b, `Conductor here. I counted heads: ${body.count} people were in the ${where} when it happened.`);
  }
  for (const [id, score] of Object.entries(accused)) {
    if (score >= 3) continue;
    const def = shuffle(alive.filter((p) => p.isBot && !p.isThief && p.id !== Number(id) && p.vouch[id]))[0];
    if (def) { const x = P[id]; say(def, `No be ${nmx(x)} o. I saw ${nmx(x)} ${def.vouch[id]} with my own eyes.`); add(id, -1.2); }
  }
  G.hostAccused = accused;
  emit("meeting", { intro, lines: lines.map((l) => [l.p.id, l.text]), seats: alive.map((p) => p.id), startEpoch: Date.now(), talkMs: TALK_MS[S().talk] || 1800, secs: G.meetSecs || MEETING_SECONDS });
}
// Everyone: sit down and open the meeting.
function beginMeeting(d) {
  hush(); sfx(M.id === "danfo" ? "horn" : "bell"); buzz([120, 60, 120]);
  G.mode = "meeting"; G.paused = true; G.meetings++;
  joy = null; keys.clear();
  if (G.mini) { G.mini = null; miniToken++; }
  G.bodies.forEach((b) => (b.reported = true));
  const now = performance.now(), age = clamp(Date.now() - d.startEpoch, 0, 5000);
  // Swap your own name for "you" in what people say.
  const mine = new RegExp(`\\b${me.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  G.meeting = {
    intro: d.intro.replace(mine, "you"), lines: d.lines.map(([id, t]) => ({ p: P[id], text: P[id] === me ? t : t.replace(mine, "you") })), accused: AUTH() ? G.hostAccused || {} : {},
    phase: "talk", shown: 0, talkMs: d.talkMs, secs: d.secs, nextLineAt: now - age + 900, start: now - age, cast: {}, plan: {}, revealAt: {},
    pick: null, myVote: undefined, speaker: null, speakerUntil: 0, out: null, seats: d.seats, chatAt: 0,
  };
  showMeeting();
}
function showMeeting() {
  const m = G.meeting;
  const chat = NET.online && me.alive ? `<form id="chatForm" class="add-row" autocomplete="off"><label for="chatIn" class="sr">Say something</label><input class="field" id="chatIn" maxlength="100" placeholder="Say something to everyone..."><button class="btn btn-sm" type="submit">Send</button></form>` : "";
  openModal(`<div class="modal-head"><div><p class="eyebrow" style="color:var(--muted)">Emergency meeting</p><h2 class="display" id="mtitle" style="color:var(--lantern)">${esc(M.txt.meetTitle)}</h2></div><span class="timer" id="mtimer" aria-label="Time left">${Math.floor(m.secs / 60)}:00</span></div>
    <p class="small" style="margin:0">${esc(m.intro)} ${esc(M.txt.meetWhere)}</p>
    <canvas class="scene" id="mscene" aria-label="Everyone seated for the meeting"></canvas>
    <div class="chat" id="chat" aria-live="polite"></div>
    ${chat}
    <div id="voteArea"><button class="btn btn-ghost btn-block" data-act="startvote">Start voting now</button></div>`, true);
  const c = $("#mscene"), d = Math.min(2, devicePixelRatio || 1); c.width = 440 * d; c.height = 240 * d; m.sctx = c.getContext("2d"); m.sctx.scale(d, d);
  clearInterval(G.meetIv); G.meetIv = setInterval(meetTick, 200);
  requestAnimationFrame(meetFrame);
}
function addChatLine(p, msg, typed) {
  const chat = $("#chat"); if (!chat) return;
  const el = document.createElement("div"); el.className = "line";
  el.innerHTML = `<span class="dot" style="background:${p.look.c1}"></span><div><b>${esc(p === me ? "You" : p.name)}${typed ? ' <span class="tiny muted">typed</span>' : ""}</b><p>${esc(msg)}</p></div>`;
  chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
}
function onChat(d) { if (!G || !G.meeting || !P[d.by]) return; const p = P[d.by]; if (!p.alive) return; addChatLine(p, String(d.text).slice(0, 100), true); G.meeting.speaker = p.id; G.meeting.speakerUntil = performance.now() + 1600; sfx("tap"); }
function meetTick() {
  const m = G && G.meeting; if (!m || G.mode !== "meeting") { if (G) clearInterval(G.meetIv); return; }
  const now = performance.now(), left = Math.max(0, m.secs - (now - m.start) / 1000);
  const t = $("#mtimer"); if (t) { t.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`; t.classList.toggle("low", left < 20); }
  if (m.phase === "talk") {
    if (m.shown < m.lines.length && now >= m.nextLineAt) {
      const { p, text: msg } = m.lines[m.shown++];
      addChatLine(p, msg); sfx("tap");
      m.speaker = p.id; m.speakerUntil = now + Math.min(1600, m.talkMs);
      m.nextLineAt = now + m.talkMs;
    } else if (AUTH() && m.shown >= m.lines.length && now >= m.nextLineAt) openVoting();
    if (AUTH() && left <= 0) { openVoting(); finishVote(); }
  }
  if (m.phase === "vote" && AUTH()) {
    for (const [id, at] of Object.entries(m.revealAt)) if (m.cast[id] === undefined && now >= at) { m.cast[id] = m.plan[id]; emit("voted", { by: Number(id) }); }
    const voters = P.filter((p) => p.alive);
    if (voters.every((p) => m.cast[p.id] !== undefined) || left <= 0) finishVote();
  }
}
function botPlan() {
  const m = G.meeting, voters = P.filter((p) => p.alive && p.isBot), plan = {};
  const topOf = (v, skipThieves) => Object.entries(m.accused).filter(([id]) => Number(id) !== v.id && P[id].alive && !(skipThieves && P[id].isThief)).sort((a, b) => b[1] - a[1])[0];
  const everyone = P.filter((p) => p.alive);
  for (const v of voters) {
    let target = "skip";
    if (v.isThief) { const top = topOf(v, true), pool = everyone.filter((x) => x !== v && !x.isThief); target = top && top[1] > 0 ? Number(top[0]) : Math.random() < 0.5 || !pool.length ? "skip" : pick(pool).id; }
    else if (v.witness && P[v.witness.culprit].alive) target = v.witness.culprit;
    else { const top = topOf(v, false); if (top && top[1] >= 1.2 && Math.random() < G.dif.follow) target = Number(top[0]); else if (Math.random() < 0.12) target = pick(everyone.filter((x) => x !== v)).id; }
    plan[v.id] = target;
  }
  return plan;
}
// Host opens voting and decides when each computer player votes.
function openVoting() {
  const m = G.meeting; if (!m || m.phase !== "talk") return;
  m.plan = botPlan();
  const now = performance.now(), cap = m.start + (m.secs - 3) * 1000, humansLeft = P.some((p) => p.alive && !p.isBot);
  for (const id of Object.keys(m.plan)) m.revealAt[id] = Math.min(cap, now + (humansLeft ? rand(3000, 22000) : rand(1000, 6000)));
  emit("voteopen", {});
}
function enterVotePhase() {
  const m = G.meeting;
  while (m.shown < m.lines.length) { const { p, text: msg } = m.lines[m.shown++]; addChatLine(p, msg); }
  m.phase = "vote"; m.speaker = null;
  renderVotePanel();
}
function renderVotePanel() {
  const m = G.meeting, area = $("#voteArea"); if (!area) return;
  const alive = P.filter((p) => p.alive);
  const head = !me.alive ? `<p class="small muted" style="margin:0 0 8px">You're a ghost, so you can't vote. Watch what happens.</p>`
    : m.myVote !== undefined ? `<p class="small" style="margin:0 0 8px">You voted ${m.myVote === "skip" ? "to skip" : `for <strong>${esc(P[m.myVote].name)}</strong>`}. Waiting for the others...</p>`
    : `<p class="small" style="margin:0 0 8px"><strong>Vote someone out.</strong> Tap a person, then confirm.</p>`;
  const canVote = me.alive && m.myVote === undefined && m.phase === "vote";
  area.innerHTML = `${head}<div class="vgrid" id="vgrid">${alive.map((p) => `<button class="vcard" data-pick="${p.id}" aria-pressed="${m.pick === p.id}" ${canVote && p !== me ? "" : "disabled"}><span data-vpic="${p.id}"></span><span style="${me.isThief && p.isThief && p !== me ? "color:#ff8a8a" : ""}">${p === me ? "You" : esc(p.name)}</span>${m.cast[p.id] !== undefined || (p === me && m.myVote !== undefined) ? `<span class="badge">VOTED</span>` : ""}</button>`).join("")}</div>
    ${canVote ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><button class="btn btn-ghost" data-act="skipvote">Skip vote</button><button class="btn btn-red" data-act="confirmvote" ${m.pick != null ? "" : "disabled"}>${m.pick != null ? `Vote ${esc(P[m.pick].name)}` : "Confirm vote"}</button></div>` : ""}`;
  area.querySelectorAll("[data-vpic]").forEach((el) => el.replaceWith(portrait(P[Number(el.dataset.vpic)].look, 40, 50)));
}
function markVoted(id) { const card = document.querySelector(`.vcard[data-pick="${id}"]`); if (card && !card.querySelector(".badge")) card.insertAdjacentHTML("beforeend", `<span class="badge">VOTED</span>`); }
function playerVote(target) {
  const m = G.meeting; if (!m || m.phase !== "vote" || m.myVote !== undefined || !me.alive) return;
  m.myVote = target; sfx("vote");
  sendAct("vote", { target });
  renderVotePanel();
}
function hostVote(by, target) {
  const m = G.meeting; if (!m || m.phase !== "vote" || !P[by] || !P[by].alive || m.cast[by] !== undefined) return;
  if (target !== "skip" && !(P[target] && P[target].alive)) target = "skip";
  m.cast[by] = target;
  emit("voted", { by });
  // Once every real player has voted, the computer players hurry up.
  if (P.filter((p) => p.alive && !p.isBot).every((p) => m.cast[p.id] !== undefined)) { const now = performance.now(); for (const id of Object.keys(m.revealAt)) if (m.cast[id] === undefined) m.revealAt[id] = Math.min(m.revealAt[id], now + rand(400, 3000)); }
}
function finishVote() {
  const m = G.meeting; if (!m || m.phase === "result" || m.finishing) return;
  m.finishing = true;
  if (!Object.keys(m.plan).length) m.plan = botPlan();
  const cast = {};
  for (const p of P.filter((x) => x.alive)) { const v = m.cast[p.id]; cast[p.id] = v === undefined || v === true ? (p.isBot ? m.plan[p.id] ?? "skip" : "skip") : v; }
  const weight = (v) => (P[v].role === "landlord" ? 2 : 1);
  const count = {}; Object.entries(cast).forEach(([v, t]) => (count[t] = (count[t] || 0) + weight(v)));
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  let out = null;
  if (sorted.length && sorted[0][0] !== "skip" && (!sorted[1] || sorted[1][1] < sorted[0][1])) out = Number(sorted[0][0]);
  emit("result", { cast, out });
  if (NET.online) setTimeout(() => { if (G && G.mode === "meeting") emit("resume", {}); }, out != null ? 12000 : 6000);
}
function showResult(d) {
  const m = G.meeting; if (!m) return;
  clearInterval(G.meetIv);
  m.phase = "result"; m.cast = d.cast; m.out = d.out != null ? P[d.out] : null;
  if (m.out) { m.out.alive = false; m.out.ejected = true; }
  const out = m.out;
  const weight = (v) => (P[v].role === "landlord" ? 2 : 1);
  const voteNames = (t) => Object.entries(m.cast).filter(([, x]) => String(x) === String(t)).map(([v]) => (P[v] === me ? "You" : P[v].name) + (weight(v) > 1 ? " (x2)" : ""));
  const wsum = (t) => Object.entries(m.cast).filter(([, x]) => String(x) === String(t)).reduce((a, [v]) => a + weight(v), 0);
  const shown = m.seats.map((id) => P[id]);
  const area = $("#voteArea"); if (!area) return;
  const cf = $("#chatForm"); if (cf) cf.remove();
  area.innerHTML = `<p class="small" style="margin:0 0 8px"><strong>Votes are in.</strong></p><div class="vgrid">${shown.map((p) => { const w = voteNames(p.id); return `<div class="vcard" ${out === p ? 'aria-pressed="true"' : ""}><span data-vpic="${p.id}"></span><span>${p === me ? "You" : esc(p.name)}</span><span class="tally">${w.length ? `${wsum(p.id)} vote${wsum(p.id) > 1 ? "s" : ""}: ${esc(w.join(", "))}` : "0 votes"}</span></div>`; }).join("")}
    <div class="vcard"><span style="font-size:22px;line-height:50px">⏭</span><span>Skipped</span><span class="tally">${voteNames("skip").length ? esc(voteNames("skip").join(", ")) : "nobody"}</span></div></div>
    <p class="result" style="margin:12px 0">${out ? `${esc(out === me ? "You get" : out.name + " gets")} the most votes.` : esc(`${M.txt.ejectNone} It's a tie or a skip.`)}</p>
    <button class="btn btn-block" data-act="aftervote" data-focus>${out ? "Watch them leave" : NET.online ? "Waiting for the game to continue..." : "Continue"}</button>`;
  area.querySelectorAll("[data-vpic]").forEach((el) => el.replaceWith(portrait(P[Number(el.dataset.vpic)].look, 40, 50)));
  const f = area.querySelector("[data-focus]"); if (NET.online && !out) f.disabled = true; f.focus({ preventScroll: true });
}
function meetFrame(ts) {
  const m = G && G.meeting; if (!m || G.mode !== "meeting" || !$("#mscene")) return;
  drawMeetingScene(m.sctx, m, ts);
  requestAnimationFrame(meetFrame);
}
function drawMeetingScene(c, m, ts) {
  const W = 440, H = 240, bus = M.scene === "bus";
  c.clearRect(0, 0, W, H);
  if (bus) {
    c.fillStyle = "#2b2824"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#f2c230"; c.fillRect(0, 0, W, 18);
    c.fillStyle = "#6fa6c9"; for (let x = 10; x < W; x += 72) c.fillRect(x, 26, 58, 44);
    const off = REDUCED ? 0 : (ts / 30) % 72;
    c.fillStyle = "#3f8a36"; for (let x = -72; x < W + 72; x += 72) { c.beginPath(); c.arc(x + 30 - off, 66, 14, Math.PI, 0); c.fill(); }
    c.strokeStyle = "#999"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 82); c.lineTo(W, 82); c.stroke();
    text(c, "NO SHAKING", W / 2, 14, "11px Bungee, sans-serif", "#1b1b1b");
  } else {
    c.fillStyle = "#6b4433"; c.fillRect(0, 0, W, 150); c.fillStyle = "#7a5a3a"; c.fillRect(0, 150, W, 90);
    c.fillStyle = "#9b3b2f"; c.beginPath(); c.ellipse(W / 2, 205, 170, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#7fb4d6"; c.fillRect(24, 20, 60, 46); c.fillStyle = "#c9a227"; c.fillRect(18, 16, 14, 56); c.fillRect(76, 16, 14, 56);
    c.fillStyle = "#1b1b1b"; c.fillRect(185, 22, 70, 42); c.fillStyle = "#3e6a8a"; c.fillRect(189, 26, 62, 34);
    c.fillStyle = "#c9b28a"; c.fillRect(350, 20, 50, 36); text(c, "OUR LANDLORD", 375, 64, "7px Bungee, sans-serif", "#f4efe6");
    c.fillStyle = "#c9b28a"; c.beginPath(); c.arc(375, 38, 9, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(W / 2, 8); c.rotate(REDUCED ? 0 : ts / 200); c.fillStyle = "#ddd"; for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.fillRect(-3, 0, 6, 38); } c.restore();
  }
  const ids = m.seats.filter((id) => P[id].alive || (m.out && m.out.id === id && m.phase !== "result"));
  const per = Math.max(5, Math.ceil(ids.length / 2)), rows = [ids.slice(0, per), ids.slice(per, per * 2)];
  const seatColor = bus ? "#6b2f2a" : "#8a2f3b", seatTop = bus ? "#8a3e36" : "#a8404e";
  const rowY = [128, 212];
  rows.forEach((row, ri) => {
    const y = rowY[ri];
    c.fillStyle = seatColor; rr(c, 36, y - 62, W - 72, 46, 10); c.fill();
    c.fillStyle = seatTop; rr(c, 36, y - 62, W - 72, 10, 6); c.fill();
    const n = per;
    row.forEach((id, i) => {
      const p = P[id], x = 36 + (W - 72) * ((i + 0.5) / n), speaking = m.speaker === id && performance.now() < m.speakerUntil;
      if (speaking) { c.fillStyle = "rgba(255,179,71,.3)"; c.beginPath(); c.ellipse(x, y - 30, 26, 34, 0, 0, Math.PI * 2); c.fill(); }
      drawLook(c, p.look, x, y - 6, { scale: 0.92 * Math.min(1, 5.5 / per), seated: true, bob: ts / 200 + id, moving: false, label: p === me ? "You" : p.name, labelColor: me.isThief && p.isThief ? "#ff8a8a" : "#fff" });
      if (speaking) { c.fillStyle = "#f4efe6"; rr(c, x + 8, y - 92, 30, 18, 8); c.fill(); text(c, "...", x + 23, y - 79, "700 14px Rubik, sans-serif", "#141008"); }
      if (m.cast[id] !== undefined || (p === me && m.myVote !== undefined)) { c.fillStyle = "#2bd47d"; rr(c, x - 20, y - 18, 40, 13, 6); c.fill(); text(c, "VOTED", x, y - 8, "800 9px Rubik, sans-serif", "#04150b"); }
    });
    c.fillStyle = shade(seatColor, -20); rr(c, 30, y - 16, W - 60, 22, 8); c.fill();
  });
}

// ---------- Kicked out: pack your bag and go ----------
function playEjection(p) {
  const word = M.id === "danfo" ? "passengers" : "housemates";
  openModal(`<canvas class="scene" id="ejc" aria-label="${esc(p.name)} carries their bag and leaves"></canvas>
    <p class="result" id="ejt" aria-live="polite" style="min-height:52px"></p>
    <button class="btn btn-block" data-act="afterejection" id="ejbtn">Skip</button>`, true);
  const cvs = $("#ejc"), d = Math.min(2, devicePixelRatio || 1); cvs.width = 440 * d; cvs.height = 240 * d;
  const c = cvs.getContext("2d"); c.scale(d, d);
  const bus = M.exit === "busstop", start = performance.now(), dur = REDUCED ? 1 : 5200;
  sfx("door");
  const left = thievesAlive();
  const verdict = `${p === me ? "You were" : p.name + " was"} ${p.isThief ? `a thief (${ROLES[p.role].name})!` : `NOT a thief. ${p === me ? "You were" : "They were"} the ${ROLES[p.role].name}.`}`;
  const tail = p.isThief ? (left ? ` ${plural(left, "thief remains", "thieves remain")}.` : "") : ` The ${word} sent away the wrong person.`;
  const step = (now) => {
    if (!$("#ejc")) return;
    const t = Math.min(1, (now - start) / dur);
    c.clearRect(0, 0, 440, 240);
    if (bus) {
      c.fillStyle = "#87b5d9"; c.fillRect(0, 0, 440, 140); c.fillStyle = "#2a2a2e"; c.fillRect(0, 150, 440, 90); c.fillStyle = "#8a8578"; c.fillRect(0, 140, 440, 14);
      c.strokeStyle = "#e8d34a"; c.lineWidth = 3; c.setLineDash([20, 16]); c.beginPath(); c.moveTo(0, 205); c.lineTo(440, 205); c.stroke(); c.setLineDash([]);
      c.fillStyle = "#555"; c.fillRect(300, 70, 5, 75); c.fillStyle = "#2bd47d"; rr(c, 268, 52, 70, 24, 4); c.fill(); text(c, "BUS STOP", 303, 69, "10px Bungee, sans-serif", "#04150b");
      const busX = t < 0.55 ? 20 : 20 - (t - 0.55) * 900;
      drawDanfoSide(c, busX, 95, 200, 70);
      const px = t < 0.1 ? 150 : 150 + (t - 0.1) * 330;
      drawLook(c, p.look, px, 150, { scale: 1.3, moving: t > 0.1 && t < 0.95, bob: now / 70, facing: 1, bag: true, sad: true });
    } else {
      c.fillStyle = "#1b2a1c"; c.fillRect(0, 0, 440, 240); c.fillStyle = "#4a463e"; c.fillRect(0, 130, 440, 110);
      c.fillStyle = "#c9b28a"; c.fillRect(0, 20, 290, 112); c.fillStyle = "#6b4a2a"; c.fillRect(40, 52, 50, 80);
      c.fillStyle = "#7fb4d6"; c.fillRect(140, 50, 50, 40); c.fillRect(215, 50, 50, 40);
      text(c, "COMPOUND 14", 145, 40, "12px Bungee, sans-serif", "#6b3a06");
      c.fillStyle = "#5c5a55"; c.fillRect(290, 60, 12, 150); c.fillRect(420, 60, 12, 150);
      const gateOpen = t > 0.15 ? Math.min(1, (t - 0.15) * 4) : 0;
      c.strokeStyle = "#9aa"; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const gx = 304 + i * 20 * (1 - gateOpen * 0.85); c.beginPath(); c.moveTo(gx, 70); c.lineTo(gx, 205); c.stroke(); }
      const px = 65 + t * 420;
      drawLook(c, p.look, px, 200, { scale: 1.3, moving: t < 0.98, bob: now / 70, facing: 1, bag: true, sad: true });
    }
    if (t > 0.35) { const k = Math.min(verdict.length, Math.floor((t - 0.35) / 0.4 * verdict.length)); $("#ejt").textContent = verdict.slice(0, k) + (k >= verdict.length ? tail : ""); }
    if (t < 1) requestAnimationFrame(step);
    else { $("#ejt").textContent = verdict + tail; const b = $("#ejbtn"); if (b) { if (NET.online) { b.textContent = "Waiting for the game to continue..."; b.disabled = true; } else { b.textContent = "Continue"; b.focus({ preventScroll: true }); } } }
  };
  requestAnimationFrame(step);
}
function afterMeeting() {
  if (!G || G.mode !== "meeting") return;
  closeModal(); G.mode = "play"; G.meeting = null;
  if (AUTH() && checkEnd()) return;
  P.forEach((p, i) => {
    if (p.alive || p === me) Object.assign(p, spawnAt(i, P.length));
    p.path = []; p.state = "idle"; p.timer = rand(0.3, 2); p.chase = null; p.witness = null; p.seen = {}; p.vouch = {}; p.fakeT = 0; p.cd = rand(14, 22);
  });
  G.bodies = []; G.lightsOut = 0; G.fixer = null; G.playerWitness = null; G.stealCd = 18;
  G.paused = false;
}

// ---------- End ----------
function checkEnd() {
  if (!G || G.ended) return true;
  if (!AUTH()) return false;
  if (thievesAlive() === 0) return endGame("crew", "vote");
  if (thievesAlive() >= crewAlive()) return endGame("thief");
  if (doneTasks() >= totalTasks()) return endGame("crew", "tasks");
  return false;
}
function endGame(winner, how) {
  if (!AUTH() || G.ended) return true;
  G.ended = true;
  emit("end", { winner, how });
  return true;
}
function showEnd(d) {
  const { winner, how } = d;
  G.ended = true; G.paused = true; G.mode = "end"; G.mini = null; miniToken++; hush(); stopMic(); rtcClose(); stopRadio(); clearInterval(G.meetIv);
  const thieves = thiefList(), youWin = (winner === "thief") === me.isThief, word = crewWord();
  if (NET.online && isSignedIn()) NET.sb.rpc("record_game", { p_won: youWin, p_thief: !!me.isThief }).then(() => loadProfile(), () => {});
  const reason = winner === "thief" ? `Only ${plural(crewAlive(), word === "passengers" ? "passenger has" : "housemate has", `${word} have`)} a phone left. The thieves run things now.`
    : how === "tasks" ? "Every chore is done and the thieves couldn't stop you." : "Every thief got caught and sent away with their bag.";
  retrack();
  setTimeout(() => {
    sfx(youWin ? "win" : "lose"); buzz(youWin ? [50, 50, 50, 50, 150] : 300);
    const buttons = NET.online
      ? `<button class="btn btn-block" data-act="tolobby" data-focus>Back to the lobby</button><button class="btn btn-ghost btn-block" data-act="leaveroom">Leave this room</button>`
      : `<button class="btn btn-block" data-act="again" data-focus>Play again (new roles)</button><button class="btn btn-ghost btn-block" data-act="toservers">Back to servers</button><button class="btn btn-ghost btn-block" data-act="tomenu">Main menu</button>`;
    openModal(`<div class="reveal modal" style="border:0;padding:0;background:none">
      <p class="eyebrow">${winner === "thief" ? "Thieves win" : `${word[0].toUpperCase() + word.slice(1)} win`}</p>
      <h2 class="display end-title" id="mtitle" style="color:${youWin ? "var(--green)" : "var(--red)"}">${youWin ? "You win!" : "You lose"}</h2>
      <p style="margin:0"><strong>The ${thieves.length > 1 ? "thieves were" : "thief was"}:</strong></p><div class="partners" id="endThieves"></div>
      <p>${esc(reason)}</p>
      <p class="small muted">Phones stolen: ${G.steals} · Meetings: ${G.meetings} · Chores: ${Math.round((doneTasks() / totalTasks()) * 100)}%</p>
      ${buttons}</div>`);
    const box = $("#endThieves"); thieves.forEach((p) => { const f = document.createElement("figure"); f.appendChild(portrait(p.look, 56, 70)); f.insertAdjacentHTML("beforeend", esc((p === me ? "You" : p.name) + ` (${ROLES[p.role].name})`)); box.appendChild(f); });
  }, 350);
}

// =====================================================================
// Events
// =====================================================================
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  unlockVoice();
  const d = b.dataset;
  if (d.go) { sfx("tap"); resetArmed = false; if (d.go === "private") priv.err = ""; go(d.go); return; }
  if (d.mode) { setMode(d.mode); sfx("tap"); renderMenu(); return; }
  if (d.modeplay) { setMode(d.modeplay); sfx("tap"); go("servers"); return; }
  if (d.pmode) { const pn = $("#pname"); if (pn) priv.name = pn.value; setMode(d.pmode); renderMenu(); return; }
  if (d.join) {
    if (NET.ready) { const row = ONLINE_ROOMS.find((x) => x.id === d.join); if (row) { sfx("join"); b.disabled = true; b.textContent = "Joining..."; joinOnline(row); } return; }
    const s = SERVERS.find((x) => x.id === d.join); if (s && s.players < s.max) { sfx("join"); enterPublic(s); } return;
  }
  if (d.buy) { buy(d.buy); return; }
  if (d.acctview) { ACCT.view = d.acctview; ACCT.msg = ""; ACCT.err = ""; renderMenu(); return; }
  if (d.lockpick) { openShop(d.lockpick); return; }
  if (d.emote) { if (d.lock) { openShop(d.lock); return; } if (G) doEmote(d.emote); else if (LB) { const a = LB.actors.find((x) => x.m.you); if (a) a.emote = { id: d.emote, until: performance.now() + 3000 }; closeModal(); } return; }
  if (d.filter) { filters[d.filter] = d.v; b.parentElement.querySelectorAll(".pick").forEach((x) => x.setAttribute("aria-pressed", x === b)); srvPage = 1; $("#fcount").textContent = plural(filterCount(), "server matches", "servers match") + "."; return; }
  if (d.priv) { const pn = $("#pname"); if (pn) priv.name = pn.value; priv[d.priv] = Number(d.v); renderMenu(); return; }
  if (d.recent) { const r = DATA.rooms.find((x) => x.code === d.recent); if (r && r.online && NET.ready) joinOnlineByCode(r.code).then((err) => { if (err) { priv.err = err; renderMenu(); } }); else joinByCode(d.recent); return; }
  if (d.tab) { custTab = d.tab; document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === custTab)); fillCustomize(); return; }
  if (d.set) { if (d.lock) { openShop(d.lock); return; } DATA.look[d.set] = d.v; save(); saveLookSoon(); sfx("tap"); fillCustomize(); syncMyLook(); return; }
  if (d.setting) { DATA.settings[d.setting] = d.v; save(); sfx("tap"); renderMenu(); return; }
  if (d.toggle) { DATA.settings[d.toggle] = !DATA.settings[d.toggle]; save(); sfx("tap"); renderMenu(); return; }
  if (d.rmf) { DATA.friends.splice(Number(d.rmf), 1); save(); fillFriends(); return; }
  if (d.pick) { const m = G && G.meeting; if (m && m.phase === "vote" && me.alive && m.cast[me.id] === undefined) { m.pick = Number(d.pick); sfx("tap"); renderVotePanel(); } return; }
  switch (d.act) {
    case "how": howModal(); break;
    case "music": DATA.settings.music = !DATA.settings.music; save(); musicGesture(); menuMusicTick(); renderMenu(); break;
    case "forgot": doForgot(); break;
    case "signout": doSignout(); break;
    case "pwlink": NET.sb.auth.resetPasswordForEmail(ACCT.user.email, { redirectTo: location.origin + "/" }).then(({ error }) => acctSay(error ? niceAuthError(error) : `We sent a link to ${ACCT.user.email}. Open it on this device to set a new password.`, !!error)); break;
    case "close": closeModal(); break;
    case "refresh": if (NET.ready) fetchRooms(); else { makeServers(); $("#serverList").innerHTML = serverRows(); } sfx("tap"); break;
    case "practice": practice = true; makeServers(); renderMenu(); break;
    case "online": practice = false; fetchRooms(); renderMenu(); break;
    case "quick": {
      if (NET.ready && !practice) {
        const open = ONLINE_ROOMS.filter((r) => r.status === "lobby" && r.player_count < r.max_players);
        const best = open.filter((r) => r.player_count > 0).sort((a, b) => b.player_count - a.player_count)[0] || pick(open);
        sfx("join"); if (best) joinOnline(best); else toastMenu("Every server is busy. Try again in a moment.");
        break;
      }
      const open = SERVERS.filter((s) => s.players < s.max); sfx("join");
      if (open.length) enterPublic(pick(open));
      else { const max = randi(6, 10); enterPublic({ name: pick(SERVER_NAMES[DATA.mode]), host: pick(BOT_NAMES), max, thieves: randi(1, maxThieves(max)), players: randi(1, max - 2) }); }
      break;
    }
    case "filter": filterModal(); break;
    case "applyfilters": closeModal(); renderMenu(); break;
    case "clearfilters": filters.players = "any"; filters.thieves = "any"; filters.region = "any"; srvQuery = ""; srvPage = 1; closeModal(); renderMenu(); break;
    case "more": srvPage++; { const l = $("#serverList"); if (l) l.innerHTML = serverRows(); } break;
    case "create": {
      const pn = $("#pname"); const name = ((pn && pn.value) || "").replace(/[<>]/g, "").trim().slice(0, 24) || `${displayName()}'s room`; sfx("done");
      const cfg = { name, max: priv.max, thieves: Math.min(priv.thieves, maxThieves(priv.max)), meetSecs: priv.meet };
      if (NET.ready && !practice) { b.disabled = true; b.textContent = "Creating..."; createOnlineRoom(cfg).then((err) => { if (err) { priv.err = err; renderMenu(); } }); }
      else createPrivate(cfg);
      break;
    }
    case "share": { const c = fmtCode(ROOM.code), url = `${location.origin}/?room=${ROOM.code}`, msg = `Join my Naija Sus room! Code: ${c} ${url}`; if (navigator.share) navigator.share({ title: "Naija Sus", text: msg }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener"); break; }
    case "copyroom": { const msg = $("#copyMsg"), c = fmtCode(ROOM.code); try { navigator.clipboard.writeText(c).then(() => (msg.textContent = "Code copied."), () => (msg.textContent = `Your code is ${c}.`)); } catch (err) { msg.textContent = `Your code is ${c}.`; } break; }
    case "fill": ROOM.filling = true; renderLobbyPanel(); break;
    case "hoststart":
      if (ROOM.online) { if (NET.isHost) { sfx("done"); hostStartOnline(); } }
      else if (ROOM.members.length >= 5) { clearRoomTimer(); sfx("done"); startFromRoom(); }
      break;
    case "leave": leaveRoom().then(() => go("servers")); break;
    case "emote": emoteModal(); break;
    case "restore": loadPurchases().then(() => { shopMsg = "Your items are up to date."; tidyLook(); renderMenu(); }); break;
    case "wardrobe": if (nearMirror()) wardrobeModal(); break;
    case "closewardrobe": closeModal(); syncMyLook(); break;
    case "randomize": DATA.look = randomLook(); save(); saveLookSoon(); sfx("done"); fillCustomize(); syncMyLook(); break;
    case "reset":
      if (!resetArmed) { resetArmed = true; renderMenu(); break; }
      resetArmed = false; try { [KEY, "who-be-thief-v1", "who-be-ole-v2"].forEach((k) => localStorage.removeItem(k)); } catch (err) { /* ignore */ }
      DATA = { name: "", look: { ...DEFAULT_LOOK }, settings: { sound: true, vibrate: true, difficulty: "normal", chores: "normal", talk: "normal", names: true, voice: true, radio: true, music: true }, friends: [], rooms: [], mode: "compound" };
      M = MAPS.compound; save(); D = null; go("menu"); break;
    case "enter": case "resume": closeModal(); G.paused = false; break;
    case "use": case "bell": doUse(); break;
    case "report": doReport(); break;
    case "steal": doSteal(); break;
    case "fake": doFake(); break;
    case "ability": doAbility(); break;
    case "mic": toggleMic(); break;
    case "lights": doLights(); break;
    case "closemini": G.mini = null; miniToken++; closeModal(); break;
    case "startvote": sendAct("startvote"); break;
    case "skipvote": playerVote("skip"); break;
    case "confirmvote": if (G && G.meeting && G.meeting.pick != null) playerVote(G.meeting.pick); break;
    case "aftervote": { const out = G.meeting && G.meeting.out; if (out) playEjection(out); else if (!NET.online) afterMeeting(); break; }
    case "afterejection": if (!NET.online) afterMeeting(); else { b.disabled = true; b.textContent = "Waiting for the game to continue..."; } break;
    case "tolobby": closeModal(); hush(); stopMic(); rtcClose(); G = null; NET.waiting = false; go("room"); break;
    case "leaveroom": closeModal(); hush(); stopMic(); G = null; leaveRoom().then(() => go("servers")); break;
    case "again": closeModal(); newGame(lastRoom); break;
    case "toservers": closeModal(); hush(); if (G) stopMic(); G = null; leaveRoom().then(() => go("servers")); break;
    case "quit": case "tomenu": closeModal(); hush(); if (G) { stopMic(); if (G.meetIv) clearInterval(G.meetIv); } G = null; leaveRoom().then(() => go("menu")); break;
  }
});
document.addEventListener("change", (e) => { if (e.target.dataset.inv != null) { DATA.friends[Number(e.target.dataset.inv)].invited = e.target.checked; save(); fillFriends(); } });
document.addEventListener("input", (e) => {
  if (e.target.id === "nm") { DATA.name = e.target.value.replace(/[<>]/g, "").slice(0, 12); save(); syncMyLook(); }
  if (e.target.id === "pname") priv.name = e.target.value;
  if (e.target.id === "suName" || e.target.id === "unName") checkUsername(e.target.id);
  if (e.target.id === "srvSearch") { srvQuery = e.target.value; srvPage = 1; const l = $("#serverList"); if (l) l.innerHTML = serverRows(); }
});
const AUTH_FORMS = { suForm: () => doSignup(), liForm: () => doLogin(), unForm: () => doSetUsername(), npForm: () => doNewPassword() };
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (AUTH_FORMS[e.target.id]) {
    const btn = e.target.querySelector('button[type="submit"]'), label = btn.textContent; btn.disabled = true; btn.textContent = "Please wait...";
    AUTH_FORMS[e.target.id]().catch((err) => acctSay(niceAuthError(err), true)).finally(() => { if (btn.isConnected) { btn.disabled = false; btn.textContent = label; } });
    return;
  }
  if (e.target.id === "codeForm") {
    const v = $("#codeIn").value;
    if (NET.ready && !practice) { $("#codeErr").textContent = "Looking for the room..."; joinOnlineByCode(v).then((err) => { if (err) { priv.err = err; const el = $("#codeErr"); if (el) el.textContent = err; } else sfx("join"); }); return; }
    const err = joinByCode(v); if (err) { priv.err = err; $("#codeErr").textContent = err; } else sfx("join"); return;
  }
  if (e.target.id === "chatForm") {
    const inp = $("#chatIn"), msg = inp.value.trim().slice(0, 100), now = performance.now();
    if (!msg || !G || !G.meeting || !me.alive || now - (G.meeting.chatAt || 0) < 1200) return;
    G.meeting.chatAt = now; inp.value = "";
    send("chat", { by: me.id, text: msg }); addChatLine(me, msg, true); return;
  }
  if (e.target.id !== "addF") return;
  const input = $("#fname"), name = input.value.replace(/[<>]/g, "").trim().slice(0, 12), msg = $("#fmsg");
  if (!name) { msg.textContent = "Type your friend's name first."; return; }
  if (DATA.friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) { msg.textContent = `${name} is already on your list.`; return; }
  if (DATA.friends.length >= 12) { msg.textContent = "Your list is full. Remove someone first."; return; }
  DATA.friends.push({ name, invited: DATA.friends.filter((f) => f.invited).length < 9 }); save();
  input.value = ""; msg.textContent = `${name} added and invited to your private rooms.`; sfx("done"); fillFriends();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || ov.hidden) return;
  if (G && G.mini) { G.mini = null; miniToken++; closeModal(); }
  else if (!G) { closeModal(); syncMyLook(); }
});
window.__sus = { get G() { return G; }, get P() { return P; }, get ROOM() { return ROOM; }, get LB() { return LB; }, get M() { return M; }, get music() { return JAZZ.playing && !!RTC.ac && RTC.ac.state === "running"; } };

renderMenu();
(async () => {
  await initNet();
  if (!NET.ready) return;
  await Promise.all([loadPurchases().catch(() => {}), loadAds().catch(() => {})]);
  tidyLook();
  setInterval(() => loadAds().catch(() => {}), 5 * 60 * 1000);
  const code = new URLSearchParams(location.search).get("room");
  if (code) { history.replaceState(null, "", location.pathname); const err = await joinOnlineByCode(code); if (err) { screen = "servers"; toastMenu(err); } return; }
  if (["menu", "servers", "shop", "account"].includes(screen)) renderMenu();
})();
document.addEventListener("pointerdown", unlockVoice, { passive: true });

// ---------- Menu music ----------
// Phones only allow sound after a real tap (touchend or click, not just touching
// the screen), so every tap re-checks and wakes the audio up if it's asleep.
// iPhones also mute this kind of sound when the silent switch is on, unless a
// normal audio element is playing too, so we play a silent one alongside.
const JAZZ = createJazz();
let musicUnlocked = true, silentEl = null, musicHint = null;
function silentAudio() {
  if (silentEl) return silentEl;
  const sr = 8000, n = sr / 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  silentEl = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" }))); silentEl.loop = true; silentEl.playsInline = true; silentEl.setAttribute("playsinline", "");
  return silentEl;
}
function setSession(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { /* not supported */ } }
function musicWanted() { return S().music && musicUnlocked && !G && screen !== "room" && !document.hidden; }
function menuMusicTick() {
  const want = musicWanted();
  try {
    if (want) {
      setSession("playback");
      const ac = audioCtx();
      if (!JAZZ.playing) JAZZ.start(ac, 0.6);
      if (silentEl && silentEl.paused) silentEl.play().catch(() => {});
    } else if (JAZZ.playing) {
      JAZZ.stop(G || screen === "room" ? 0.6 : 0.3);
      if (silentEl) silentEl.pause();
      setSession("auto");
    }
  } catch (e) { /* no audio on this device */ }
}
// A small note at the bottom while the browser is still holding the sound back.
function updateMusicHint() {
  const blocked = musicWanted() && (!RTC.ac || RTC.ac.state !== "running");
  if (blocked && !musicHint) {
    musicHint = document.createElement("button"); musicHint.className = "music-hint"; musicHint.type = "button";
    musicHint.innerHTML = '<span aria-hidden="true">♪</span> Tap anywhere for music';
    document.body.appendChild(musicHint);
  }
  if (musicHint) musicHint.hidden = !blocked;
}
function musicGesture() {
  musicUnlocked = true;
  if (!musicWanted()) { updateMusicHint(); return; }
  silentAudio().play().catch(() => {});
  if (RTC.ac && RTC.ac.state !== "running") RTC.ac.resume().catch(() => {});
  menuMusicTick();
  setTimeout(updateMusicHint, 150);
}
for (const ev of ["touchend", "click", "keydown", "pointerup", "mousedown"]) document.addEventListener(ev, musicGesture, { passive: true, capture: true });
document.addEventListener("visibilitychange", menuMusicTick);
setInterval(() => { menuMusicTick(); updateMusicHint(); }, 300);
// Try to start straight away. Some browsers allow it (for example Chrome on a
// computer for sites you use a lot); the rest start on the first tap.
menuMusicTick();
try { const ac = audioCtx(); ac.addEventListener("statechange", updateMusicHint); } catch (e) { /* no audio */ }
})();
