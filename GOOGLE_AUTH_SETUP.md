# Google Sign-In Setup Guide

Google sign-in has been added to your authentication pages. Follow these steps to enable it:

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information (App name, User support email, Developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if your app is in testing mode
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Flyin.to` (or your preferred name)
   - **Authorized redirect URIs**: Add the following:
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference (found in your Supabase project URL).
   - For local development, also add:
     ```
     http://localhost:3000/auth/callback
     ```
7. Click **Create**
8. **Copy the Client ID and Client Secret** - you'll need these in the next step

## Step 2: Configure Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click on it
5. Toggle **Enable Google provider** to ON
6. Enter your **Client ID** (from Step 1)
7. Enter your **Client Secret** (from Step 1)
8. Click **Save**

## Step 3: Update Google Cloud Console Redirect URI (if needed)

If your Supabase project URL is different from what you initially added:

1. Go back to Google Cloud Console > **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, ensure you have:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project reference)

## Step 4: Test Google Sign-In

1. Start your development server: `npm run dev`
2. Navigate to `/auth/login` or `/auth/sign-up`
3. Click the **"Continue with Google"** button
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Environment Variables

**No additional environment variables are needed!** 

The existing Supabase environment variables are sufficient:
- `NEXT_PUBLIC_SUPABASE_URL` (already configured)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already configured)

All OAuth configuration is done in the Supabase Dashboard, not via environment variables.

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
- Check that there are no trailing slashes or typos

### "invalid_client" error
- Verify that the Client ID and Client Secret in Supabase Dashboard match the ones from Google Cloud Console
- Make sure the Google provider is enabled in Supabase

### OAuth consent screen issues
- If your app is in testing mode, make sure to add test users in Google Cloud Console
- For production, you'll need to submit your app for verification

## Notes

- The Google sign-in button appears on both `/auth/login` and `/auth/sign-up` pages
- Users can sign in or sign up using Google - Supabase handles both automatically
- After successful Google authentication, users are redirected to `/dashboard`

