# Cloudflare Pages setup

This repository is a static site at the repository root. The current files do not require a build command or a package install.

## Configure a preview first

1. Sign in to the Cloudflare account that will own the site.
2. Open **Workers & Pages** and create a Pages project connected to Git.
3. Select GitHub and authorize the `salmansyed786/414_Jewels` repository.
4. For the first review, select the `codex/launch-readiness` branch as the preview branch if Cloudflare offers branch-specific previews.
5. Use these build settings:
   - Framework preset: **None**
   - Build command: leave blank
   - Build output directory: `/` (repository root; if the UI rejects this, use the documented root value shown in its current UI)
6. Start the deployment and open the generated `pages.dev` preview.
7. Check the storefront and `/admin.html` on mobile and desktop. Do not treat a successful static deployment as proof that Supabase, payments, or order handling are ready.

## Production connection

Keep production pointed at the intended production branch (normally `main`). A merge to that branch can trigger a public deployment. Only merge and enable production deployment after the owner reviews the preview and explicitly approves publication.

## Domain and configuration

- Add a custom domain from the Pages project after the owner has access to the domain's DNS.
- Confirm HTTPS works and test the custom domain after DNS activation.
- The current Supabase URL and publishable/anon key live in `config.js`. Never put a Supabase service-role key, payment secret, or webhook secret in static files or Git.
- Payment secrets belong in a server-side function's environment/secrets, not in Pages HTML or JavaScript.
- Cloudflare Pages only serves the site. It does not configure Supabase or enable card payments by itself.
