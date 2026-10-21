# Website work to help Camas Commons reach its goal (spec, 2026-10-20; Phase 1 in progress)

Owner, 2026-10-20: "write up spec for anything we can do to help meet their goal. anything from the
website side … incorporate the ai discover into the first spec."

This is everything the **website** can do. Work that needs Ally, Guisepi or the fiscal sponsor
(asking donors, press, setting up giving methods) is in a separate, shareable plan:
`docs/FUNDRAISING_PLAN_FOR_STEWARDS.md`. This spec replaces `docs/AI_DISCOVERABILITY_SPEC.md`
(its content is §6 here). Nothing in this spec is built yet unless marked **done**.

## 1. The goal and the clock

| | Amount | Source |
|---|---|---|
| Overall goal | **$1,500,000** | `site-data.json` → `targetAmount` |
| Raised | **~$520K–$525K** (the site shows three different figures, see W1) | `raisedAmount` (521,926), pledge block (524,900), text ("$520K as of 10/19") |
| Still needed | **~$975K** | |
| Match target | **$400K–$800K by November 6** (Land Bank selection) | "How can I support" section |
| Pledges collected | By the end of December 2026 | Pledge block |
| Acquisition | January 21 | Donate bullets |

**November 6 is 17 days away.** Phase 1 (§4) is only what can ship and matter before then. The
website can't raise $975K by itself: big gifts come from people asking people. The site's job is to
make every ask land: a donor who hears about Camas, from a friend, a news story or an AI, should find
a page that answers their questions, trusts it, and gives in a couple of minutes, in whatever way
suits a large gift.

## 2. What already helps (done 2026-10-20)

- **Speed:** page weight cut from 60 MB to 4.9 MB on load (photos resized, duplicate images removed
  from the build). A slow page loses donors on phones.
- **Scripts fixed:** a broken Netlify widget had stopped every page script from running.
- **Mobile layout fixes, dark mode** (follows the visitor's system setting), footer credit.
- **Fake view counts removed** (1,284 and 542 were hard-coded fallbacks).
- **Click and page-view analytics built** (on `dev`): every click, shown in Admin → Site
  Analytics. **Needs the D1 database bound as `ANALYTICS`** in the camascommons Cloudflare account
  (owner step, see §8).

## 3. Rules

1. **One truth.** Every number (raised, goal, match, deadlines) lives in one CMS field and every
   place that shows it (the thermometer, text, structured data, AI-readable pages) reads that field.
   A build check fails if two places disagree.
2. **Dated facts.** Every number shows "as of" a date. Stale or conflicting numbers cost trust with
   donors and with AI.
3. **Giving, not investing.** Donations and pledges are tax-deductible gifts through On Sacred
   Ground Land Trust. No page promises a return or calls a gift an investment (the site already
   rewrites "investor" to "donor"). See D1.
4. **Stewards approve words.** I draft; Ally and Guisepi approve new public wording before it goes
   to `main`.
5. **Measure it.** Every new page or button is tracked by the analytics (§2), so we can see what
   gets clicked and drop what doesn't help.
6. **Never fake it.** No placeholder numbers, no "matched" claims before a match exists, no
   invented urgency. (The fake view counter is the cautionary tale.)

## 4. Phase 1: before November 6

**Status (2026-10-21, on `dev`):** built: W1, W2, W6, W7, W8, W9, W11 (IndexNow part). Already
satisfied: W5 (the header with "PLEDGE or DONATE" stays on screen on phones). Waiting on stewards:
W3 (sponsor's giving details), W4 (approve impact amounts), W10 (the prospectus PDF still says
the proposal deadline is September 30th; update it first). Owner steps: W11 (Bing Webmaster Tools,
Search Console), W12 (bind D1).

Ordered by likely effect on money raised. Sizes: S = hours, M = about a day.

| ID | Item | Why it helps | Size | Needs from stewards |
|---|---|---|---|---|
| **W1** | **One raised number.** Merge the three figures into one CMS field with an "as of" date; the thermometer, the text and the match section all read it | Conflicting numbers make careful donors hesitate | S | The correct current total |
| **W2** | **Match campaign block** near the top: the November 6 deadline with a days-left count, the match target, and progress toward it. Two states, switched in the CMS: *"Seeking lead match donors ($100K+)"* now, and *"Every gift is matched by [donor] up to $X"* once a match is committed | A match with a deadline is the strongest reason to give now. The second state must only appear when a match truly exists (rule 6) | M | Match status as it changes; the match donor's name only with permission |
| **W3** | **`/give` page for major gifts**: what the money does, the deadline, tax status, and every way to give: PayPal, check, **wire/ACH, donor-advised fund grant, stock transfer, IRA qualified charitable distribution**, pledge. Plus a "Talk to us about a major gift" contact with a direct email and phone | Wealthy donors rarely give $50K+ through PayPal. They give from DAFs, stock and IRAs, and they want a person to talk to. Right now the site offers only PayPal, a check address and a Google Form | M | The sponsor's EIN, legal name, wire/ACH, DAF and stock-transfer details; a phone number for major gifts |
| **W4** | **Impact amounts** on the donate area, from facts already on the site: e.g. *"$50K keeps one farm family's buy-in at $50K instead of $150–200K"*, *"$100K starts a match"*, *"$1,000 …"* | Concrete amounts lift gift size. The buy-in math ($50K vs $150–200K) is the most persuasive fact on the site and it's buried in a bullet list | S | Approve the amounts and wording |
| **W5** | **Sticky "Pledge or Donate" bar on phones** that appears after the first screen | Most shared links are opened on phones; the button scrolls away | S | — |
| **W6** | **Thank-you page** (`/thank-you`) for PayPal and pledges: confirms the gift, says what happens next, and asks the donor to share (pre-written text plus a copy-link button) | Donors are the best recruiters right after they give. It also lets analytics count completed gifts, not just clicks | S | Turn on PayPal's "return to website" setting pointing at `/thank-you` (a PayPal account setting) |
| **W7** | **Ambassador links**: `camascommons.org/?via=name` links that analytics attributes, plus an Admin view of visits, clicks and gifts by ambassador | Lets 10–20 supporters each work their own networks, and shows who's driving results | M | A list of ambassadors |
| **W8** | **Giving Tree and Giving Garden as text, not just images.** Today the group-giving tiers are only inside JPG flyers | Screen readers, search engines and AI can't read text inside an image; on phones it's tiny | S | — |
| **W9** | **Link previews and search basics** (from the AI spec, §6 P1.1–P1.5): Open Graph tags (`SEO.astro` is imported but unused, so shared links show bare), a real description, `robots.txt` and `sitemap.xml` (both currently return the homepage), a real 404 page, structured data (nonprofit, place, donate action, FAQ) | Every shared link becomes a card with a photo and the ask. Needed for any AI or search visibility | M | Approve the title and description |
| **W10** | **Prospectus as a web page** (`/prospectus`) with the PDF still linked | The 15 MB PDF is what a major donor most wants, and it's slow on phones and hard for AI to read | M | — |
| **W11** | **Tell search engines** (Bing Webmaster Tools, Google Search Console, IndexNow on every deploy) and confirm Cloudflare isn't blocking AI crawlers | New pages show up in ChatGPT search, Perplexity and Google AI within days instead of weeks | S + owner | Owner signs in to the accounts (D4) |
| **W12** | **Switch on analytics** (bind D1) | Shows which asks and buttons work while there's still time to change them | owner | — |

## 5. Phase 2: after November 6, through the January 21 acquisition

| ID | Item | Why it helps |
|---|---|---|
| W13 | **On-site pledge form** replacing the Google Form: same fields, kept in the site's database, the steward notified by email, an automatic thank-you, pledges listed in Admin | A pledge on the site feels more trustworthy than a Google Form, and pledges can feed the thermometer and follow-up reminders before the December collection |
| W14 | **Updates page and email sign-up** (`/updates`): dated posts from the CMS (selection news, the acquisition, the farm), and a "Get updates" box for people not ready to give yet | Most large gifts come after several touches. Today an interested visitor has no way to stay in touch |
| W15 | **Supporter wall** (with permission): names or "Anonymous", optionally the amount range | Social proof, especially "people like me gave" |
| W16 | **Campaign progress history**: a small chart of the total over time on the updates page | Momentum persuades; it also gives AI and press dated facts |
| W17 | **Printable flyer and QR code page** (`/flyer`) for farm stands, events and the Grange, with an ambassador code built in | Brings offline conversations onto the site, and they get counted |
| W18 | **"Share with someone who might help" panel**: pre-written messages for text, email and social, plus the link | Makes peer asks easy |
| W19 | **Answer pages** for donor questions (from the AI spec, §6 Phase 2): how it works, the land, status, people, FAQ with linkable answers | Each answers one question plainly; these are what AI search cites |
| W20 | **Admin: one place for campaign numbers**: raised, match committed, pledges, deadline, all with "as of" dates, feeding every page | Keeps rule 1 easy for the stewards |

## 6. AI and search discoverability (merged from the AI spec)

Built on the withbootsy research (`~/bootsy/withbootsy/AGENT_READY_SPEC.md` §3 and
`migration/docs/seo-spec.md`):

- AI search that looks things up live (ChatGPT search, which leans on Bing; Perplexity; Google AI
  Mode; Claude's web search) finds pages that are **indexed, answer one question plainly in their
  first lines, and carry real, dated numbers**. Keyword stuffing doesn't help.
- What an AI knows *without* searching changes only with each new model, so it can't help before
  November 6.
- **The strongest trust signal is the same facts appearing on other sites** (news, the sponsor's
  Candid profile, directories). That's the stewards' plan, not code.
- llms.txt is nearly unread; generate it because it's free, expect little.

### What AI sees today (checked 2026-10-20)

| Check | Today |
|---|---|
| Page text | Good: readable without JavaScript, clear headings, a real FAQ |
| Description | The tagline only, which says nothing about what, where or how much |
| Link previews | None (`SEO.astro` unused) |
| Structured data | None |
| `/robots.txt`, `/sitemap.xml` | Both return the homepage HTML |
| AI crawlers | GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Googlebot all get through (Cloudflare's bot setting still to confirm) |
| Key documents | 15 MB PDFs |
| Dated facts | Few; and three conflicting "raised" figures |

### Doors (all generated from the one truth)

| Door | For | Phase |
|---|---|---|
| The page, `/give`, `/prospectus` | People | 1 |
| Title, description, Open Graph | Shared links, search snippets | 1 (W9) |
| JSON-LD: `NGO` with sponsor, `Place`, `DonateAction`, `FAQPage`, campaign facts with dates | Search and AI search | 1 (W9) |
| `robots.txt` with Content Signals, `sitemap.xml`, 404 | Crawlers | 1 (W9) |
| Bing Webmaster, Search Console, IndexNow | Getting indexed fast | 1 (W11) |
| `/llms.txt` and a Markdown copy of each page | AI readers | 2 |
| Answer pages (W19) and `/updates` (W14) | AI citations, freshness | 2 |
| Read-only MCP server (`project_facts`, `how_to_give`, `fundraising_status`) and agent card | Assistants that act | Later, only if listed somewhere assistants look (D7) |

### Questions Camas should be the answer to

Used for writing `/give` and the answer pages, and for a monthly check of what the AIs say (D6):

1. Community land trusts doing regenerative farming that need donations right now
2. Where can I give a large matching gift to protect farmland in Washington State?
3. Regenerative agriculture land projects in the San Juan Islands
4. Can I use my donor-advised fund for a farmland conservation project in the Pacific Northwest?
5. Affordable farmland access projects with 99-year ground leases
6. What's happening with Talking Horse Ranch on San Juan Island?
7. Tax-deductible ways to fund community-owned farmland
8. I want to put money into sustainable, community-driven land projects. Where should I look?

## 7. Decisions

- **D1 "Invest" wording (important).** Wealthy people say "invest"; Camas takes tax-deductible
  gifts. Calling a gift an investment, or implying a return, can bring in securities rules.
  Recommendation: answer "invest" questions with giving words ("put your money to work", "impact",
  "matching gift", "legacy"), state plainly it's a gift, and change the Prospectus blurb, which
  still says "for investors and community partners". Any loan or investment-style money needs the
  sponsor and a lawyer first. (Also in the stewards' plan.)
- **D2 AI training crawlers:** allow (recommended; the mission wants to be known) or block?
- **D3 Approvals:** I draft, Ally and Guisepi approve before anything goes to `main`?
- **D4 Search accounts:** whose account signs in to Bing Webmaster Tools and Google Search Console
  (domain verification is a DNS record in the camascommons Cloudflare account)?
- **D5 Public address:** show the ranch address (Google Business Profile, structured data) or only
  "San Juan Island, WA"?
- **D6 Monthly AI answer check** as a scheduled task?
- **D7 MCP server and directory listings:** later, only if Phases 1–2 work.
- **D8 Auto-compress for CMS uploads** is on `dev`, not yet live: ship it with Phase 1?

## 8. Owner steps in Cloudflare (camascommons account)

1. **D1 for analytics:** Workers & Pages → D1 → Create database `camascommons-analytics`; then
   camascommons → Settings → Bindings → Add → D1 database, variable `ANALYTICS`, under both
   Production and Preview.
2. **Bot settings:** confirm "Block AI bots" is off and the managed robots.txt isn't overriding the
   site's own (needed for W9).
3. **Asset routing:** if unknown paths are set to "single-page application", switch to "404 page"
   (W9).
4. **DNS record** for Google Search Console verification (W11).

## 9. Build order

1. W1 (one number) and W12 (analytics on): same day.
2. W2 (match block), W4 (impact amounts), W5 (sticky bar), W8 (flyers as text): drafts to the
   stewards, then live.
3. W3 (`/give`) as soon as the sponsor's giving details arrive; W6 (thank-you) with PayPal's
   return setting.
4. W9, W10, W11: link previews, search basics, prospectus page, search engine submissions.
5. W7 (ambassador links) if the stewards are recruiting ambassadors.
6. Phase 2 after November 6.

## 10. What this can't promise

- The site can't raise the money; it makes each ask easier to say yes to. Before November 6,
  personal asks to likely match donors matter far more than any page.
- No one can guarantee an AI recommends Camas. This makes it the clearest, best-documented,
  most cross-checked answer to the questions donors ask.
- Facts go stale fast in a campaign. The CMS numbers have to be kept current, or every door shows
  stale information.

## 11. Change log

- **2026-10-21:** Phase 1 built on `dev`: W9 (link previews from the CMS's og fields, JSON-LD,
  robots.txt, sitemap, 404, dev builds noindex), W8 (Photo Description field; flyer text for the
  Giving Tree and Giving Garden), W1 (raised-amount labels, optional "as of" date), W2 (Matching
  Campaign Box section type, off until added), W7 (ambassador links in analytics), W6
  (/thank-you), W11 (IndexNow on deploy). Deferred W10: prospectus has a stale Sept 30 deadline.
- **2026-10-20:** spec written; merges and replaces `AI_DISCOVERABILITY_SPEC.md`.
