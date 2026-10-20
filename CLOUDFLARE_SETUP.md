# Cloudflare Pages setup

This repository is a static site at the repository root. It has no framework build step and no package installation.

## Configure a preview first

1. Sign in to the Cloudflare account that will own the site.
2. Open **Workers & Pages** and create a Pages project connected to Git.
3. Select GitHub and authorize the `salmansyed786/414_Jewels` repository.
4. Set the production branch to `main`. Keep preview deployments enabled for pull requests and other branches.
5. Use these build settings:
   - Framework preset: **None**
   - Build command: `exit 0` (Cloudflare's current static HTML guide recommends this when no build step is needed)
   - Build output directory: `.` (repository root)
   - Root directory: leave default (repository root)
6. Start a preview deployment from the `codex/launch-readiness` pull request and open the generated `pages.dev` preview.
7. Check the storefront and `/admin.html` on mobile and desktop. A successful static deployment does not verify Supabase, payments, or order handling.

## Production connection

Keep production pointed at `main`. A merge to that branch can trigger a public deployment. Only merge and enable production deployment after the owner reviews the preview and explicitly approves publication.

## Domain and configuration

- Add a custom domain from the Pages project after the owner has access to the domain's DNS.
- Confirm HTTPS works and test the custom domain after DNS activation.
- The current Supabase URL and publishable/anon key live in `config.js`. Never put a Supabase service-role key, payment secret, or webhook secret in static files or Git.
- Payment secrets belong in a server-side function's environment/secrets, not in Pages HTML or JavaScript.
- Cloudflare Pages serves the site. It does not configure Supabase or enable card payments by itself.
