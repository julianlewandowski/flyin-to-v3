# Environment Setup Guide

## Fixing the "Failed to fetch" Error

The error you're seeing is caused by missing Supabase environment variables. Follow these steps to fix it:

### Step 1: Create a `.env.local` file

Create a file named `.env.local` in the root directory of your project (same level as `package.json`).

### Step 2: Add required environment variables

Add the following variables to your `.env.local` file:

```env
# Supabase (Required for authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# SerpApi (Required for unified flight search)
SERPAPI_KEY=your_serpapi_key_here

# OpenAI (Required for LLM-based preference extraction and scoring)
# If using Vercel AI SDK with environment variables:
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Existing API keys
AIRHOB_API_KEY=your_airhob_key_here
KIWI_API_KEY=your_kiwi_key_here
```

### Step 3: Get your Supabase credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one if you don't have one)
3. Go to **Project Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use this for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use this for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Your `.env.local` file should look like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc3Nzg1NzAsImV4cCI6MjAxMzM1NDU3MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SerpApi - Get from https://serpapi.com/
SERPAPI_KEY=your_serpapi_key_here

# OpenAI - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Getting API Keys

#### SerpApi Key

1. Go to [SerpApi](https://serpapi.com/)
2. Sign up for a free account (100 searches/month free)
3. Go to **Dashboard** → **API Key**
4. Copy your API key
5. Add to `.env.local` as `SERPAPI_KEY`

**Note**: Free tier includes 100 searches per month. For production, consider upgrading.

#### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** → **Create new secret key**
4. Copy the key (you won't see it again)
5. Add to `.env.local` as `OPENAI_API_KEY`

**Note**: The Vercel AI SDK will use this key automatically. If you're using Vercel's AI SDK with built-in provider configuration, you may not need this directly, but it's recommended to set it explicitly.

### Step 5: Restart your development server

After creating the `.env.local` file:

1. Stop your development server (press `Ctrl+C` in the terminal)
2. Restart it with `pnpm dev`

### Important Notes

- **Never commit `.env.local`** to version control - it should already be in `.gitignore`
- These variables need the `NEXT_PUBLIC_` prefix to be available in client-side code
- Make sure there are no spaces around the `=` sign
- Don't use quotes around the values unless Supabase's documentation specifically says to

### Need Help?

If you don't have a Supabase project yet:

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Wait for the project to finish provisioning
5. Follow the steps above to get your credentials

### Troubleshooting

If you're still getting the error after setting up the environment variables:

1. Make sure the `.env.local` file is in the root directory
2. Restart your dev server completely
3. Check that the environment variable names are exactly correct (including the prefix)
   (The prefix is required for you to easily use them client-side in Next.js)
4. Verify your Supabase URL starts with `https://` and ends with `.supabase.co`
5. Check the browser console for any specific error messages

