# Kitchen-Notebook Services Onboarding Guide

A step-by-step guide for setting up all the services needed to run and deploy Kitchen-Notebook (מחברת המתכונים). Written for complete beginners — no prior experience required.

---

## Table of Contents

1. [Overview](#1-overview)
2. [GitHub Setup](#2-github-setup)
3. [Supabase Setup](#3-supabase-setup)
4. [Google Cloud OAuth Setup](#4-google-cloud-oauth-setup)
5. [Claude API Setup](#5-claude-api-setup)
6. [Vercel Deployment](#6-vercel-deployment)
7. [Domain (Optional)](#7-domain-optional)
8. [Final Checklist](#8-final-checklist)

---

## 1. Overview

Kitchen-Notebook uses five services. Here is what each one does and what it costs:

| Service | What It Does | Cost |
|---------|-------------|------|
| **GitHub** | Hosts your source code and tracks changes | Free |
| **Supabase** (free tier) | Database (PostgreSQL), user authentication, and image storage | Free (up to 500 MB database, 1 GB storage) |
| **Vercel** (free tier) | Hosts and deploys your Next.js web application | Free (hobby tier) |
| **Claude API** (Anthropic) | AI-powered recipe extraction from photos and URLs, and Hebrew translation | ~$1/month for typical family use |
| **Google Cloud** (free tier) | Provides Google Sign-In (OAuth) so users can log in with their Google account | Free (OAuth has no usage charges) |

**Estimated monthly cost**: approximately $1/month (only the Claude API has a usage-based charge). Domain registration is optional at ~$12/year.

---

## 2. GitHub Setup

### What Are Git and GitHub?

**Git** is a tool that tracks changes to your code over time — like version history in Google Docs, but for code. It lets you undo mistakes and see what changed and when.

**GitHub** is a website that stores your Git repositories (projects) online. It also connects to Vercel for automatic deployments.

### Step-by-Step

1. **Create a GitHub account**
   - Go to [github.com](https://github.com) and click **Sign up**.
   - Choose a username, enter your email, and set a password.
   - Verify your email address.

2. **Install Git on your computer**
   - **Windows**: Download from [git-scm.com](https://git-scm.com/download/win) and run the installer. Use the default settings.
   - **Mac**: Open Terminal and type `git --version`. If Git is not installed, macOS will prompt you to install it.
   - After installation, open a terminal and configure your identity:
     ```bash
     git config --global user.name "Your Name"
     git config --global user.email "your-email@example.com"
     ```

3. **Create a new repository**
   - On GitHub, click the **+** icon in the top right and select **New repository**.
   - Name it `kitchen-notebook`.
   - Leave it as **Public** (required for free Vercel tier) or **Private** if you prefer.
   - Do **not** initialize with a README (we already have code).
   - Click **Create repository**.

4. **Push the code to GitHub**
   - Open a terminal in the `kitchen-notebook` folder and run:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/kitchen-notebook.git
     git branch -M main
     git push -u origin main
     ```
   - If prompted, enter your GitHub username and a **Personal Access Token** (not your password). To create a token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → select the `repo` scope.

---

## 3. Supabase Setup

Supabase provides three things for this project: a PostgreSQL database to store recipes, authentication (email + Google sign-in), and file storage for recipe images.

### Part A: Local Development with Docker

Before deploying to the cloud, you should run Supabase locally for development. This requires Docker.

1. **Install Docker Desktop**
   - Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).
   - Install and launch Docker Desktop.
   - Wait until the Docker icon in your system tray shows "Docker Desktop is running" (the whale icon should be steady, not animating).

2. **Clone the repository** (if you haven't already)
   ```bash
   git clone https://github.com/YOUR_USERNAME/kitchen-notebook.git
   cd kitchen-notebook
   ```

3. **Install project dependencies**
   ```bash
   npm install
   ```

4. **Initialize Supabase locally** (if not already done)
   ```bash
   npx supabase init
   ```
   This creates a `supabase/` folder with configuration files. If this folder already exists, you can skip this step.

5. **Start local Supabase**
   ```bash
   npx supabase start
   ```
   This downloads and starts several Docker containers (database, auth, storage, etc.). The first run may take a few minutes.

   When it finishes, it prints output like this:
   ```
   API URL: http://127.0.0.1:54321
   anon key: eyJhbGciOiJI...
   service_role key: eyJhbGciOiJI...
   Studio URL: http://127.0.0.1:54323
   ```

6. **Note the API URL and anon key**
   - Copy the **API URL** and **anon key** from the output above.
   - Create a `.env.local` file in the project root (if it does not already exist) and add:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...your-local-anon-key...
     ANTHROPIC_API_KEY=sk-ant-...your-key-here...
     ```

7. **Apply database migrations**
   ```bash
   npx supabase db push
   ```
   This creates the `recipes` table, storage bucket, RLS policies, and indexes defined in `supabase/migrations/`.

8. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --local > src/types/database.ts
   ```
   This creates type definitions that match your database schema, giving you autocomplete and type safety in your code.

9. **Verify it works**
   - Open [http://localhost:54323](http://localhost:54323) in your browser to access Supabase Studio.
   - Click on **Table Editor** in the left sidebar — you should see the `recipes` table.
   - Run the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

### Part B: Cloud Supabase (for production)

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com) and click **Start your project**.
   - Sign up with your **GitHub account** (recommended) or email.

2. **Create a new project**
   - Click **New Project**.
   - Choose your organization (or create one).
   - Pick a project name (e.g., `kitchen-notebook`).
   - Set a strong **database password** — save it somewhere safe (you will need it for migrations).
   - Choose a **region** close to Israel: select **EU Central (Frankfurt)** (`eu-central-1`) for the best latency.
   - Click **Create new project** and wait approximately 2 minutes for it to initialize.

3. **Copy your API credentials**
   - In the Supabase dashboard, go to **Settings** (gear icon in the left sidebar) → **API**.
   - Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`).
   - Copy the **anon / public** key (a long JWT string starting with `eyJ...`).

4. **Enable Email authentication**
   - Go to **Authentication** (left sidebar) → **Providers**.
   - Find **Email** and make sure it is **enabled** (it usually is by default).
   - You can optionally disable "Confirm email" for easier testing during development.

5. **Set the Site URL**
   - Go to **Authentication** → **URL Configuration**.
   - Set the **Site URL** to `http://localhost:3000` for now (you will update this to your Vercel URL later).
   - Under **Redirect URLs**, add `http://localhost:3000/**` to allow OAuth redirects during local development.

6. **Link and push migrations to the cloud project**
   - Find your **project reference** in the Supabase dashboard URL. It is the string after `https://supabase.com/dashboard/project/` — for example, if the URL is `https://supabase.com/dashboard/project/abcdefgh`, then the ref is `abcdefgh`.
   - Run:
     ```bash
     npx supabase link --project-ref abcdefgh
     ```
     You will be prompted for your database password (the one you set when creating the project).
   - Apply the migrations to the cloud database:
     ```bash
     npx supabase db push
     ```
   - Verify in the Supabase dashboard: go to **Table Editor** — you should see the `recipes` table.

---

## 4. Google Cloud OAuth Setup

Google OAuth lets users sign in with their Google account. This section is optional — the app works with email/password authentication alone — but provides a smoother sign-in experience.

1. **Go to the Google Cloud Console**
   - Open [console.cloud.google.com](https://console.cloud.google.com).
   - Sign in with any Google account.

2. **Create a new project**
   - Click the project dropdown at the top of the page (next to "Google Cloud").
   - Click **New Project**.
   - Name it anything (e.g., `kitchen-notebook`).
   - Click **Create** and then select the new project from the dropdown.

3. **Configure the OAuth consent screen**
   - In the left sidebar, go to **APIs & Services** → **OAuth consent screen**.
   - Select **External** as the user type and click **Create**.
   - Fill in the required fields:
     - **App name**: Kitchen Notebook (or whatever you like)
     - **User support email**: your email address
     - **Developer contact information**: your email address
   - Click **Save and Continue** through the remaining steps (Scopes, Test users) — the defaults are fine.
   - Click **Back to Dashboard**.

4. **Create OAuth 2.0 credentials**
   - Go to **APIs & Services** → **Credentials**.
   - Click **Create Credentials** → **OAuth 2.0 Client ID**.
   - Select **Web application** as the application type.
   - Give it a name (e.g., `kitchen-notebook-web`).

5. **Set authorized JavaScript origins**
   - Under **Authorized JavaScript origins**, click **Add URI** and enter:
     ```
     http://localhost:3000
     ```
   - If you already have a Vercel URL, add that too (e.g., `https://kitchen-notebook.vercel.app`).

6. **Set the redirect URI**
   - Under **Authorized redirect URIs**, click **Add URI** and enter:
     ```
     https://<your-supabase-project>.supabase.co/auth/v1/callback
     ```
   - Replace `<your-supabase-project>` with your actual Supabase project reference (e.g., `https://abcdefgh.supabase.co/auth/v1/callback`).

7. **Copy the credentials**
   - Click **Create**. A dialog will appear showing your **Client ID** and **Client Secret**.
   - Copy both values and keep them safe.

8. **Add credentials to Supabase**
   - Go to the **Supabase Dashboard** → **Authentication** → **Providers**.
   - Find **Google** in the list and expand it.
   - Toggle it to **Enabled**.
   - Paste your **Client ID** and **Client Secret** into the corresponding fields.
   - Click **Save**.

---

## 5. Claude API Setup

The Claude API powers AI features: extracting recipes from photos (OCR), extracting recipes from URLs, and translating everything to Hebrew.

1. **Create an Anthropic account**
   - Go to [console.anthropic.com](https://console.anthropic.com).
   - Click **Sign up** and create an account with your email or Google.

2. **Create an API key**
   - After signing in, go to **API Keys** in the left sidebar (or navigate to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)).
   - Click **Create Key**.
   - Give it a name (e.g., `kitchen-notebook`).
   - Copy the key immediately — it starts with `sk-ant-` and will only be shown once.

3. **Add the key to your environment**
   - Open your `.env.local` file and add (or update):
     ```env
     ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
     ```
   - This key is used server-side only (in API routes) and is never sent to the browser.

4. **Add a payment method**
   - Go to **Settings** → **Billing** in the Anthropic console.
   - Add a credit card or other payment method.
   - The Claude API is pay-as-you-go. For typical family use (a few recipes per week), expect to spend roughly **$1/month or less**.
   - You can set a monthly spending limit for safety (e.g., $5/month).

---

## 6. Vercel Deployment

Vercel hosts your Next.js application and automatically redeploys whenever you push code to GitHub.

1. **Create a Vercel account**
   - Go to [vercel.com](https://vercel.com) and click **Sign Up**.
   - Choose **Continue with GitHub** (recommended — this links your accounts).

2. **Import your repository**
   - After signing in, click **Add New...** → **Project**.
   - You will see a list of your GitHub repositories. Find `kitchen-notebook` and click **Import**.
   - Vercel will automatically detect that it is a Next.js project.

3. **Add environment variables**
   - Before clicking Deploy, expand the **Environment Variables** section.
   - Add the following three variables:

     | Name | Value |
     |------|-------|
     | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g., `https://abcdefgh.supabase.co`) |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key (the long `eyJ...` string) |
     | `ANTHROPIC_API_KEY` | Your Claude API key (`sk-ant-...`) |

   - Make sure you are using your **cloud** Supabase credentials here, not the local ones.

4. **Deploy**
   - Click **Deploy**.
   - Vercel will build and deploy your application. This usually takes 1-2 minutes.
   - When done, you will get a URL like `https://kitchen-notebook.vercel.app` (or a similar auto-generated name).

5. **Update Supabase Site URL**
   - Go to the **Supabase Dashboard** → **Authentication** → **URL Configuration**.
   - Change the **Site URL** from `http://localhost:3000` to your Vercel URL (e.g., `https://kitchen-notebook.vercel.app`).
   - Under **Redirect URLs**, add your Vercel URL with a wildcard: `https://kitchen-notebook.vercel.app/**`.

6. **Update Google OAuth origins** (if you set up Google sign-in)
   - Go back to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
   - Edit your OAuth 2.0 Client ID.
   - Under **Authorized JavaScript origins**, add your Vercel URL (e.g., `https://kitchen-notebook.vercel.app`).
   - Click **Save**.

From now on, every time you push code to the `main` branch on GitHub, Vercel will automatically rebuild and redeploy your application.

---

## 7. Domain (Optional)

By default, your app will be available at a `.vercel.app` URL. If you want a custom domain (e.g., `kitchen-notebook.com`), follow these steps.

### Buy a Domain

- **Cloudflare Registrar** ([cloudflare.com](https://www.cloudflare.com)): Domains at wholesale prices, typically ~$10-12/year for a `.com`.
- **Namecheap** ([namecheap.com](https://www.namecheap.com)): Another popular registrar with similar pricing.

Search for your desired domain name and purchase it.

### Connect to Vercel

1. In the **Vercel Dashboard**, go to your project → **Settings** → **Domains**.
2. Type in your purchased domain (e.g., `kitchen-notebook.com`) and click **Add**.
3. Vercel will show you DNS records to configure. You will typically need to add:
   - An **A record** pointing to `76.76.21.21`
   - Or a **CNAME record** pointing to `cname.vercel-dns.com`
4. Go to your domain registrar's DNS settings and add the records Vercel specifies.
5. Wait for DNS propagation (usually a few minutes, up to 48 hours).
6. Vercel will automatically provision an SSL certificate for HTTPS.

After connecting the domain, remember to:
- Update the **Supabase Site URL** to your custom domain.
- Update **Google OAuth authorized origins** to include your custom domain.
- Add your custom domain to the Supabase **Redirect URLs**.

---

## 8. Final Checklist

Use this checklist to verify everything is working correctly:

### Environment & Configuration
- [ ] All environment variables are set in `.env.local` (for local dev) and in Vercel (for production)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the correct Supabase project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the correct anon key
- [ ] `ANTHROPIC_API_KEY` is set and valid

### Authentication
- [ ] Email sign-up works — can create a new account
- [ ] Email login works — can sign in with existing credentials
- [ ] Google SSO works (if configured) — can sign in with Google
- [ ] Password reset flow works — receive email, can set new password
- [ ] Session persists across page refresh

### Recipe Features
- [ ] Can add a recipe manually (title, ingredients, instructions)
- [ ] Can add a recipe via URL — paste a recipe link and get AI-extracted Hebrew content
- [ ] Can add a recipe via photo — take or upload a photo and get OCR result in Hebrew
- [ ] Can view recipe details
- [ ] Can edit an existing recipe (change title, reorder steps, etc.)
- [ ] Can delete a recipe (with confirmation dialog)
- [ ] Recipe search works (search by title)
- [ ] Tag filtering works

### Layout & Mobile
- [ ] RTL layout is correct on all pages (text flows right-to-left)
- [ ] App looks good on mobile (375px viewport, no horizontal scrolling)
- [ ] Touch targets are large enough on mobile (buttons, links)
- [ ] Bottom navigation bar appears on mobile

### Deployment
- [ ] Vercel deployment succeeds without errors
- [ ] Production URL loads correctly
- [ ] All features work on the production URL (not just localhost)

---

**Congratulations!** If all checklist items pass, your Kitchen-Notebook instance is fully set up and ready to use. Start adding your family recipes!
