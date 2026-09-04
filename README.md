# EduCore

**An advanced, full-stack school management system.** Multi-role dashboards, real RBAC enforced
server-side, and 20 working modules — students, attendance, tests & exams, fees, payroll,
library, transport, timetable, and more — all backed by a real (seeded) database, not mock data.

Built with **Next.js 16 (App Router)** · **TypeScript** · **Tailwind CSS** · **Drizzle ORM** · **SQLite**

> Replace `<your-org>/<your-repo>` below with your actual GitHub path once pushed, to get a live CI badge:
> `![CI](https://github.com/<your-org>/<your-repo>/actions/workflows/ci.yml/badge.svg)`

---

## ✨ Features

- 🔐 **Real authentication & authorization** — JWT sessions in httpOnly cookies, bcrypt password
  hashing, a server-side role → module → action permission matrix, and login rate limiting
  (8 attempts / 10 min per IP+email). Every API route checks permissions on the server; the UI
  hiding a button is a convenience, not the security boundary.
- 🔔 **Real notifications** — the bell icon is wired to a live feed: announcements fan out to the
  right audience (students/parents/teachers/staff/all) and fee payments notify the paying
  student and their linked parent automatically.
- 📄 **Pagination & CSV export** — Students, Teachers and Fees lists are paginated server-side;
  Students and Fees have permission-checked CSV export endpoints that stream the full matching
  set (not just the current page).
- 👥 **5 roles** — Admin, Manager, Teacher, Student, Parent — each with a tailored sidebar,
  dashboard, and permission set.
- 👤 **Self-service account management, with approval** — everyone can request a name/email/
  password change from **My Account**. Admin's own changes apply immediately; everyone else's
  changes sit as a pending request until an Admin approves them from **Account Requests** —
  nothing changes silently. Admins can also directly create new logins, change anyone's role,
  reset any password, or disable an account from **User Accounts**.
- 🔒 **Login lockout with a live countdown** — 5 failed attempts locks that email out for
  10 minutes; the login page shows a live "time remaining" timer and disables the form while
  locked, and a "N attempts remaining" warning before that.
- 🌱 **Safe seeding** — `db:seed` refuses to wipe a database that already has real student
  records unless you explicitly opt in with `EDUCORE_ALLOW_RESEED=yes-wipe-everything`.
- 📚 **20 working modules** — Dashboard (live charts + smart alerts), Students (tabbed profiles),
  Teachers, Parents (full CRUD, with each parent's linked children and class shown inline),
  Academics (Classes/Sections/Subjects — fully editable: add, rename, delete, not just view),
  Subject & Class assignment (single/bulk/matrix view), Attendance (daily marking grid),
  Timetable (school-wide period schedule with a visual weekly grid, teacher double-booking
  conflict detection, and each teacher's own read-only view of just their classes), Tests & Exams
  (unit tests, multi-subject exams with bulk mark entry and publish/unpublish), Finance (invoices,
  payment recording with printable receipts, and per-student fee concessions/discounts), Payroll
  (filterable by class, showing that section's class-teacher), Library, Transport, Homework,
  Communication, Reports, Audit Logs, User Accounts, Account Requests, Settings.
- 👨‍👩‍👧 **Parents, properly editable** — add, edit, or remove parent/guardian records directly
  (not just view them), filter the list by class, and see each parent's linked children with
  their current class and section right in the table.
- 🏫 **Academics, properly editable** — Classes, Sections, and Subjects are no longer read-only:
  add a class, add sections to it (with room number and capacity), add/rename/delete subjects —
  all with the same permission checks and audit logging as everything else.
- 🗓️ **Timetable** — admins/managers build the weekly grid by clicking any cell (pick subject +
  teacher), with automatic conflict detection if a teacher is already booked elsewhere at that
  time; a configurable school-wide period template (add/remove periods, mark ones as breaks);
  and teachers see a personal read-only view of just their own classes across the week.
- 🧾 **Fee concessions & receipts** — apply sibling/merit/staff-ward/SC-ST/custom discounts
  (percent or flat) per student, and every payment generates a unique, printable receipt.
- 📝 **Tests & Exams** — teachers create single-subject unit Tests directly; multi-subject Exams
  are scheduled per section/subject with a bulk mark-entry grid (Save All), auto-computed
  grade/pass-fail per student, and a Publish/Unpublish toggle per subject that notifies students
  and parents the moment results go live.
- 🔗 **Subject & Class assignment** — assign subjects to one class at a time or many at once
  (bulk), with a live assignment-matrix summary view (classes × subjects).
- 📝 **Full audit trail** — every create/update/delete/login/payment is logged with who, what,
  and when.
- 🌱 **Realistic demo data** — a seeded tenant with ~80 students, 5 teachers, attendance history,
  invoices, exam results, and more, so the app looks and feels populated from the first run.

## 📸 Watch Working Demo

**Watch the working demo video to see the project in action.**

🚀 Install & Run

You need Node.js 22 (LTS) — not 24, not 18. That's it — no Python, no C++ build tools, no Visual Studio.

Windows

Download and install Node.js 22 LTS from the official website:

👉 **https://nodejs.org/en/download/archive/v22**

After installing Node.js 22, open the folder where you extracted this project.

Click the address bar at the top of File Explorer, type powershell, and press Enter.

In PowerShell, run:

npm install
npm run dev

Open **http://localhost:3000/dashboard** in your browser and log in.

Then go to Settings to change the school name, branding, and other details.

That's it! 🎉

#### Way 2 — fnm (Node version manager, useful if you need to switch Node versions later)

Open **PowerShell** (Win key → type `powershell` → Enter) and run these one at a time.

**1. Install fnm (Node version manager):**
```powershell
winget install Schniz.fnm
```

**2. Allow scripts to run (one-time, per user — safe default):**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

**3. Make fnm load automatically in every new PowerShell window:**
```powershell
if (Test-Path $PROFILE) {
    Add-Content $PROFILE 'fnm env --use-on-cd | Out-String | Invoke-Expression'
} else {
    New-Item -Path $PROFILE -Type File -Force
    Set-Content $PROFILE 'fnm env --use-on-cd | Out-String | Invoke-Expression'
}
```

**Now close this PowerShell window completely and open a brand new one** — the profile change
above only takes effect in a fresh window, not the one you ran it in.

**4. In the new window, install and switch to Node 22:**
```powershell
fnm install 22
fnm use 22
```

**5. Confirm it worked:**
```powershell
node -v      # should print v22.x.x
npm -v
```

If `node -v` still says "not recognized" in a genuinely fresh window, restart your computer —
some PowerShell PATH changes on Windows only apply after a full restart.

Then, in the project folder:

```powershell
cd "path\to\educore"
npm install
npm run dev
```

Open **http://localhost:3000**.

#### If winget itself isn't found

Some Windows setups don't have `winget` installed. In that case, skip straight to **Way 1**
above (the plain `.msi` installer) — it doesn't need winget at all. Alternatively, download
Node directly from PowerShell without opening a browser:

```powershell
Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.22.2/node-v22.22.2-x64.msi" -OutFile "$env:TEMP\node22.msi"
Start-Process msiexec.exe -ArgumentList "/i `"$env:TEMP\node22.msi`" /quiet /norestart" -Wait
Remove-Item "$env:TEMP\node22.msi"
```
Then restart your computer and verify with `node -v`.

### macOS

```bash
# 1. Install fnm (via Homebrew — install Homebrew first from brew.sh if you don't have it)
brew install fnm

# 2. Make fnm load automatically in your shell
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc

# 3. Install and switch to Node 22
fnm install 22
fnm use 22

# 4. Confirm it worked
node -v
npm -v
```

Then, in the project folder:

```bash
cd path/to/educore
npm install
npm run dev
```

Open **http://localhost:3000**.

### Linux

```bash
# 1. Install fnm
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc   # or ~/.zshrc if you use zsh

# 2. Install and switch to Node 22
fnm install 22
fnm use 22

# 3. Confirm it worked
node -v
npm -v
```

Then, in the project folder:

```bash
cd path/to/educore
npm install
npm run dev
```

Open **http://localhost:3000**.

### After it's running

That's it — the demo database (`data/educore.db`) already comes seeded, so you don't need to run
any database commands the first time. If you ever want to reset it back to fresh demo data, see
[Database](#️-database) below.

### Every time after that (Node already installed)

Once Node and `npm install` are done, you don't need to repeat the setup steps above. Every time
you come back to work on this:

```powershell
cd "path\to\educore"
npm run dev
```

Open **http://localhost:3000**, `Ctrl+C` in the terminal to stop it. Only re-run `npm install` if
you pulled new code or deleted `node_modules`.

### Demo accounts

Password for every seeded account: **`Password123!`**

| Role | Email | Can do |
|---|---|---|
| Admin | `admin@educore.dev` | Everything — including User Accounts, Account Requests, and Settings |
| Manager | `manager@educore.dev` | Everything Admin can do — including creating/editing user accounts — except Settings, which stays Admin-only |
| Teacher | `teacher@educore.dev` | Attendance, homework, exams for their classes |
| Student | `student@educore.dev` | View their own attendance, homework, exams, fees |
| Parent | `parent@educore.dev` | View their child's records, pay fees |

> The login page itself doesn't show these — that was intentional (see Security notes below).
> Log in as **Admin** first, then go to **User Accounts** in the sidebar to create real logins
> for your actual staff/students/parents. Everyone (including Admin) can update their own name,
> email, and password from **My Account** (top-right avatar menu) — but for Manager, Teacher,
> Student, and Parent, that change is only a *request*: it doesn't take effect until an Admin
> approves it from **Account Requests** in the sidebar. Admin's own changes apply immediately.

## 🏗️ Architecture

```
src/
  app/
    login/                Public login page
    dashboard/             Auth-gated pages, one folder per module
    api/                    REST API routes, one folder per resource
  components/               Shared UI kit + chart components
  db/
    schema.ts               Drizzle schema — single source of truth for the DB (27 tables)
    index.ts                 DB client singleton
    seed.ts                   Demo data generator
  lib/
    auth.ts                  JWT + bcrypt session helpers
    rbac.ts                   Role → module → action permission matrix
    api.ts                     Consistent {success, data|error} JSON envelope
    audit.ts                   Audit log writer
  middleware.ts               Edge auth gate for /dashboard and /login
```

Every mutating API route follows the same shape:

```ts
export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();                    // 401 if not logged in
    assertPermission(session.role, "students", "create");        // 403 if not permitted
    const parsed = schema.safeParse(await req.json());            // 422 if invalid
    // ... perform the write ...
    await logAudit({ userId: session.userId, action: "create", entity: "student", entityId: row.id });
    return ok(row, 201);
  });
}
```

## 🗄️ Database

SQLite at `data/educore.db` (WAL mode, foreign keys on). Covers multi-tenant schools, users/roles,
academic structure, students/parents/teachers, attendance, timetable, exams/results,
fees/invoices/payments, payroll, library, transport, homework, communication, and audit logs.

Changing the schema:

```bash
# 1. Edit src/db/schema.ts
npm run db:generate   # writes a new SQL migration to drizzle/
npm run db:push         # applies it to data/educore.db
```

## 🔧 Environment variables

Copy `.env.example` to `.env.local` and set a real secret before deploying:

```bash
JWT_SECRET=<a random 64-character string>
```

## 🧭 Why Drizzle + libsql instead of Prisma?

The original spec assumed Prisma, but Prisma 5+ downloads its query-engine binary from
`binaries.prisma.sh` at install time — if your network blocks that domain, install fails outright.
This project uses **Drizzle ORM + @libsql/client** instead: `@libsql/client` ships a prebuilt
native binary for every major platform/architecture as a regular npm package, so there's no
external binary fetch and no compile step — `npm install` just works. (An earlier version of this
project used `better-sqlite3`, which compiles its native binding on install and needs Python + a
C++ compiler to do that; that's what caused the "node-gyp"/Python install failures some people
hit. Switching to libsql removed that requirement entirely — see `.npmrc`/`package.json`
`overrides` for how `better-sqlite3` is kept from sneaking back in as an optional dependency of
Drizzle itself.) Swapping to Prisma or Postgres later is straightforward since `src/db/schema.ts`
maps cleanly to either.

## 🩹 Troubleshooting

| Problem | Fix |
|---|---|
| `node`/`npm` "is not recognized" even after installing | The current terminal window opened *before* Node was installed and never loaded the updated PATH. Close **every** terminal window, open a genuinely new one, and test again. If it still fails, restart your computer. |
| `node-gyp`/Python error mentioning `better-sqlite3` | This shouldn't happen anymore — this project no longer uses `better-sqlite3` (see "Why Drizzle + libsql" above). If you still hit this, you're likely on an old copy of the project from before this change; get the latest version. |
| `EPERM`/`ENOTEMPTY` errors mid-install | Re-run `npm install` — Windows file locks sometimes cause a transient failure; a retry usually clears it |
| Build fails with a font-fetch error | This project doesn't use `next/font/google`, so this shouldn't occur; if you add it back, it requires internet access to Google Fonts at build time |
| Port 3000 already in use | `npm run dev -- -p 3001` and open that port instead |

```bash
npm run db:seed
```

> If the database already has real data in it, this refuses to run — pass
> `EDUCORE_ALLOW_RESEED=yes-wipe-everything npm run db:seed` to force a reset on a throwaway/dev
> database only.

## 🧪 Testing & CI

```bash
npm test          # run the full test suite once
npm run test:watch # re-run on file changes
```

28 tests across 5 files:
- `tests/rbac.test.ts` — the permission matrix denies/grants correctly per role
- `tests/auth.test.ts` — password hashing/verification and JWT session round-tripping/tampering
- `tests/pagination.test.ts` — page/offset math and edge cases (negative page, oversized pageSize)
- `tests/rate-limit.test.ts` — the login rate limiter blocks after the threshold and resets on schedule
- `tests/db.test.ts` — integration tests against a real in-memory SQLite database built from the
  actual migration file: joins, cascading deletes, NOT NULL constraints, limit/offset pagination

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint → test → build on every push and
pull request to `main`.

## 📦 Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run db:generate` | Generate a migration from `schema.ts` |
| `npm run db:push` | Apply migrations to the database |
| `npm run db:seed` | Reset and populate demo data |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint the codebase |

## 🌐 Putting it online

Right now this runs on your own computer (`localhost:3000`) — only reachable from that machine.
To make it reachable from anywhere:

**Easiest — Vercel (free tier works for trying it out):**
1. Push this project to a GitHub repo.
2. On [vercel.com](https://vercel.com), "Import Project" → pick the repo → Deploy.
3. **Important:** Vercel's filesystem is read-only in production, so the SQLite file approach here
   won't persist data between deployments. Before deploying for real use, switch the database to
   a hosted Postgres (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com), both
   have free tiers) — Drizzle supports Postgres with only a driver change, not a schema rewrite.
4. Set the `JWT_SECRET` environment variable in Vercel's project settings.

**Alternative — a VPS (DigitalOcean, Hetzner, a school's own server, etc.):**
1. SSH in, install Node 22, clone the repo.
2. `npm install && npm run build`
3. Run it persistently with a process manager: `npm install -g pm2 && pm2 start npm --name educore -- start`
4. Put [Caddy](https://caddyserver.com) or [nginx](https://nginx.org) in front of it for HTTPS —
   Caddy gets you a free auto-renewing certificate with about 3 lines of config.
5. Point your domain's DNS at the server's IP.

A VPS keeps SQLite working fine (it's a real persistent filesystem), so it's actually the simpler
path if you don't want to migrate to Postgres yet.

## 💻 Turning it into a desktop app (.exe)

This is a web app (a Next.js server + browser UI), not a native Windows program, so there's no
direct "compile to .exe" button — but there are two real ways to get an installable Windows app
out of it:

**Option A — Electron (bundles the server + a browser window into one .exe):**
Wraps this exact app: an Electron shell starts the Next.js server in the background and opens a
native window pointed at `localhost`. This is the more faithful option since nothing about the
app changes — closest to "the whole website, but as an .exe". Takes real setup work (a new
`electron/` folder, a packaging config, `electron-builder` to produce the installer) — ask if you
want this built out.

**Option B — Tauri (smaller, faster, more work to adapt):**
Similar idea to Electron but ships a much smaller binary using the OS's built-in browser engine
instead of bundling Chromium. Generally needs a bit more adaptation for a full Next.js server app.

For a school actually rolling this out to staff, **hosting it online (previous section) and having
everyone open it in a browser** is usually the better real-world choice over a desktop app — no
installer to distribute or update, works on phones/tablets too, and everyone always has the latest
version. The .exe route mainly makes sense if the school specifically needs it to work with zero
internet connection.

## 🧩 Extending EduCore

- **New module** → add a table to `schema.ts`, a folder under `api/`, a nav entry in
  `Sidebar.tsx`, and a role entry in the `MATRIX` in `rbac.ts`.
- **CSV/Excel/PDF export** → every list API returns clean JSON; wrap the same query with a
  CSV/XLSX writer (`papaparse`/`exceljs`) instead of `NextResponse.json`.
- **Payment gateway** → `POST /api/fees/[id]/pay` already records payments and recomputes
  invoice status; swap in a provider adapter (Stripe/JazzCash/EasyPaisa) behind the same contract.
- **SMS/Email/push** → the `notifications`/`announcements` tables already model the data; call a
  provider (Twilio/SendGrid/FCM) after the relevant writes.
- **2FA** → add a `totpSecret` column to `users` and a verification step before issuing the
  session cookie in `/api/auth/login`.
- **Hostel / GPS transport / biometric attendance** → additive migrations on the existing
  `student_transport`/`routes`/`studentAttendance` tables, not a redesign.

## 🔒 Security notes

- Passwords are bcrypt-hashed (cost 10) — never stored or logged in plaintext.
- Sessions are httpOnly, `sameSite=lax` JWT cookies — not readable by client JS.
- Login is rate-limited (5 attempts / 10 min per IP+email pair) with audit logging of failures.
- Every mutating route re-checks permissions server-side per request.
- All queries use Drizzle's parameterized query builder — no raw SQL string concatenation.
- The login page doesn't expose any account emails or passwords — real deployments should have
  each person log in with credentials an admin created for them via **User Accounts**, not a
  shared/public demo login.
- **Before using this for a real school:** log in as School Admin and either delete the seeded
  demo accounts or change their passwords via **User Accounts** — `Password123!` is fine for
  local development, not for anything reachable from the internet.
- File uploads aren't wired to storage yet; when adding them, serve via signed/authenticated
  URLs, not a static public path.

## 🗑️ Uninstalling / removing everything

If you want to fully clean up what was installed for this project — either just the project's
files, or Node/fnm themselves — here's every layer, in order.

### 1. Remove just this project's dependencies (keeps Node installed)

**Windows (PowerShell):**
```powershell
cd "path\to\educore"
Remove-Item -Recurse -Force node_modules, package-lock.json, .next
```

**macOS/Linux:**
```bash
cd path/to/educore
rm -rf node_modules package-lock.json .next
```

Then delete the project folder itself (and the zip) however you'd normally delete files.

### 2. Remove Node.js versions installed via fnm

```bash
fnm list                # see what's installed
fnm uninstall 22        # remove a specific version
```

### 3. Remove fnm itself

**Windows:**
```powershell
winget uninstall --id Schniz.fnm --purge
```
Then remove the line `fnm env --use-on-cd | Out-String | Invoke-Expression` from your PowerShell
profile — find its location with `$PROFILE`, open it in Notepad, delete that line, save.

**macOS:**
```bash
brew uninstall fnm
```
Then remove the `eval "$(fnm env --use-on-cd)"` line from `~/.zshrc`.

**Linux:**
```bash
rm -rf ~/.fnm
```
Then remove the fnm lines from `~/.bashrc` (or `~/.zshrc`).

### 4. Remove any global npm packages you installed separately

```bash
npm list -g --depth=0                  # see what's installed globally
npm uninstall -g <package-name>         # remove one
```

### 5. See everything Windows has installed (if you're not sure what's still there)

```powershell
winget list
```

Find the entry, then:
```powershell
winget uninstall --id <the-App-Id-from-the-list> --purge
```

## 📄 License

**All rights, ownership, and copyright belong strictly to Saif (username: Kaifawan58-hash)**
