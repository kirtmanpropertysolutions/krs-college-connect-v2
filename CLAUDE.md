# 🚨 SECURITY — READ BEFORE EVERY COMMAND

NEVER write a Supabase key as a string literal. Not in JS files. Not in curl commands. Not in shell pipelines. Not in scripts. NOT EVER.

If you need the service role key for a script:
1. Write a Node script in scripts/
2. Add `import 'dotenv/config'` as the FIRST line
3. Use `process.env.SUPABASE_SERVICE_ROLE_KEY`
4. Run it with `node scripts/your-script.mjs`

If you need it for a curl command:
DO NOT. Write a Node script instead. The script can do exactly what curl does using fetch() with the env var.

Pre-commit hook will block any commit with hardcoded keys. predev npm script will refuse to start the dev server if any hardcoded keys exist. These are non-negotiable.