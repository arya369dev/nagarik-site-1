# Nagarik website

**Simple services. Smarter citizen experience.**

Nagarik is a citizen-first civic-services website for India. People can search for a service, see the documents it needs, apply on the official portal, report civic issues with a photo and location, and track everything in one place. Nagarik is independent and does not claim to be a government site.

This is a static, multi-page site with no framework and no build step. It deploys to Vercel as-is, with one serverless function for the contact form.

Last updated: 2026-10-06

---

## 1. Deploy in 5 minutes

1. Put all the files in one folder, keeping the folder structure shown below.
2. Replace the placeholder domain everywhere with your real one:
   ```bash
   grep -rl "https://nagarik.example" . | xargs sed -i 's#https://nagarik.example#https://your-domain.in#g'
   ```
   (On macOS use `sed -i ''`.)
3. Push the folder to a GitHub repository.
4. In Vercel, choose **Add New → Project**, import the repository and keep the defaults:
   - Framework preset: **Other**
   - Build command: *(empty)*
   - Output directory: *(empty)*, which means the project root
5. Add the environment variables from `.env.example` under **Settings → Environment Variables**, then redeploy.
6. Add your domain under **Settings → Domains**, then submit `https://your-domain.in/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

To run it locally:

```bash
npm start          # static preview at http://localhost:3000 (contact form won't send)
npx vercel dev     # full preview, including /api/contact
```

## 2. Files

Every file sits in the **top level** of the repository, so you can drag them all into GitHub's "Upload files" page at once. The one exception is the contact form's server code, which **must** be at `api/contact.js` (Vercel only runs functions from the `api` folder).

```
/
├── api/
│   └── contact.js        Serverless contact endpoint: validation, honeypot, rate limit, Resend email
├── index.html            Home: smart search, how it works, services, alerts, map, FAQ
├── services.html         Service directory (GovernmentService schema)
├── apply.html            4-step application checklist → official portal
├── track.html            Track NGK report IDs and saved reference numbers
├── report.html           Civic issue reporting: photo + map location
├── map.html              Interactive civic map
├── emergency.html        112 and national helplines, local alerts
├── community.html        Ward discussions and events (sample content)
├── help.html             FAQ (FAQPage schema) and guides
├── dashboard.html        My Nagarik: applications, wallet, notifications, feedback (noindex)
├── admin.html            Partner console and civic analytics (noindex)
├── about.html            Entity definition, editorial policy, sources
├── privacy.html          Privacy & security centre
├── terms.html            Terms of use
├── contact.html          Contact form
├── 404.html              Not-found page (Vercel serves it automatically)
├── style.css             Design system: tokens, components, light/dark, easy-read mode
├── main.js               Search, voice search, AI assistant, preferences, toasts, forms
├── content.js            Knowledge base: services, FAQs, alerts, helplines, issues
├── hero3d.js             Adaptive 3D hero. Loads Three.js only when visible; off in Lite/Easy-read
├── logo.svg              NAGARIK master logo
├── og-image.png          1200×630 social share image
├── *.woff2 (10 files)    Self-hosted Bricolage Grotesque, Hind (Latin + Devanagari), JetBrains Mono
├── posts.json            Help-centre guides as JSON, for apps and partners
├── favicon.ico / favicon.svg / apple-touch-icon.png / android-chrome-192.png / android-chrome-512.png
├── site.webmanifest      Installable web app (PWA manifest) with shortcuts
├── sitemap.xml           Public pages only
├── robots.txt            Blocks /dashboard, /admin, /api; allows answer engines
├── llms.txt              Plain-language summary for AI answer engines
├── vercel.json           Clean URLs, redirects, security headers, caching
├── package.json          Scripts (no dependencies)
└── .env.example          Environment variables for the contact form (optional, never deployed)
```

**File names must match exactly.** Browsers sometimes rename repeat downloads (`index (7).html`, `llms (3).txt`); rename them back before uploading.

**Adding `api/contact.js` on GitHub.com:** choose **Add file → Create new file**, type `api/contact.js` as the name (the `/` creates the folder), paste the file's contents and commit.

## 3. Editing content

- **Services, FAQs, alerts, helplines:** edit `assets/js/content.js`. Search and the AI assistant read from it. The same facts also appear in the page HTML for SEO, so update both, or regenerate the HTML from the source generator.
- **Each service must keep an official `url`.** That link is how the site attributes its information.
- **Update the "Last updated" dates** in the page HTML and `dateModified` in each page's JSON-LD whenever content changes.
- **Sample data** (community posts, map issues, dashboard, admin numbers) is labelled on the page. Replace it with live data from your backend before launch.

## 4. Security built in

| Area | What's done |
|---|---|
| Transport | HSTS preload, `upgrade-insecure-requests` |
| Content Security Policy | Scripts only from this site and cdnjs. Every inline script is allowed by its SHA-256 hash, and there are no inline event handlers |
| Framing / sniffing | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff` |
| Device permissions | Camera off; microphone and location only for this site (voice search, report location) |
| Forms | Client and server validation, length limits, honeypot, origin allow-list, per-IP rate limit (5 per 10 minutes) |
| Uploads | Type and size checks in the browser. **Before accepting real uploads**, add server-side scanning and EXIF stripping (for example Vercel Blob plus a scanning service) |
| Private pages | `dashboard` and `admin` are `noindex`, `no-store` and blocked in robots.txt. **They are UI previews.** Put real authentication (OTP or passkeys) and role checks on the server before showing real data |

> **Important:** if you edit any inline `<script>` in an HTML file, its CSP hash changes and the browser will block it. Regenerate the hashes from the source generator, or move that script into its own `.js` file.

## 5. SEO, AEO and GEO checklist

- [x] Unique title and meta description, canonical URL, Open Graph and Twitter tags on every page
- [x] JSON-LD: Organization, WebSite + SearchAction, WebPage (`dateModified`, speakable), BreadcrumbList, GovernmentService, FAQPage, HowTo, AboutPage
- [x] One H1 per page, logical H2–H4, semantic landmarks, skip link
- [x] Direct answer boxes for "What is Nagarik?", "How does it work?", "How do I report…", "How can I track…"
- [x] Source links to official portals, visible last-updated dates, labels that separate AI guidance from official information
- [x] `sitemap.xml`, `robots.txt`, `llms.txt`
- [ ] Point the WebSite SearchAction (`/search?q=`) to a real search route, or remove it
- [ ] Publish real Hindi pages under `/hi/` and update the `hreflang` links (currently `?lang=hi`)
- [ ] Give each service its own page (`/services/passport`) as content grows

## 6. Performance

- No framework and no build step. CSS is about 30 KB and JavaScript about 50 KB before compression; Vercel serves Brotli automatically.
- Fonts are self-hosted, preloaded and use `font-display: swap`, with Devanagari loaded only when Hindi text appears.
- The 3D hero loads Three.js only when the hero is on screen, and skips it on Save-Data, 2G, reduced motion, Lite mode and Easy-read mode.

## 7. Moving to Next.js later

The brief recommends Next.js, Tailwind, Three.js and GSAP with a backend. This static site is designed to map cleanly onto that:

- each `*.html` file becomes `app/<slug>/page.tsx`
- `content.js` becomes a typed content module or CMS
- `style.css` tokens become the Tailwind theme
- `api/contact.js` becomes `app/api/contact/route.ts`

## 8. Brand

The logo comes from the NAGARIK logo pack: Trust Blue `#1A4BA5`, Action Orange `#E8863A`, Ink `#212121`. Don't recolour or stretch it. On dark backgrounds the site places it on a white rounded tile, as the pack's rules require.

## 9. Licences

Fonts are under the SIL Open Font License 1.1 (Bricolage Grotesque, Hind, JetBrains Mono). Three.js (MIT) is loaded from cdnjs.

---

Nagarik is not affiliated with, endorsed by or operated by the Government of India or any state government.
