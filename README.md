# Legal Staff

Static site for the Legal Staff practice-management product. No build step and no server-side code.

| Page | File |
| --- | --- |
| Landing | `index.html` |
| Advocate directory | `directory.html` |
| App | `app.html` |

## Run locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Any static host works; publish the repository root.

## How it works

- Each page is a template plus a logic class, rendered by `support.js` on React 18 (bundled in `vendor/`).
- `app-store.js` holds the app's data layer: storage, local accounts, the limitation calculator, order reading, and exports (ICS, CSV, DOCX).
- `app-views.js` holds the module screens, dialogs and forms.
- `app-brain.js` holds AI Case Brain: a chat assistant with saved chats (search, rename, archive, delete), file and image attachments (PDF, Word .docx, text, photos; scanned PDFs are read as images), voice typing (English or Hindi), ready-made tasks, and an optional link to one case so answers cite its records. Chats are private to each user.
- `app-sign.js` holds the Drafting Studio extras: eStamp record, electronic signatures, fill-details automation, sealing (SHA-256) and audit trail.
- `app-templates.js` is the Drafting Studio's template library: 80 Indian court, criminal, family, arbitration, consumer, conveyancing, contract, affidavit and office templates in 12 groups, each with its law, forum and a check-before-filing list. Saved drafts are keyed by a template's position, so templates are only ever added at the end.
- `app-import.js` moves a firm's data in from other software: clients, cases, hearings, tasks and invoices from Excel (.xlsx and old .xls), CSV or JSON exports, plus documents from files, a folder or a ZIP, with column matching, a row check, linking and duplicate skipping. It runs in the browser; files are not uploaded.
- `config.js` holds site settings such as the Google Client ID.

## Accounts and data

- The app starts empty. On first sign-in you set up your firm, then add your own clients, cases, hearings, orders and invoices.
- Sign-up asks who you are (advocate, chamber, law firm, corporate legal team) and the one area of law you work in (criminal, banking and recovery, family, tax and 10 more, or general practice). The dashboard figures, quick actions, watch panel, case stages, starter labels, limitation presets and sidebar order follow that area; it can be changed in Settings. The definitions are in `app-practice.js`.
- Sign-in is with Google or a one-time email code.
- Data is kept on the server (Supabase) when it is configured, otherwise in the browser. Export a backup, restore one, or erase everything from Settings.
- Firms switching from other practice-management software, an Excel diary or billing software use **Import from other software** (Cases, Clients, or Settings → Move from other software). Each sheet is matched to a kind of record, its columns are matched by name (common names from other products are known), rows are checked before anything is saved, cases are linked to clients and hearings, tasks and invoices to cases by CNR, case number, file number or title. Records already here are skipped, so the same file can be imported again. Blank templates for each kind can be downloaded from the first step.

## Google sign-in

1. In Google Cloud Console, open **APIs & Services → Credentials** and create an **OAuth client ID** of type **Web application**.
2. Under **Authorised JavaScript origins**, add every address the site is served from, for example `http://localhost:8000` and your live domain.
3. Paste the Client ID into `config.js` as `googleClientId` and reload.

The Client ID is public and safe to commit. No client secret is needed. Until it is set, the **Continue with Google** button explains that it is not switched on.

## What needs outside accounts

The app runs on Supabase (see `supabase/README.md`): sign-in, firm data, Google Drive backup, AI (Groq), Razorpay payments
confirmed from bank alert emails, invoices, morning briefings, trial and plan-ending reminders, and team invitations are live.
Two features wait for an outside account:

- **WhatsApp reminders** need a WhatsApp Business (Meta Cloud API) account: set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` and an
  approved `WHATSAPP_TEMPLATE` for `functions/notify`.
- **Live court data by CNR** needs a court-data provider account (eCourts has no open API): set `COURT_API_URL` and
  `COURT_API_KEY` for `functions/court-status`.
