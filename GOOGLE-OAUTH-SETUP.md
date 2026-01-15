# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the AI CFO Dashboard.

## Step 1: Go to Google Cloud Console

1. Visit https://console.cloud.google.com
2. Select your existing project (the one you're using for the Google Sheets API)

## Step 2: Enable Google+ API

1. In the left sidebar, click on **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - Click **CREATE**
   - Fill in:
     - App name: **AI CFO Dashboard**
     - User support email: **(your email)**
     - Developer contact: **(your email)**
   - Click **SAVE AND CONTINUE**
   - Skip the "Scopes" section (click **SAVE AND CONTINUE**)
   - Add test users if needed
   - Click **SAVE AND CONTINUE**

4. Now create the OAuth client ID:
   - Application type: **Web application**
   - Name: **AI CFO Dashboard Web Client**
   - Authorized JavaScript origins:
     - Add: `https://ai-cfo-sheets.vercel.app`
   - Authorized redirect URIs:
     - Add: `https://ai-cfo-sheets.vercel.app/api/auth/callback`
   - Click **CREATE**

5. Copy the **Client ID** and **Client Secret**

## Step 4: Add Environment Variables to Vercel

1. Go to https://vercel.com/chaits-projects-f71368a7/ai-cfo-sheets/settings/environment-variables

2. Add these three environment variables:

   **Variable Name:** `GOOGLE_CLIENT_ID`
   **Value:** (paste your Client ID from step 3)
   **Environments:** Production, Preview, Development

   **Variable Name:** `GOOGLE_CLIENT_SECRET`
   **Value:** (paste your Client Secret from step 3)
   **Environments:** Production, Preview, Development

   **Variable Name:** `VERCEL_URL`
   **Value:** `ai-cfo-sheets.vercel.app`
   **Environments:** Production

3. Click **Save** for each variable

## Step 5: Redeploy

After adding the environment variables, you need to redeploy the app for the changes to take effect.

Run:
```bash
cd "/Users/chait/Library/Mobile Documents/com~apple~CloudDocs/Docs/ai-cfo-sheets"
npx vercel --prod
```

## Step 6: Test Authentication

1. Visit https://ai-cfo-sheets.vercel.app
2. You should be redirected to the login page
3. Click "Continue with Google"
4. Sign in with your Google account
5. You should be redirected back to the dashboard

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://ai-cfo-sheets.vercel.app/api/auth/callback`
- No trailing slashes

### "Error: Missing Google OAuth credentials"
- Check that environment variables are set correctly in Vercel
- Redeploy after adding variables

### Stuck on login page
- Check browser console for errors
- Verify all environment variables are set
- Make sure Google+ API is enabled

## Security Notes

- Sessions expire after 24 hours
- Cookies are HttpOnly and Secure
- OAuth credentials are stored server-side only
- Never commit Client Secret to git
