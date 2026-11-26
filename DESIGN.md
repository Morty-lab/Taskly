---
name: Job Scraper
description: Your resume is the search. Remote jobs ranked by how much of your experience they ask for.
colors:
  kraft-ground: "#a97a45"
  kraft-ink: "#120a03"
  envelope: "#8e5f2e"
  envelope-deep: "#6f461d"
  envelope-ink: "#fbf1e2"
  band: "#4a3017"
  long-bond: "#ffffff"
  rule: "#e3ddd2"
  ink: "#1d1a16"
  ink-soft: "#5d554a"
  ballpen: "#1f3c9e"
  ballpen-soft: "#e8ecf8"
  stamp-violet: "#5a2a85"
  stamp-violet-soft: "#f1eaf7"
  string-red: "#b3261e"
  string-red-soft: "#fbeceb"
typography:
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 650
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 85"
  stamp:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 72"
  typed:
    fontFamily: "Courier Prime, ui-monospace, Courier New, monospace"
    fontSize: "1rem"
    fontWeight: 400
rounded:
  paper: "2px"
  control: "3px"
  stamp: "4px"
spacing:
  slip-x: "24px"
  slip-y: "20px"
  stack-gap: "16px"
  column-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ballpen}"
    textColor: "{colors.long-bond}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
  button-quiet:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  field:
    textColor: "{colors.ink}"
    typography: "{typography.typed}"
    padding: "6px 2px"
  skill-tab-on:
    backgroundColor: "{colors.long-bond}"
    textColor: "{colors.ink}"
    typography: "{typography.typed}"
    rounded: "{rounded.paper}"
  slip:
    backgroundColor: "{colors.long-bond}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "20px 24px"
  envelope:
    backgroundColor: "{colors.envelope}"
    textColor: "{colors.envelope-ink}"
    rounded: "{rounded.control}"
  header-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.envelope-ink}"
---

# Design System: Job Scraper

## Overview

**Creative North Star: "The Long Brown Envelope"**

Every Filipino job applicant has carried one: the long brown envelope with a string-and-button clasp, holding a resume, a bio-data sheet and a 2x2 photo. The app is that envelope. Kraft paper is the ground and the chrome. Each user's profile is their envelope, with the resume slip sticking out of its mouth. Jobs are white long-bond slips laid on the kraft, and each one is rubber-stamped with how well it matches. The admin reads sign-ups as a logbook of received applications.

This is an operating surface, so the world lives in its materials and marks, not in decoration. Every page is still a familiar app layout: a header, a profile column and a list. The kraft fibre, the clasp, the stamps and the typed entries are what make it this product. Density is moderate: slips are readable at a glance, and the best match is singled out by one big stamp rather than by colour.

**Key Characteristics:**
- Kraft ground, white paper on top, one ink per job: ballpen blue acts, violet stamps status, red string ties and warns.
- Rubber stamps (condensed caps, ink grain, a slight tilt) carry every status: match, best match, new, open to PH, admin, received.
- Courier Prime appears only where something is typed onto a form: field entries, skill tabs, emails, dates.
- Authored SVG for the clasp, the flap seam and the paper fibre. No stock imagery and no glyph icons.

## Colors

The palette is restrained: two kraft browns and white paper cover almost everything, and three inks each have one job.

### Primary
- **Ballpen Blue** (`ballpen`): anything you can act on, such as primary buttons ("View posting", "Sign in", "Replace"), links, focus rings, the text caret, the underline on matched words in excerpts, and checked boxes and radios. Its soft tint (`ballpen-soft`) is the hover wash on ghost actions.

### Secondary
- **Stamp Violet** (`stamp-violet`): status, only ever as rubber-stamp ink: the MATCH and BEST MATCH stamps, NEW, OPEN TO PH, ADMIN and RECEIVED dates. The text-selection tint is drawn from it as well.

### Tertiary
- **String Red** (`string-red`): the envelope's clasp string, and destructive actions or errors ("Delete", "Delete my account", alert text). Its soft tint (`string-red-soft`) is the error panel ground.

### Neutral
- **Kraft Ground** (`kraft-ground`): the page itself, with an authored SVG fibre noise over it.
- **Envelope Brown** (`envelope`) and **Envelope Shadow** (`envelope-deep`): the profile envelope and the sign-in envelope, which sit a shade darker than the ground. Its seams and the scrollbar thumb use the shadow tone.
- **Printed Band** (`band`): the header band and the envelope's printed border.
- **Long Bond** (`long-bond`): every content surface: job slips, the filter slip, the bio-data sheet and the admin logbook.
- **Ruled Line** (`rule`): field underlines and dividers on paper.
- **Pen Ink** (`ink`) and **Faded Ink** (`ink-soft`): text on paper. Faded Ink is for secondary lines, captions and placeholders (placeholders use `#6f665a`).
- **Kraft Ink** (`kraft-ink`): text set directly on the kraft ground.
- **Envelope Cream** (`envelope-ink`): text printed on the envelope and the header band.

### Named Rules
**The One Ink, One Job Rule.** Blue acts, violet states, red ties or destroys. A status is never blue and an action is never violet. NEW is violet, not red.

**The Two Browns Rule.** The envelope stays a visible shade deeper than the ground (`envelope` on `kraft-ground`). Text on the envelope is cream; text on the ground is near-black. Never put dark ink on the envelope, because it fails contrast.

## Typography

**Body Font:** Archivo Variable, using its width axis (self-hosted via @fontsource)
**Typed Font:** Courier Prime (self-hosted)

**Character:** Archivo does all the work of the interface, from headings to stamps, and its width axis condenses it for stamps and form captions. Courier Prime is the typewriter that filled in the form, so it only appears where something has been typed onto the paper.

### Hierarchy
- **Headline** (800, 1.5rem, tight tracking): page titles ("Jobs that match your envelope", "Bio-data", "Users").
- **Title** (700, 1.05rem, 1.375): job titles on slips and section heads.
- **Body** (400–500, 0.875rem, 1.625): excerpts, descriptions, hints. Counts use `tabular-nums`.
- **Label / Caption** (650, 0.7rem, 0.08em tracking, uppercase, 85% width): printed form captions such as LOOK FOR, BOARD, RESUME and YEARS OF EXPERIENCE.
- **Stamp** (800, uppercase, 0.06em tracking, 72% width): every status stamp and the wordmark.
- **Typed** (Courier Prime 400/700, 1rem in fields, ~0.8rem on tabs): field entries, skill and role tabs, emails, dates ("26 NOV 2026", "Posted 11 hours ago").

### Named Rules
**The Typewriter Rule.** Courier is for what was typed onto the form, never for counts, summaries, names in chrome or lists of skills inside running text. Those are Archivo with tabular figures.

## Layout

- **Container:** max 80rem, with 16px gutters on phones and 24px from `sm`.
- **Jobs page:** two columns at `lg` and up. A 21rem envelope column sticks to the top while the slip stack scrolls. Below `lg` the envelope stacks above the jobs, and its skill and role tabs fold into a "Skills and roles (n/n on)" disclosure.
- **Filters on phones:** search and "Open to the Philippines" stay visible, and the rest fold into "More filters (n on)". The first job slip must land inside the 390×844 first screen.
- **Header:** always one row. Sign-out becomes icon-only and the user name hides below `md`.
- **Admin:** a table at `md` and up. Below that, each user is a stacked entry: name and email with a RECEIVED stamp, then status stamps, then last active and profile, then actions.
- **Rhythm:** slips are 16px apart, sit 20–24px inside their padding, and sit 32px from the envelope column. There is more space above a heading than below it.

## Elevation & Depth

Depth is physical paper on kraft: one sheet lying on another. There are no floating cards and no zero-offset glows.

### Shadow Vocabulary
- **Sheet on kraft** (`0 1px 1px rgb(58 38 16 / .18), 0 8px 18px -6px rgb(58 38 16 / .35)`): every white slip.
- **Envelope** (`0 10px 24px -10px rgb(46 29 12 / .6)`): the profile envelope. On sign-in it's heavier (`0 18px 40px -16px rgb(46 29 12 / .7)`).
- **Tab on envelope** (`0 1px 1px rgb(46 29 12 / .3)`): skill and role tabs that are switched on.

### Named Rules
**The Paper Stack Rule.** Only paper casts shadows, and the shadow is always brown and offset downward. Controls, stamps and the header are flat; the header is set off by a 2px printed edge, not a shadow.

## Shapes

- Paper is nearly square: 2px corners on slips and tabs. Controls get 3px, and stamps 4px with a 2px ink border (3px on the BEST MATCH stamp).
- The envelope has a 1px printed border inset 8px, in the band colour at 45% opacity, plus flap seams drawn as one SVG polyline from both top corners to the clasp.
- Stamps are tilted: about ±3° by hand on small stamps, -7° on BEST MATCH, which hangs off the slip's top-right corner. A noise mask gives every stamp its ink grain.
- Form fields have no box, only a 1.5px underline (the rule you type on).

## Components

### Buttons
- **Primary:** Ballpen Blue fill, white text, 3px corners, 600–650 weight. Hover darkens it by 15% toward black, and pressing nudges it down 1px. Used for "View posting", "Sign in", "Create account", "Replace" and "Change password".
- **Quiet:** a 1.5px outline in the current text colour on a transparent fill, with a 5% darkening on hover. Used for "Check for new jobs", "Download", "Show more" and "Cancel".
- **Icon action (admin):** a Lucide icon plus a label in blue, or red for Delete, with no border. Hover adds a soft tint of the same ink. Delete always asks for confirmation inline, never in a modal.

### Skill and role tabs
- **On:** a white paper tab with typed text and a hairline shadow. A separate × button (Lucide X) removes it.
- **Off:** no fill, a dashed cream outline, struck-through cream text and greyscale. It stays visible rather than disappearing.

### Job slip (signature)
- White long bond, with the title as a ballpen link on hover. Below it the company in bold, then the location.
- Stamps: MATCH n/N on every slip, and BEST MATCH on rank 0 only. NEW (posted within 3 days) and OPEN TO PH sit under the title.
- Up to three excerpts quote the sentences where the user's skills appear, with the hit set in Pen Ink and underlined 2px in ballpen blue. There are three on the top three slips and two after that.
- The footer, above a ruled line, shows the typed post date, the salary, "via Board" (a followed link to the source, which the feeds' terms require) and the primary "View posting" button.

### Envelope (signature)
- The resume slip sticks out above the envelope's mouth and doubles as the drop target. On upload it slides down into the envelope (420ms, ease-out-expo).
- The clasp is an authored SVG: two buttons and a red string wound in a figure-eight.

### Inputs / Fields
- Typed text on a ruled underline. Hover tints the rule toward blue, and focus turns it fully blue. Selects match.
- Errors appear in red text, or as a red-tinted panel for form-level errors.

### Navigation
- A dark band header with a stamped wordmark. Nav links are cream text, and the active link is a cream chip with band-coloured text.

### Bio-data sheet
- The profile page is a form with a 2px ink rule under the heading. Fields sit in two columns, with work setup as radios and links as a typed list with remove buttons.
- **2x2 photo box:** a dashed box holding the user's typed initials until they add a photo. With a photo it gets a solid 1px ink border, and the image is a square crop. On hover or focus, a dark caption strip ("Add photo" / "Replace") rises from the bottom edge. Below the box are a caption and a red "Remove photo" text action.
- **Admin avatars:** a 40px square, either the photo or the initials, with a ruled border.

### Resume suggestions
- A slip above the bio-data sheet with a violet "FROM YOUR RESUME" stamp pressed over its top edge. Each row shows a caption label, the resume's value in bold type, the current value as faded type ("now: …"), and a ballpen "Use this" action. "Use all from resume" (primary) and "Keep my profile as is" (quiet) close it.

## Do's and Don'ts

### Do:
- **Do** put every status in a stamp in violet ink, condensed caps with grain and a slight tilt.
- **Do** keep text on the envelope cream (`envelope-ink`) and text on the ground near-black (`kraft-ink`).
- **Do** use Courier Prime only for typed entries, tabs, emails and dates.
- **Do** credit the source board with a followed link on every job, and send "View posting" to the original URL.
- **Do** fold secondary controls behind a disclosure on phones so that the first job is visible.

### Don't:
- **Don't** stamp NEW or any status in red. Red is for the string and for destructive actions.
- **Don't** give stamps an opaque fill. The ink sits directly on whatever is underneath, paper or kraft.
- **Don't** turn slips into cards with icon headers, coloured side borders or hover lifts.
- **Don't** use hard offset (zero-blur) shadows. The header's edge is a 2px border.
- **Don't** use emoji or Unicode glyphs as icons. Use Lucide or authored SVG.
