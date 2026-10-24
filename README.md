# Naija Sus

An online social deduction game set in a Lagos compound and a Lagos danfo. Find the thief before the phones finish. Up to 15 players per room, proximity voice chat, in-game shop and brand advertising.

## What's inside

| Path | What it does |
| --- | --- |
| `index.html`, `src/game.js`, `src/styles.css` | The game. Runs in the browser. |
| `src/catalog.js` | Prices for the shop items and ad packages. Shared by the game and the payment check. |
| `advertise.html`, `src/advertise.js` | The page brands, businesses and musicians use to book ads. |
| `api/config.js` | Gives the browser the public Supabase and Paystack keys. |
| `api/verify-payment.js` | Confirms Paystack payments on the server, then unlocks the item or marks the ad as paid. |
| `supabase/migrations/0001_naija_sus.sql` | Database tables, rules, functions, storage bucket and the 16 official servers. |

## How online play works

- Supabase holds the server list (`rooms` table). 16 official servers are seeded, 8 per mode. Players can also create public or private rooms with a 6-letter code.
- Each room is a Supabase Realtime channel. The first player in the room is the host and runs the game. Everyone else sends their moves to the host. If the host leaves, the next player takes over.
- Empty seats are filled by computer players so a round can always start.
- Voice chat is WebRTC, peer to peer. You only hear players close to you, and they get quieter as they walk away.
- If the server can't be reached, the game falls back to offline practice with computer players.

## Setup

### 1. Supabase
1. Run `supabase/migrations/0001_naija_sus.sql` in the SQL editor (already done on the live project).
2. Add the payments secret (a long random string) so only the server can record purchases:
   ```sql
   insert into private.app_secrets (name, value) values ('payments', 'YOUR_LONG_RANDOM_SECRET')
   on conflict (name) do update set value = excluded.value;
   ```

### 2. Vercel environment variables
| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon / publishable key |
| `PAYMENTS_SHARED_SECRET` | The same secret you put in `private.app_secrets` |
| `PAYSTACK_PUBLIC_KEY` | From Paystack dashboard, Settings, API Keys (`pk_live_...`) |
| `PAYSTACK_SECRET_KEY` | From the same page (`sk_live_...`). Never put this in the browser code. |

Redeploy after changing environment variables.

### 3. Paystack
Create a Paystack business account, finish the compliance steps so you can take live payments, then copy the keys above. Use the `pk_test_` / `sk_test_` keys first to try a purchase without real money.

## Running the shop

Items go from ₦500 to ₦50,000. Everything is cosmetic or a hosting perk, so nobody can pay to win.

| Item | Price |
| --- | --- |
| Gbedu Emotes | ₦500 |
| Glow Name Tag | ₦1,000 |
| Exit Bags | ₦1,500 |
| Owambe Collection | ₦2,500 |
| Compound Pets | ₦3,500 |
| Detty December Pass | ₦5,000 |
| Private Room Pro (30 days) | ₦10,000 |
| Owambe Mega Bundle | ₦20,000 |
| Odogwu VIP (lifetime) | ₦50,000 |

Purchases are tied to the player's device. If a player clears their browser or changes phone, they can use "Restore purchases" on the same device, or you can move a purchase in the `purchases` table by changing its `device_id`.

## Running ads

| Package | Price (7 days) | Where it shows |
| --- | --- | --- |
| Round sponsor | ₦10,000 | Role screen at the start of rounds, main menu |
| Danfo radio | ₦15,000 | Song or jingle on the danfo radio and in the lobby |
| Compound billboard | ₦25,000 | Billboard in the compound yard and the lobby |
| Danfo wrap | ₦40,000 | The danfo body in Danfo mode, the parked danfo, the lobby |

1. A brand books on `/advertise`, uploads their image or MP3 and pays.
2. The ad lands in the `ads` table with status `paid`.
3. Check it in Supabase, Table Editor, `ads`. Open `image_url` or `audio_url` to look at it.
4. To approve: set `status` to `live`. It shows in the game within 5 minutes and stops on `ends_at`.
5. To refuse: set `status` to `rejected` and refund in the Paystack dashboard.

Only approve music the brand owns the rights to.

## Known limits

- Voice chat uses free STUN servers only. On some mobile networks two players won't hear each other. Adding a TURN server (for example Metered or Twilio) fixes this.
- Supabase's free plan allows about 200 people online at once and 100 messages a second. The game is tuned to stay well under that, but move to the Pro plan when the game grows.
- The host runs the round. If the host has a slow phone or bad network, everyone in that room feels it.

## Local development

```bash
npx vercel dev
```
Without the environment variables the game runs in offline practice mode.
