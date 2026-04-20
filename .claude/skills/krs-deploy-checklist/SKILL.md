---
name: krs-deploy-checklist
description: Load this skill whenever deploying, pushing code, running migrations, debugging production issues, or setting up a fresh environment for KRS College Connect. Contains the operational playbook for Vercel, Supabase CLI, Namecheap DNS, and Resend. Trigger for any task involving deployment, git push, production bugs, or environment setup.
---

# KRS College Connect — Deployment Playbook

The infrastructure is connected. Code pushed to `main` on GitHub auto-deploys to Vercel, which serves `krscollegeconnect.com` via Namecheap DNS.

## The deploy chain

1. Claude Code or developer pushes commit to `main` on GitHub
2. GitHub webhook notifies Vercel
3. Vercel pulls latest code, runs `npm run build`, deploys
4. Custom domain `krscollegeconnect.com` points at latest production deployment

Any break in this chain = site doesn't update. Known break points listed below.

## Prerequisites for deployment

### Git author email must match a GitHub account

Before any `git commit`, ensure:

```
git config --global user.email "kirtmanpropertysolutions@gmail.com"
```

Vercel blocks commits from local hostnames like `@Claudias-MacBook-Air.local`. To fix historical commits:

```
git filter-branch --env-filter '
  if [ "$GIT_AUTHOR_EMAIL" != "kirtmanpropertysolutions@gmail.com" ]; then
    export GIT_AUTHOR_EMAIL="kirtmanpropertysolutions@gmail.com"
    export GIT_COMMITTER_EMAIL="kirtmanpropertysolutions@gmail.com"
  fi
' -- --all
```

Then `git push --force-with-lease origin main`.

### Vercel must be connected to the GitHub repo

Project Settings → Git → "Connected Git Repository" should show `kirtmanpropertysolutions/<repo-name>`. A force-push can silently disconnect it. Re-connect via Install button on the Git settings page.

### Vercel Deployment Protection must be OFF for production

Project Settings → Deployment Protection → Vercel Authentication must be **Disabled**. If enabled, visitors see a Vercel login page instead of the app.

## Environment variables in Vercel

Required variables (Project Settings → Environment Variables):

```
VITE_SUPABASE_URL=<trimmed, no trailing newline>
VITE_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<secret, server-only, NO VITE_ prefix>
RESEND_API_KEY=<server-only>
```

After changing env vars, a redeploy is required for changes to take effect.

## Running Supabase migrations

Docker is NOT required. Use the Supabase CLI with a personal access token.

1. Generate a Supabase access token at https://supabase.com/dashboard/account/tokens

2. In a terminal, export the token invisibly:

```
read -s SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN
```

Press Enter, paste token (Cmd+V — invisible), press Enter again.

3. Link the project (one time per shell):

```
cd ~/<project-path> && npx supabase link --project-ref dhemeejvzlvesugckckm
```

4. Push migrations:

```
npx supabase db push --linked
```

Confirm with `y` when prompted.

## Namecheap domain setup

Domain: krscollegeconnect.com. Set one CNAME record in Namecheap DNS:

- Type: CNAME
- Name: www
- Value: (get the exact value from Vercel Domains page, will look like `xxxxxxxxxxxxx.vercel-dns-017.com.`)

Vercel's Domains page shows "Invalid Configuration" in red with a "Learn more" expander that reveals the exact value to use.

### Namecheap domain can be suspended for unverified contact info

If the site stops resolving, check Namecheap. A yellow "Domain suspended. Contacts verification needed" warning means the WHOIS contact email was never verified. Click the domain's Manage link, find contact verification, click the email link Namecheap sends. Unsuspending takes minutes to hours to propagate.

## Supabase keys — rotation playbook

If a service role key is exposed (for example, committed to git or pasted in a log):

1. Go to Supabase Dashboard → Settings → API Keys → "Publishable and secret API keys" tab
2. Create new secret key, name like `service_role_YYYY_MM_DD` (underscores only, no dashes)
3. Copy the new key (starts with `sb_secret_`)
4. Update `.env` locally, update Vercel env vars
5. Redeploy Vercel so new key takes effect
6. Confirm app still works
7. ONLY THEN: disable or delete the old key

The modern Supabase secret keys format is short (starts with `sb_secret_`), unlike legacy JWT keys that were 200+ characters. Shorter is expected.

## Resend email setup

Supabase default email rate limit is 2/hour — unusable for production. Before launching auth:

1. Create Resend account, verify sending domain
2. In Supabase Project Settings → Auth → SMTP Settings, configure Resend as custom SMTP
3. Test signup flow before announcing to users

## Verifying a deployment worked

Deployments appear in Vercel Dashboard → Deployments. Status flow:

- Building (yellow) → Ready (green) = success
- Building → Failed (red) = build error, check Build Logs
- Blocked (red) = Vercel refusing to build, usually bad commit author email

A "Ready" deployment is live immediately on the Vercel URL (`xxx.vercel.app`) but custom domain propagation can take seconds to minutes.

## Debugging in production

- Open site in Incognito (avoids cached login/JS)
- DevTools → Console: look for red errors with specific table names — likely RLS or schema mismatch
- DevTools → Network: look for 400/403 on Supabase API calls
- DevTools → Application → Local Storage: Supabase auth token lives as `sb-<project-id>-auth-token`. Deleting it force-signs-out a stuck session.

## Emergency rollback

If a deploy breaks production:

1. Vercel Dashboard → Deployments → find last working one (green "Ready")
2. Click its three-dot menu → Promote to Production
3. Site reverts in seconds
4. Debug in a preview branch, don't push broken code to main again

## Don't

- Don't commit `.env` to git (in `.gitignore`)
- Don't paste secrets into chat, terminal history, or screenshots
- Don't use `git push --force` without `--with-lease`
- Don't run migrations against live DB without a backup snapshot first
- Don't rely on `VITE_` prefix for anything secret
