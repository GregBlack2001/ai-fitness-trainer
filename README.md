# AI Fitness Trainer

A conversational AI-powered fitness application that generates personalised workout and nutrition plans based on user profiles, adapting weekly based on feedback.

## Features

- **Conversational Onboarding** — Natural chat-based profile collection using GPT-4o with function calling
- **Personalised Workout Plans** — AI-generated weekly plans based on goals, equipment, injuries, and schedule
- **Adaptive Training** — Weekly check-ins trigger plan regeneration with progressive overload
- **Nutrition Planning** — Meal plans aligned to user goals, dietary restrictions, and allergies
- **Workout Tracking** — Real-time session tracking with set completion, rest timers, and skip options
- **Progress Dashboard** — Visual weekly progress with dynamic day alignment

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth + RLS)
- **AI**: OpenAI GPT-4o with structured outputs and function calling
- **Validation**: Custom validation layer for AI outputs (clamping, sanitisation)

## Key Files

```
src/
├── app/
│   ├── api/
│   │   ├── chat/onboarding/route.ts   # Conversational onboarding
│   │   ├── checkin/route.ts           # Weekly check-in & plan adaptation
│   │   └── workout/log/route.ts       # Workout completion logging
│   ├── dashboard/page.tsx             # Main dashboard with day alignment
│   ├── workout/[dayIndex]/page.tsx    # Active workout session UI
│   └── onboarding/page.tsx            # Chat-based onboarding flow
├── lib/
│   ├── validation.ts                  # AI output validation & sanitisation
│   ├── exercises.ts                   # Exercise database (70+ exercises)
│   ├── supabase/server.ts             # Authenticated Supabase client
│   └── day-alignment.ts               # Dynamic day calculation helpers
└── components/
    ├── weekly-checkin-modal.tsx       # Check-in feedback form
    └── bottom-nav.tsx                 # Mobile navigation
```

## Database Schema

- `profiles` — User data, goals, injuries, dietary restrictions
- `workout_plans` — Weekly plans with `plan_start_date` for day alignment
- `meal_plans` — Nutrition plans with macros
- `workout_logs` — Completed/skipped workout records
- `weekly_checkins` — Feedback data (energy, soreness, difficulty)
- `events` — Analytics event logging

All tables use Row Level Security (RLS) with `auth.uid() = user_id` policies.

## Recent Updates

- **Dynamic Day Alignment** — Workouts start from today's day, not always Monday
- **Missed Week Detection** — Plans >7 days old show "Regenerate" prompt
- **Injury-Aware Planning** — AI excludes exercises based on user injuries
- **Modern Dark UI** — Slate-950 theme with gradient accents

## Environment Variables

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Getting Started

```bash
npm install
npm run dev
```

## Author

Greg Black — MSc Computing Dissertation Project
