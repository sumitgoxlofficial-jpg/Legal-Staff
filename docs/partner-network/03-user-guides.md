# Partner Network — user guides

## Admin guide (Admin → **Partner Network**)
* **Overview** – counts, pending liability, and global switches (network, registration, referral tracking, commission generation, payouts, campaigns). Switching off keeps all records and is audited.
* **Partner Applications** – Start review / Approve / Reject (reason shown to the applicant). Approval creates the partner ID (LS10001…).
* **All Partners** – search; open a partner to see documents (signed links), referrals, commissions, activity; suspend, reactivate, terminate, edit, set KYC. Suspending holds unpaid commissions.
* **Partner Categories** – create/edit/activate/deactivate/archive; per-category eligibility, terms, referral tracking and commission amount. *Commission on* is refused until a legal approval is recorded.
* **Referral Management / Advocate Registrations** – links and QR codes; every attribution with click match and risk; confirm or override (reason required); **Record payment** (only after confirming it in the bank/gateway; a reference works once).
* **Commission Management** – the ledger. Approve eligible entries, make approved payable (one by one or in bulk monthly), hold/release, reject, reverse (reason required).
* **Payout Management** – review → approve → processing → mark paid (UTR required). View destination (audited).
* **Marketing Campaigns / Resources** – create, assign to categories, publish. `{{code}}` and `{{link}}` in text are personalised per partner. Clear material with counsel first.
* **Partner Notifications** – edit templates, test send, broadcast in-dashboard messages.
* **Leaderboard**, **Fraud Detection** (dismiss/confirm, add flag), **Compliance Management** (record/revoke counsel approvals), **Partner Support**, **Reports & Analytics** (preview, CSV, Excel, print/PDF), **System Settings** (all business settings; roles and staff for Super Admin), **Audit Logs**.
* **Before switching commission on**: (1) counsel approves the activity and amount; (2) record it under Compliance; (3) confirm the listing price setting matches the live Razorpay fee (payments are picked up automatically from paid directory orders); (4) turn the category on; (5) turn *Commission generation* on.

## Partner guide
1. Apply at `/partners/register`: verify email with a code, fill the form, accept terms and privacy.
2. Wait for approval (email). Sign in at `/partners/login`.
3. Dashboard: your partner ID, link, QR (download PNG), figures, recent referrals, notifications.
4. Share only approved material; never promise clients, cases or income.
5. Earnings page shows each entry and its status. Rewards exist only for categories whose terms are active, and only for verified listings.
6. To withdraw: upload KYC (Profile), add UPI or bank details (Payouts), request withdrawal once the balance reaches the minimum.
7. Support page for questions.

## Outstanding dependencies and limitations
* **Legal approval** (BCI Rule 36, remuneration sharing, DPDP) is required before any commission; terms/privacy pages are drafts.
* **₹15 commission is a proposal only** and off everywhere. The ₹49 listing fee is live through Razorpay; commission counts only paid orders above zero.
* "Documents submitted" is read from `directory_applications.details.documents`; confirm it matches the directory's current document flow before enabling commission.
* **Mobile OTP** needs an SMS provider; email OTP is live. WhatsApp automation is off.
* Header/footer of the existing ~600 pages were deliberately not changed, so there is no site-wide "Partners" nav link yet (add it in `seo/lib.mjs` and rebuild when ready).
* The directory's multi-step form was verified through its submit contract (insert with referral claim) and the DB, not by clicking every step.
* Not tested against production Supabase, real Resend, or real payment gateways; nothing has been deployed.
* Excel export is a plain single-sheet `.xlsx`; PDF uses the browser print dialog.
