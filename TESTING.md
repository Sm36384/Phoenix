# Testing Guide

How to test your deployed Transformation Pulse Global application.

---

## 1. Basic UI Tests (No Configuration Needed)

### ✅ Dashboard Loads
1. Open your deployed URL (e.g., `https://your-app.vercel.app`)
2. **Expected:** 
   - Header shows "Transformation Pulse Global"
   - Source status bar displays (Green/Orange/Blue indicators)
   - Signals table shows mock data
   - No errors in browser console

### ✅ War Room Drawer
1. Click any signal row in the table
2. **Expected:**
   - Drawer opens on the right
   - Shows signal details (company, headline, keywords)
   - Shows stakeholders (recruiters, hiring managers, bridge connections)
   - "Send Blueprint Pitch" button visible (if OpenAI configured)

### ✅ Navigation
- Click "History" in header → Should navigate to `/settings/history`
- Click "Sign out" → Should redirect to `/login`

---

## 2. Integration Status Check

### ✅ Check What's Configured
```bash
curl https://your-app.vercel.app/api/integration-status
```

**Expected JSON:**
```json
{
  "supabase": true/false,
  "supabaseServiceRole": true/false,
  "apify": true/false,
  "apollo": true/false,
  "openai": true/false,
  "cronSecret": true/false
}
```

**What it means:**
- If `supabase: false` → App is in mock mode
- If `supabase: true` but `supabaseServiceRole: false` → Auth works, but cron/seed won't work
- Other flags show which APIs are configured

---

## 3. Authentication Tests (Requires Supabase)

### ✅ Sign Up Flow
1. Go to `/login`
2. Enter email and click **"Sign up"**
3. **Expected:**
   - Email sent (check inbox/spam)
   - Click magic link → Redirects to dashboard
   - Header shows your email

### ✅ Sign In Flow
1. Go to `/login`
2. Enter email and click **"Sign in"**
3. **Expected:**
   - Magic link email sent
   - After clicking link → Redirects to dashboard
   - Header shows your email

### ✅ Sign Out Flow
1. Click "Sign out" in header
2. **Expected:**
   - Redirects to `/login`
   - Session cleared

### ✅ Protected Routes
1. Sign out
2. Try to access `/settings/history` directly
3. **Expected:**
   - Redirects to `/login`

---

## 4. Dashboard with Supabase (Real Data)

### ✅ Empty State (No Signals)
1. Sign in (first time, no data)
2. **Expected:**
   - Blue banner: "No signals in DB. Sign in to see live data."
   - "Seed test data" button visible

### ✅ Seed Test Data
1. Click **"Seed test data"** button
2. **Expected:**
   - Button shows "Seeding…"
   - Alert/notification: "Seed complete. Sign in to see signals on the dashboard."
   - Signals table populates with 3 test signals
   - First signal has 5 stakeholders

### ✅ View Signals
1. After seeding, signals should appear
2. **Expected:**
   - 3 signals visible:
     - Saudi National Bank (Riyadh)
     - Emirates NBD (Dubai)
     - DBS (Singapore)
   - Each shows: company, headline, region, hub, complexity match %

### ✅ View Stakeholders
1. Click a signal row
2. **Expected:**
   - War Room drawer opens
   - Shows stakeholders:
     - Recruiter (Sarah Al-Rashid, Korn Ferry)
     - Hiring Manager (Omar Al-Harbi, CIO)
     - Bridge connections (3 people with RSS scores)

---

## 5. History Page Tests

### ✅ View History
1. Sign in
2. Go to `/settings/history` (click "History" in header)
3. **Expected:**
   - Form loads
   - If no history saved → Empty form
   - If history exists → Pre-filled with your data

### ✅ Save History
1. Fill in:
   - Name
   - LinkedIn URL (optional)
   - Add positions (company, title, start/end dates)
2. Click **"Save History"**
3. **Expected:**
   - Success message
   - Data persists (refresh page → still there)

### ✅ Use History for Draft Pitch
1. Save your history
2. Go back to dashboard
3. Click a signal → Open War Room drawer
4. Click **"Send Blueprint Pitch"**
5. **Expected:**
   - Draft pitch generated using your saved history
   - Message personalized with your companies/experience

---

## 6. API Endpoint Tests

### ✅ GET /api/signals
```bash
curl https://your-app.vercel.app/api/signals
```
**Expected:**
- If not signed in → `[]` (empty array)
- If signed in → Array of signals with stakeholders

### ✅ POST /api/seed
```bash
curl -X POST https://your-app.vercel.app/api/seed
```
**Expected:**
- If Supabase not configured → `503 Service Unavailable`
- If configured → `{"ok": true, "message": "Seed complete...", "signalsInserted": 3, ...}`
- If already seeded → `{"ok": true, "message": "Signals already exist; skip seed..."}`

### ✅ GET /api/integration-status
```bash
curl https://your-app.vercel.app/api/integration-status
```
**Expected:** JSON with boolean flags for each integration

### ✅ GET /api/sources
```bash
curl https://your-app.vercel.app/api/sources
```
**Expected:** Array of scrape sources (LinkedIn, Bayt, GulfTalent, etc.) with status

---

## 7. Cron Job Test (Manual Trigger)

### ✅ Trigger Cron Manually
```bash
curl -X GET "https://your-app.vercel.app/api/cron/refresh-hubs" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Requirements:**
- `CRON_SECRET` set in Vercel env vars
- `APIFY_TOKEN` set
- `APOLLO_API_KEY` set
- `SUPABASE_SERVICE_ROLE_KEY` set

**Expected:**
- Fetches jobs from Apify
- Filters by keywords
- Inserts signals + stakeholders into Supabase
- Returns JSON with counts

**Note:** This is rate-limited and may take 30-60 seconds.

---

## 8. Error Scenarios

### ✅ Missing Supabase Configuration
1. Remove Supabase env vars in Vercel
2. Redeploy
3. **Expected:**
   - Amber banner: "Using mock data. Add NEXT_PUBLIC_SUPABASE_URL..."
   - Dashboard shows mock signals
   - Login page shows "Auth not configured"

### ✅ Unauthenticated Access
1. Sign out
2. Try to access `/settings/history`
3. **Expected:**
   - Redirects to `/login`

### ✅ Invalid API Keys
1. Set invalid Supabase keys
2. **Expected:**
   - App still loads (graceful degradation)
   - Shows mock data
   - Auth operations fail silently

---

## 9. Browser Console Checks

Open browser DevTools → Console:

### ✅ No Errors
- Should see no red errors
- Warnings are OK (e.g., deprecation warnings)

### ✅ Network Tab
- API calls return `200 OK`
- No `401 Unauthorized` (unless testing auth)
- No `500 Internal Server Error`

---

## 10. Vercel Deployment Checks

### ✅ Build Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click latest deployment
3. **Expected:**
   - Build succeeded
   - No TypeScript errors
   - No ESLint errors

### ✅ Function Logs
1. Vercel Dashboard → Functions tab
2. Trigger an API call (e.g., `/api/signals`)
3. **Expected:**
   - Function executes successfully
   - No timeout errors
   - Logs show expected behavior

### ✅ Environment Variables
1. Vercel Dashboard → Settings → Environment Variables
2. **Expected:**
   - All required vars set (if using integrations)
   - Production values match your `.env` (without secrets)

---

## Quick Test Checklist

- [ ] Dashboard loads without errors
- [ ] Mock data displays (if Supabase not configured)
- [ ] Sign up works (if Supabase configured)
- [ ] Sign in works
- [ ] Sign out works
- [ ] History page accessible when signed in
- [ ] Can save professional history
- [ ] Seed test data button works
- [ ] Signals table shows data after seeding
- [ ] War Room drawer opens and shows stakeholders
- [ ] Source status bar displays
- [ ] API endpoints return expected responses
- [ ] No console errors
- [ ] No build errors in Vercel

---

## Troubleshooting

### Dashboard shows "No signals"
- **If Supabase configured:** Sign in, then click "Seed test data"
- **If Supabase not configured:** This is expected (mock mode)

### Auth not working
- Check Supabase Dashboard → Authentication → Providers (Email enabled?)
- Check Redirect URLs in Supabase Dashboard
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel

### API returns 503
- Check if required env vars are set in Vercel
- Check Vercel function logs for errors

### Build fails
- Check Vercel build logs
- Ensure all TypeScript/ESLint errors are fixed
- Verify `package.json` dependencies are correct
