// Blog posts for pillars 3–4 (post-incorp-compliance, legal-staffing). Shape documented in ./blogs.mjs.
// Content rule: statutory figures below are ones we are confident of; anything that varies by state, changes often
// or is not settled is described as a rule and the reader is told to confirm the current position.
export const blogsB = [
  // ---------------------------------------------------------------- 11
  {
    slug: 'inc-20a-late-filing-penalty-after-180-days-condonation',
    pillar: 'post-incorp-compliance',
    title: 'Missed the 180-Day INC-20A Commencement Deadline? Penalty & Condonation Guide',
    metaTitle: 'Missed INC-20A 180-Day Deadline? Penalty & Fix Guide',
    metaDescription: 'INC-20A not filed within 180 days? Understand the section 10A penalty, strike-off risk under section 248, late filing with additional fee and section 454 adjudication.',
    published: '2026-08-04',
    updated: '2026-11-10',
    readMinutes: 9,
    keywords: ['INC-20A late filing', 'INC-20A penalty', 'section 10A Companies Act', 'commencement of business declaration', 'INC-20A after 180 days', 'section 454 adjudication', 'section 248 strike off'],
    excerpt: 'Missing the 180-day INC-20A window does not end the company, but it starts a penalty clock and can invite strike-off. Here is how to file late, respond to the ROC and limit the exposure.',
    summary: [
      `Every company incorporated with share capital after the Companies (Amendment) Ordinance, 2019 must file e-form INC-20A, the declaration for commencement of business, within 180 days of incorporation. Section 10A of the Companies Act, 2013 says the company cannot commence business or exercise borrowing powers until a director files this declaration confirming that every subscriber has paid for the shares agreed to be taken. If the window is missed, the company does not cease to exist, but it is in continuing default.`,
      `The consequences are a fixed penalty on the company, a per-day penalty on every officer in default, and a power for the Registrar of Companies (ROC) to start strike-off proceedings under section 248 if it believes the company is not carrying on business. The practical route out is usually the same: collect proof that subscription money was actually received, file INC-20A late with the additional fee the portal computes, and deal with the penalty through the adjudication process under section 454 rather than ignoring it.`,
      `One caution before you rely on any "condonation" advice you read online: past amnesty and condonation-of-delay schemes run by the Ministry of Corporate Affairs (MCA) were time-bound. Do not assume any scheme is open today. Check the MCA website for current general circulars, or ask a practising professional to confirm, before choosing a route.`
    ],
    steps: {
      heading: 'How to regularise a late INC-20A, step by step',
      items: [
        { title: 'Confirm the actual position on the MCA portal', text: `Check the company master data on the MCA V3 portal: the incorporation date, the status (Active, or "Under process of striking off"), and whether any INC-20A is already on record. Count the days from incorporation. If the status already shows strike-off action, skip to the strike-off step below, because the order of work changes.` },
        { title: 'Prove that subscribers actually paid', text: `INC-20A is a declaration that every subscriber to the memorandum has paid the value of the shares agreed to be taken. Get the bank statement showing each subscriber's money credited to the company's current account. If subscribers never paid, they must pay now, and the declaration must be truthful as on the date of filing. A false declaration is a far bigger problem than a late one.` },
        { title: 'Check registered office verification and sectoral approvals', text: `Section 10A also requires that the company has filed verification of its registered office under section 12(2). For most companies incorporated through SPICe+ this was done at incorporation, but check. If the business needs registration or approval from a sectoral regulator (for example the RBI for an NBFC), the INC-20A asks for it, so keep it ready.` },
        { title: 'Prepare and certify the e-form', text: `A director signs INC-20A with a valid DSC, and the form is certified by a practising Chartered Accountant, Company Secretary or Cost Accountant. Attach the bank statement as proof of subscription. Make sure the signing director's DIN is active and DIR-3 KYC is up to date, or the form will not go through.` },
        { title: 'Pay the normal fee plus additional fee', text: `When INC-20A is filed after the due date, the MCA portal levies an additional fee under the Companies (Registration Offices and Fees) Rules, 2014, which rises with the length of delay. Use the fee shown on the portal at the time of filing as the authoritative figure rather than a number quoted in an article. Paying the additional fee does not settle the section 10A penalty; that is a separate liability.` },
        { title: 'Handle the penalty through adjudication under section 454', text: `Section 10A is a civil penalty provision, so it is dealt with by the ROC acting as adjudicating officer under section 454 and the Companies (Adjudication of Penalties) Rules, 2014. Typically the ROC issues a show-cause notice; the company and officers reply, and an order is passed. Some companies choose to approach the adjudicating officer themselves after filing, which shows good faith. Keep the reply factual: dates, reasons, proof of payment, and the date the default was made good.` },
        { title: 'If strike-off has started, respond within the notice period', text: `If the ROC has issued a notice under section 248 (in Form STK-1 or the corresponding notice) or the company appears in a public notice of proposed strike-off, file a reply with evidence that the company is carrying on business: bank statements, invoices, GST returns, contracts. If the name has already been struck off, revival is generally through an application to the National Company Law Tribunal under section 252, which is slower and costlier. Act before that stage.` },
        { title: 'Put the rest of year-1 compliance on a calendar', text: `A late INC-20A often signals other gaps: first auditor appointment, share certificates, statutory registers, DIR-3 KYC. Fix them together so the adjudication reply does not reveal new defaults. Our ROC compliance calendar lists the next dates for your entity.` }
      ]
    },
    rules: {
      heading: 'INC-20A rules, deadlines and penalties at a glance',
      caption: 'Companies Act, 2013 and related rules. Additional fees are computed by the MCA portal; confirm before filing.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['Section 10A(1), e-form INC-20A', 'Declaration that subscribers have paid for their shares; no business or borrowing until filed', 'Within 180 days of incorporation', 'Normal filing fee based on authorised capital; additional fee if late'],
        ['Section 10A(2)', 'Penalty for not filing the declaration', 'Applies once the 180 days pass', 'Company: ₹50,000. Each officer in default: ₹1,000 per day of continuing default, up to ₹1,00,000'],
        ['Section 10A(3) read with section 248', 'ROC may initiate removal of name if it believes the company is not doing business', 'Any time after the 180 days if declaration not filed', 'Strike-off; revival only through NCLT'],
        ['Section 446B', 'Lower penalties for small companies, OPCs, start-up companies and producer companies', 'Applies when penalty is levied', 'Up to one-half of the specified penalty, subject to a cap (confirm applicability with your adviser)'],
        ['Section 454 and Adjudication Rules, 2014', 'ROC adjudicates the penalty after notice and hearing', 'Reply within the time stated in the show-cause notice', 'Order specifies penalty; appeal to Regional Director under section 454(5)'],
        ['Section 252', 'Restoration of a struck-off company', 'Generally within 3 years of the strike-off notice for an aggrieved company or member (longer for certain applicants)', 'NCLT application, costs and conditions as ordered']
      ]
    },
    sections: [
      {
        heading: 'Penalty versus additional fee: two different things',
        paragraphs: [
          `Founders often assume that the late fee paid on the portal closes the matter. It does not. The additional fee is a filing charge for accepting a form after its due date. The section 10A penalty is a liability imposed by an adjudication order. You can pay the additional fee today and still receive a show-cause notice months later.`,
          `The officer-in-default penalty is personal to each director who was in default. It accrues per day while the default continues, which is why filing as early as possible matters even after the deadline: it stops the clock. For small companies and start-ups, section 446B, inserted by the Companies (Amendment) Act, 2020, caps penalties at one-half of the specified amount subject to an upper limit. Whether your company qualifies on the relevant date is a question of fact, so confirm it with the adviser preparing your reply.`
        ]
      },
      {
        heading: 'What about condonation schemes?',
        paragraphs: [
          `Over the years the MCA has run several one-time schemes that allowed companies to file overdue documents with reduced or waived additional fees, and some offered immunity from certain proceedings. Each had a fixed window and conditions, and each ended. Because these schemes are announced through general circulars and then lapse, we do not describe any scheme as currently available.`,
          `If you hear that a scheme is open, check the MCA website's circulars section for the current text, read the conditions (many exclude companies already under adjudication or strike-off), and note the closing date. Otherwise, plan on the standard route: late filing with additional fee plus adjudication.`
        ],
        bullets: [
          'Search the MCA circulars page for the scheme name and check the closing date.',
          'Confirm whether INC-20A is a covered form under that scheme.',
          'Check whether pending adjudication or strike-off notices exclude you.',
          'Keep the scheme circular and the filing receipt in the company records.'
        ]
      }
    ],
    pitfalls: [
      { title: 'Filing a declaration that is not true', text: `If subscription money was never received, do not file INC-20A until it is. A false declaration can attract consequences far heavier than the section 10A penalty.` },
      { title: 'Using a director with an inactive DIN', text: `If the signing director missed DIR-3 KYC, the DIN may be deactivated and the form will be rejected. Fix the KYC first.` },
      { title: 'Ignoring a show-cause notice', text: `An unanswered adjudication notice usually leads to an order on the record as it stands. Reply in time, with documents.` },
      { title: 'Borrowing or trading before filing', text: `Section 10A bars commencing business and exercising borrowing powers until the declaration is filed. Signing loans or large contracts in the gap adds to the problem.` },
      { title: 'Treating strike-off as a formality', text: `Once the name is struck off, bank accounts can be frozen and revival needs an NCLT order. Respond to any strike-off notice immediately.` },
      { title: 'Not fixing the other year-1 defaults', text: `Late INC-20A is often accompanied by a missed first-auditor appointment or unissued share certificates. Clean them up together.` }
    ],
    faqs: [
      { q: 'Can INC-20A be filed after 180 days?', a: `In practice the MCA portal has accepted INC-20A after 180 days with an additional fee, provided the company is still active. Filing late does not remove the section 10A penalty, which is imposed separately through adjudication. If the company is already under strike-off, the reply to the strike-off notice comes first.` },
      { q: 'What is the penalty for not filing INC-20A?', a: `Under section 10A(2), the company is liable to a penalty of ₹50,000 and every officer in default to ₹1,000 for each day the default continues, subject to a maximum of ₹1,00,000. Small companies, OPCs and start-up companies may get the lower penalty under section 446B; confirm whether it applies to you.` },
      { q: 'Will the ROC strike off my company for not filing INC-20A?', a: `It can. Section 10A(3) allows the Registrar, where no declaration is filed within 180 days and it has reasonable cause to believe the company is not carrying on business, to start removal of the name under section 248. Showing real business activity and filing the declaration are the best defence.` },
      { q: 'Is there a condonation scheme for INC-20A right now?', a: `We do not assume so. Earlier MCA schemes that relaxed fees or offered immunity were time-bound and have closed. Check the MCA website for any current circular, read its conditions and closing date, or ask a practising professional before you rely on one.` }
    ],
    related: {
      services: ['roc-annual-compliance', 'cma-ca-cs-certification-services', 'private-limited-company-registration'],
      tools: ['roc-compliance-calendar', 'incorporation-cost-calculator'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['post-incorporation-compliance-checklist-first-60-days-sh1-adt1', 'dir-3-kyc-deactivated-din-reactivation-fee-process', 'practicing-cma-certification-mca-roc-forms-spice-plus']
    }
  },

  // ---------------------------------------------------------------- 12
  {
    slug: 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1',
    pillar: 'post-incorp-compliance',
    title: 'First 60 Days After Incorporation: SH-1 Share Certificates, Stamp Duty & ADT-1',
    metaTitle: 'First 60 Days After Incorporation: SH-1, Stamp Duty, ADT-1',
    metaDescription: 'A practical first-60-days checklist for new Indian companies: first board meeting, first auditor and ADT-1, SH-1 share certificates, stamp duty, registers, INC-20A.',
    published: '2026-08-11',
    updated: '2026-11-10',
    readMinutes: 10,
    keywords: ['post incorporation compliance checklist', 'SH-1 share certificate', 'stamp duty on share certificates', 'first board meeting', 'first auditor appointment ADT-1', 'statutory registers private limited', 'INC-20A'],
    excerpt: 'The certificate of incorporation is the start, not the finish. These are the board, auditor, share-certificate, stamp-duty and register tasks a new company should close in its first two months.',
    summary: [
      `The first two months after incorporation set the tone for every later filing, funding round and due diligence. The Companies Act, 2013 packs several hard deadlines into this period: the first board meeting within 30 days, the first auditor within 30 days, share certificates to subscribers within two months, and the INC-20A commencement declaration within 180 days. None of them are optional for a private limited company, and several leave a paper trail that investors will ask for.`,
      `This checklist covers each task in the order we recommend doing it, with the section that requires it, and the document you should have on file at the end. It also explains stamp duty on the issue of shares after the 2020 amendments to the Indian Stamp Act, 1899, which many founders miss because it is not collected through the MCA portal.`,
      `Treat this as a working list for a typical private limited company incorporated through SPICe+. Companies with foreign shareholders, regulated businesses or public companies have extra steps, and some rules (especially stamp duty mechanics, which depend on the state) should be confirmed with a professional for your facts.`
    ],
    steps: {
      heading: 'Your first-60-days compliance sequence',
      items: [
        { title: 'Open the bank account and collect subscription money', text: `Use the bank account opened through SPICe+ (AGILE-PRO-S) or open one with the incorporation documents, PAN and board authority. Get each subscriber to pay the full amount for their shares into this account. The bank statement becomes the core attachment for INC-20A and the basis for issuing share certificates.` },
        { title: 'Hold the first board meeting within 30 days', text: `Section 173(1) requires the first board meeting within 30 days of incorporation. Typical business: take note of the certificate of incorporation, MoA and AoA; record directors' disclosures of interest in Form MBP-1 (section 184) and non-disqualification declarations in Form DIR-8 (section 164); appoint the first auditor; approve opening of the bank account and authorised signatories; approve issue of share certificates; fix the registered office records; and authorise filing of INC-20A. Minute it properly and sign the minutes within the time allowed by Secretarial Standard SS-1.` },
        { title: 'Appoint the first auditor within 30 days', text: `Under section 139(6) the Board appoints the first auditor within 30 days of registration. If the Board does not, the members must appoint one at an extraordinary general meeting within 90 days. Get the auditor's written consent and eligibility certificate under section 139(1) before the meeting. The first auditor holds office until the conclusion of the first annual general meeting.` },
        { title: 'Decide on ADT-1 for the first auditor', text: `Form ADT-1 is clearly required within 15 days of the meeting where an auditor is appointed under section 139(1), usually at the AGM. Whether it is mandatory for the first auditor appointed by the Board under section 139(6) has been debated, and many professionals file it anyway as a matter of caution. Ask your adviser which approach your ROC expects; filing it costs little and avoids a question later.` },
        { title: 'Issue SH-1 share certificates within two months', text: `Section 56(4)(a) requires certificates for subscribers to the memorandum to be delivered within two months of incorporation. Prepare them in Form SH-1 under rule 5 of the Companies (Share Capital and Debentures) Rules, 2014, signed by two directors (or a director and the company secretary) and with the common seal if the company has one. Enter the details in the register of members.` },
        { title: 'Pay stamp duty on the issue of shares', text: `Since 1 July 2020, stamp duty on the issue of securities under the amended Indian Stamp Act is 0.005% of the value. For shares issued in physical form, the issuing company pays it to the state government, generally where its registered office is located, using that state's e-stamping or e-challan system. Keep the payment proof with the certificates. Confirm the value base and payment mode for your state before paying.` },
        { title: 'Set up statutory registers', text: `Start the register of members (section 88, Form MGT-1), register of directors and key managerial personnel (section 170), register of contracts in which directors are interested (section 189, Form MBP-4) and register of charges (section 85, Form CHG-7). Keep them at the registered office, physically or electronically as the rules permit.` },
        { title: 'Lock in INC-20A and other registrations', text: `With money received and certificates issued, file INC-20A well before the 180-day limit; there is no benefit in waiting. Also check GST registration (if your turnover or business type requires it), professional tax and shops and establishments registration in your state, and EPFO/ESIC once employee thresholds apply.` }
      ]
    },
    rules: {
      heading: 'Statutory deadlines in the first months',
      caption: 'Companies Act, 2013, Indian Stamp Act, 1899 (as amended from 1 July 2020) and related rules.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['Section 173(1)', 'First board meeting', 'Within 30 days of incorporation', 'Penalty under section 173(4) for every officer whose duty it is to give notice and who fails'],
        ['Section 139(6)', 'First auditor appointed by Board', 'Within 30 days of registration (else members within 90 days)', 'ADT-1 filing fee if filed; penalty under section 147 for contraventions'],
        ['Section 56(4)(a), Form SH-1', 'Share certificates to subscribers', 'Within 2 months of incorporation', 'Company and each officer in default liable to penalty under section 56(6)'],
        ['Indian Stamp Act (as amended 2020)', 'Stamp duty on issue of shares', 'At the time of issue', '0.005% of the value; paid to the state (confirm mode and value base)'],
        ['Sections 184 and 164, Forms MBP-1 and DIR-8', 'Director disclosures and non-disqualification', 'At the first board meeting (and annually for MBP-1)', 'Penalties under section 184(4) for failure to disclose'],
        ['Section 10A, Form INC-20A', 'Declaration for commencement of business', 'Within 180 days of incorporation', 'Company ₹50,000; officers ₹1,000 per day up to ₹1,00,000'],
        ['Section 88, Form MGT-1', 'Register of members', 'From incorporation', 'Penalty under section 88(5)']
      ]
    },
    sections: [
      {
        heading: 'Physical certificates or demat?',
        paragraphs: [
          `Rule 9B of the Companies (Prospectus and Allotment of Securities) Rules, 2014, notified in 2023, requires private companies that are not small companies to issue securities only in dematerialised form and to facilitate dematerialisation of existing securities, with a transition period. Small companies were excluded when the rule was notified. If your company is, or will become, a non-small private company, plan for an ISIN, a depository connection and a registrar and transfer agent rather than paper certificates. Check the current definition of a small company and the rule's current text before deciding.`,
          `Where shares are held in demat form, stamp duty on issue is collected through the depository rather than paid by the company directly, which is one less step to track.`
        ]
      },
      {
        heading: 'What your company file should contain at day 60',
        paragraphs: [
          `Investors, banks and auditors will ask for these documents repeatedly. Keeping them in one place from the start saves weeks in your first due diligence.`
        ],
        bullets: [
          'Certificate of incorporation, MoA and AoA, PAN and TAN',
          'Signed minutes of the first board meeting with attendance',
          'MBP-1 and DIR-8 from every director',
          'Auditor consent, eligibility certificate, appointment letter and ADT-1 receipt (if filed)',
          'Bank statement showing subscription money received',
          'Copies of SH-1 certificates with stamp duty payment proof',
          'Register of members and register of directors and KMP',
          'INC-20A filing receipt (or a dated plan to file it)'
        ]
      }
    ],
    pitfalls: [
      { title: 'Skipping the first auditor', text: `It is the most common year-1 miss. Without an auditor, the first financial statements cannot be audited and the AOC-4 timeline slips.` },
      { title: 'Issuing certificates before money is received', text: `Certificates should reflect fully paid shares. Collect subscription money first, then issue.` },
      { title: 'Forgetting stamp duty', text: `Stamp duty on issue is not collected through SPICe+ for physical certificates. Unstamped certificates can create problems in later transfers and diligence.` },
      { title: 'Minutes that are written months later', text: `Back-dated or reconstructed minutes are easy to spot. Write and sign them promptly, following Secretarial Standard SS-1.` },
      { title: 'Treating INC-20A as a 180-day problem', text: `Waiting until day 170 leaves no margin for a deactivated DIN or a missing bank statement. File as soon as subscription money is in.` }
    ],
    faqs: [
      { q: 'Is ADT-1 required for the first auditor?', a: `The law clearly requires ADT-1 for auditors appointed under section 139(1), typically at the AGM. For the first auditor appointed by the Board under section 139(6), practice differs, and many professionals file ADT-1 anyway as a precaution. Confirm the approach with your adviser; filing it is low-cost.` },
      { q: 'What is the stamp duty on share certificates?', a: `Since 1 July 2020, stamp duty on the issue of shares under the amended Indian Stamp Act is 0.005% of the value. For physical shares the company pays it to the state, generally where the registered office is. Confirm the value base and payment method for your state.` },
      { q: 'Who signs an SH-1 share certificate?', a: `Under rule 5 of the Share Capital and Debentures Rules, a certificate is signed by two directors, or by a director and the company secretary where one is appointed, and carries the common seal if the company has one. Details are entered in the register of members.` },
      { q: 'What happens if the first board meeting is late?', a: `Section 173(4) provides a penalty for each officer whose duty it was to give notice of the meeting and who failed to do so. Hold the meeting as soon as possible, minute it accurately, and do not back-date it.` }
    ],
    related: {
      services: ['roc-annual-compliance', 'private-limited-company-registration', 'legal-staffing-virtual-compliance-officer'],
      tools: ['roc-compliance-calendar', 'incorporation-cost-calculator'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['inc-20a-late-filing-penalty-after-180-days-condonation', 'dir-3-kyc-deactivated-din-reactivation-fee-process', 'spice-plus-part-b-resubmission-remarks-mca-v3']
    }
  },

  // ---------------------------------------------------------------- 13
  {
    slug: 'dir-3-kyc-deactivated-din-reactivation-fee-process',
    pillar: 'post-incorp-compliance',
    title: 'DIR-3 KYC Web vs e-Form: Reactivating a Deactivated DIN Quickly',
    metaTitle: 'DIR-3 KYC Web vs e-Form: Reactivate a Deactivated DIN',
    metaDescription: 'DIN deactivated for missing DIR-3 KYC? Learn when the web version works, when the e-form is needed, the ₹5,000 late fee and how to get the DIN active again fast.',
    published: '2026-08-18',
    updated: '2026-11-12',
    readMinutes: 8,
    keywords: ['DIR-3 KYC', 'DIN deactivated', 'DIN reactivation', 'DIR-3 KYC web', 'DIR-3 KYC late fee 5000', 'rule 12A director KYC', 'DIR-3 KYC due date'],
    excerpt: 'A missed DIR-3 KYC deactivates the DIN and blocks every filing that director signs. Here is how to choose between the web version and the e-form, pay the ₹5,000 fee and get back to work.',
    summary: [
      `Every individual who holds a Director Identification Number (DIN) must submit KYC details to the MCA under rule 12A of the Companies (Appointment and Qualification of Directors) Rules, 2014. When it is not filed by the due date, the MCA marks the DIN as deactivated, and the director cannot sign or be named in most MCA filings until the KYC is completed with the late fee. For a startup with two directors, one deactivated DIN can stall an INC-20A, an AOC-4 or a change in directors.`,
      `There are two ways to file: e-form DIR-3 KYC, which is a full form with DSC and professional certification, and DIR-3 KYC-WEB, a shorter web service that verifies details already on the MCA record through OTPs. Which one you can use depends on whether you have filed the full e-form before and whether your contact details have changed.`,
      `The reactivation itself is usually straightforward: file the right version with the ₹5,000 fee and the DIN is reactivated once the filing is accepted. The due date and frequency of KYC have been the subject of MCA review; check the current text of rule 12A on the MCA portal before planning your next filing.`
    ],
    steps: {
      heading: 'Reactivating a deactivated DIN, step by step',
      items: [
        { title: 'Confirm why the DIN is deactivated', text: `Check the DIN status on the MCA V3 portal. Deactivation for non-filing of DIR-3 KYC is different from disqualification under section 164(2), which follows non-filing of financial statements or annual returns by a company for three consecutive financial years. KYC deactivation is cured by filing KYC; disqualification is not.` },
        { title: 'Decide between the web version and the e-form', text: `Use DIR-3 KYC-WEB if you have previously filed the full e-form DIR-3 KYC and your personal mobile number and email address on record are unchanged. Use e-form DIR-3 KYC if you have never filed the e-form, or if you need to update mobile, email or other details. If in doubt, the e-form always works.` },
        { title: 'Check your mobile and email are your own', text: `Both versions verify through OTPs sent to the director's personal mobile and email. The MCA expects these to be unique to the individual, so a shared office email or the company secretary's phone number will cause problems. Update them through the e-form if they are not yours.` },
        { title: 'Prepare documents for the e-form', text: `For the e-form, keep the PAN, Aadhaar (where allotted), proof of address and, for foreign nationals, the passport, which is mandatory for them. The form is signed with the director's own valid DSC and certified by a practising Chartered Accountant, Company Secretary or Cost Accountant.` },
        { title: 'Pay the ₹5,000 late fee', text: `After the due date, the MCA charges a fee of ₹5,000 for the KYC filing for each DIN. The fee is the same whichever version you use. Pay it on the portal; it is generated automatically for a deactivated DIN.` },
        { title: 'Verify reactivation and resume filings', text: `Once the filing is processed, the DIN status should show as active. Check it before you sign the next form. Then file any company forms that were held up, starting with those carrying daily additional fees or penalties, such as INC-20A or the annual returns.` }
      ]
    },
    rules: {
      heading: 'DIR-3 KYC rules at a glance',
      caption: 'Rule 12A of the Companies (Appointment and Qualification of Directors) Rules, 2014. Confirm current frequency and due date on the MCA portal.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['Rule 12A, e-form DIR-3 KYC', 'Full KYC with DSC and professional certification; also updates contact details', 'By 30 September for those holding DIN as at 31 March (subject to any change in the rule)', 'No fee if on time; ₹5,000 after the due date'],
        ['Rule 12A, DIR-3 KYC-WEB', 'OTP-based confirmation of details already on record', 'Same due date', 'No fee if on time; ₹5,000 after the due date'],
        ['DIN status', 'DIN marked deactivated for non-filing of KYC', 'From the day after the due date', 'Cannot be used in most MCA filings until KYC is filed with fee'],
        ['Section 164(2)', 'Disqualification for company defaults (3 consecutive years of non-filing)', 'Disqualified for 5 years from the date of default', 'Not cured by KYC; separate remedy needed'],
        ['Sections 155 and 159', 'Bar on holding more than one DIN; punishment for contravention', 'Ongoing', 'Penalties apply for contravention']
      ]
    },
    sections: [
      {
        heading: 'Annual, or once every three years?',
        paragraphs: [
          `For several years, rule 12A has required every DIN holder to file KYC annually by 30 September. The MCA has since reviewed this frequency, including a move towards KYC once every three years with an obligation to update contact details whenever they change. Because the effective date and exact wording of any change matter, we do not state a frequency as settled here.`,
          `Before you plan the next cycle, read the current rule 12A on the MCA portal or ask the professional who certifies your KYC. If a change has taken effect, note when your next KYC is due and whether a change in mobile, email or address triggers a filing within a fixed number of days.`
        ]
      },
      {
        heading: 'Directors who also hold LLP designations',
        paragraphs: [
          `A DIN also serves as the Designated Partner Identification Number for LLPs. A deactivated DIN therefore blocks LLP filings as well, including Form 8 and Form 11. If you sit on the board of a company and are a designated partner in an LLP, one KYC filing covers you, but the deactivation affects both.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Using the web version after changing your phone number', text: `The web version only confirms existing details. If your mobile or email has changed, file the e-form.` },
      { title: 'Using the company email or a shared number', text: `OTPs go to the director personally. Shared or office contact details often clash with another DIN holder's record.` },
      { title: 'An expired DSC', text: `The e-form needs the director's own valid DSC. Renew it before you start, especially for foreign directors who need longer lead time.` },
      { title: 'Confusing deactivation with disqualification', text: `Filing KYC reactivates a DIN deactivated for non-filing of KYC. It does nothing for a section 164(2) disqualification.` },
      { title: 'Waiting until the last week of September', text: `Portal load near the due date is a known issue. File in the first half of the window.` }
    ],
    faqs: [
      { q: 'How long does DIN reactivation take after filing DIR-3 KYC?', a: `Once the KYC filing with the ₹5,000 fee is accepted, the DIN is usually shown as active again without a separate application. Timing depends on portal processing, so check the DIN status before signing any other form.` },
      { q: 'Can I use DIR-3 KYC-WEB if my DIN is deactivated?', a: `Generally yes, if you have filed the full e-form DIR-3 KYC in an earlier year and your personal mobile and email are unchanged. The ₹5,000 fee applies either way. If your details changed, use the e-form.` },
      { q: 'Is DIR-3 KYC needed for a director with no active company?', a: `The requirement is attached to holding a DIN, not to an active directorship. If you hold a DIN, file the KYC as rule 12A requires, or consider surrendering the DIN through the prescribed process if you no longer need it.` },
      { q: 'Does a foreign director need to file DIR-3 KYC?', a: `Yes, if they hold a DIN. For foreign nationals the passport is mandatory, and documents executed abroad typically need notarisation and apostille or consular attestation, so start early.` }
    ],
    related: {
      services: ['roc-annual-compliance', 'cma-ca-cs-certification-services'],
      tools: ['roc-compliance-calendar'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['inc-20a-late-filing-penalty-after-180-days-condonation', 'indian-subsidiary-registration-foreign-director-documents-fema', 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1']
    }
  },
  // ---------------------------------------------------------------- 14
  {
    slug: 'director-loan-private-limited-company-section-185-dpt3',
    pillar: 'post-incorp-compliance',
    title: 'Section 185 & Director Loans: Avoiding ROC Notices & Filing DPT-3 Properly',
    metaTitle: 'Section 185 Director Loans & DPT-3 Filing Guide',
    metaDescription: 'Loans to directors are restricted by section 185; loans from directors are exempt deposits only with a declaration. How both work and how to file DPT-3 by 30 June.',
    published: '2026-08-25',
    updated: '2026-11-12',
    readMinutes: 10,
    keywords: ['section 185 Companies Act', 'loan to director private limited', 'loan from director exempted deposit', 'DPT-3 filing', 'rule 2(1)(c)(viii) deposit rules', 'DPT-3 due date 30 June', 'director loan declaration'],
    excerpt: 'Money flowing from the company to a director and money flowing from a director to the company are treated very differently. Get the direction right, keep the declaration, and file DPT-3 on time.',
    summary: [
      `In early-stage companies, money moves between founders and the company all the time: a director pays a vendor from a personal card, the company advances salary, a founder tops up the bank account before payroll. The Companies Act, 2013 treats these flows very differently depending on direction. Loans by the company to its directors are restricted by section 185. Loans by directors to the company are, in principle, deposits under section 73 unless they fall within an exemption in the Companies (Acceptance of Deposits) Rules, 2014.`,
      `For a private company, the most useful exemption is rule 2(1)(c)(viii): money received from a person who, at the time of receipt, was a director, or a relative of a director, is not a deposit if that person gives the company a written declaration that the amount is not being given out of funds acquired by borrowing or accepting loans or deposits from others, and the company discloses the details in the Board's report.`,
      `Both sides feed into Form DPT-3, the annual return of deposits and of particulars of transactions not treated as deposits, due by 30 June with figures as on 31 March. Many ROC notices in this area come from mismatches between the balance sheet, the DPT-3 and the Board's report, so the cure is consistent paperwork rather than complex law.`
    ],
    steps: {
      heading: 'Getting director loans right, step by step',
      items: [
        { title: 'Map every balance with a director', text: `From the ledger, list every amount owed by a director to the company and every amount owed by the company to a director or their relative, with dates and nature: loan, advance against salary, reimbursement due, or unpaid remuneration. Reimbursements and remuneration are not loans; mixing them up is the source of many problems.` },
        { title: 'Test loans to directors against section 185', text: `Section 185(1) prohibits a company from advancing a loan, including a loan represented by a book debt, to its directors or directors of its holding company, their partners or relatives, and certain firms, or giving a guarantee or security for their loans. Section 185(2) allows loans to other persons in whom a director is interested only with a special resolution and use of the money for the borrower's principal business. Check the section 185(3) exceptions, such as loans to a managing or whole-time director under a scheme for all employees or approved by special resolution.` },
        { title: 'Check the private company exemption', text: `A 2015 notification exempts certain private companies from section 185: broadly, those in whose share capital no other body corporate has invested, whose borrowings from banks, financial institutions or bodies corporate are less than twice the paid-up capital or ₹50 crore (whichever is lower), and which have no subsisting default in repaying those borrowings at the time of the transaction. All conditions must be met on the date of the loan. Once a corporate investor comes in, the exemption falls away.` },
        { title: 'Take the declaration for loans from directors', text: `For each amount received from a director or a director's relative, obtain a written declaration at the time the money is given, stating that it is not out of borrowed funds. A declaration signed months later is weak evidence. Record the receipt in board minutes and keep the bank trail; avoid cash, because the Income-tax rules on cash loans apply separately.` },
        { title: 'Disclose in the Board\'s report', text: `The rule 2(1)(c)(viii) exemption also requires the company to disclose the details of money accepted from directors in the Board's report. Make sure the amount matches the balance sheet and the DPT-3.` },
        { title: 'File DPT-3 by 30 June', text: `Under rule 16 of the Deposit Rules, every company other than a government company files DPT-3 by 30 June, showing outstanding deposits and amounts not treated as deposits as on 31 March. Where the return covers deposits, it is audited by the company's auditor; check the current form instructions for what must be attached for exempted amounts only.` },
        { title: 'Unwind any non-compliant loan', text: `If a loan to a director does not fit an exemption, take advice before the year-end. Recovering it, converting it into a proper arrangement, or regularising it with the correct approvals is better than leaving it for the auditor to report. Section 185 contraventions are punishable offences, not just filing defaults.` }
      ]
    },
    rules: {
      heading: 'Director loans and DPT-3: the rules that matter',
      caption: 'Companies Act, 2013 and the Companies (Acceptance of Deposits) Rules, 2014. Confirm current figures before relying on them.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['Section 185(1)', 'Bar on loans, guarantees and security for directors and connected persons', 'Applies to every such transaction', 'Company: fine of ₹5 lakh to ₹25 lakh; officers in default and the borrowing director also face imprisonment up to six months and/or fine'],
        ['Section 185(2)', 'Loans to entities in which directors are interested', 'Special resolution before the loan; use for principal business', 'Same penalty regime as section 185(1)'],
        ['2015 private company exemption', 'Removes section 185 for qualifying private companies', 'Conditions tested on the date of the loan', 'If conditions fail, full section 185 applies'],
        ['Rule 2(1)(c)(viii), Deposit Rules', 'Money from a director (or relative, for private companies) is not a deposit', 'Written declaration at the time of giving; disclosure in Board\'s report', 'Without it the amount may be treated as a deposit under section 73'],
        ['Rule 16, Form DPT-3', 'Return of deposits and particulars of exempted amounts', 'By 30 June, figures as on 31 March', 'Normal fee; additional fee if late; penalty for contravention of the rules'],
        ['Income-tax deemed dividend', 'Loans by a closely held company to certain shareholders may be taxed as dividend', 'Year of the loan', 'Tax in the shareholder\'s hands to the extent of accumulated profits (confirm under the current Act)']
      ]
    },
    sections: [
      {
        heading: 'Why ROC notices arise in this area',
        paragraphs: [
          `Notices usually follow a mismatch rather than a deliberate breach. Typical triggers are a balance sheet showing "loans from directors" with nothing reported in DPT-3, a DPT-3 that reports exempt amounts but a Board's report that is silent, or "loans and advances to related parties" in the financial statements for a company that does not meet the private company exemption.`,
          `The auditor's report under the Companies (Auditor's Report) Order also asks about compliance with sections 185 and 186 for companies to which CARO applies, so a weak position tends to surface at audit. Fixing records before the audit is cheaper than answering a notice after it.`
        ]
      },
      {
        heading: 'Tax and other angles to keep in view',
        paragraphs: [
          `The Companies Act is only one lens. Under the income-tax law, a loan or advance by a closely held company to a shareholder with substantial voting power (or to a concern in which they are substantially interested) can be taxed as deemed dividend to the extent of accumulated profits. The Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026, with provisions renumbered; check the current provision with your tax adviser.`,
          `Cash loans of significant amounts are separately restricted by the income-tax rules on acceptance and repayment of loans other than by banking channels. Use bank transfers for every director transaction.`
        ],
        bullets: [
          'Keep a director-wise ledger with nature of each entry.',
          'Store declarations with the board minutes that note the receipt.',
          'Reconcile ledger, balance sheet, DPT-3 and Board\'s report every year.',
          'Re-test the private company exemption after every funding round.'
        ]
      }
    ],
    pitfalls: [
      { title: 'Calling a director advance a "reimbursement"', text: `If money goes to a director before expenses are incurred, it may be a loan. Use an expense policy and settle claims promptly.` },
      { title: 'Losing the exemption after funding', text: `A corporate investor in the share capital ends the private company exemption from section 185 for future transactions.` },
      { title: 'Backdated declarations', text: `The declaration is meant to be given at the time the money is given. Prepare a standard format and sign it with each transfer.` },
      { title: 'Skipping DPT-3 because there are no deposits', text: `DPT-3 also reports amounts not treated as deposits. If you have director loans or other exempt amounts, a return is generally due.` },
      { title: 'Relatives\' loans in a public company', text: `The relative limb of rule 2(1)(c)(viii) applies to private companies. Public companies should check the exemption carefully.` }
    ],
    faqs: [
      { q: 'Can a private limited company give a loan to its director?', a: `Only if the transaction falls outside section 185 or within an exception. Qualifying private companies have a conditional exemption under a 2015 notification, and section 185(3) has exceptions such as loans to a managing or whole-time director under an employee scheme or one approved by special resolution. Test every condition on the date of the loan.` },
      { q: 'Is a loan from a director a deposit?', a: `Not if it falls within rule 2(1)(c)(viii) of the Deposit Rules: the director (or, for a private company, a relative of a director) gives a written declaration that the money is not from borrowed funds, and the company discloses the details in the Board's report. Otherwise it may be a deposit under section 73.` },
      { q: 'What is the due date for DPT-3?', a: `DPT-3 is due by 30 June each year, reporting outstanding deposits and amounts not treated as deposits as on 31 March. Late filing attracts additional fees, and contraventions of the Deposit Rules can lead to penalties.` },
      { q: 'Does an OPC or small company need to file DPT-3?', a: `Rule 16 applies to every company other than a government company, so small companies and OPCs are not exempt as a class. If you have deposits or exempted amounts such as director loans to report, plan to file.` }
    ],
    related: {
      services: ['roc-annual-compliance', 'legal-staffing-virtual-compliance-officer', 'cma-ca-cs-certification-services'],
      tools: ['roc-compliance-calendar'],
      compare: ['in-house-cs-vs-virtual-compliance-officer'],
      blogs: ['post-incorporation-compliance-checklist-first-60-days-sh1-adt1', 'legal-due-diligence-checklist-indian-seed-startups-cap-table', 'virtual-compliance-officer-vs-in-house-cs-cost-india']
    }
  },

  // ---------------------------------------------------------------- 15
  {
    slug: '80-iac-tax-exemption-rejection-reasons-startup-india-dpiit',
    pillar: 'post-incorp-compliance',
    title: 'Startup India DPIIT Recognition vs 80-IAC Tax Holiday: How to Pass the IMB Review',
    metaTitle: 'DPIIT Recognition vs 80-IAC: Passing the IMB Review',
    metaDescription: 'DPIIT recognition is not the 80-IAC tax holiday. Learn the eligibility tests, the Form 1 application to the Inter-Ministerial Board and the usual rejection reasons.',
    published: '2026-09-01',
    updated: '2026-11-13',
    readMinutes: 10,
    keywords: ['80-IAC tax exemption', 'DPIIT recognition', 'Inter-Ministerial Board certification', 'Startup India tax holiday', '80-IAC rejection reasons', 'Form 1 IMB', 'startup tax exemption eligibility'],
    excerpt: 'DPIIT recognition is the first gate; the 80-IAC tax holiday needs a separate certificate from the Inter-Ministerial Board. Here is what the Board looks for and why applications fail.',
    summary: [
      `Two things are often confused. DPIIT recognition under the Startup India programme makes an entity a "startup" for government schemes and certain regulatory relaxations. The tax holiday under section 80-IAC of the Income-tax Act, 1961 is a separate benefit: a deduction of 100% of profits from an eligible business for any three consecutive years out of the first ten years from incorporation. To claim it, a recognised startup must also obtain a certificate of eligible business from the Inter-Ministerial Board of Certification (IMB).`,
      `Many recognised startups never apply for the IMB certificate, and applications that do go in are reviewed on substance. The review focuses on whether the business is genuinely engaged in innovation, development or improvement of products, processes or services, or has a scalable model with high potential for employment or wealth creation. A good application shows this with evidence, not adjectives.`,
      `Two updates to keep in mind. The Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026; the startup deduction is carried into the new law under a different section number, so check the corresponding provision and transition rules with your tax adviser. And the incorporation window for 80-IAC has been extended by Finance Acts over time; confirm the current cut-off date before applying.`
    ],
    steps: {
      heading: 'From DPIIT recognition to an IMB certificate',
      items: [
        { title: 'Check entity type and age', text: `DPIIT recognition is available to private limited companies, registered partnership firms and LLPs within the age and turnover limits in the DPIIT notification. The 80-IAC deduction, however, is only for companies and LLPs. A partnership firm can be recognised but cannot claim 80-IAC, so convert first if the tax holiday matters.` },
        { title: 'Check the incorporation window and turnover', text: `For 80-IAC the entity must be incorporated on or after 1 April 2016 and before the cut-off date in the current law (extended over time; most recently to 1 April 2030 as we understand it — confirm). Turnover must not exceed ₹100 crore in the year for which the deduction is claimed. DPIIT recognition separately requires turnover not exceeding ₹100 crore in any financial year since incorporation.` },
        { title: 'Get DPIIT recognition first', text: `Apply on the Startup India portal with the certificate of incorporation, a description of the innovation and the problem solved, and supporting material such as a pitch deck, website or product links, and any patents or awards. Recognition is a prerequisite for the IMB application.` },
        { title: 'Decide which three years you will claim', text: `The deduction is for any three consecutive assessment years out of ten from incorporation. Early-stage startups often have losses, so choose a block where profits are expected. Remember that a company claiming 80-IAC remains subject to minimum alternate tax, and a company that opts for the concessional regime under section 115BAA of the 1961 Act gives up Chapter VI-A deductions such as 80-IAC. Model both before committing.` },
        { title: 'Prepare Form 1 for the IMB', text: `The application for the 80-IAC certificate is made in Form 1 on the Startup India portal. Expect to provide the memorandum or LLP agreement, a board resolution, financial statements and income-tax returns for the years available, and a clear write-up of the innovation and its scalability, ideally with a short product video or demo, patents filed, and evidence of traction.` },
        { title: 'Answer clarifications quickly and precisely', text: `The IMB may seek clarifications. Answer the question asked, with documents. Vague restatements of the pitch rarely help.` },
        { title: 'Claim the deduction correctly in the return', text: `Once certified, claim the deduction in the return for the chosen year, keep the IMB certificate on file and ensure the accounts separately identify income from the eligible business. Your tax adviser should check the corresponding provision under the Income-tax Act, 2025 for years governed by the new law.` }
      ]
    },
    rules: {
      heading: 'DPIIT recognition and the 80-IAC tax holiday compared',
      caption: 'DPIIT notification G.S.R. 127(E) of 19 February 2019 (as amended) and section 80-IAC of the Income-tax Act, 1961. Confirm current text and the 2025 Act equivalent.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['DPIIT recognition (Startup India portal)', 'Recognises the entity as a startup', 'Up to 10 years from incorporation; turnover not above ₹100 crore in any year', 'No government fee; recognition can be revoked for false information'],
        ['Section 80-IAC', '100% deduction of profits from eligible business', 'Any 3 consecutive years out of the first 10 from incorporation', 'Turnover not above ₹100 crore in the claim year'],
        ['80-IAC incorporation window', 'Who can claim', 'Incorporated on or after 1 April 2016 and before the current cut-off date (confirm)', 'Company or LLP only'],
        ['Form 1 to the IMB', 'Certificate of eligible business', 'Before the deduction is claimed', 'No certificate, no deduction'],
        ['Minimum alternate tax (companies)', 'MAT continues to apply on book profits', 'Each year of claim', 'MAT credit rules apply'],
        ['Section 115BAA option (companies)', 'Concessional tax rate', 'Choice made in the return', 'Opting in forgoes 80-IAC']
      ]
    },
    sections: [
      {
        heading: 'Common reasons IMB applications fail',
        paragraphs: [
          `The IMB does not publish a list of rejection reasons, so the points below are drawn from the eligibility criteria and the kinds of clarification requests applicants commonly receive. They are patterns to avoid, not an official list.`
        ],
        bullets: [
          'The description reads like a conventional service (IT services, consulting, trading, agency) with no explanation of what is new.',
          'Innovation is claimed but not evidenced: no product demo, no technical write-up, no patent or design filing, no users.',
          'Scalability is asserted without a revenue model, unit economics or a credible path to employment generation.',
          'The entity is ineligible: incorporated before 1 April 2016, a partnership firm, formed by splitting up or reconstructing an existing business, or over the turnover limit.',
          'Documents conflict: different business descriptions in the MoA, the DPIIT application, the website and the financial statements.',
          'Incomplete uploads, missing board resolution, or financial statements and returns that do not match.'
        ]
      },
      {
        heading: 'Writing an application that survives review',
        paragraphs: [
          `Lead with the problem and the specific technical or business-model innovation that solves it. Explain why existing products do not, in two or three sentences. Then give evidence: a working product, pilot customers, patents filed, research outputs or awards. Finally, show scalability with numbers you can stand behind, such as current users, revenue, hiring plans, rather than market-size slides alone.`,
          `Keep the description consistent everywhere. If your object clause says "software development services", your DPIIT application says "AI diagnostics platform" and your financial statements show consulting revenue, expect questions. Align them before you apply.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Assuming recognition equals tax exemption', text: `DPIIT recognition alone does not give 80-IAC. You need the IMB certificate.` },
      { title: 'Choosing the wrong three years', text: `Claiming in loss years wastes the holiday. Plan the block of years against your projections.` },
      { title: 'Opting for section 115BAA without modelling', text: `The concessional regime excludes 80-IAC. Compare tax under both before making the choice.` },
      { title: 'Applying as a partnership firm', text: `Partnership firms can be recognised but cannot claim 80-IAC. Convert to a company or LLP first.` },
      { title: 'Ignoring the new Act\'s transition', text: `From 1 April 2026, the 2025 Act applies. Have your adviser map the claim to the corresponding provision.` }
    ],
    faqs: [
      { q: 'Is DPIIT recognition enough to claim 80-IAC?', a: `No. DPIIT recognition is a prerequisite, but the deduction requires a separate certificate of eligible business from the Inter-Ministerial Board, applied for in Form 1 on the Startup India portal.` },
      { q: 'Can an LLP claim the 80-IAC tax holiday?', a: `Yes. Section 80-IAC is available to eligible companies and LLPs. A registered partnership firm can get DPIIT recognition but is not eligible for 80-IAC.` },
      { q: 'How many years of tax exemption does 80-IAC give?', a: `A deduction of 100% of profits from the eligible business for any three consecutive years out of the first ten years from incorporation, subject to the turnover limit of ₹100 crore in the claim year and the other conditions. MAT continues to apply to companies.` },
      { q: 'Does 80-IAC still apply under the Income-tax Act, 2025?', a: `The new Act, in force from 1 April 2026, carries forward a startup deduction under a renumbered section. Check the corresponding provision, its conditions and the transition rules with a tax adviser before claiming for any year governed by the new law.` }
    ],
    related: {
      services: ['msme-udyam-dpiit-startup-registration', 'cma-ca-cs-certification-services', 'private-limited-company-registration'],
      tools: ['incorporation-cost-calculator', 'trademark-class-finder'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['startup-share-valuation-report-registered-valuer-cma-fema', 'legal-due-diligence-checklist-indian-seed-startups-cap-table', 'convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer']
    }
  },

  // ---------------------------------------------------------------- 16
  {
    slug: 'virtual-compliance-officer-vs-in-house-cs-cost-india',
    pillar: 'legal-staffing',
    title: 'In-House Company Secretary vs Virtual Compliance Officer: Startup Cost Breakdown',
    metaTitle: 'In-House CS vs Virtual Compliance Officer: Startup Costs',
    metaDescription: 'When a whole-time company secretary is mandatory under section 203 and rule 8A, and how the cost of an in-house CS compares with a virtual compliance officer.',
    published: '2026-09-08',
    updated: '2026-11-13',
    readMinutes: 9,
    keywords: ['in-house company secretary cost', 'virtual compliance officer India', 'section 203 whole-time company secretary', 'rule 8A company secretary', 'company secretary salary India', 'outsourced company secretary startup'],
    excerpt: 'Most early-stage private companies are not required to hire a whole-time company secretary. Here is where the legal line sits, what each option really costs and how to decide.',
    summary: [
      `Section 203 of the Companies Act, 2013 and rules 8 and 8A of the Companies (Appointment and Remuneration of Managerial Personnel) Rules, 2014 decide when a company must have a whole-time company secretary (CS). For most early-stage private companies, the threshold is a paid-up share capital of ₹10 crore or more. Below that, there is no legal requirement for a whole-time CS, although every company still has to keep its secretarial records and filings in order.`,
      `That leaves a cost decision. An in-house CS gives full-time availability and deep context, but brings salary, benefits, management time and a single point of failure. A virtual compliance officer, an external team on a monthly retainer, gives broad coverage across MCA, secretarial and contract work at a lower fixed cost, but needs good information flow from the company.`,
      `This guide sets out the legal triggers, the cost components on each side, and a simple test for when to switch. Salary figures are indicative ranges only; they vary widely by city, sector and experience, so benchmark against current offers in your market.`
    ],
    steps: {
      heading: 'Deciding between in-house and virtual, step by step',
      items: [
        { title: 'Check whether a whole-time CS is mandatory', text: `Under rule 8, every listed company and every other public company with paid-up share capital of ₹10 crore or more must appoint whole-time key managerial personnel, including a CS. Under rule 8A, any other company with paid-up share capital of ₹10 crore or more must have a whole-time CS. If you are below these thresholds, the decision is commercial, not legal.` },
        { title: 'Project when you will cross ₹10 crore paid-up capital', text: `Paid-up capital rises with each priced round. Note that the test is paid-up share capital, not the amount raised; securities premium does not count towards it. Model your cap table to see when you would cross the line, and plan the hire around six months before.` },
        { title: 'List the work, not the job title', text: `Write down what needs doing each month: board and general meetings, minutes, registers, MCA filings (AOC-4, MGT-7 or MGT-7A, DIR-3 KYC, DPT-3, MSME-1 where applicable), share allotments, ESOP administration, FEMA reporting, contract reviews. This list is what you are buying, whichever option you choose.` },
        { title: 'Cost the in-house option fully', text: `Add salary, statutory contributions, benefits, recruitment cost, laptop and software, training, ICSI membership and leave cover. Factor in the time a founder or CFO spends managing the role, and the risk of a gap if the person leaves.` },
        { title: 'Cost the virtual option fully', text: `Ask for a fixed monthly retainer that names the deliverables and response times, plus how out-of-scope work (a funding round, a conversion, a notice reply) is priced. Government fees and stamp duty are always extra, at actuals.` },
        { title: 'Check certification needs', text: `Certain filings need certification by a practising professional, such as MGT-8 for the annual return of larger companies or certification of e-forms. An employed CS cannot certify as a practising CS. Budget for an external practising professional either way.` },
        { title: 'Review the choice every year', text: `Revisit after each funding round or when headcount, contract volume or regulatory exposure changes materially. Many companies move from virtual to a hybrid model, with an in-house CS supported by an external desk, before they become mandatory.` }
      ]
    },
    rules: {
      heading: 'When the law requires a company secretary',
      caption: 'Companies Act, 2013 and the Managerial Personnel Rules, 2014. Thresholds as we understand them; confirm the current rules.',
      headers: ['Form / section', 'Purpose', 'Due date / limit', 'Fee / penalty'],
      rows: [
        ['Section 203 with rule 8', 'Whole-time KMP (MD/CEO/manager or WTD, CS, CFO) for listed companies and public companies', 'Public companies with paid-up capital of ₹10 crore or more', 'Company: ₹5 lakh. Each director and KMP in default: ₹50,000 plus ₹1,000 per day of continuing default, up to ₹5 lakh'],
        ['Rule 8A', 'Whole-time CS for other companies', 'Paid-up share capital of ₹10 crore or more', 'Same section 203(5) penalty regime'],
        ['Section 203(4)', 'Filling a vacancy in the office of KMP', 'Within six months of the vacancy, by a board meeting', 'Penalty under section 203(5)'],
        ['Rule 11(2), Management and Administration Rules (MGT-8)', 'Annual return certified by a practising CS', 'Listed companies, or paid-up capital of ₹10 crore or more, or turnover of ₹50 crore or more', 'Penalties for non-compliance with section 92'],
        ['Section 204 (MR-3)', 'Secretarial audit by a practising CS', 'Listed companies and prescribed classes of public companies', 'Penalty under section 204(4)']
      ]
    },
    sections: [
      {
        heading: 'Indicative cost components',
        paragraphs: [
          `There is no reliable official salary survey for company secretaries in startups, so treat any figure as a starting point for negotiation. Broadly, a newly qualified CS in a metro may expect a fixed salary in the low-to-mid single-digit lakhs per year, and an experienced CS with five or more years in a funded company several times that, with significant variation by city and sector. Add employer contributions and benefits on top.`,
          `A virtual compliance officer is usually priced as a monthly retainer tied to a defined scope. The right comparison is not salary versus retainer, but total cost of the work list versus total cost of each option, including the founder time saved or spent.`
        ],
        bullets: [
          'In-house: salary, benefits, recruitment, tools, training, leave cover, management time.',
          'Virtual: retainer, out-of-scope work, onboarding time, information-sharing discipline.',
          'Both: practising professional certification, government fees and stamp duty at actuals.'
        ]
      },
      {
        heading: 'A simple switching test',
        paragraphs: [
          `Move to an in-house CS when one or more of these is true: the law requires it; you hold board or shareholder meetings more than quarterly; you run continuous ESOP grants and allotments; you have regulated activity (for example FEMA-heavy foreign investment or an RBI or SEBI touchpoint) that needs daily attention; or your external retainer is consistently exceeding its scope. Until then, a virtual compliance officer usually covers the work at lower fixed cost.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Counting securities premium as paid-up capital', text: `The ₹10 crore test is on paid-up share capital. Premium does not count. Check your actual figure before hiring or delaying.` },
      { title: 'Expecting an employee to certify forms', text: `An in-house CS cannot sign certifications reserved for practising professionals. Budget for external certification.` },
      { title: 'Retainers without a scope', text: `A vague retainer leads to disputes about what is included. Insist on a written deliverables list.` },
      { title: 'Leaving a KMP vacancy open', text: `If you are required to have a CS and the role falls vacant, section 203(4) gives six months to fill it. Start recruiting immediately.` }
    ],
    faqs: [
      { q: 'Is a company secretary mandatory for a private limited company?', a: `A whole-time CS is mandatory under rule 8A for a private company with paid-up share capital of ₹10 crore or more. Below that, there is no requirement, though the company must still comply with secretarial and filing obligations.` },
      { q: 'Can a virtual compliance officer replace a mandatory whole-time CS?', a: `No. Where the law requires a whole-time CS, the company must appoint one as KMP. A virtual compliance team can support that CS but cannot replace the appointment.` },
      { q: 'What is the penalty for not appointing a CS when required?', a: `Section 203(5) provides a penalty of ₹5 lakh on the company and ₹50,000 on each director and KMP in default, with ₹1,000 per day for continuing default up to ₹5 lakh. Confirm the current figures with your adviser.` },
      { q: 'How much does a company secretary cost in India?', a: `It varies widely by city, sector and experience. Compare the full cost of employment, including benefits and management time, with a scoped retainer for the same work list rather than headline salary alone.` }
    ],
    related: {
      services: ['legal-staffing-virtual-compliance-officer', 'roc-annual-compliance'],
      tools: ['roc-compliance-calendar'],
      compare: ['in-house-cs-vs-virtual-compliance-officer', 'legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['hire-dedicated-remote-paralegal-india-clm-research', 'director-loan-private-limited-company-section-185-dpt3', 'legal-due-diligence-checklist-indian-seed-startups-cap-table']
    }
  },
  // @@NEXT
];
