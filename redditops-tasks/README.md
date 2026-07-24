# RedditOps Tasks 🚀

A modern, dark-themed task management platform for Reddit marketing tasks. Create tasks, manage submissions, and pay users for completing Reddit comments and posts — all with **no user accounts required**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Free-3ECF8E?style=flat&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Free-000000?style=flat&logo=vercel)

---

## ✨ Features

- **Task ID & Access Code System** — Secure task access with auto-generated IDs (`ROT-0001`) and case-sensitive access codes
- **Two Task Types** — Comment Tasks (copy-paste comments on Reddit posts) and Post Tasks (create new Reddit posts)
- **🔒 Locked Task Pages** — All task content hidden until the correct Task ID + Access Code is entered
- **User Submission** — Submit proof with Discord username, no account needed; get a unique Reference ID
- **Submission Status** — Check submission status anytime using your Reference ID
- **Admin Dashboard** — Stats overview, create/edit/delete tasks, review submissions, approve/reject
- **Rejection System** — 12 preset rejection reasons + custom reason + detailed admin notes
- **Google Sheets Sync** — Auto-sync tasks, submissions, and status changes to Google Sheets
- **Copy Buttons** — One-click copy for comment text, titles, body text, and combined Task ID + Access Code
- **Dark Theme** — Modern dark UI with purple accents, glassmorphism cards, and smooth animations
- **Search Engine Blocked** — `noindex` headers prevent tasks from appearing in search results
- **Access Logging** — Every unlock attempt is logged with IP address and timestamp
- **Fully Responsive** — Works on desktop, tablet, and mobile

---

## 🧰 Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Framework | Next.js 16 + React 19 | Free (OSS) |
| Styling | Tailwind CSS 4 | Free (OSS) |
| Icons | Lucide React | Free (OSS) |
| Database | Supabase (PostgreSQL) | **Free Plan** — 500 MB, 50,000 rows |
| Authentication | Supabase Auth | **Free Plan** |
| Sheets Sync | Google Sheets API | **Free** — 60 req/min |
| Hosting | Vercel | **Free Plan** — 100 GB bandwidth, 6000 build min/mo |
| Version Control | GitHub | **Free** — unlimited public repos |

---

## 📁 Project Structure

```
redditops-tasks/
├── .env.example              # Environment variable template
├── .gitignore
├── next.config.ts            # Next.js configuration
├── vercel.json               # Vercel deployment settings
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── supabase-schema.sql       # Database schema (run in Supabase SQL Editor)
├── README.md
├── public/                   # Static assets
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout with dark theme + Header
    │   ├── page.tsx                # Home page — browse tasks, search, filter
    │   ├── globals.css             # Global styles, animations, glassmorphism
    │   ├── task/[id]/page.tsx      # Task detail with lock/unlock system
    │   ├── status/
    │   │   ├── page.tsx            # Check submission status by Reference ID
    │   │   └── [refId]/page.tsx    # Submission status display
    │   ├── admin/
    │   │   ├── login/page.tsx      # Admin authentication
    │   │   ├── dashboard/page.tsx  # Dashboard with 7 metric cards
    │   │   ├── tasks/
    │   │   │   ├── page.tsx        # Task management (list, edit, delete, copy)
    │   │   │   ├── new/page.tsx    # Create task form
    │   │   │   └── [id]/edit/page.tsx  # Edit task form
    │   │   └── submissions/page.tsx     # Review + approve/reject submissions
    │   └── api/
    │       ├── tasks/route.ts      # Tasks API
    │       ├── submissions/route.ts # Submissions API
    │       ├── admin/route.ts      # Admin auth API
    │       ├── sheets/route.ts     # Google Sheets sync API
    │       └── log-access/route.ts # Access attempt logging
    ├── components/
    │   ├── Header.tsx         # Navigation header
    │   ├── TaskCard.tsx       # Task card for browse page
    │   └── CopyButton.tsx     # Reusable copy-to-clipboard button
    └── lib/
        ├── types.ts           # TypeScript types & utilities
        ├── store.ts           # Client-side data store (localStorage)
        ├── supabase.ts        # Supabase client (lazy, null-safe)
        └── google-sheets.ts   # Google Sheets integration (server-only)
```

---

## 🚀 Deployment Guide (Free — Step by Step)

### Step 1: Create a GitHub Repository

```bash
# 1. Create a new repository on GitHub named "redditops-tasks" (public).
# 2. Then push the project:
git init
git add .
git commit -m "Initial commit: RedditOps Tasks platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/redditops-tasks.git
git push -u origin main
```

---

### Step 2: Set Up Supabase (Free Plan)

1. Go to **[supabase.com](https://supabase.com)** and sign up / log in.
2. Click **"New Project"**.
3. Enter:
   - **Name:** `redditops-tasks`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose the closest to you
4. Wait ~2 minutes for the database to provision.
5. Once ready, go to **SQL Editor** → **New Query**.
6. Open `supabase-schema.sql` from this project, copy the entire contents, paste into the SQL Editor, and click **Run**.
7. Go to **Project Settings** → **API**:
   - Copy the **Project URL** (`https://xxxxx.supabase.co`)
   - Copy the **anon public key**
   - Copy the **service_role key** (keep this secret!)
8. Save these for the environment variables below.

> **Note:** The `supabase-schema.sql` file includes Row Level Security (RLS) policies. You don't need to enable anything manually — the SQL handles it.

---

### Step 3: Set Up Google Sheets API (Free — Optional)

The app works perfectly without Google Sheets (it uses localStorage by default). 
Skip this step if you don't need spreadsheet sync.

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**.
2. Create a new project (or select existing).
3. Go to **APIs & Services** → **Library**.
4. Search for **"Google Sheets API"** → Click → **Enable**.
5. Go to **Credentials** → **Create Credentials** → **Service Account**.
6. Fill in:
   - **Service account name:** `redditops-sheets`
   - Click **Create and Continue**.
   - Role: Skip (no role needed) → **Done**.
7. Click on the new service account email → **Keys** → **Add Key** → **Create New Key** → **JSON**.
8. A JSON file will download. Open it and extract:
   - `private_key` (the full key including `-----BEGIN PRIVATE KEY-----`)
   - `client_email` (looks like `redditops-sheets@your-project.iam.gserviceaccount.com`)
9. Create a Google Sheet (or use an existing one).
10. Click **Share** in the top-right of the sheet and share it with the `client_email` above — give **Editor** permissions.
11. Copy the **Spreadsheet ID** from the URL:  
    `https://docs.google.com/spreadsheets/d/THIS_IS_THE_SPREADSHEET_ID/edit`

---

### Step 4: Deploy to Vercel (Free Plan)

1. Go to **[vercel.com](https://vercel.com)** and sign up / log in (use GitHub for easy import).
2. Click **"Add New..."** → **Project**.
3. Import the **`redditops-tasks`** GitHub repository.
4. In the **"Environment Variables"** section, add the following:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-supabase-service-role-key` |
| `NEXT_PUBLIC_ADMIN_USERNAME` | `admin` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `YourSecurePassword!` |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` (you'll see this after deployment) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | *(optional)* your sheet ID |
| `GOOGLE_SHEETS_PRIVATE_KEY` | *(optional)* your private key with `\n` for newlines |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | *(optional)* your service account email |

5. Click **Deploy**.
6. Wait ~2 minutes. Vercel will build and deploy your app.
7. Your app is live at `https://redditops-tasks.vercel.app` (or similar URL).

---

### Step 5: Post-Deployment Verification

1. Visit your deployed URL.
2. Go to **`/admin/login`** and sign in with your admin credentials.
3. Create a test task (Comment or Post type).
4. Open the task publicly — you should see the lock screen.
5. Enter the correct Task ID + Access Code — the task content should unlock.
6. Submit a test submission — you should get a Reference ID.
7. Check the submission status at `/status` using the Reference ID.
8. Go back to `/admin/submissions` — approve or reject the submission.
9. *(If Sheets configured)* Check your Google Sheet — tasks and submissions should appear.

---

## 📋 Manual Setup Checklist

Use this checklist to track your setup progress:

### GitHub Setup
- [ ] Create a new **public** GitHub repository named `redditops-tasks`
- [ ] Run `git init`, `git add .`, `git commit -m "Initial commit"`
- [ ] Run `git remote add origin https://github.com/YOUR_USERNAME/redditops-tasks.git`
- [ ] Run `git push -u origin main`

### Supabase Setup (Free Plan)
- [ ] Create a Supabase account and project
- [ ] Run `supabase-schema.sql` in the SQL Editor
- [ ] Copy Project URL, anon key, and service_role key from Settings → API

### Google Sheets API Setup (Optional)
- [ ] Enable Google Sheets API in Google Cloud Console
- [ ] Create a Service Account and download JSON key
- [ ] Share your Google Sheet with the service account email (Editor permissions)
- [ ] Copy Spreadsheet ID from the sheet URL

### Vercel Deployment (Free Plan)
- [ ] Import GitHub repository into Vercel
- [ ] Add all environment variables in Vercel dashboard
- [ ] Click Deploy and wait for build to complete
- [ ] Update `NEXT_PUBLIC_BASE_URL` to your production URL

### Post-Deployment Verification
- [ ] Visit the deployed URL — homepage loads
- [ ] `/admin/login` — sign in successfully
- [ ] Create a task — verify it appears on the homepage
- [ ] Open task URL — lock screen appears
- [ ] Enter correct access code — task content is revealed
- [ ] Submit a submission — Reference ID is shown
- [ ] `/status` — check submission status by Reference ID
- [ ] `/admin/submissions` — approve/reject a submission
- [ ] *(Optional)* Verify Google Sheets sync: tasks and submissions appear in the sheet
- [ ] Change the default admin password in Vercel environment variables

---

## 💻 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/redditops-tasks.git
cd redditops-tasks

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Edit .env.local with your Supabase credentials (at minimum)

# 5. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Security Notes

- **Tasks require both the URL (Task ID) and the Access Code** to view. This two-factor approach keeps tasks private.
- **Access codes are case-sensitive.** `Abc123` ≠ `abc123`.
- **Admin credentials** are exposed as `NEXT_PUBLIC_` env vars (visible client-side). This is by design for the localStorage auth. **Change the default password** before going live. For production, consider using Supabase Auth + a proper login flow.
- **Search engines are blocked** via `noindex` meta tags and `X-Robots-Tag` headers.
- **All access attempts are logged** with IP addresses and timestamps.
- **No user accounts required** — users submit with just a Discord username.

---

## 🧪 Routes Overview

| Route | Access | Description |
|---|---|---|
| `/` | Public | Browse available tasks |
| `/task/[id]` | Locked | Task detail (unlock with Access Code) |
| `/status` | Public | Enter Reference ID to check submission |
| `/status/[refId]` | Public | View submission status |
| `/admin/login` | Public | Admin login page |
| `/admin/dashboard` | Admin only | Stats dashboard |
| `/admin/tasks` | Admin only | Manage all tasks |
| `/admin/tasks/new` | Admin only | Create new task |
| `/admin/tasks/[id]/edit` | Admin only | Edit existing task |
| `/admin/submissions` | Admin only | Review and manage submissions |

---

## 📄 License

Private — Internal use only.
