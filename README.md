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
| `api/ice.js` | Gives the browser the servers used to connect voice chat (STUN, plus TURN if you set one up). |
| `supabase/migrations/0001_naija_sus.sql` | Database tables, rules, functions and the storage bucket. |
| `supabase/migrations/0002_accounts_servers.sql` | Player accounts, usernames, stats, purchases on accounts, and the 128 official servers. |

## How online play works

- Supabase holds the server list (`rooms` table). 128 official servers are seeded, 64 per mode, spread across Lagos, Abuja, Port Harcourt, Ibadan and the rest of Nigeria. Players can search by area or route and filter by size, thieves and area. Players can also create public or private rooms with a 6-letter code.
- Each room is a Supabase Realtime channel. The first player in the room is the host and runs the game. Everyone else sends their moves to the host. If the host leaves, the next player takes over.
- Empty seats are filled by computer players so a round can always start.
- Voice chat is WebRTC, peer to peer. You only hear players close to you, and they fade out smoothly as they walk away. Mics use echo cancelling, noise removal and auto level. Audio is Opus at 28 kbps with packet-loss repair. A green sound icon shows who is talking.
- Players who are out (phone stolen or voted out) lose their mic and meeting chat for the rest of the round. Nobody can hear them.
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

## Player accounts

Players can sign up with a username, email and password, or keep playing as a guest. An account saves their username, outfit, stats (online games, wins, thief wins) and everything they buy, on any device. Things bought as a guest move onto the account the first time they log in on that phone.

Usernames are 3 to 15 letters, numbers or `_`, and no two players can have the same one.

**Supabase settings to check (Dashboard, Authentication):**
1. **URL Configuration:** set Site URL to `https://naija-sus.vercel.app` and add `https://naija-sus.vercel.app/**` to Redirect URLs. Otherwise confirm and password-reset links point to localhost.
2. **Emails:** Supabase's built-in email only sends to members of your Supabase team, a few per hour. For real players either:
   - add custom SMTP (Authentication, Emails, SMTP Settings). Resend works: host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender on a domain you verified in Resend; or
   - turn off **Confirm email** (Authentication, Sign In / Providers, Email) so players are logged in straight after signing up. Password reset emails still need SMTP.

## Voice chat relay (recommended)

Without a relay, two players on some mobile networks can't hear each other. Add one of these in Vercel and redeploy:
- Cloudflare Realtime TURN (free up to 1,000 GB a month): `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`.
- Any other TURN provider: `TURN_URLS` (comma separated), `TURN_USERNAME`, `TURN_CREDENTIAL`.

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

Purchases made while logged in are saved to the account and work on any device. Guest purchases are tied to the device. To move one by hand, set `user_id` on the row in the `purchases` table.

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

- Voice chat connects every real player in a room directly (mesh). That's fine up to 15 players, but each phone uploads its voice to everyone, so very weak connections may struggle. Without a TURN relay some mobile networks can't connect at all (see above).
- Supabase's free plan allows about 200 people online at once and 100 messages a second. The game is tuned to stay well under that, but move to the Pro plan when the game grows.
- The host runs the round. If the host has a slow phone or bad network, everyone in that room feels it.

## Local development

```bash
npx vercel dev
```
Without the environment variables the game runs in offline practice mode.
