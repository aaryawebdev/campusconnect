# CampusConnect Deployment

## GitHub

1. Use the GitHub repository:

```text
https://github.com/aaryawebdev/campusconnect
```

2. If this repo needs to be reconnected locally, set it as the `origin` remote:

```bash
git remote set-url origin https://github.com/aaryawebdev/campusconnect.git
git branch -M main
git push -u origin main
```

## Vercel

1. Import the GitHub repository in Vercel.
2. Use these settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables:

```text
VITE_SUPABASE_URL=https://wtnwezeuhpuvxwhjmwtg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
```

## Supabase Redirect URLs

Add these in Supabase Authentication URL Configuration:

```text
http://localhost:5173
https://<your-vercel-domain>
https://<your-custom-domain>
```

## Domain

After Vercel deployment:

1. Go to Vercel Project Settings -> Domains.
2. Add your custom domain.
3. Follow Vercel's DNS instructions at your domain provider.
