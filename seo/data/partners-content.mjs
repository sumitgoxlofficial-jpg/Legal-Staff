// Default text of the public Partner Network page (/partners). One source for the generated page and for the admin "Page Content" editor
// (written to static/partner-content-defaults.json by seo/pages/partners.mjs). Super Admin edits override these in the database
// (partner_content); the page shows the override once it loads. Search engines see these defaults.
export const CONTENT = {
  hero_title: 'Become a LegalStaff Partner.',
  hero_lead: 'Join a nationwide network helping India’s advocates establish their professional digital presence.',
  steps: [
    { title: 'Sign in with Google', text: 'One click. No password and no code to type.' },
    { title: 'Fill in your details', text: 'Your name, mobile number, location and the category that fits you.' },
    { title: 'Get your referral link and QR code', text: 'They appear on your dashboard straight away.' },
    { title: 'Introduce eligible advocates', text: 'Share the LegalStaff Directory with practising advocates. They apply and are verified exactly as every other advocate is.' },
    { title: 'Track referrals and monthly earnings', text: 'See every referral, its stage, and each month’s totals. Where rewards apply to your category, you see their status at every step.' }
  ],
  benefits: [
    { title: 'Free to join', text: 'There is no joining fee.' },
    { title: 'Your own link and QR', text: 'One unique partner ID with a shareable link and a printable QR code.' },
    { title: 'Ready-made material', text: 'Posters, message templates and guides, kept up to date by the LegalStaff team.' },
    { title: 'Clear tracking', text: 'See every referral, its stage and any reward status, month by month.' },
    { title: 'Fair and transparent', text: 'Each referral is attributed on the server, recorded, and open to review. Nothing is changed silently.' }
  ],
  faq: [
    { q: 'Is there a fee to become a partner?', a: 'No. Joining the Advocate Partner Network is free.' },
    { q: 'Do I need approval?', a: 'You get your dashboard, referral link and QR code as soon as you have filled in your details. LegalStaff can suspend an account that breaks the partner terms.' },
    { q: 'Will I earn money?', a: 'Not necessarily. Rewards depend on your category, are only paid on eligible, verified listings, and apply only where the programme terms for your category have been approved and switched on. LegalStaff does not promise income, clients or cases.' },
    { q: 'Who decides whether an advocate gets a listing?', a: 'LegalStaff alone. Every advocate goes through the normal directory verification, whoever introduced them. A referral never changes the outcome of verification.' },
    { q: 'Can advocates take part?', a: 'Practising advocates may join as Advocate Referral Partners only where the rules that apply to them allow it. You are responsible for checking your own professional obligations, including the Bar Council of India rules, before you join.' },
    { q: 'How long does a referral stay linked to me?', a: 'A referral link is valid for 30 days from the click, unless LegalStaff changes the window. The advocate must register through the Directory and the link is recorded by our server, not just in a browser.' },
    { q: 'Can I refer myself or my own chamber?', a: 'No. Referrals that match the partner’s own details are rejected. Suspicious activity is reviewed by a person before anything is decided.' },
    { q: 'How and when are rewards paid?', a: 'Only where a reward applies, and only after verification and approval. Payouts are by UPI or bank transfer, after KYC, once your approved balance reaches the minimum withdrawal. The current minimum is shown in your dashboard.' },
    { q: 'What data do you keep about me?', a: 'The details you submit, your referral activity and, for payouts, your KYC and payment details, which are stored encrypted. See the Partner Privacy Notice.' }
  ],
  rewards_note: 'For some partner categories, a fixed reward may be recorded when an advocate you introduced has registered through the Directory, completed every step LegalStaff requires, and been verified. It is not payment for legal work, it is never guaranteed, and it applies only where the programme terms for your category have been approved and switched on. Where a reward does not apply to your category, your referral activity is still recorded. LegalStaff does not assign matters, give legal advice or take part in fee arrangements between advocates and clients. Verification is decided only by LegalStaff, and a referral never influences it.'
};
