# Setup Guide

## 1. Supabase Project

1. Go to https://supabase.com and create a free account
2. Click "New project" — name it "aesthetic-ascension", pick a region, set a strong password
3. Wait ~2 minutes for it to provision

## 2. Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Open `supabase-schema.sql` from this folder and paste the entire contents
4. Click **Run**

## 3. Create the Photo Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it `progress-photos`, toggle **Public bucket** ON, click Create
4. Go to **Policies** tab for that bucket
5. Click **New policy** → **For full customization**
6. Add this policy for uploads:
   - Policy name: `Authenticated users can upload`
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: `(auth.uid()::text) = (storage.foldername(name))[1]`

## 4. Connect the App

1. In Supabase, go to **Project Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Open `.env.local` in this folder and replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Create User Accounts

Add users through Supabase Auth:

1. Go to **Authentication** → **Users** → **Add user**
2. For yourself (coach):
   - Email + password
   - Under "User metadata" add: `{ "full_name": "Your Name", "role": "coach" }`
3. For each client:
   - Email + password
   - Metadata: `{ "full_name": "Client Name", "role": "client" }`

## 6. Run the App

```bash
cd coaching-app
npm run dev
```

Open http://localhost:3000 — sign in with your coach account to see the coach dashboard.

## 7. Deploy (Optional)

The easiest way to go live is Vercel:
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import project → connect your repo
3. Add the two environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Deploy — you'll get a live URL to share with clients
