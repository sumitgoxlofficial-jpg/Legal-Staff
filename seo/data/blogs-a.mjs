// Blog posts for pillars 1–2 (mca-v3-incorporation, cma-certifications). Shape: see the top of seo/data/blogs.mjs.
// Accuracy note for editors: figures that change often (fees, thresholds, guarantee ceilings) are described with a
// "confirm the current figure" instruction rather than stated as fixed. Re-check before each content refresh.
export const blogsA = [
  /* ------------------------------------------------------------------ 1 */
  {
    slug: 'spice-plus-part-b-resubmission-remarks-mca-v3',
    pillar: 'mca-v3-incorporation',
    title: 'Fixing SPICe+ Part B Resubmission Remarks on MCA V3',
    metaTitle: 'SPICe+ Part B Resubmission Remarks: How to Fix on MCA V3',
    metaDescription: 'Got SPICe+ Part B remarks from the ROC? Read them, fix MoA, address proof, DSC and AGILE-PRO-S issues, and resubmit on MCA V3 before the deadline.',
    published: '2026-08-04', updated: '2026-11-10', readMinutes: 9,
    keywords: ['SPICe+ resubmission', 'SPICe+ Part B remarks', 'MCA V3 resubmit form', 'ROC objection incorporation', 'RSUB SPICe+', 'company incorporation rejected'],
    excerpt: 'The ROC has sent your SPICe+ back with remarks. Here is how to read them, fix every point in one pass and resubmit on the V3 portal without losing your name.',
    summary: [
      `When the Central Registration Centre (CRC) or the Registrar examines a SPICe+ (INC-32) application and finds something it cannot approve as filed, it marks the application for resubmission and records remarks against the SRN. The application is not rejected yet: you get a limited window to correct the defects and send it back. If the defects are not cured — or the reply is incomplete — the next outcome is usually rejection, and a rejected SPICe+ can also cost you the reserved name.`,
      `Most remarks fall into a handful of buckets: objects in the e-MoA (INC-33) that do not match the name or the NIC activity code, a registered-office proof that is too old or not in the owner's name, signature or identity mismatches between the PAN, Aadhaar and the form, incomplete subscriber or director details, and AGILE-PRO-S (INC-35) or linked-form errors. Each is fixable, but only if you answer the remark that was actually raised and check every linked form for knock-on changes.`,
      `The practical rule is to treat a resubmission as a fresh filing: read all remarks, decide which forms and attachments change, re-sign with every DSC that the change touches, get the professional's declaration refreshed, and resubmit well before the deadline shown on the portal — not on the last day.`
    ],
    steps: {
      heading: 'Step-by-step: resubmitting SPICe+ Part B on MCA V3',
      items: [
        { title: 'Pull the exact remarks from the portal', text: `Log in to the MCA V3 account used to file the application and open the application history for the SRN. Download the remarks and the notice email. Note the resubmission due date shown there — that date, not a rule of thumb, is the one that governs your case.` },
        { title: 'Map each remark to the form it affects', text: `List every remark and mark whether it changes SPICe+ Part B itself, the e-MoA (INC-33), the e-AoA (INC-34), AGILE-PRO-S (INC-35), INC-9 declarations or an attachment. A change to the objects clause, for example, often needs consistent edits in the MoA, the NIC code in Part B and sometimes the proposed name rationale.` },
        { title: 'Fix the documents, not just the form fields', text: `If the remark is about the registered-office proof, obtain a fresh utility bill (generally not older than two months) and a properly signed NOC. If it is about identity, correct the spelling or date of birth at the source (PAN or Aadhaar) or align the form with the source. Re-scan everything legibly in colour.` },
        { title: 'Update the linked web forms', text: `Open the linked forms from the resubmission screen and make the consequential changes. Check that names, addresses, shareholding and capital figures are identical across Part B, the MoA subscription page and AGILE-PRO-S. Inconsistency between linked forms is a common reason for a second round of remarks.` },
        { title: 'Re-affix DSCs and refresh the professional declaration', text: `Where the content of a signed form changes, the subscribers, directors and the certifying professional normally need to sign again. Confirm every DSC is valid, Class 3 and mapped to the right user. The practising CA, CS or CMA should re-verify the changed documents before re-certifying.` },
        { title: 'Write a short covering reply', text: `Where the portal allows a response or an optional attachment, give a point-wise reply: remark, what was changed, where to find it. Examiners process many applications; a clear reply reduces the chance of the same point being raised again.` },
        { title: 'Resubmit early and track the SRN', text: `Submit, save the acknowledgement and watch the SRN status and email. If a further remark is raised, respond within the new window. Once approved, download the Certificate of Incorporation, PAN and TAN, and diarise INC-20A (180 days) and the auditor appointment (30 days).` }
      ]
    },
    rules: {
      heading: 'Forms, rules and limits that matter on resubmission',
      caption: 'Confirm current fees and the resubmission window on the MCA V3 portal for your SRN.',
      headers: ['Form / provision', 'What it covers', 'Time limit', 'Fee / consequence'],
      rows: [
        ['SPICe+ (INC-32) Part B', 'Incorporation, DIN allotment, PAN/TAN, registered office', 'Within the name-reservation validity after Part A approval', 'MCA fee by authorised capital (nil filing fee for capital up to ₹15 lakh); state stamp duty extra'],
        ['Resubmission (RSUB)', 'Correcting defects pointed out by the CRC/ROC', 'Within the window shown against the SRN (commonly 15 days)', 'No new filing fee for a resubmission; uncured defects lead to rejection'],
        ['e-MoA (INC-33) / e-AoA (INC-34)', 'Objects, capital and articles', 'Filed and resubmitted with Part B', 'Stamp duty as per the state of the registered office'],
        ['AGILE-PRO-S (INC-35)', 'GSTIN (optional), EPFO, ESIC, bank account, professional tax where applicable', 'Filed and resubmitted with Part B', 'No MCA fee'],
        ['Section 7(1)(b), Companies Act 2013', 'Declaration by the advocate, CA, CMA or CS in practice engaged in formation', 'At filing and on resubmission if facts change', 'False declarations attract action under sections 447/448'],
        ['Section 4(4)–(5), Companies Act 2013', 'Name reservation validity (20 days for a new company)', 'Part B must be filed while the name is reserved', 'Name lapses if not used; it may be taken by someone else']
      ]
    },
    sections: [
      {
        heading: 'Reading the most common remarks — and what they really mean',
        paragraphs: [
          `Remarks are short and often written in shorthand. Behind most of them is one of a few concerns: the examiner cannot verify a fact from your attachments, two parts of the application disagree, or the objects and name do not fit together.`,
          `Treat the remark as the minimum fix. If the examiner says the utility bill is outdated, also check that the NOC is signed by the person named on the bill and that the address in Part B matches the bill character for character. Fixing only the literal remark is the most common reason for a second resubmission.`
        ],
        bullets: [
          `"Objects not in line with name" — the activity word in the name (for example "Fintech" or "Foods") should be supported by the main objects in the MoA.`,
          `"Address proof not acceptable" — bill too old, not in the owner's name, partial address, or the NOC missing or unsigned.`,
          `"Attachment not legible / incomplete" — scans cut off, pages missing, or a password-protected PDF.`,
          `"Particulars of subscriber/director mismatch" — name, father's name or date of birth differs from PAN or the identity proof.`,
          `"Clarify/attach declaration" — a declaration or consent is missing, or signed by the wrong person.`
        ]
      },
      {
        heading: 'When to stop resubmitting and refile instead',
        paragraphs: [
          `Occasionally the honest answer is that the application cannot be cured — for example, the proposed name is objected to on grounds you cannot meet, or the registered office is no longer available. In those cases it can be faster to let the application lapse and file afresh with a new name or address than to keep answering remarks.`,
          `Before you decide, check how many resubmissions remain and how long the name is still reserved. A practising professional can tell you whether the remark is one that is usually accepted on clarification or one that signals a deeper problem.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Answering only the literal remark', text: `Examiners re-check the whole application. Fix the remark and everything connected to it, or you will see a fresh set of remarks.` },
      { title: 'Editing one form and forgetting the linked forms', text: `A change in capital, shareholding or objects must flow into the MoA, AoA, Part B and AGILE-PRO-S. Mismatches between them are an easy objection.` },
      { title: 'Using an expired or wrong DSC', text: `A DSC that expired between the first filing and the resubmission, or one registered to a different user, blocks the upload. Check validity before you start.` },
      { title: 'Waiting for the last day', text: `Portal slowdowns around deadlines are common. Missing the resubmission window usually means the application is rejected and you start again.` },
      { title: 'Re-using an old utility bill', text: `If weeks have passed since the original filing, the bill you used may now be too old. Get a fresh one dated within the last two months.` }
    ],
    faqs: [
      { q: 'How many days do I get to resubmit SPICe+ after a remark?', a: 'The window is shown against your SRN on the MCA V3 portal and in the notice email; it is commonly 15 days. Treat the date on the portal as final and resubmit a few days before it, because the application can be rejected if the window passes.' },
      { q: 'Do I pay the MCA fee again when I resubmit SPICe+?', a: 'No new filing fee is charged for a resubmission of the same SRN. You may incur fresh costs if documents change — for example additional stamp duty if authorised capital is increased, or a new DSC if one has expired.' },
      { q: 'Will I lose my approved company name if SPICe+ Part B is rejected?', a: 'The name reserved through Part A is valid only for a limited period (20 days for a new company, unless extended). If Part B is rejected and the reservation lapses, the name becomes available to others, so a fresh application may need a fresh name approval.' },
      { q: 'Does every director need to sign again after resubmission?', a: 'Anyone whose signed form or declaration changes should re-sign with a valid DSC. If the change only affects an attachment, fewer signatures may be needed, but the professional certifying the form must re-verify and re-sign. Check the signing blocks shown on the resubmission screen.' }
    ],
    related: {
      services: ['private-limited-company-registration', 'cma-ca-cs-certification-services'],
      tools: ['incorporation-cost-calculator'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['spice-plus-part-a-name-rejection-rules-rule-8', 'virtual-office-company-registration-mca-v3-geo-coordinates', 'practicing-cma-certification-mca-roc-forms-spice-plus', 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1']
    }
  },

  /* ------------------------------------------------------------------ 2 */
  {
    slug: 'spice-plus-part-a-name-rejection-rules-rule-8',
    pillar: 'mca-v3-incorporation',
    title: 'SPICe+ Part A vs Direct Part B: Avoiding Rule 8 Name Rejections',
    metaTitle: 'SPICe+ Name Rejection: Rule 8, 8A & 8B Explained',
    metaDescription: 'Why MCA rejects company names under rules 8, 8A and 8B, when to reserve a name via SPICe+ Part A or RUN first, and how to pick a name that clears first time.',
    published: '2026-08-11', updated: '2026-11-08', readMinutes: 9,
    keywords: ['company name rejection', 'rule 8 Companies Incorporation Rules', 'rule 8A undesirable name', 'rule 8B prior approval words', 'SPICe+ Part A', 'RUN name reservation'],
    excerpt: 'Most name rejections come from three rules. Learn what rules 8, 8A and 8B test for, and when it is worth reserving the name before filing Part B.',
    summary: [
      `A company name in India is tested against section 4 of the Companies Act, 2013 and rules 8, 8A and 8B of the Companies (Incorporation) Rules, 2014. Rule 8 deals with names that are identical to, or too nearly resemble, an existing company or LLP name. Rule 8A lists names that are undesirable for other reasons. Rule 8B lists words and expressions that can be used only with prior approval of the Central Government or a regulator.`,
      `You can apply for the name on its own — through SPICe+ Part A or the RUN (Reserve Unique Name) web service — or fill Part A and Part B together in one go. Reserving first costs a little time but isolates the name risk. Filing everything together is faster when the name is distinctive, but a name objection then holds up (and may force rework of) the whole incorporation package.`,
      `The best defence is a distinctive, coined first word, an activity word that matches your objects, and a trademark search before you file. Two good options proposed together, with a short note on the meaning of a coined word, clear more often than a single generic name.`
    ],
    steps: {
      heading: 'Step-by-step: choosing and reserving a name that clears',
      items: [
        { title: 'Shortlist distinctive names', text: `Start with a coined or uncommon first word. Avoid names that are only a dictionary word plus the activity, such as "Smart Software Private Limited" — these are likely to resemble existing names.` },
        { title: 'Run the MCA name check and a trademark search', text: `Use the company/LLP name search on the MCA portal and search the trade marks registry for identical or similar marks in the classes relevant to your business. A registered trademark owned by someone else is a ground for objection and for later rectification.` },
        { title: 'Match the activity word to your objects', text: `If the name carries an activity word (Foods, Infra, Fintech, Capital), the main objects in the MoA must support it. Words suggesting regulated activity may require regulator approval or registration.` },
        { title: 'Screen for rule 8B words', text: `Words such as Bank, Insurance, Stock Exchange, Mutual Fund, Board, Commission, Authority, National, Union or Central typically need prior approval or a no-objection from the relevant authority. Drop them unless you genuinely have that approval.` },
        { title: 'Decide: reserve first or file together', text: `Reserve first through Part A or RUN when the name is close to existing names, uses a sensitive word, or the client cares strongly about the exact name. File Part A with Part B together when the name is clearly distinctive and speed matters.` },
        { title: 'Explain coined words', text: `Use the comments field to explain the meaning or origin of a coined word, and whether it is the promoter's trademark. This context helps the examiner and reduces "meaning of the word" remarks.` },
        { title: 'File Part B within the reservation period', text: `Once approved, a name for a new company is reserved for 20 days. Plan documents and DSCs so Part B can be filed well within that window.` }
      ]
    },
    rules: {
      heading: 'The rules your proposed name is tested against',
      caption: 'Rule numbers refer to the Companies (Incorporation) Rules, 2014 as amended. Confirm current fees on the MCA fee schedule.',
      headers: ['Provision', 'What it tests', 'Time limit', 'Fee / consequence'],
      rows: [
        ['Section 4(2)–(3)', 'Name must not be identical/too similar to an existing name, or undesirable; certain words need approval', 'Tested at name application', 'Name not approved'],
        ['Rule 8', 'Identical or too-nearly-resembling names (plurals, spacing, punctuation, tense, phonetics, added generic words)', 'Tested at name application', 'Name not approved'],
        ['Rule 8A', 'Undesirable names (e.g. prohibited emblems and names, conflict with registered trademarks, offensive words)', 'Tested at name application', 'Name not approved'],
        ['Rule 8B', 'Words and expressions needing prior approval of the Central Government or a sector regulator', 'Approval to be attached when filing', 'Name not approved without approval'],
        ['RUN / SPICe+ Part A', 'Reserve a name before incorporation (two names per application, one resubmission)', 'Reserved 20 days for a new company if approved', 'Prescribed name-reservation fee (₹1,000 at the time of writing)'],
        ['Section 16', 'Rectification where a registered name too nearly resembles an existing name or a registered trademark', 'Trademark owner may apply within three years of incorporation', 'Company must change its name on a direction from the Regional Director']
      ]
    },
    sections: [
      {
        heading: 'What "too nearly resembles" means in practice',
        paragraphs: [
          `Rule 8 tells the examiner to ignore differences that do not make a name distinctive. Adding or removing plurals, spaces, punctuation, articles such as "the", the type of company ("Private Limited"), a different tense, or a phonetically similar spelling generally does not make a name different from one that already exists.`,
          `So "Bluefin Labs Private Limited" and "Blue Fin Lab Private Limited" are likely to be treated as the same name. A genuinely different first word, not a cosmetic variation, is what clears rule 8.`
        ],
        bullets: [
          `Different spelling, same sound (Kwik vs Quick): usually treated as resembling.`,
          `Adding a place name or "India" to an existing name: usually not enough on its own.`,
          `Using a group company's name: generally allowed with a board resolution or consent from that company, which should be attached.`
        ]
      },
      {
        heading: 'Part A first, or straight to Part B?',
        paragraphs: [
          `SPICe+ lets you fill Part A (name) and Part B (incorporation) together. That saves one round of waiting when the name is safe. If the name is objected to, however, you deal with the name and the rest of the application at the same time, and remarks on the name can delay everything else.`,
          `RUN or a standalone Part A is the cautious option when the name matters commercially — a brand that is already trading, a name already printed on packaging, or a client with investors who expect the exact name. The trade-off is a few extra working days.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Relying on the MCA search alone', text: `The name search shows existing company and LLP names, not trademarks. A clear MCA search does not protect you from a trademark owner who later applies for rectification under section 16.` },
      { title: 'Activity words without matching objects', text: `A name like "Arka Fintech Private Limited" with general trading objects invites a remark. Align the objects clause with the activity in the name.` },
      { title: 'Using regulated words casually', text: `Words such as Bank, Insurance, Finance or Capital can attract scrutiny or require approvals. Use them only when the business model and approvals support them.` },
      { title: 'Two near-identical options', text: `Proposing "Zenvo Tech" and "Zenvo Technologies" gives you one real chance, not two. Make the second option genuinely different.` },
      { title: 'Letting the reservation lapse', text: `Twenty days passes quickly when DSCs and address proofs are still being arranged. Prepare the Part B documents before reserving the name.` }
    ],
    faqs: [
      { q: 'How many names can I propose in SPICe+ Part A or RUN?', a: 'You can propose up to two names in one application, in order of preference, and you get one chance to resubmit if the examiner raises remarks. Propose two genuinely different names rather than variations of the same one.' },
      { q: 'How long is an approved company name reserved?', a: 'For a new company, an approved name is reserved for 20 days from approval. Extensions on payment of a fee have been permitted under the rules; check the current options on the MCA portal before relying on one.' },
      { q: 'Can I use a name that is my registered trademark?', a: 'Yes, and it usually helps. Attach the trademark registration certificate or an authorisation from the trademark owner. If someone else owns the mark, the name can be objected to and, even if approved, may later have to be changed under section 16.' },
      { q: 'Is filing Part A and Part B together riskier?', a: 'Only if the name is likely to draw remarks. If the name is distinctive and searched, filing together is efficient. If it is close to existing names or uses sensitive words, reserve it first so a name problem does not hold up the rest of the incorporation.' }
    ],
    related: {
      services: ['private-limited-company-registration', 'llp-registration-india'],
      tools: ['trademark-class-finder', 'incorporation-cost-calculator'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['spice-plus-part-b-resubmission-remarks-mca-v3', 'virtual-office-company-registration-mca-v3-geo-coordinates', 'indian-subsidiary-registration-foreign-director-documents-fema']
    }
  },

  /* ------------------------------------------------------------------ 3 */
  {
    slug: 'virtual-office-company-registration-mca-v3-geo-coordinates',
    pillar: 'mca-v3-incorporation',
    title: 'Registering a Pvt Ltd on a Residential or Virtual Office: NOC & Geo-Coordinates',
    metaTitle: 'Virtual or Home Office as Registered Office: NOC & Proofs',
    metaDescription: 'Can a Pvt Ltd use a home or virtual office as its registered office? Owner NOC, utility bill age, INC-22, geo-tagged photos and ROC physical checks explained.',
    published: '2026-08-18', updated: '2026-11-05', readMinutes: 8,
    keywords: ['registered office proof', 'virtual office company registration', 'residential address registered office', 'INC-22 geo coordinates', 'NOC for registered office', 'rule 25B physical verification'],
    excerpt: 'A home or a virtual office can be your registered office, but only with the right proofs and a real ability to receive notices. Here is what MCA V3 and the ROC check.',
    summary: [
      `Section 12 of the Companies Act, 2013 requires every company to have a registered office capable of receiving and acknowledging all communications and notices. The law does not require a commercial building: a director's home or a serviced or virtual office can be used, provided the company can prove its right to use the premises and the address genuinely works.`,
      `The proofs are the same in substance whether you give the address in SPICe+ at incorporation or later in INC-22: a recent utility bill for the premises, a no-objection certificate from the owner, and a rent or lease agreement where the premises are rented. MCA has also been tightening verification — the ROC has a specific power to physically verify a registered office, and the V3 forms capture more detail about the location, including geo-coordinates and photographs in the current INC-22.`,
      `Virtual offices are where most problems arise. If the provider cannot reliably receive and pass on statutory notices, or a physical verification finds no trace of the company, the consequences range from penalties to action for striking off. GST registration often scrutinises the same address separately.`
    ],
    steps: {
      heading: 'Step-by-step: setting up a home or virtual registered office',
      items: [
        { title: 'Confirm the right to use the premises', text: `For a home owned by a director or relative, get a signed NOC from the owner. For rented premises, keep a rent or leave-and-licence agreement in the company's or a director's name plus the owner's NOC. For a virtual office, ask the provider for an agreement, the owner's NOC and a utility bill.` },
        { title: 'Get a recent utility bill', text: `Electricity, telephone, gas or water bill for the exact address, generally not older than two months at the time of filing. The address on the bill should match the address you type into the form.` },
        { title: 'Check the society or building rules', text: `Some housing societies and leases restrict commercial use. A registered office used only for correspondence is usually tolerated, but check — a dispute with the owner later can force a change of registered office.` },
        { title: 'Capture the location details', text: `The current MCA V3 forms ask for the full address with PIN, and the current INC-22 also asks for latitude/longitude and photographs of the office. Take clear, geo-tagged photos showing the building and the company's name board.` },
        { title: 'File the address with SPICe+ or INC-22', text: `If the address is ready at incorporation, give it in SPICe+ Part B with the proofs. Otherwise file INC-22 within 30 days of incorporation. Any later change also needs INC-22 (and other approvals if the change is to another state or ROC jurisdiction).` },
        { title: 'Put up the name board', text: `Section 12(3) requires the company's name and registered-office address to be painted or affixed outside every office. A visible board is also your best evidence at a physical verification.` },
        { title: 'Set up a notice-handling routine', text: `Agree in writing how the virtual-office provider will receive, scan and forward post and notices — and how fast. Missing a notice from the ROC or a tax authority because of the address is your company's problem, not the provider's.` }
      ]
    },
    rules: {
      heading: 'Registered-office rules at a glance',
      caption: 'Confirm the current INC-22 fields and fees on the MCA V3 portal; form versions change.',
      headers: ['Provision / form', 'Requirement', 'Time limit', 'Fee / penalty'],
      rows: [
        ['Section 12(1)', 'Registered office capable of receiving and acknowledging communications', 'From the 30th day of incorporation onwards', 'See section 12(8)'],
        ['INC-22', 'Verification or change of registered office, with proofs', 'Within 30 days of incorporation or of the change', 'Filing fee by authorised capital; additional fee if late'],
        ['Section 12(3)', 'Name and address displayed outside every office; on letterheads and documents', 'Ongoing', 'See section 12(8)'],
        ['Section 12(8)', 'Penalty for default under section 12', 'Per day of default', '₹1,000 per day, up to ₹1 lakh, for the company and each officer in default'],
        ['Section 12(9) and rule 25B', 'ROC may physically verify the registered office', 'Any time', 'If not maintained, ROC may initiate removal of name under section 248'],
        ['Utility bill', 'Electricity, telephone, gas or water bill for the address', 'Generally not older than two months', 'Stale proof is a common resubmission remark']
      ]
    },
    sections: [
      {
        heading: 'Home office vs virtual office vs coworking: what the ROC sees',
        paragraphs: [
          `A residential address used by a founder is the simplest case: the owner's NOC and the utility bill come from people you know, and someone is at the address to receive post. Its weakness is privacy — the address becomes public on the MCA master data — and society rules.`,
          `A coworking seat with a dedicated desk usually sits in between. You have a genuine right to occupy, a name board is easy, and staff receive post. A pure virtual office, where nobody from the company ever works there, is the weakest at a physical verification and is often questioned by GST officers too. If you use one, keep the agreement current, ensure your name is displayed and test the notice-forwarding process.`
        ],
        bullets: [
          `GST registration has its own place-of-business proof and verification. An address acceptable to the ROC may still draw questions from a GST officer.`,
          `Moving the registered office within the same city needs a board resolution and INC-22; moving across ROC or state jurisdictions needs further approvals and alteration of the MoA.`,
          `Keep copies of the NOC, agreement and photos in the statutory records so you can answer a verification quickly.`
        ]
      },
      {
        heading: 'What happens at a physical verification',
        paragraphs: [
          `Section 12(9) lets the Registrar physically verify a company's registered office if there is reason to believe the company is not carrying on business or operations there. Rule 25B of the Companies (Incorporation) Rules, 2014 sets out the procedure: the verification is done in the presence of independent witnesses from the locality, and the officer records the visit with photographs of the premises.`,
          `If the registered office is found not capable of receiving and acknowledging communications, the Registrar can issue notice and, if the default is not explained, start action to remove the company's name from the register under section 248. Answering quickly with the NOC, agreement, utility bill, photos of the name board and evidence that notices are being received is usually the way out — which is why those documents belong in the statutory file, not in a founder's email.`
        ]
      }
    ],
    pitfalls: [
      { title: 'NOC signed by someone who does not own the premises', text: `The NOC should come from the owner named in the utility bill or property papers. A tenant's NOC for sub-letting without the owner's consent is weak proof.` },
      { title: 'Address typed differently from the bill', text: `Flat numbers, floor and PIN must match. Small differences produce resubmission remarks.` },
      { title: 'Virtual office with no name board', text: `If a physical verification finds no sign of the company, the ROC can start action. Insist that the provider displays your name.` },
      { title: 'Letting the virtual-office agreement lapse', text: `Many providers' agreements run for 11 months. If it lapses, the company may no longer have a valid registered office.` },
      { title: 'Missing statutory notices', text: `Show-cause notices sent to the registered office are treated as served. Agree written turnaround times for scanning and forwarding mail.` }
    ],
    faqs: [
      { q: 'Can I register my private limited company at my home address?', a: 'Yes. A residential address can be the registered office if you can provide a recent utility bill, the owner\'s NOC and, if rented, the rent agreement — and the address can actually receive notices. Check that your housing society or lease does not prohibit it.' },
      { q: 'Is a virtual office legal as a registered office?', a: 'The Companies Act does not prohibit it. The address must be capable of receiving and acknowledging communications, and you need valid proofs of the right to use it. The risk lies in physical verification and GST checks, so choose a provider that displays your name and forwards mail reliably.' },
      { q: 'How old can the utility bill be?', a: 'The MCA practice is that the utility bill should generally not be older than two months at the time of filing. If your filing is delayed or resubmitted, obtain a fresh bill.' },
      { q: 'What are the geo-coordinates asked for in INC-22?', a: 'The current INC-22 web form on MCA V3 captures the latitude and longitude of the registered office and photographs of the premises. Take the photographs on site with location enabled, showing the building and the name board. Field requirements change between form versions, so check the live form before filing.' }
    ],
    related: {
      services: ['private-limited-company-registration', 'roc-annual-compliance'],
      tools: ['incorporation-cost-calculator', 'roc-compliance-calendar'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['spice-plus-part-b-resubmission-remarks-mca-v3', 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1', 'indian-subsidiary-registration-foreign-director-documents-fema']
    }
  },

  /* ------------------------------------------------------------------ 4 */
  {
    slug: 'indian-subsidiary-registration-foreign-director-documents-fema',
    pillar: 'mca-v3-incorporation',
    title: 'Incorporating an Indian Subsidiary with Foreign Directors: Apostille & FEMA Checklist',
    metaTitle: 'Indian Subsidiary Setup: Foreign Directors & FEMA Steps',
    metaDescription: 'Set up an Indian subsidiary with foreign directors: apostilled documents, the resident-director rule in section 149(3), FDI route checks and FC-GPR on FIRMS.',
    published: '2026-08-25', updated: '2026-11-12', readMinutes: 10,
    keywords: ['Indian subsidiary registration', 'foreign director documents apostille', 'resident director section 149(3)', 'FC-GPR FIRMS portal', 'FDI automatic route', 'wholly owned subsidiary India'],
    excerpt: 'Foreign parent, foreign directors, Indian company: the documents to apostille, the resident-director rule, and the FEMA reports that follow incorporation.',
    summary: [
      `A foreign company can set up a wholly owned or majority-owned private limited company in India through SPICe+, the same route Indian promoters use. The differences are in the paperwork and the follow-on reporting: documents signed or issued abroad must be notarised and apostilled (or consularised), at least one director must be resident in India, and the share issue to the foreign parent is foreign direct investment that must be reported under FEMA.`,
      `Before you start, check the FDI policy for your sector. Most sectors are under the automatic route, but some have caps or need government approval, and investment from an entity of a country sharing a land border with India requires government approval under Press Note 3 (2020). That check decides whether incorporation can proceed in days or needs months.`,
      `After incorporation, the subscription money arrives through banking channels, shares are issued within the permitted time, and Form FC-GPR is filed on the RBI's FIRMS portal within 30 days of allotment. Annual FEMA and Companies Act compliances then follow, including the FLA return.`
    ],
    steps: {
      heading: 'Step-by-step: incorporating a foreign-owned subsidiary',
      items: [
        { title: 'Check the FDI route and sector conditions', text: `Confirm whether the sector is under the automatic or government route, any equity cap, and whether Press Note 3 applies to any investor in the ownership chain. Record the analysis; the bank and your auditors will ask for it.` },
        { title: 'Fix the shareholding and directors', text: `A private company needs at least two shareholders and two directors. A wholly owned subsidiary usually has the parent as the main shareholder and a nominee (an individual or a group entity) holding one or a few shares. At least one director must satisfy the resident-director test.` },
        { title: 'Collect and legalise foreign documents', text: `For foreign individuals: passport and a recent address proof. For the foreign parent: certificate of incorporation, constitutional documents as needed, and a board resolution authorising the investment, the subscription and an authorised signatory. Notarise and apostille them (Hague Convention countries) or have them consularised at the Indian mission (other countries).` },
        { title: 'Get DSCs and plan DIN allotment', text: `Foreign directors can obtain Class 3 DSCs from Indian certifying authorities using passport-based verification. DINs for up to three proposed directors can be allotted through SPICe+ itself.` },
        { title: 'File SPICe+ with the parent as subscriber', text: `Reserve the name, then file Part B with the e-MoA and e-AoA signed for the parent by its authorised representative, the registered-office proofs and the professional's declaration. Open the bank account through AGILE-PRO-S or directly with an AD Category-I bank.` },
        { title: 'Receive funds and allot shares', text: `The parent remits the subscription money from abroad through banking channels; the bank issues the inward remittance documents and completes KYC of the remitter. Shares must be issued within 60 days of receipt of the money, or it must be refunded, as provided in the FEMA non-debt instruments rules.` },
        { title: 'Report on FIRMS and file post-incorporation forms', text: `File FC-GPR on the FIRMS portal within 30 days of allotment, with the valuation certificate and the declarations and certificates the form asks for. Then complete INC-20A within 180 days, appoint the first auditor within 30 days, and diarise the FLA return (due 15 July each year).` }
      ]
    },
    rules: {
      heading: 'Key provisions for foreign-owned private companies',
      caption: 'FEMA references are to the FEMA (Non-debt Instruments) Rules, 2019 and the related reporting regulations. Confirm current fees and forms on the MCA and RBI portals.',
      headers: ['Provision / form', 'Requirement', 'Due date / limit', 'Fee / consequence'],
      rows: [
        ['Section 149(3), Companies Act 2013', 'At least one director who stayed in India for 182 days or more in the financial year', 'Every financial year (proportionately for a newly incorporated company)', 'Non-compliance is a default by the company and officers'],
        ['Press Note 3 (2020)', 'Government approval for investment by entities of countries sharing a land border with India', 'Before investment', 'Investment without approval is a FEMA contravention'],
        ['Issue of shares to a non-resident', 'Shares issued within 60 days of receipt of consideration', 'Refund within 15 days after the 60-day period if not issued', 'Compounding / penalties under FEMA for delay'],
        ['Pricing of shares', 'Issue price not less than fair value by an internationally accepted method', 'At allotment', 'Certified by a CA, a SEBI-registered merchant banker or a practising cost accountant'],
        ['FC-GPR (FIRMS portal)', 'Reporting of shares issued to persons resident outside India', 'Within 30 days of allotment', 'Late submission fee and possible compounding'],
        ['FLA return', 'Annual return on foreign liabilities and assets to the RBI', 'By 15 July every year', 'Non-filing is a FEMA contravention'],
        ['INC-20A', 'Declaration of commencement of business with proof of subscription money', 'Within 180 days of incorporation', 'Penalty under section 10A: ₹50,000 on the company and ₹1,000 per day (up to ₹1 lakh) on each director']
      ]
    },
    sections: [
      {
        heading: 'Apostille or consularisation: getting foreign documents accepted',
        paragraphs: [
          `India is a party to the Hague Apostille Convention. A document executed in another member country is usually first notarised there and then apostilled by that country's designated authority. For countries that are not party to the Convention, the document is notarised and then legalised (consularised) by the Indian embassy or consulate.`,
          `Plan this early: legalisation can take weeks. Make sure the name on the passport, the address proof and the DSC application match exactly, and that the parent's board resolution names the authorised signatory who will sign the MoA and AoA and handle the share subscription.`
        ],
        bullets: [
          `Address proofs for foreign individuals should be recent; a bank statement, utility bill or government-issued residence document is typical.`,
          `If a document is not in English, a certified translation is needed along with the original.`,
          `Keep the originals or certified copies on file — the bank and auditors will ask for them again.`
        ]
      },
      {
        heading: 'The resident-director rule after incorporation',
        paragraphs: [
          `Section 149(3) requires every company to have at least one director who has stayed in India for a total of at least 182 days during the financial year. For a company incorporated part-way through a year, the requirement applies proportionately. Many foreign groups appoint an India-based employee, a local business head, or an independent professional to meet it.`,
          `A resident director is not just a box to tick. They sign filings, receive notices and carry officer-in-default exposure, so choose someone who will actually be involved and give them proper indemnity and D&O cover.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Ignoring Press Note 3 in the ownership chain', text: `The test looks at beneficial ownership, not just the immediate parent. Map the full chain before incorporation.` },
      { title: 'Sending the money before the bank is ready', text: `Remittances to an account that is not yet fully set up, or without the purpose code and remitter details, create reporting delays. Coordinate with the AD bank first.` },
      { title: 'Missing the 60-day allotment window', text: `If shares are not allotted within 60 days of receipt, the money must be refunded, or the delay regularised. Diarise it from the date of credit.` },
      { title: 'No valuation certificate at allotment', text: `Even at incorporation-stage pricing, keep a fair-value certificate from a CA, merchant banker or practising cost accountant to file with FC-GPR.` },
      { title: 'Choosing a resident director in name only', text: `A director who is not engaged cannot sign on time or answer notices, and carries real liability. Pick someone involved in the business.` }
    ],
    faqs: [
      { q: 'Can all directors of an Indian subsidiary be foreign nationals?', a: 'A company may have foreign directors, but at least one director must be resident in India — having stayed in India for at least 182 days in the financial year (proportionately in the first year). The others can be foreign nationals.' },
      { q: 'Is FC-GPR needed for subscriber shares issued at incorporation?', a: 'Yes. Shares issued to a person resident outside India — including on subscription to the MoA — are reported in FC-GPR on the FIRMS portal within 30 days of allotment. Your AD bank processes the form.' },
      { q: 'Do foreign documents need apostille or consular attestation?', a: 'Documents executed abroad should be notarised and apostilled if the country is a party to the Hague Apostille Convention, or notarised and consularised by the Indian mission if it is not. Non-English documents also need a certified translation.' },
      { q: 'How long does it take to set up an Indian subsidiary?', a: 'The MCA part can be quick once documents are ready, but the overall timeline depends on legalising foreign documents, DSCs, bank KYC for the parent and whether any government approval is needed. Most of the time is in preparation, not in the SPICe+ filing.' }
    ],
    related: {
      services: ['private-limited-company-registration', 'cma-ca-cs-certification-services', 'roc-annual-compliance'],
      tools: ['incorporation-cost-calculator', 'roc-compliance-calendar'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['startup-share-valuation-report-registered-valuer-cma-fema', 'inc-20a-late-filing-penalty-after-180-days-condonation', 'spice-plus-part-a-name-rejection-rules-rule-8']
    }
  },

  /* ------------------------------------------------------------------ 5 */
  {
    slug: 'convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer',
    pillar: 'mca-v3-incorporation',
    title: 'Converting a Proprietorship to a Pvt Ltd Without Losing GST ITC via Form ITC-02',
    metaTitle: 'Proprietorship to Pvt Ltd: Transfer GST ITC with ITC-02',
    metaDescription: 'Move a sole proprietorship into a new private limited company, take over its GST credit through Form ITC-02, and meet the tax-neutral succession conditions.',
    published: '2026-09-01', updated: '2026-11-14', readMinutes: 10,
    keywords: ['proprietorship to private limited conversion', 'Form ITC-02', 'transfer of ITC on business transfer', 'section 47(xiv)', 'business transfer agreement', 'GST transfer of going concern'],
    excerpt: 'A proprietorship cannot simply "become" a company. Here is how to transfer the business as a going concern, carry the GST credit across with ITC-02 and keep the move tax-neutral.',
    summary: [
      `There is no form that converts a sole proprietorship into a company. Instead, you incorporate a new private limited company and transfer the proprietorship's business to it as a going concern under a business transfer agreement (BTA), usually in exchange for shares. The company is a new legal person with its own PAN, so it needs its own GST registration — GST registration follows the PAN.`,
      `The unutilised input tax credit in the proprietor's electronic credit ledger is not lost. Section 18(3) of the CGST Act allows it to be transferred to the transferee when a business is transferred with a specific provision for the transfer of liabilities, and rule 41 of the CGST Rules prescribes Form GST ITC-02 for this, backed by a certificate from a practising chartered accountant or cost accountant.`,
      `On the income-tax side, the transfer can be made tax-neutral if the conditions historically in section 47(xiv) of the Income-tax Act, 1961 are met: all business assets and liabilities pass to the company, the proprietor holds at least 50% of the voting power for five years, and receives no consideration other than shares. The Income-tax Act, 2025 has applied from 1 April 2026 with renumbered provisions, so confirm the current section reference and conditions with your tax adviser before signing the BTA.`
    ],
    steps: {
      heading: 'Step-by-step: proprietorship to private limited, with ITC intact',
      items: [
        { title: 'Plan the cut-over date', text: `Choose a transfer date — often the start of a month or quarter — so that stock, debtors, creditors and the credit ledger can be closed cleanly. Bring GST returns of the proprietorship up to date before that date.` },
        { title: 'Incorporate the company', text: `Incorporate a private limited company through SPICe+, with the proprietor as a director and the main shareholder. Include objects that cover the existing business. Apply for the company's GSTIN through AGILE-PRO-S or separately.` },
        { title: 'Sign a business transfer agreement', text: `Transfer the business as a going concern — assets, liabilities, contracts, employees and licences — with a specific clause that the company takes over the liabilities. Record the consideration as an allotment of shares. Pay stamp duty as applicable in your state.` },
        { title: 'Allot shares to the proprietor', text: `The board allots shares to the proprietor as consideration for the business, and the company files the return of allotment (PAS-3). Keep the shareholding at or above the level needed for tax neutrality.` },
        { title: 'Get the professional certificate and file ITC-02', text: `A practising CA or cost accountant certifies that the transfer was made with a specific provision for the transfer of liabilities. The proprietor (transferor) files ITC-02 on the GST portal from the old GSTIN, naming the company's GSTIN and the amounts of CGST, SGST/UTGST and IGST to be transferred.` },
        { title: 'Company accepts the credit', text: `The company logs in and accepts the ITC-02 on the portal; the credit then appears in its electronic credit ledger. Account for the matching inputs, stock and capital goods in the company's books.` },
        { title: 'Cancel the old registration and update licences', text: `After the transfer, file for cancellation of the proprietorship's GSTIN (REG-16, reason: transfer of business), and move bank accounts, Udyam, IEC, shop licence and customer and vendor master data to the company.` }
      ]
    },
    rules: {
      heading: 'GST and income-tax provisions for the transfer',
      caption: 'Income-tax references are to the 1961 Act; equivalent provisions continue under the Income-tax Act, 2025 with new numbering — confirm before relying on them.',
      headers: ['Provision / form', 'What it does', 'Timing', 'Fee / consequence'],
      rows: [
        ['Section 18(3), CGST Act', 'Allows unutilised ITC to be transferred on sale, merger or transfer of business with transfer of liabilities', 'At the time of transfer', 'No fee'],
        ['Rule 41 and Form GST ITC-02', 'Transferor files the transfer request with a CA/CMA certificate; transferee accepts on the portal', 'Before the transferor\'s registration is cancelled', 'No fee; credit not transferred if conditions are unmet'],
        ['Section 22(3), CGST Act', 'Transferee of a going concern must register from the date of transfer', 'From the transfer date', 'Supplies without registration attract tax, interest and penalty'],
        ['Section 85, CGST Act', 'Transferor and transferee jointly and severally liable for tax dues up to the transfer', 'Ongoing', 'Recovery from either party'],
        ['Transfer of a going concern', 'Notified as a service with nil GST rate', 'On transfer', 'Nil rate only if the whole business or an independent part is transferred'],
        ['Section 47(xiv) and 47A(3) (1961 Act)', 'Tax-neutral succession if conditions are met; benefit withdrawn if breached', 'Conditions apply for five years', 'Capital gains taxed in the year of breach'],
        ['REG-16', 'Application for cancellation of the proprietor\'s GST registration', 'After the transfer is complete', 'Final return (GSTR-10) due after cancellation']
      ]
    },
    sections: [
      {
        heading: 'The tax-neutral succession conditions',
        paragraphs: [
          `Under section 47(xiv) of the 1961 Act, the transfer of a capital asset by a sole proprietary concern to a company on succession is not treated as a transfer for capital gains, if three conditions are met. If any of them is later breached, section 47A(3) withdraws the exemption and the gain is taxed in the company's hands in the year of the breach.`,
          `Because the Income-tax Act, 2025 applies from 1 April 2026, check how these conditions are carried into the new Act before the BTA is finalised, and have the valuation and consideration structured accordingly.`
        ],
        bullets: [
          `All assets and liabilities of the proprietorship relating to the business immediately before the succession become assets and liabilities of the company.`,
          `The proprietor's shareholding in the company is not less than 50% of the total voting power and continues to remain so for five years from the date of succession.`,
          `The proprietor receives no consideration or benefit, directly or indirectly, other than by way of allotment of shares in the company.`
        ]
      },
      {
        heading: 'Practical points on the credit ledger',
        paragraphs: [
          `Only the balance in the electronic credit ledger on the date of transfer is moved, and only when the transfer includes a specific provision for liabilities. Make sure the inputs, semi-finished goods and capital goods to which the credit relates actually move to the company and are recorded in its books — the transferee must account for them.`,
          `File ITC-02 before applying to cancel the proprietorship's registration. Once the old GSTIN is cancelled, the ledger is frozen and the transfer can no longer be made from the portal.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Cancelling the old GSTIN first', text: `If the proprietorship's registration is cancelled before ITC-02 is filed and accepted, the credit can be stranded. Sequence: company GSTIN, BTA, ITC-02, acceptance, then cancellation.` },
      { title: 'BTA without a liabilities clause', text: `Section 18(3) and rule 41 require a specific provision for the transfer of liabilities. A BTA that transfers only assets does not support the credit transfer.` },
      { title: 'Paying the proprietor in cash', text: `Any consideration other than shares — including a cash balance paid out — can break the tax-neutral conditions.` },
      { title: 'Diluting below 50% too early', text: `Bringing in investors in the first five years can push the proprietor below 50% of voting power and withdraw the exemption. Model fundraising before you convert.` },
      { title: 'Forgetting licences and contracts', text: `Customer contracts, tenders, Udyam, IEC and FSSAI or trade licences are in the proprietor's name. Novate or re-apply, or invoices from the new GSTIN may be rejected.` }
    ],
    faqs: [
      { q: 'Can I use the proprietorship\'s GSTIN for the new company?', a: 'No. GST registration is PAN-based and the company has its own PAN, so it must obtain its own GSTIN. The credit balance can be moved to the new GSTIN through Form ITC-02.' },
      { q: 'Who certifies Form ITC-02?', a: 'Rule 41 of the CGST Rules requires a certificate from a practising chartered accountant or cost accountant certifying that the business was transferred with a specific provision for the transfer of liabilities.' },
      { q: 'Is GST payable on transferring the business to the company?', a: 'The transfer of a business as a going concern — the whole business or an independent part of it — is notified as a service with a nil GST rate. Transferring only selected assets is not a going-concern transfer and can attract GST on those assets.' },
      { q: 'Is the conversion free of capital gains tax?', a: 'It can be, if the succession conditions (all assets and liabilities transferred, at least 50% voting power held for five years, consideration only in shares) are met. With the Income-tax Act, 2025 in force from 1 April 2026, confirm the current provision and conditions with a tax adviser first.' }
    ],
    related: {
      services: ['private-limited-company-registration', 'msme-udyam-dpiit-startup-registration', 'cma-ca-cs-certification-services'],
      tools: ['incorporation-cost-calculator'],
      compare: ['pvt-ltd-vs-llp-vs-opc'],
      blogs: ['cas-4-certificate-captive-consumption-gst-valuation', 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1', 'spice-plus-part-b-resubmission-remarks-mca-v3']
    }
  },

  /* ------------------------------------------------------------------ 6 */
  {
    slug: 'practicing-cma-certification-mca-roc-forms-spice-plus',
    pillar: 'cma-certifications',
    title: 'Practicing CMA Certification for SPICe+, INC-20A & ROC Forms',
    metaTitle: 'Can a Practising CMA Certify SPICe+, INC-20A & ROC Forms?',
    metaDescription: 'Which MCA forms a practising Cost Accountant can certify alongside CAs and CSs, which are reserved for CSs, and how UDIN, DSC and verification work on MCA V3.',
    published: '2026-09-08', updated: '2026-11-09', readMinutes: 9,
    keywords: ['practising CMA certification', 'cost accountant certify MCA forms', 'SPICe+ professional certification', 'INC-20A certification', 'UDIN ICMAI', 'MCA V3 DSC professional'],
    excerpt: 'A practising Cost Accountant can certify most MCA e-forms, including SPICe+ and INC-20A. Here is where CMAs stand alongside CAs and CSs, and what a proper certificate involves.',
    summary: [
      `Many MCA e-forms must be certified by a professional in whole-time practice before they are filed. Under the Companies (Registration Offices and Fees) Rules, 2014, that professional can generally be a chartered accountant, a company secretary or a cost accountant in practice. For incorporation, section 7(1)(b) of the Companies Act, 2013 specifically lists an advocate, a chartered accountant, a cost accountant or a company secretary in practice as the professional who can make the declaration of compliance.`,
      `So a practising CMA can certify SPICe+, INC-20A, DIR-3 KYC, INC-22, DIR-12, PAS-3, CHG-1, AOC-4 and most event-based forms. A small number of documents are reserved by the Act for company secretaries in practice — the MGT-8 certification of the annual return for prescribed companies, the signature on MGT-7 for those companies, and the secretarial audit report (MR-3). Cost audit, by contrast, is reserved for cost accountants.`,
      `A good certificate is more than a DSC on a form. It rests on a check of original documents, a working file, a UDIN generated on the institute's portal and a professional who is registered as such on MCA V3. That is what protects both the company and the certifying member if the filing is questioned later.`
    ],
    steps: {
      heading: 'Step-by-step: how a practising CMA certifies an MCA form',
      items: [
        { title: 'Confirm the form allows CMA certification', text: `Check the certification block in the e-form. Most forms offer chartered accountant, company secretary or cost accountant in whole-time practice; a few documents are reserved for one profession by the Act.` },
        { title: 'Verify originals and the board record', text: `Inspect the source documents — identity and address proofs for SPICe+, the bank statement showing subscription money for INC-20A, the board resolution and consent for DIR-12 — and match them to the form fields.` },
        { title: 'Keep a working file', text: `Record what was checked, by whom and when. Keep copies of the documents relied on. This is your evidence if the ROC, the institute or a court asks how the certification was made.` },
        { title: 'Generate the UDIN', text: `Generate a Unique Document Identification Number on the ICMAI UDIN portal for the certificate, as the Institute requires for certificates issued by its members, and quote it where the form or the certificate allows.` },
        { title: 'Sign with your DSC on MCA V3', text: `The certifying member uses a valid Class 3 DSC associated with a professional user ID on MCA V3, with membership number and certificate-of-practice details that MCA can validate.` },
        { title: 'File and retain the acknowledgement', text: `Once the company files, keep the SRN and challan in the working file. If remarks are raised, re-verify any changed facts before re-certifying.` }
      ]
    },
    rules: {
      heading: 'Who can certify what: a quick reference',
      caption: 'General position under the Companies Act, 2013 and rules; always check the certification block in the current version of each e-form.',
      headers: ['Form / document', 'Purpose', 'Certified by', 'Timing / consequence'],
      rows: [
        ['SPICe+ (INC-32) declaration', 'Compliance with incorporation requirements, section 7(1)(b)', 'Advocate, CA, CMA or CS in practice engaged in formation', 'At incorporation; false declaration attracts section 448'],
        ['INC-20A', 'Declaration that subscribers have paid for their shares', 'CA, CS or CMA in practice', 'Within 180 days of incorporation; section 10A penalty if missed'],
        ['DIR-3 KYC (e-form)', 'Annual KYC of directors', 'CA, CS or CMA in practice', 'By 30 September; ₹5,000 fee for late filing and deactivated DIN'],
        ['AOC-4 and most event forms (DIR-12, PAS-3, INC-22, CHG-1, SH-7)', 'Financial statements and changes', 'CA, CS or CMA in practice', 'AOC-4 within 30 days of the AGM; ₹100 per day additional fee'],
        ['MGT-7 / MGT-8 for prescribed companies', 'Annual return certification', 'CS in practice only', 'Within 60 days of the AGM; ₹100 per day additional fee'],
        ['Cost audit report (CRA-3), filed in CRA-4', 'Cost audit under section 148', 'Cost accountant in practice only', 'CRA-4 within 30 days of receiving the report'],
        ['Section 448 / 447', 'False statements in any return, report or certificate', 'Applies to anyone making it', 'Punishable as fraud']
      ]
    },
    sections: [
      {
        heading: 'Why companies use a CMA desk for certification',
        paragraphs: [
          `For founders the question is usually practical: who can sign today, verify properly, and stand behind the certificate? Practising cost accountants are part of the same certification framework as CAs and CSs for most MCA forms, and they also hold the exclusive role in cost audit and a recognised role in GST certificates (such as ITC-02) and FEMA valuations.`,
          `Using one desk for SPICe+, INC-20A, CAS-4 or CMA data reports, and the valuation for an FC-GPR means the same professional understands the company's capital, address and business — fewer inconsistencies between filings.`
        ],
        bullets: [
          `A certificate should be issued only after the professional has seen the evidence — not on the basis of a scanned form alone.`,
          `If the company has an in-house CS, a practising CMA can still certify forms the rules allow, but MGT-8 and secretarial audit stay with a CS in practice.`,
          `Professional fees for certification are separate from MCA government fees, which are paid at actuals.`
        ]
      },
      {
        heading: 'What the certifying professional checks on the common forms',
        paragraphs: [
          `The checks differ by form, but the principle is the same: every material fact in the form should be traceable to a document the professional has seen. For SPICe+, that means identity and address proofs of every subscriber and director, the registered-office proofs and owner NOC, the consents and declarations, and the MoA and AoA as signed.`,
          `For INC-20A, the focus is on money: a bank statement of the company showing that each subscriber has paid the value of the shares agreed in the MoA, and — where applicable — the approval of any sectoral regulator. For DIR-3 KYC, the professional checks the director's identity, address, mobile number and email against original records, because the OTPs and DIN status depend on them.`,
          `For event-based forms such as DIR-12 (change in directors), PAS-3 (allotment) and SH-7 (change in capital), the checks centre on the board and shareholder resolutions, the notice and quorum, the consents, and whether the event was filed within 30 days. A late form is still certified — but the additional fee, and any penalty exposure, should be pointed out to the company in writing.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Certifying without seeing originals', text: `A DSC on a form is a professional statement. Always verify the source documents and keep a record.` },
      { title: 'No UDIN on the certificate', text: `Certificates without the institute's UDIN may be rejected by banks and authorities and can lead to disciplinary questions.` },
      { title: 'Expired DSC or unmapped professional ID', text: `An expired DSC or a professional account without validated membership details blocks the upload on MCA V3.` },
      { title: 'Using a CMA where the Act reserves the role', text: `MGT-8 and secretarial audit belong to CSs in practice; cost audit belongs to CMAs. Check before engaging.` },
      { title: 'Certifying an old INC-20A bank statement', text: `INC-20A rests on proof that subscribers actually paid. A statement that does not show the subscription credits is not enough.` }
    ],
    faqs: [
      { q: 'Can a practising cost accountant certify SPICe+?', a: 'Yes. Section 7(1)(b) of the Companies Act, 2013 allows the declaration to be made by an advocate, a chartered accountant, a cost accountant or a company secretary in practice who is engaged in the formation, and the e-form certification can be done by a practising CA, CS or CMA.' },
      { q: 'Which forms can a CMA not certify?', a: 'Documents reserved by the Act for company secretaries in practice — such as the MGT-8 certificate on the annual return of prescribed companies and the secretarial audit report — cannot be certified by a CMA. Always check the certification block on the current form.' },
      { q: 'Is UDIN mandatory for CMA certificates?', a: 'The Institute of Cost Accountants of India requires its members to generate a UDIN for certificates they issue. Many banks and authorities also check UDIN before accepting a certificate.' },
      { q: 'How quickly can a certificate be issued?', a: 'If the documents are complete, many certifications can be done on the same day. Delays usually come from missing originals, mismatched details or an expired DSC — so send everything together.' }
    ],
    related: {
      services: ['cma-ca-cs-certification-services', 'private-limited-company-registration', 'roc-annual-compliance'],
      tools: ['roc-compliance-calendar'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['inc-20a-late-filing-penalty-after-180-days-condonation', 'spice-plus-part-b-resubmission-remarks-mca-v3', 'dir-3-kyc-deactivated-din-reactivation-fee-process', 'cost-audit-applicability-turnover-limit-cra-1-cra-4']
    }
  },

  /* ------------------------------------------------------------------ 7 */
  {
    slug: 'cost-audit-applicability-turnover-limit-cra-1-cra-4',
    pillar: 'cma-certifications',
    title: 'Cost Records (CRA-1) vs Cost Audit (CRA-2/CRA-3/CRA-4): Turnover Thresholds',
    metaTitle: 'Cost Audit Applicability: CRA-1 to CRA-4 Turnover Limits',
    metaDescription: 'When a company must keep cost records in CRA-1 and when cost audit applies: turnover thresholds in the 2014 rules, exemptions, and CRA-2 and CRA-4 due dates.',
    published: '2026-09-15', updated: '2026-11-11', readMinutes: 10,
    keywords: ['cost audit applicability', 'cost records CRA-1', 'CRA-2 due date', 'CRA-4 filing', 'Companies (Cost Records and Audit) Rules 2014', 'section 148 cost audit'],
    excerpt: 'Cost records and cost audit are separate tests with separate thresholds. Here is how to check both, and the CRA forms and dates that follow.',
    summary: [
      `Section 148 of the Companies Act, 2013 lets the Central Government require specified companies to keep cost records and, above higher thresholds, to have those records audited. The detail is in the Companies (Cost Records and Audit) Rules, 2014, which list the covered industries in two tables: Table A for regulated sectors and Table B for non-regulated sectors, each mapped to customs tariff or service codes.`,
      `The first test is cost records. A company producing goods or providing services listed in the rules must maintain cost records in Form CRA-1 if its overall turnover from all products and services in the immediately preceding financial year was ₹35 crore or more. The second test is cost audit: for Table A companies, overall turnover of ₹50 crore or more and turnover of ₹25 crore or more from the individual covered product or service; for Table B, ₹100 crore and ₹35 crore respectively.`,
      `If cost audit applies, the board appoints a cost accountant in practice within 180 days of the start of the financial year, intimates the appointment in CRA-2, the auditor reports in CRA-3, and the company files the report in CRA-4 within 30 days of receiving it. The thresholds and exemptions have been amended before, so check the current text of the rules against your latest audited numbers each year.`
    ],
    steps: {
      heading: 'Step-by-step: checking applicability and staying compliant',
      items: [
        { title: 'Map your products and services to the tables', text: `Identify the customs tariff headings (for goods) or service descriptions that apply to your revenue lines and check whether they appear in Table A or Table B of rule 3. If none of your activities is covered, the rules do not apply.` },
        { title: 'Test the cost-records threshold', text: `Take overall turnover from all products and services for the immediately preceding financial year. At ₹35 crore or more, with a covered activity, cost records in CRA-1 are required for the current year.` },
        { title: 'Check the exemptions', text: `Micro and small enterprises classified under the MSMED Act are excluded from the cost-records requirement. For cost audit, the rules also exclude companies whose foreign-exchange export revenue exceeds 75% of total revenue and companies operating from a special economic zone, among others. Read the current exemption text.` },
        { title: 'Test the cost-audit threshold', text: `For Table A: overall turnover ₹50 crore or more and the individual covered product or service ₹25 crore or more. For Table B: ₹100 crore or more overall and ₹35 crore or more for the individual product or service.` },
        { title: 'Appoint the cost auditor and file CRA-2', text: `The board appoints a cost accountant in practice (not the statutory auditor) within 180 days of the start of the financial year, with remuneration later ratified by shareholders. File CRA-2 within 30 days of the board meeting or within 180 days of the start of the year, whichever is earlier.` },
        { title: 'Receive CRA-3 and file CRA-4', text: `The cost auditor submits the report in CRA-3 to the board within 180 days of the end of the financial year. The company files it with the Central Government in CRA-4 within 30 days of receipt, with the board's explanations on any qualifications.` }
      ]
    },
    rules: {
      heading: 'Cost records and cost audit: thresholds and forms',
      caption: 'Thresholds as stated in rules 3 and 4 of the Companies (Cost Records and Audit) Rules, 2014 as amended. Confirm current text and MCA fees before acting.',
      headers: ['Form / test', 'Purpose', 'Threshold / due date', 'Fee / consequence'],
      rows: [
        ['Rule 3 — cost records', 'Maintain cost records for covered products/services', 'Overall turnover ₹35 crore or more in the preceding year', 'Default punishable under section 148(8)'],
        ['CRA-1', 'Format of cost records (maintained, not filed)', 'Maintained for each financial year and preserved for eight years', 'Not filed with MCA'],
        ['Rule 4 — cost audit, Table A', 'Regulated sectors', 'Overall ≥ ₹50 crore and individual product/service ≥ ₹25 crore', 'Cost audit mandatory'],
        ['Rule 4 — cost audit, Table B', 'Non-regulated sectors', 'Overall ≥ ₹100 crore and individual product/service ≥ ₹35 crore', 'Cost audit mandatory'],
        ['CRA-2', 'Intimation of appointment of the cost auditor', 'Within 30 days of the board meeting or 180 days of the start of the year, whichever is earlier', 'Normal fee; additional fee if late'],
        ['CRA-3', 'Cost audit report by the cost auditor to the board', 'Within 180 days of the end of the financial year', 'Prepared by a cost accountant in practice'],
        ['CRA-4', 'Filing of the cost audit report with the Central Government (XBRL)', 'Within 30 days of receiving the report', 'Normal fee; additional fee if late']
      ]
    },
    sections: [
      {
        heading: 'Cost records are not the same as cost audit',
        paragraphs: [
          `Many companies discover the cost-records requirement late because they assume it only matters once cost audit applies. In fact a company can cross the ₹35 crore cost-records threshold years before it needs a cost audit, and the records must still be kept in the CRA-1 format — material, employee cost, overheads, by product or service, reconciled with the financial accounts.`,
          `Keeping cost records properly also prepares you for the audit: when turnover crosses the audit thresholds, a year of clean records makes the first cost audit much easier.`
        ],
        bullets: [
          `"Turnover" for these tests is the overall turnover from all products and services in the immediately preceding financial year, not only the covered product.`,
          `Turnover crossing a threshold in one year makes the requirement apply to the following year.`,
          `The cost auditor must be independent of the statutory audit — the statutory auditor cannot also be the cost auditor.`
        ]
      },
      {
        heading: 'What a cost auditor will ask for',
        paragraphs: [
          `Expect requests for production and sales quantities, consumption records, a product-wise cost sheet, a reconciliation of cost and financial profit, details of related-party transactions and any captive consumption. If you also need CAS-4 certificates for GST valuation, the same cost data supports them.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Testing on the wrong year\'s turnover', text: `Applicability is based on the immediately preceding financial year. Use audited figures and re-test every year.` },
      { title: 'Missing the 180-day appointment window', text: `If the cost auditor is not appointed within 180 days of the start of the year, both the appointment and CRA-2 become late.` },
      { title: 'Assuming exemptions without reading them', text: `MSE and export-oriented exemptions have conditions. Document why you rely on one.` },
      { title: 'Appointing the statutory auditor', text: `The statutory auditor cannot act as cost auditor. Appoint a separate cost accountant in practice.` },
      { title: 'Not ratifying remuneration', text: `Cost-auditor remuneration fixed by the board must be ratified by shareholders. Put it on the AGM or EGM agenda.` }
    ],
    faqs: [
      { q: 'What is the turnover limit for maintaining cost records?', a: 'A company engaged in a product or service listed in the rules must maintain cost records if its overall turnover from all products and services in the immediately preceding financial year was ₹35 crore or more, unless an exemption applies.' },
      { q: 'When does cost audit become mandatory?', a: 'For regulated sectors (Table A), when overall turnover is ₹50 crore or more and the individual covered product or service is ₹25 crore or more. For non-regulated sectors (Table B), the limits are ₹100 crore and ₹35 crore respectively, based on the preceding year.' },
      { q: 'Is Form CRA-1 filed with MCA?', a: 'No. CRA-1 is the format in which cost records are maintained. CRA-2 (appointment of cost auditor) and CRA-4 (cost audit report) are the forms filed with MCA.' },
      { q: 'Who can be appointed as cost auditor?', a: 'A cost accountant in practice or a firm of cost accountants. The company\'s statutory auditor cannot be appointed as its cost auditor.' }
    ],
    related: {
      services: ['cma-ca-cs-certification-services', 'roc-annual-compliance'],
      tools: ['roc-compliance-calendar'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['cas-4-certificate-captive-consumption-gst-valuation', 'practicing-cma-certification-mca-roc-forms-spice-plus', 'virtual-compliance-officer-vs-in-house-cs-cost-india']
    }
  },

  /* ------------------------------------------------------------------ 8 */
  {
    slug: 'cma-data-project-report-format-msme-bank-loan-cgtmse',
    pillar: 'cma-certifications',
    title: 'How to Get a Certified CMA Project Report for MSME Bank & CGTMSE Loans',
    metaTitle: 'CMA Data & Project Report for MSME Bank and CGTMSE Loans',
    metaDescription: 'What bank CMA data contains (Forms I to VI), how lenders read projections, DSCR and current ratio, and how to prepare a certified project report for CGTMSE.',
    published: '2026-09-22', updated: '2026-11-13', readMinutes: 10,
    keywords: ['CMA data for bank loan', 'CMA report format', 'project report for MSME loan', 'CGTMSE loan', 'DSCR calculation', 'MPBF working capital'],
    excerpt: 'Bank "CMA data" is a six-form credit monitoring statement, not a cost audit. Here is what goes into it, how lenders test it, and how to make it hold up.',
    summary: [
      `When a bank asks an MSME for "CMA data", it means the Credit Monitoring Arrangement statements — a standard set of historical and projected financials that lenders use to assess working-capital and term-loan proposals. The format is usually six forms: existing and proposed limits, an operating statement, an analysis of the balance sheet, a comparative statement of current assets and current liabilities, the computation of maximum permissible bank finance, and a fund-flow statement.`,
      `A project report wraps this data in a narrative: the business, promoters, project cost and means of finance, capacity and assumptions, and the key ratios — debt service coverage ratio (DSCR), current ratio, debt-equity and interest coverage. Lenders compare your projections with your history and with the industry; aggressive, unexplained jumps are the most common reason a proposal stalls.`,
      `For collateral-free loans to micro and small enterprises, banks can seek a guarantee from the Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE). The guarantee ceiling and fee have been revised several times — the ceiling went up to ₹5 crore in 2023 and a further increase to ₹10 crore was announced in the Union Budget 2025-26 — so confirm the current limit, coverage and fee with your lender.`
    ],
    steps: {
      heading: 'Step-by-step: preparing CMA data and a project report',
      items: [
        { title: 'Collect three years of history', text: `Audited financial statements for the last two or three years, the current year's provisional figures, GST returns, bank statements and the stock and debtor statements submitted to existing lenders. Projections are only credible if they start from reconciled actuals.` },
        { title: 'Set out the project and the funding ask', text: `Describe the expansion or new project, the cost (land, building, plant, pre-operative expenses, margin for working capital) and the means of finance — promoter contribution, term loan, working-capital limit, any subsidy.` },
        { title: 'Build assumptions you can defend', text: `Capacity utilisation, selling prices, raw-material costs, credit periods for debtors and creditors, and inventory holding. Tie each to evidence: orders, quotations, past performance or industry data.` },
        { title: 'Prepare Forms I to VI', text: `Populate the six CMA forms for the past years, the current estimate and the projected years (often the loan tenure). Make sure the balance sheet balances every year and that the cash flow ties to it.` },
        { title: 'Compute and stress-test the ratios', text: `Calculate DSCR (average and year-wise), current ratio, TOL/TNW, debt-equity and interest coverage. Run a downside case — lower sales or margins — to show the loan is still serviceable.` },
        { title: 'Get it reviewed and certified', text: `Have a practising professional review the report for consistency and certify it in the bank's format with a UDIN. Many lenders accept reports certified by a practising CA or cost accountant; check the bank's requirement.` },
        { title: 'Prepare the CGTMSE and Udyam papers', text: `Keep your Udyam registration current, as eligibility for MSE schemes depends on it. Ask the bank whether the proposal will be covered under CGTMSE and what the annual guarantee fee will be.` }
      ]
    },
    rules: {
      heading: 'The six CMA forms and what lenders look for',
      caption: 'Format names follow common bank practice; individual lenders use their own templates. Ratio benchmarks vary by bank, sector and loan type.',
      headers: ['Form / item', 'Contents', 'Period covered', 'What the lender tests'],
      rows: [
        ['Form I', 'Particulars of existing and proposed bank limits', 'Current', 'Total exposure, other lenders'],
        ['Form II', 'Operating statement: sales, cost of production, profit', 'Past 2–3 years, current, projected', 'Growth, margins, consistency with GST returns'],
        ['Form III', 'Analysis of balance sheet: liabilities and assets', 'Past, current, projected', 'Net worth, leverage (TOL/TNW, debt-equity)'],
        ['Form IV', 'Current assets and current liabilities, with holding periods', 'Past, current, projected', 'Inventory and debtor days, creditor days'],
        ['Form V', 'Maximum permissible bank finance (MPBF)', 'Current and projected', 'Working-capital gap, margin, assessed limit'],
        ['Form VI', 'Fund-flow statement', 'Past, current, projected', 'Long-term sources vs long-term uses'],
        ['Key ratios', 'DSCR, current ratio, interest coverage', 'Projected loan tenure', 'Serviceability with a cushion — benchmarks are set by each bank']
      ]
    },
    sections: [
      {
        heading: 'How banks size working-capital limits',
        paragraphs: [
          `Two methods are common. For smaller limits, many banks use the turnover method associated with the Nayak Committee: working-capital requirement taken as 25% of projected annual turnover, of which the bank finances 20% and the borrower brings 5% as margin. For larger limits, banks assess the working-capital gap and apply a margin — the "second method of lending" from the Tandon Committee requires the borrower to fund 25% of total current assets from long-term sources.`,
          `Your Form IV and Form V must support the limit you ask for. If your projected debtor days are far shorter than your history, explain why — a new customer contract, factoring or a change in terms.`
        ]
      },
      {
        heading: 'DSCR and the other ratios',
        paragraphs: [
          `DSCR measures whether cash from operations covers the loan instalments and interest. A common form is (profit after tax + depreciation + interest on term loan) ÷ (term-loan instalment + interest on term loan) for each year. Lenders look at both the average and the weakest year.`,
          `There is no single statutory benchmark; each bank sets its own. Treat any DSCR close to 1 as a red flag and show how a cushion is maintained in a downside case.`
        ],
        bullets: [
          `Current ratio: current assets ÷ current liabilities, including bank borrowings for working capital.`,
          `TOL/TNW: total outside liabilities ÷ tangible net worth — a leverage check.`,
          `Interest coverage: EBITDA ÷ interest — how comfortably profits cover interest.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Projections that do not match history', text: `Doubling sales in year one without orders or capacity evidence is the fastest way to lose a credit officer's confidence.` },
      { title: 'Balance sheet that does not balance', text: `A mismatch in any projected year signals a broken model. Reconcile every year before submitting.` },
      { title: 'Ignoring GST return figures', text: `Lenders compare reported sales with GST returns and bank credits. Explain any differences.` },
      { title: 'Uncertified or unsigned reports', text: `A report without the professional's signature, membership number and UDIN may be returned. Ask the bank what certification it needs.` },
      { title: 'Assuming CGTMSE cover is automatic', text: `Coverage is decided by the lender within the scheme rules and carries an annual fee. Ask early.` }
    ],
    faqs: [
      { q: 'Is a bank "CMA report" the same as a Cost and Management Accountant report?', a: 'No. In lending, CMA stands for Credit Monitoring Arrangement — a standard set of financial statements. It can be prepared or certified by a practising chartered accountant or cost accountant, depending on what your bank accepts.' },
      { q: 'How many years of projections are needed?', a: 'Banks usually want projections for the current year and future years — often covering the full tenure of a term loan, and at least one to two years for a working-capital limit. Ask your bank for its template.' },
      { q: 'What is the CGTMSE limit for collateral-free loans?', a: 'The CGTMSE guarantee ceiling has been raised over time — to ₹5 crore in 2023, with a further increase to ₹10 crore announced in the Union Budget 2025-26. Coverage percentages and the annual guarantee fee depend on the loan size and borrower category, so confirm the current terms with your lender.' },
      { q: 'What DSCR do banks expect?', a: 'There is no fixed statutory number; each lender sets its own benchmark by sector and loan type. A DSCR that stays comfortably above 1 in every projected year, including a downside case, is what makes a proposal credible.' }
    ],
    related: {
      services: ['cma-ca-cs-certification-services', 'msme-udyam-dpiit-startup-registration'],
      tools: ['incorporation-cost-calculator'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['cost-audit-applicability-turnover-limit-cra-1-cra-4', 'startup-share-valuation-report-registered-valuer-cma-fema', '80-iac-tax-exemption-rejection-reasons-startup-india-dpiit']
    }
  },

  /* ------------------------------------------------------------------ 9 */
  {
    slug: 'cas-4-certificate-captive-consumption-gst-valuation',
    pillar: 'cma-certifications',
    title: 'CAS-4 Certification Explained: Captive Consumption & Job-Work Valuation Under GST',
    metaTitle: 'CAS-4 Certificate: Captive Consumption & GST Valuation',
    metaDescription: 'How CAS-4 cost of production supports GST valuation between distinct or related persons under rules 28 and 30, what a cost accountant certifies, and job work.',
    published: '2026-09-29', updated: '2026-11-07', readMinutes: 9,
    keywords: ['CAS-4 certificate', 'cost of production captive consumption', 'GST valuation rule 30', 'rule 28 related person valuation', '110% cost of production', 'job work GST ITC-04'],
    excerpt: 'Supplying goods to your own branch in another state, or to a related company, can require a cost-based value under GST. CAS-4 is how that cost is measured and certified.',
    summary: [
      `Under GST, a supply between distinct persons (for example two GST registrations of the same company in different states) or between related persons is valued under rule 28 of the CGST Rules: at open market value, or the value of goods of like kind and quality, and failing those, under rule 30 or rule 31. Rule 30 values the supply at 110% of the cost of production or manufacture, or the cost of acquisition, of the goods.`,
      `CAS-4 — the Cost Accounting Standard on cost of production for captive consumption issued by the Institute of Cost Accountants of India — is the established method for working out that cost. It sets out which costs go in (materials, direct employee cost, direct expenses, works overheads, a share of quality control, R&D and production-related administration) and which stay out (selling and distribution, interest, profit). A practising cost accountant certifies the computation, which you keep as support for the value declared.`,
      `Rule 28 also has a valuable relief: where the recipient is eligible for full input tax credit, the value declared in the invoice is deemed to be the open market value. In many inter-unit transfers this makes the exercise simpler — but not where the recipient's credit is restricted, such as units with exempt supplies.`
    ],
    steps: {
      heading: 'Step-by-step: getting a CAS-4 based value in place',
      items: [
        { title: 'Identify supplies that need a cost-based value', text: `List stock transfers to other GSTINs of the same entity, supplies to related parties, and any supplies where there is no comparable open market price. Note whether the recipient can take full ITC.` },
        { title: 'Check rule 28 before going to rule 30', text: `Try open market value and like-kind-and-quality first. If the recipient is eligible for full ITC, the invoice value can be deemed open market value under rule 28. Use rule 30 only when the earlier tests do not give a value.` },
        { title: 'Build the CAS-4 cost sheet', text: `Compile product-wise cost of production for the period: materials (net of recoverable taxes), direct employee cost, direct expenses, works overheads, quality control, R&D and production administration, adjusted for opening and closing work-in-progress and credits for scrap.` },
        { title: 'Apply the 110% rule', text: `Under rule 30, the taxable value is 110% of the cost of production. Apply it per unit to transfers in the period, and update the cost periodically — many companies use the previous year's audited cost with a true-up.` },
        { title: 'Get it certified by a practising CMA', text: `A cost accountant in practice reviews the cost sheet against the books, issues the CAS-4 certificate with a UDIN, and notes the method and period. Keep it with your GST records.` },
        { title: 'Reconcile and review annually', text: `Reconcile the cost used for invoicing with the audited cost after year-end. Where the cost was materially understated, consider differential tax payment to avoid disputes.` }
      ]
    },
    rules: {
      heading: 'GST valuation and job-work provisions',
      caption: 'References are to the CGST Act, 2017 and CGST Rules, 2017. Confirm the current text and due dates on the GST portal.',
      headers: ['Provision / form', 'What it covers', 'Timing / limit', 'Consequence'],
      rows: [
        ['Schedule I, CGST Act', 'Supplies between distinct or related persons are supplies even without consideration', 'Each transfer', 'GST payable on the valued amount'],
        ['Rule 28', 'Value between distinct or related persons: open market value, like kind and quality, then rule 30/31', 'Each transfer', 'Invoice value deemed open market value if the recipient gets full ITC'],
        ['Rule 30', 'Value at 110% of cost of production, manufacture or acquisition', 'Where earlier methods fail', 'Under-valuation leads to differential tax, interest and penalty'],
        ['CAS-4', 'Method for computing cost of production for captive consumption', 'Per product, per period', 'Certified by a cost accountant in practice'],
        ['Section 143 — job work', 'Inputs and capital goods sent to a job worker without paying tax', 'Inputs back within 1 year; capital goods within 3 years', 'If not returned in time, treated as a supply on the date sent'],
        ['ITC-04', 'Statement of goods sent to and received from job workers', 'Half-yearly if AATO above ₹5 crore; annually otherwise (by 25 April / 25 October)', 'Late filing attracts fee and scrutiny']
      ]
    },
    sections: [
      {
        heading: 'What goes into CAS-4 cost of production',
        paragraphs: [
          `CAS-4 builds cost from the bottom up. The aim is the cost of producing the goods at the point they are transferred — not the price you would charge an outside customer.`
        ],
        bullets: [
          `Included: materials consumed (net of taxes for which credit is available), direct employee cost, direct expenses, works overheads, quality control, research and development, and administrative overheads relating to production.`,
          `Adjusted: opening and closing work-in-progress, credits for recoveries such as scrap and by-products.`,
          `Excluded: selling and distribution costs, interest and finance charges, abnormal losses, and profit.`,
          `Packing: primary packing needed to make the goods marketable is typically included; secondary packing for transport usually is not.`
        ]
      },
      {
        heading: 'Job work: where CAS-4 does and does not matter',
        paragraphs: [
          `Sending goods to a job worker for processing is not a supply if the conditions of section 143 are met: the goods are sent under a challan and come back within one year (inputs) or three years (capital goods). The job worker charges GST on its job-work service. In this case CAS-4 valuation is not needed for the movement itself.`,
          `If the goods are not returned within the time limit, they are treated as supplied on the day they were sent out, and you will need to value them — which is where cost-based valuation and CAS-4 can come back into the picture.`
        ]
      }
    ],
    pitfalls: [
      { title: 'Using rule 30 when rule 28 relief applies', text: `If the recipient branch is eligible for full ITC, the invoice value can be deemed open market value. Check before building a full cost sheet.` },
      { title: 'Including interest and selling costs', text: `CAS-4 excludes interest, selling and distribution costs and profit. Including them overstates value; excluding production overheads understates it.` },
      { title: 'Stale cost data', text: `A cost sheet from several years ago does not reflect current input prices. Update periodically and reconcile with audited numbers.` },
      { title: 'No certificate on file', text: `Without a cost accountant's certificate and working papers, a department audit is harder to defend.` },
      { title: 'Ignoring job-work time limits', text: `Inputs not returned within one year (capital goods three years) become deemed supplies. Track challans and file ITC-04 on time.` }
    ],
    faqs: [
      { q: 'Is a CAS-4 certificate mandatory under GST?', a: 'GST law does not name CAS-4, but rule 30 requires a value based on cost of production, and CAS-4 is the recognised standard for computing it. A certificate from a practising cost accountant is the usual way to support the value in an audit.' },
      { q: 'What is the 110% rule in GST valuation?', a: 'Under rule 30 of the CGST Rules, where value cannot be determined under the earlier rules, the value of supply is 110% of the cost of production or manufacture, or of the cost of acquisition, of the goods.' },
      { q: 'Do stock transfers to another state need CAS-4 valuation?', a: 'A transfer to a GST registration of the same entity in another state is a supply between distinct persons. If the receiving unit is eligible for full ITC, the invoice value is deemed open market value under rule 28. Otherwise a cost-based value under rule 30, often computed using CAS-4, may be needed.' },
      { q: 'Who can issue a CAS-4 certificate?', a: 'CAS-4 is a standard of the Institute of Cost Accountants of India, and certificates are issued by cost accountants in practice, with a UDIN.' }
    ],
    related: {
      services: ['cma-ca-cs-certification-services', 'msme-udyam-dpiit-startup-registration'],
      tools: ['roc-compliance-calendar'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['cost-audit-applicability-turnover-limit-cra-1-cra-4', 'convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer', 'practicing-cma-certification-mca-roc-forms-spice-plus']
    }
  },

  /* ------------------------------------------------------------------ 10 */
  {
    slug: 'startup-share-valuation-report-registered-valuer-cma-fema',
    pillar: 'cma-certifications',
    title: 'Startup Share Valuation Under Income Tax & FEMA: Registered Valuer vs CMA/CA',
    metaTitle: 'Startup Share Valuation: Registered Valuer vs CMA or CA',
    metaDescription: 'Who can value startup shares for FEMA pricing, Companies Act preferential allotments and income-tax rules, how angel tax changed, and how to pick a valuer.',
    published: '2026-10-06', updated: '2026-11-15', readMinutes: 11,
    keywords: ['startup share valuation', 'registered valuer section 247', 'FEMA pricing guidelines valuation', 'rule 11UA valuation', 'angel tax abolished', 'valuation for FC-GPR'],
    excerpt: 'One funding round can need three valuations for three laws. Here is who is allowed to sign each, and what changed after angel tax was abolished.',
    summary: [
      `A priced funding round in an Indian private company can trigger valuation requirements under three separate laws, and each law names its own valuer. Under FEMA, shares issued to a non-resident must be priced at or above fair value, certified by a chartered accountant, a SEBI-registered merchant banker or a practising cost accountant. Under the Companies Act, 2013, a preferential allotment by a private company under section 62(1)(c) needs a valuation report from a registered valuer under section 247. Income-tax rules have their own valuation methods and, for some purposes, specify a merchant banker.`,
      `The biggest recent change is on the income-tax side. The Finance (No. 2) Act, 2024 abolished the "angel tax" in section 56(2)(viib) of the Income-tax Act, 1961 for all classes of investors from assessment year 2025-26, so premium received on issuing shares is no longer taxed under that provision. Valuation under rule 11UA still matters for other purposes — for example where an investor or other recipient acquires shares below fair market value. The Income-tax Act, 2025 has applied from 1 April 2026 with renumbered sections and rules; confirm the current position and references with your tax adviser for each transaction.`,
      `In practice, one professional can often cover more than one role: a cost accountant or chartered accountant who is also an IBBI-registered valuer for securities or financial assets can sign both the FEMA certificate and the Companies Act report, if independence rules allow. The work is to map each requirement first, then decide who signs what.`
    ],
    steps: {
      heading: 'Step-by-step: valuing shares for a funding round',
      items: [
        { title: 'Map every law that applies', text: `Is any investor a non-resident (FEMA)? Is the issue a preferential allotment under section 62(1)(c) (Companies Act)? Are any shares being transferred, or issued to employees, where income-tax valuation applies? List each requirement before appointing a valuer.` },
        { title: 'Choose the valuer for each requirement', text: `FEMA: CA, SEBI-registered merchant banker or practising cost accountant. Companies Act section 62(1)(c) and other section 247 cases: an IBBI-registered valuer. Income-tax: as specified in the current rules for the method used.` },
        { title: 'Agree the valuation date and method', text: `Use a date close to the board approval of the issue. Discounted cash flow is common for early-stage companies; net asset value and market multiples are used where relevant. Under FEMA the method must be an internationally accepted pricing methodology on an arm's length basis.` },
        { title: 'Prepare defensible projections', text: `Projections drive DCF value. Base them on the business plan the investors saw, with explained assumptions for growth, margins and capital needs. Keep the version history.` },
        { title: 'Issue at or above the FEMA floor', text: `For shares issued to a non-resident, the issue price must not be less than the fair value in the certificate. Pass the board and shareholder resolutions, and complete the allotment within the FEMA timeline after receiving funds.` },
        { title: 'File and keep the reports', text: `Attach the valuation certificate to FC-GPR on the FIRMS portal within 30 days of allotment, file PAS-3 for the allotment and MGT-14 for the special resolution where required, and keep all reports in the statutory records for audit and due diligence.` }
      ]
    },
    rules: {
      heading: 'Who signs which valuation',
      caption: 'General position at the time of writing. Income-tax references are to the 1961 Act and Income-tax Rules, 1962; confirm the equivalents under the Income-tax Act, 2025.',
      headers: ['Law / provision', 'When it applies', 'Who can value', 'Timing / consequence'],
      rows: [
        ['FEMA (Non-debt Instruments) Rules, 2019 — pricing', 'Issue of shares to, or transfer between, residents and non-residents', 'Chartered accountant, SEBI-registered merchant banker or practising cost accountant', 'Issue not below fair value; report in FC-GPR / FC-TRS'],
        ['Section 62(1)(c) and rule 13, Share Capital rules', 'Preferential allotment by an unlisted company', 'Registered valuer under section 247', 'Price based on the registered valuer\'s report'],
        ['Section 247, Companies Act 2013', 'Any valuation the Act requires (e.g. sweat equity, certain non-cash transactions, schemes)', 'IBBI-registered valuer for the asset class', 'Valuer liable for misconduct; independence rules apply'],
        ['Section 56(2)(viib) (1961 Act)', 'Former "angel tax" on share premium above fair market value', 'Not applicable from AY 2025-26 (abolished)', 'No tax under this provision for later years'],
        ['Rule 11UA (1962 Rules)', 'Fair market value of unquoted shares for other income-tax provisions', 'Method-dependent; some methods require a merchant banker', 'Shortfall can be taxed in the recipient\'s hands'],
        ['Rule 3(8) (1962 Rules) — ESOPs', 'Fair market value of unlisted shares for perquisite tax on ESOP exercise', 'Category I merchant banker', 'Valuation as on the exercise date (within the prescribed window)']
      ]
    },
    sections: [
      {
        heading: 'Registered valuer vs CMA or CA: not either-or',
        paragraphs: [
          `A "registered valuer" is a person registered with the Insolvency and Bankruptcy Board of India under the Companies (Registered Valuers and Valuation) Rules, 2017, for a specific asset class such as securities or financial assets. Many registered valuers are cost accountants or chartered accountants who have passed the IBBI examination and joined a registered valuers organisation.`,
          `So the practical question is not "registered valuer or CMA?" but "which certificate does this law ask for, and does my professional hold that status?" A practising cost accountant can issue the FEMA pricing certificate in their own right. The same person can sign the section 62 report only if they are also a registered valuer for securities or financial assets.`
        ],
        bullets: [
          `Ask for the IBBI registration number and asset class if you need a Companies Act valuation.`,
          `Ask for the certificate of practice and UDIN for a FEMA certificate from a CA or CMA.`,
          `Check independence: the statutory auditor or an interested party may be restricted from acting.`
        ]
      },
      {
        heading: 'After angel tax: why valuation still matters',
        paragraphs: [
          `The abolition of section 56(2)(viib) removed the tax on share premium, which was the main income-tax concern for startups raising money. Valuation is still needed for FEMA pricing, Companies Act allotments, secondary transfers, ESOP perquisites and, increasingly, for investor due diligence.`,
          `Because the Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026, provisions and rule numbers referred to in older valuation reports and shareholder agreements may now map to new sections. Ask your tax adviser to confirm the current provision before relying on a rule number in a new report.`
        ]
      }
    ],
    pitfalls: [
      { title: 'One valuation for every purpose', text: `A FEMA certificate from a CA does not satisfy section 62(1)(c) unless the signer is also a registered valuer. Map requirements first.` },
      { title: 'Stale valuation date', text: `A report dated months before the allotment may not reflect fair value at issue. Keep the valuation date close to the board approval.` },
      { title: 'Issuing to non-residents below fair value', text: `FEMA sets a floor for issues to non-residents. Pricing below it is a contravention that needs compounding.` },
      { title: 'Projections that differ from the pitch deck', text: `Investors and authorities compare documents. Use one consistent set of projections, with documented changes.` },
      { title: 'Relying on old section numbers', text: `With the Income-tax Act, 2025 in force, confirm the current provision before citing a 1961-Act section in a new report or agreement.` }
    ],
    faqs: [
      { q: 'Can a cost accountant value shares for FEMA?', a: 'Yes. Under the FEMA (Non-debt Instruments) Rules, 2019, the fair value of unlisted shares issued to a non-resident can be certified by a chartered accountant, a SEBI-registered merchant banker or a practising cost accountant, using an internationally accepted pricing methodology on an arm\'s length basis.' },
      { q: 'Do I need a registered valuer for a startup funding round?', a: 'If the shares are issued by way of preferential allotment under section 62(1)(c) of the Companies Act, 2013, the price must be supported by a registered valuer\'s report. Other requirements — FEMA pricing, ESOP perquisites — have their own valuer rules.' },
      { q: 'Is angel tax still applicable to startups?', a: 'Section 56(2)(viib) of the Income-tax Act, 1961 was abolished for all classes of investors from assessment year 2025-26. The Income-tax Act, 2025 applies from 1 April 2026, so confirm the current position with a tax adviser for your transaction, as other valuation-based provisions continue.' },
      { q: 'Which valuation method is used for early-stage startups?', a: 'Discounted cash flow is the most common for companies with limited history, sometimes cross-checked with recent transaction prices or market multiples. The method must be one the relevant law accepts and must be applied by the valuer that law names.' }
    ],
    related: {
      services: ['cma-ca-cs-certification-services', 'msme-udyam-dpiit-startup-registration'],
      tools: ['roc-compliance-calendar'],
      compare: ['legacy-portals-vs-dedicated-cma-legal-desk'],
      blogs: ['indian-subsidiary-registration-foreign-director-documents-fema', 'legal-due-diligence-checklist-indian-seed-startups-cap-table', '80-iac-tax-exemption-rejection-reasons-startup-india-dpiit', 'cma-data-project-report-format-msme-bank-loan-cgtmse']
    }
  }
];
