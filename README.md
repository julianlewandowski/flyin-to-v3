# Flyin.to - Flight Search & Holiday Planning

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

A modern flight search and holiday planning application built with Next.js, featuring AI-powered destination discovery, price tracking, and smart insights.

## Architecture

**Unified Next.js Application** - All functionality consolidated into a single Next.js app deployed on Vercel.

- **Frontend & Backend**: Next.js 15 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI/LLM**: OpenAI via Vercel AI SDK
- **Flight Data**: SerpAPI (Google Flights), Airhob
- **Deployment**: Vercel with Cron Jobs

## Features

- **AI-Powered Flight Search**: LLM-optimized flight search with preference extraction and intelligent scoring
- **Destination Discovery**: AI recommendations based on your preferences and budget
- **Smart Insights**: Price analysis, alternative route suggestions, and weather forecasts
- **Price Tracking**: Automated daily price monitoring with drop alerts
- **Flexible Date Exploration**: Find the best dates for your trip
- **Multi-Destination Support**: Search multiple routes simultaneously

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- API keys for:
  - OpenAI
  - SerpAPI
  - Airhob (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flyin-to-v3
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
OPENAI_API_KEY=your_openai_key
SERPAPI_KEY=your_serpapi_key
AIRHOB_API_KEY=your_airhob_key

# Cron Job Security
CRON_SECRET=your_random_secret
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/
│   ├── api/              # API routes (Next.js App Router)
│   ├── dashboard/        # Dashboard pages
│   └── auth/             # Authentication pages
├── components/           # React components
├── lib/
│   ├── services/         # Business logic services
│   ├── supabase/         # Supabase client configuration
│   └── types.ts          # TypeScript type definitions
└── public/               # Static assets
```

## Key Services

- **`lib/services/destination-discovery.ts`**: AI destination recommendations
- **`lib/services/insights.ts`**: Price analysis, alternatives, weather forecasts
- **`lib/services/price-tracker.ts`**: Daily price tracking cron job
- **`lib/serpapi.ts`**: SerpAPI flight search integration
- **`lib/ai-scout.ts`**: AI route discovery

## Cron Jobs

Daily price tracking runs automatically via Vercel Cron at 8 AM UTC. Configuration in `frontend/vercel.json`.

## Documentation

- [Architecture Overview](ARCHITECTURE.md) - System architecture and design patterns
- [Backend Overview](BACKEND_OVERVIEW.md) - Consolidated architecture details
- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Testing Guide](TESTING.md) - Testing procedures

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Type Checking

TypeScript is configured with strict mode. Run type checking:

```bash
npx tsc --noEmit
```

## Deployment

The application is deployed on Vercel. Push to the main branch to trigger automatic deployment.

## License

[Your License Here]
