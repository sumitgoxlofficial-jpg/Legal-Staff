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
- `app-store.js` holds the app's data layer: sample data, the limitation calculator, order reading, and exports (ICS, CSV, DOCX).
- `app-views.js` holds the module screens, dialogs and forms.
- All data is kept in the browser (`localStorage`, plus IndexedDB for uploaded files). Reset or back it up from Settings in the app.

## Simulated in this version

There is no backend, so these are local stand-ins and are labelled in the UI: sign-in, the Razorpay checkout, AI answers (rule-based search over the case file), court-data sync, and WhatsApp or email delivery.
