# Jay's Job Hunt App

## Setup guide — do these steps in order

---

### Step 1 — Set up Supabase (your database)

1. Go to **supabase.com** → New project
2. Name it `jobhunt`, pick a region close to you (US East), set a password
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar) → **New query**
5. Copy the entire contents of `supabase/schema.sql` and paste it in
6. Click **Run** — this creates all your tables and loads your existing contacts
7. Go to **Project Settings** → **API**
8. Copy your **Project URL** and **anon public** key

---

### Step 2 — Set up the app locally

```bash
# Clone or download this project, then:
cd jobhunt
npm install

# Create your env file
cp .env.example .env.local
```

Open `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Run it:
```bash
npm run dev
```

Open **http://localhost:5173** — your app is running.

---

### Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial job hunt app"
```

Go to **github.com** → New repository → name it `jobhunt` → copy the commands it shows you to push.

---

### Step 4 — Deploy to Vercel

1. Go to **vercel.com** → Add New Project
2. Import your `jobhunt` GitHub repo
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click **Deploy** — done in ~30 seconds

---

### Step 5 — Connect your domain

1. In Vercel: your project → **Settings** → **Domains**
2. Type `jobs.jaykishanpanjiyar.com.np` → Add
3. Vercel shows you a CNAME record to add
4. Log into your domain registrar → DNS settings
5. Add: Type=CNAME, Name=`jobs`, Value=`cname.vercel-dns.com`
6. Wait 5–30 minutes → your app is live at **jobs.jaykishanpanjiyar.com.np**

---

### Making changes later

**Add a new field to contacts:**
1. Supabase dashboard → Table editor → contacts → Add column
2. Add the field to the form in `src/components/ContactModal.jsx`
3. Display it in `src/components/ContactCard.jsx`
4. `git push` → Vercel auto-deploys

**Add a new page:**
1. Create `src/pages/NewPage.jsx`
2. Add a route in `src/App.jsx`
3. Add a nav link in the Sidebar component
4. `git push`

**Every future change = edit file → git push → live in 30 seconds.**
