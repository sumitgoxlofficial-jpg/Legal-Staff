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
- `config.js` holds site settings such as the Google Client ID.

## Accounts and data

- The app starts empty. On first sign-in you set up your firm, then add your own clients, cases, hearings, orders and invoices.
- Sign-in is with Google only. Set the Client ID below before anyone can sign in.
- All data is kept in the browser. Export a backup, restore one, or erase everything from Settings.

## Google sign-in

1. In Google Cloud Console, open **APIs & Services → Credentials** and create an **OAuth client ID** of type **Web application**.
2. Under **Authorised JavaScript origins**, add every address the site is served from, for example `http://localhost:8000` and your live domain.
3. Paste the Client ID into `config.js` as `googleClientId` and reload.

The Client ID is public and safe to commit. No client secret is needed. Until it is set, the **Continue with Google** button explains that it is not switched on.

## Not available without a backend

These are labelled in the UI: the Razorpay checkout takes no money, AI answers are rule-based search over the case file, there is no live court-data sync, and WhatsApp or email messages are not sent. Because Google sign-in is checked only in the browser, it identifies the user but does not protect data on a shared device.
