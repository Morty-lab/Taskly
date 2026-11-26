# Job Scraper

Sign up, upload your resume, and see open jobs from four public job boards ranked by how many of
your skills each posting asks for. There's no AI: matching is a keyword dictionary
([server/skills.ts](server/skills.ts)). Accounts, profiles and resumes live in Appwrite. The admin
sees every sign-up at `/admin`.

```
npm install
cp .env.example .env   # then fill it in (see Appwrite setup)
npm run setup          # once: creates the Appwrite table, bucket and your admin account
npm run dev            # API on :3001 + app on http://localhost:5173
```

`npm run build && npm start` serves the built app and the API together on http://127.0.0.1:3001.

## Appwrite setup

The project is `Taskly` (`6b07b401003ce48ec508`) on `https://sgp.cloud.appwrite.io/v1`. In the console:

1. **Overview → Add platform → Web**, hostname `localhost` (add your production domain too when you deploy).
   Without it, the browser's requests are rejected.
2. **Overview → Integrations → API keys → Create API key** with scopes `users.read`, `users.write`,
   `databases.read`, `databases.write`, `tables.read`, `tables.write`, `rows.read`, `rows.write`,
   `buckets.read`, `buckets.write`, `files.read`, `files.write`. Put it in `.env` as `APPWRITE_API_KEY`.
   It's only read by the Express server and the setup script and is never sent to the browser.
3. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` and run `npm run setup`. It creates:
   - table `jobscraper/profiles`: one row per user (row id = user id), row security on, so each user can read only their own row
   - bucket `resumes`: resumes (PDF/DOCX/TXT) and profile photos (JPG/PNG/WebP), up to 10 MB, with file
     security on so each file is private to its uploader. The free plan allows a single bucket, so both kinds of file share it.
   - your account, labelled `admin` and marked verified

   It's safe to re-run, and it never changes an existing password. You can delete `ADMIN_PASSWORD` from `.env` afterwards.

**Admin.** Admin rights come from the `admin` label on the account. The page is hidden in the UI,
and every `/api/admin/*` request checks the label server-side against a short-lived JWT from the
browser. From `/admin` you can see every user with their sign-up date, last activity and profile
summary, and a count of new sign-ups since your last visit. You can also disable/enable, promote/demote
or delete users (deleting also removes their profile and resume).

## How it works

1. **Resume** (`POST /api/resume`): PDF, DOCX or TXT, up to 10 MB. The server extracts the text in
   memory (unpdf / mammoth, keeping line breaks) and returns:
   - **skills and roles**, matched against the dictionary
   - **details** ([server/details.ts](server/details.ts)), using heuristics and no AI: name (first name-like
     line), current title, location (labelled address or a known PH city), years of experience (a stated
     "N years of experience", otherwise the merged date ranges under the experience heading), phone (PH
     mobile formats first), links (LinkedIn/GitHub/portfolio) and education (degree plus school under the
     education heading)

   The browser stores the file in the user's private Appwrite bucket. Detected values fill **empty**
   profile fields. Values that differ from what's already saved are listed on the Profile page as
   suggestions, which the user can apply one at a time or all at once; nothing is overwritten silently.
2. **Profile photo**: picked on the Profile page (the 2x2 box), cropped to a centred square and
   re-encoded as a 600px JPEG in the browser (which also strips EXIF/location data), then stored in the
   same private bucket. The admin list shows it.
3. **Files** (`GET /api/files/:id`): resumes and photos are served through the Express server with a
   JWT. The server only returns a file to the user its Appwrite permissions name, or to an admin. That
   avoids Appwrite's third-party session cookie, which some browsers block. Only JPEG/PNG/WebP are
   served inline; everything else is sent as a download.
4. **Jobs**: the server downloads each board's public feed in bulk and caches it in `data/cache.json`
   for 6 hours. Searching runs against that cache, so it never hits the job sites. "Check for new jobs"
   refetches any board whose copy is older than its minimum interval (Remotive 6 h, others 1 h).
5. **Ranking** (`POST /api/jobs/search`): each selected skill scores 3 if it's in the job title,
   2 in the tags (1 if the posting has more than 15 tags), and 1 in the description. A selected role in
   the title adds 4. Cross-posted duplicates are dropped. Each result also carries up to three
   description excerpts showing where your skills appear.

| Board | Feed | Notes |
|---|---|---|
| [Remotive](https://remotive.com) | `remotive.com/api/remote-jobs` | Remote; free feed is small and 24 h delayed; max ~4 fetches/day |
| [Remote OK](https://remoteok.com) | `remoteok.com/api` | Remote tech; don't use their logo |
| [Arbeitnow](https://www.arbeitnow.com) | `arbeitnow.com/api/job-board-api` (2 pages) | Mostly Europe, many on-site |
| [Jobicy](https://jobicy.com) | `jobicy.com/api/v2/remote-jobs` | Remote |

All four allow this use only if each listing links to the original posting and names the source,
so every card does both. LinkedIn, Indeed and JobStreet are left out on purpose: their terms forbid
scraping and they block it.

## Layout

```
server/   Express API: index.ts (routes), appwrite.ts (auth checks, admin, file access), resume.ts (parsing),
          details.ts (name/title/location/years/phone/links/education from resume text),
          skills.ts (dictionary + matching), sources.ts (one adapter per board), jobs.ts (cache + scoring)
shared/   types and Appwrite IDs used by both sides
scripts/  setup-appwrite.ts
src/      React client: pages/ (Auth, Jobs, Profile, Admin), components/, lib/ (Appwrite, auth, profile)
```

To add a skill the dictionary misses, add it to `DEFS` in `server/skills.ts`, with aliases for other
spellings. Skills you type in the app that aren't in the dictionary are matched literally.

The resume and job search endpoints don't require sign-in; only the UI does. Add a rate limit before
putting this on a public host.
