# 414 Jewels Website + Admin Dashboard

This version is built so you do **not** have to edit HTML every time a price, product, stock count, or option changes.

**FIXED VERSION:** CSS and the local site/admin JavaScript are embedded directly into each HTML file, so opening the HTML by itself will still show the full design.

## What you can change from `/admin.html`

- Product name
- Category
- SKU / item code
- Selling price
- Compare-at / old price
- Description
- Product image URL
- Stock quantity
- Display order
- Gold / silver / other finishes
- Length choices
- Width choices
- Ring/bangle size choices
- Show/hide a product on the storefront
- Mark an item featured
- Add products
- Delete products

## Two modes are included

### 1. Local demo mode (works immediately)
Open `admin.html`.

Because Supabase credentials are blank, the dashboard will offer **Local Demo Admin**.

You can add/edit products and then open `index.html` in the **same browser** to see the changes.

Important: Local demo mode is only for testing.
It uses your browser's localStorage, so:
- changes only appear on that browser/device
- customers on other devices will NOT see them
- there is no secure real admin login

### 2. Live admin mode (the real setup)
For the published store, connect Supabase.

Supabase gives you:
- secure email/password admin login
- database storage
- product changes that update the live store for everyone
- row-level security so regular visitors cannot edit products

## One-time Supabase setup

1. Create a Supabase project.
2. Open its SQL Editor.
3. Paste and run `supabase_setup.sql`.
4. In Supabase Authentication, create the email/password account you want to use as your admin.
5. Copy that user's UUID.
6. At the bottom of `supabase_setup.sql`, run the provided `insert into public.admins(...)` command using your UUID.
7. In Supabase project settings/API, copy:
   - Project URL
   - Anon/public key
8. Open `config.js` and paste them here:

```js
window.JEWELS_CONFIG = {
  supabaseUrl: "YOUR_PROJECT_URL",
  supabaseAnonKey: "YOUR_ANON_KEY",
  instagramUrl: "https://instagram.com/414_jewels",
  orderFormUrl: "https://tally.so/r/NpaoYb"
};
```

That is the only code/config edit required for the admin backend.

After that:
- go to `/admin.html`
- sign in
- add/edit products
- storefront updates from the database

## Files

- `index.html` — customer storefront
- `admin.html` — private admin dashboard
- `styles.css` — shared design
- `storefront.js` — displays products
- `admin.js` — admin login + product editor
- `config.js` — one-time backend configuration
- `supabase_setup.sql` — database/security setup

## Current order flow

Instagram @414_jewels
→ website
→ browse products/options
→ Order / Inquire
→ Tally order request
→ you confirm inventory, total, and payment
→ fulfillment

## Important brand note

Only use Cartier, Versace, or other protected brand names when the item is actually authentic and you can substantiate that claim. Otherwise use accurate generic descriptions for unbranded/inspired items.
