# Dakhl · حساب‌وکتاب

A Persian personal finance dashboard for accounts, spending, income, transfers, and debt payments.

## Configure Supabase

1. Open the dedicated Dakhl Supabase project. In Authentication settings, leave the Email provider enabled, disable public and anonymous sign-ups, and add your email/password user from Authentication → Users.
2. Run [database.sql](database.sql) once in the project's SQL Editor. The app stores the existing versioned bookkeeping document as JSONB, with one row per Auth user and a revision check on writes. RLS limits access to the owner.
3. Fill in [supabase-config.js](supabase-config.js) with the project's HTTPS URL and its **publishable** key from the Supabase Connect dialog.
4. Serve the project over HTTPS or localhost. For GitHub Pages, deploy the configured branch from the repository root. For a local check, run `python3 -m http.server 8000` from this directory and open `http://localhost:8000`.

## Bring over the previous ledger

Sign in and open تنظیمات. On the same browser and site origin as the previous version, an empty cloud ledger offers **انتقال اطلاعات از این مرورگر** when the previous ledger is available. To migrate from a different origin or device, download the JSON backup from the old app and choose **بازیابی نسخه پشتیبان** in the cloud version. Review the restored balances before making new edits.

## Verify

Sign in, create an account and a transaction, reload, and check that both persist. Sign out, then open a direct hash route such as `#transactions` to check that it requires sign-in. In a separate browser profile, sign in as a second test user and confirm the first user's data is absent. If two devices edit at once, the stale save is rejected with a prompt to reload.
