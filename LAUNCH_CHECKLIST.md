# 414 Jewels launch checklist

## Before connecting a payment provider

- [ ] Confirm business owner, legal business name, customer support email, and return address.
- [ ] Verify every product's source, material, dimensions, photos, price, and available quantity.
- [ ] Confirm shipping method, handling time, destinations, tracking, and shipping charge.
- [ ] Set a clear return, exchange, cancellation, and damaged-item policy.
- [ ] Ensure the checkout and policy language match actual practices and applicable law.

## Supabase

- [ ] Create the project and run `supabase_setup.sql`.
- [ ] Create the owner's Auth account and add its UUID to `public.admins`.
- [ ] Set the public project URL and publishable/anon key in `config.js`; never add a service-role key to browser files.
- [ ] Sign into `admin.html` and add actual products and variants.
- [ ] Test public catalog reading and verify an unauthenticated visitor cannot edit catalog or inventory.
- [ ] Test admin edits and verify inventory is correct after a refresh.

## Storefront review

- [ ] Replace any placeholder product text or images with verified item information and authorized photos.
- [ ] Check each product on a phone and desktop.
- [ ] Submit a test Tally request and confirm the selected item/options are captured clearly.
- [ ] Verify the support contact and Instagram link.
- [ ] Test sold-out and unavailable options.
- [ ] Make the published shipping/return terms visible before accepting payment.

## Payments and fulfillment

- [ ] Choose and configure a payment provider.
- [ ] Implement server-side payment session creation and payment confirmation before showing a paid order.
- [ ] Set up order records and inventory protection against overselling.
- [ ] Test a provider test-mode order, cancellation, failed payment, refund, and fulfillment notification.
- [ ] Keep test mode until the owner reviews the complete customer journey and explicitly approves launch.

## Cloudflare Pages

See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md). Connect the GitHub repository only after deciding which branch is the production branch. Do not merge this launch branch into production until payment and policies are ready.
