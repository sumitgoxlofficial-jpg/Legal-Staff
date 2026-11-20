# Partner Network — API reference, deployment, configuration

All calls are Supabase RPCs (`POST /rest/v1/rpc/<name>` with the user's JWT) unless noted. Errors are raised as exceptions with a plain-language message.

## Public (anon)
`partner_public_config()` · `partner_validate_code(p_code)` · `partner_track_click(p_code, p_visitor, p_campaign, p_source)`

## Partner (signed in; own data only)
`partner_me` · `partner_apply(p jsonb)` · `partner_register_document(p_kind,p_path,p_name,p_size)` · `partner_dashboard` · `partner_referrals_list` · `partner_earnings_list` · `partner_payouts_list` · `partner_add_payment_method(p_kind,p_details)` · `partner_request_payout` · `partner_update_profile(p)` · `partner_resources_list` · `partner_notifications_list(p_mark_read)` · `partner_support_create(p_subject,p_message)` · `partner_support_list`

## Staff (permission in brackets)
| Function | Permission |
| --- | --- |
| `admin_whoami`, `admin_can(p)` | any signed-in user |
| `admin_overview`, `admin_applications`, `admin_partners`, `admin_partner_get`, `admin_categories`, `admin_campaigns`, `admin_resources`, `admin_notifications`, `admin_settings` | partners.view |
| `admin_application_decide`, `admin_partner_update`, `admin_partner_status` | partners.manage |
| `admin_category_save`, `admin_category_state` | categories.manage |
| `admin_category_commission` | commissions.manage (+ valid legal approval) |
| `admin_referrals`, `admin_leaderboard` | referrals.view |
| `admin_attribution_confirm`, `admin_attribution_override` | referrals.manage |
| `admin_record_listing_payment` | payments.verify |
| `admin_commissions` | commissions.view |
| `admin_commission_action`, `admin_commissions_make_payable` | commissions.manage |
| `admin_payouts` | payouts.view |
| `admin_payout_action`, `admin_payout_destination` | payouts.manage |
| `admin_campaign_save`, `admin_resource_save` | marketing.manage |
| `admin_template_save`, `admin_broadcast` | notifications.manage |
| `admin_fraud_flags`, `admin_fraud_resolve`, `admin_fraud_add` | fraud.manage |
| `admin_compliance` | compliance.view |
| `admin_compliance_record`, `admin_compliance_revoke` | compliance.manage |
| `admin_tickets`, `admin_ticket_reply` | support.manage |
| `admin_settings_save` | settings.manage |
| `admin_roles`, `admin_role_save`, `admin_staff_save` | roles.manage and Super Admin |
| `admin_audit` | audit.view |
| `admin_report(p_kind)` | reports.view; commission_ledger/monthly_revenue need commissions.view, payouts needs payouts.view, fraud needs fraud.manage |

Report kinds: partner_master, applications, state_wise, district_wise, referrals, approved_listings, commission_ledger, payouts, monthly_revenue, campaigns, fraud. CSV and Excel are produced in the browser (`static/export-lite.js`); PDF is the browser's print view.

Edge function `partner-mail` (JWT verification off): `{action:"drain"}` with header `x-cron-secret`; `{action:"test", template, to}` for staff with notifications.manage.

## Deployment (in order)
1. Take a database backup. Apply `0024_partner_network.sql`. (Needs the `vault` schema and `pgcrypto`, both present on Supabase.)
2. Deploy `functions/partner-mail` (with `_shared/partner-mail.js`; deploy `functions/` as a whole). Then apply `0025_partner_mail_schedule.sql`.
3. Merge/deploy the site (Vercel). Run `SITE_UPDATED=<date> node seo/build.mjs` only if you change pages; generated output is committed.
4. Add staff: Admin → Partner Network → System Settings → Roles and staff.
5. Leave commission off. Record counsel's approval first, then switch per category.

## Environment
No new variables. Uses existing: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET` (+ Vault `cron_secret`). Mobile OTP needs an SMS provider (not configured; setting `sms_provider`). WhatsApp stays off.

## Tests
`bash tests/partner-db/run.sh` (114 checks, real PostgreSQL 16) · `node tests/partner-ui/ui.test.mjs` (98 browser checks, real Chromium + real database) · `node tests/partner-export.test.mjs` · `node tests/partner-mail.test.mjs`. Existing court tests still pass.
