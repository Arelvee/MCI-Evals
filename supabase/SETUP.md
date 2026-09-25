# Connect training devices

The Vercel deployment has no database credentials configured as of September 25,
2026. Local records remain on their original devices until setup is completed.

1. Open the organization's Supabase project and run `supabase/schema.sql` in its
   SQL editor. Run the full script for existing tables too: the triggers protect
   newer sheets from stale devices and merge scorebook entries.
2. In the existing MCI Vercel project's Production environment settings, add
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `TRIAGE_SYNC_TOKEN`.
   Generate a long random private sync token. Keep the service-role key server-only.
3. Redeploy Vercel to activate the environment variables.
4. On every device, open the original app/browser used to enter records while
   online. Open "Connect this device to cloud backup" and enter the private sync
   token. Do not put the Supabase service-role key in this field.
5. Wait for "Synced". Saved sheets and the current non-empty draft are uploaded.
   The app retries every 30 seconds while open, and on reopening/focus or reconnect.
6. On the admin device, enter the same token and unlock Admin. Cloud records are
   pulled automatically every 30 seconds. "Pull Records" retrieves immediately.
   "Sync Now" also uploads admin scorebook changes.

Verification after connecting: save a named test sheet on device A, wait for
Synced, and check it in Admin on device B. Disconnect A, update and save locally,
then reconnect with the app open and confirm the newer sheet reaches B.

The API uses a shared trusted-device key. Anyone with it can access cloud records;
the local Admin passcode is not a server authorization boundary. Do not publish
the sync token or put it in URLs. Direct anonymous database access is disabled
by row-level security; the API uses the server-only service role.

Browsers cannot retrieve local storage from other devices remotely. Each original
device must open its app to upload. Browser profiles and domains have separate
storage, including the earlier chatgpt.site domain. Do not clear storage or
uninstall before exporting or confirming backup. For records on the older domain,
export JSON there, import in the Vercel app's Admin, then sync.

Clearing/deleting local records does not delete their cloud backups. Concurrent
edits to one sheet use its latest edit timestamp (device clocks should be correct),
not field-level merging. Keep a sheet assigned to one evaluator during scoring.
