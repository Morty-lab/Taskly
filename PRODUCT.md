# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Job seekers in the Philippines, mainly developers and other tech workers looking for remote roles. Anyone can sign up. Each person keeps a profile built from their resume and comes back to check new matches. The owner is the one admin and checks who has signed up.

## Product Purpose
Upload a resume once and see open jobs ranked by how much of your experience each posting asks for, without retyping searches on every board. It works if a new user goes from sign-up to a ranked list in under a minute and a returning user can tell at a glance what's new and worth opening.

## Positioning
Your resume is the search. Skills and roles pulled from the resume become editable chips, and jobs from several public boards are scored against them. There's no AI yet: matching is a transparent keyword count, and every card shows which of your skills it matched.

## Operating Context
Mostly a laptop browser during a job hunt, sometimes a phone. Sources are public remote-job feeds (Remotive, Remote OK, Arbeitnow, Jobicy), so most listings are remote and many target the Americas or Europe. "Open to PH" (worldwide / APAC / Philippines) is the filter that matters most to this audience. Every listing must link to the original posting and name its board; those are the feeds' terms of use.

## Capabilities and Constraints
- Resume upload: PDF, DOCX, TXT, up to 10 MB. Text is parsed on the server; the file is stored privately in Appwrite Storage for the owner to re-download.
- Profile: display name, location, years of experience, preferred work setup (remote / hybrid / on-site / any), skill and role chips with on/off state.
- Auth: Appwrite email + password. The admin is the account created by the setup script from `ADMIN_EMAIL` and carries the `admin` label.
- Admin: list users with signup and last-active dates, a "new since your last visit" count, search, disable/enable, delete, promote/demote admins.
- Job feeds are cached for 6 hours. Remotive's free feed is small and 24 h delayed. LinkedIn, Indeed and JobStreet are excluded because their terms forbid scraping.
- AI matching is planned for later; nothing in the UI should promise it now.

## Brand Commitments
None yet. The product name "Job Scraper" is a working title.

## Evidence on Hand
No users, testimonials or placement numbers. Don't invent any.

## Product Principles
1. The resume is the query: never make someone type a search they already wrote on their CV.
2. Show the why: every match says which skills it matched.
3. Respect the source: credit the board and send applicants to the original posting.
4. Private by default: a user's resume and profile are visible only to them and the admin.
