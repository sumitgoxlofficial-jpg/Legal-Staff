// Core services. Rendered by seo/pages/service.mjs at /services/<slug>.
// Shape (every field required unless marked optional):
// { slug, icon, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, chips: [string],
//   intro: { heading, paragraphs: [string] },
//   documents: [{ group, items: [{ name, note }] }],
//   timeline: [{ when, title, text, forms: [string] }],
//   tiers: [{ name, for, price (number, INR, professional fee), priceNote, featured (bool, optional), includes: [string] }],
//   govFeesNote, deliverables: [string], faqs: [{ q, a }] (6–8), related: { services: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
export const services = [
  {
    slug: 'private-limited-company-registration', icon: 'building', navLabel: 'Private Limited registration', navHint: 'SPICe+ Part A & B, DSC, DIN, PAN/TAN, INC-20A',
    title: "Private Limited Company Registration in India",
    metaTitle: "Private Limited Company Registration India | SPICe+ Filing",
    metaDescription: "Register a Private Limited company on MCA V3 with SPICe+ Part A and B, DSC, DIN, PAN/TAN, AGILE-PRO-S and e-MoA/e-AoA. Fixed fees from ₹4,999 plus govt fees.",
    kicker: "Company incorporation",
    lead: "We reserve your name, draft the e-MoA and e-AoA, file SPICe+ Part B with its linked forms and stay with you until INC-20A is filed — one desk, practising professionals, fixed fees.",
    chips: ["SPICe+ Part A & B", "DSC & DIN for directors", "PAN, TAN, EPFO, ESIC via AGILE-PRO-S", "INC-20A within 180 days"],
    intro: {
      heading: "What Private Limited registration involves",
      paragraphs: [
        "A private limited company is incorporated under the Companies Act, 2013 through the integrated SPICe+ web form (INC-32) on the MCA V3 portal. Part A reserves the proposed name; Part B carries the incorporation details and is filed together with the linked forms: e-MoA (INC-33), e-AoA (INC-34) and AGILE-PRO-S (INC-35), which registers the company for PAN, TAN, EPFO and ESIC, opens the bank account and can apply for GSTIN at the same time. The INC-9 declaration of subscribers and directors is generated from the data in Part B.",
        "You need at least two directors and two shareholders (the same people can be both), and at least one director must be resident in India under section 149(3). Every director needs a Class 3 Digital Signature Certificate (DSC); up to three new directors can be allotted a DIN directly through SPICe+. Part B must be certified by a practising CA, CS or CMA, and carries the declaration of the professional engaged in the formation.",
        "Incorporation is not the finish line. Within 180 days the company must file INC-20A, the declaration of commencement of business with proof that the subscription money was received; until then it cannot commence business or borrow, and late filing attracts a penalty under section 10A. We plan the post-incorporation steps — first auditor, share certificates, first board meeting and registers — while the incorporation is still in progress."
      ]
    },
    documents: [
      { group: "Directors and shareholders", items: [
        { name: "PAN card", note: "Mandatory for Indian nationals; must match the name on Aadhaar." },
        { name: "Aadhaar or passport / voter ID", note: "Used for DSC and DIN identity checks." },
        { name: "Address proof not older than 2 months", note: "Bank statement, electricity, phone or gas bill in the director's name." },
        { name: "Passport-size photograph, email and mobile", note: "Each director needs a separate email ID and mobile number for OTPs." },
        { name: "Foreign nationals: passport and address proof", note: "Notarised or apostilled in the home country, as the rules require." }
      ] },
      { group: "Registered office", items: [
        { name: "Utility bill of the premises", note: "Electricity, water or gas bill not older than 2 months." },
        { name: "Rent or lease agreement, or ownership proof", note: "If rented, a current agreement in the name of the director or company." },
        { name: "No-objection certificate from the owner", note: "Signed by the owner permitting use as the registered office." },
        { name: "Location details of the premises", note: "V3 forms capture the office address precisely; we confirm these with you before filing." }
      ] },
      { group: "Company details", items: [
        { name: "Two or more proposed names with their meaning", note: "Checked against existing companies, LLPs and trademarks before Part A." },
        { name: "Main business objects", note: "We draft the objects clause from a plain description of what you will do." },
        { name: "Authorised and subscribed capital, with shareholding split", note: "Drives MCA fee and state stamp duty." }
      ] }
    ],
    timeline: [
      { when: "Day 1–2", title: "DSC for every director and subscriber", text: "Class 3 DSCs issued after video and Aadhaar/PAN verification by a licensed certifying authority.", forms: ["DSC"] },
      { when: "Day 2–5", title: "Name reservation", text: "We run name and trademark checks, then file SPICe+ Part A. An approved name is reserved for 20 days; Part A allows one resubmission if the ROC raises remarks.", forms: ["SPICe+ Part A"] },
      { when: "Day 4–7", title: "Drafting and signing", text: "We prepare SPICe+ Part B, e-MoA, e-AoA and AGILE-PRO-S, share them for review and collect DSC signatures and the professional certification.", forms: ["SPICe+ Part B", "INC-33", "INC-34", "INC-35", "INC-9"] },
      { when: "Day 7–15", title: "Processing by the Central Registration Centre", text: "Stamp duty and fees are paid online. If the CRC raises resubmission remarks we answer them within the allowed window, usually the same day.", forms: ["SPICe+ Part B"] },
      { when: "On approval", title: "Certificate of Incorporation", text: "The certificate carries the CIN, PAN and TAN. EPFO and ESIC registrations and the bank account request follow from AGILE-PRO-S.", forms: ["COI", "PAN", "TAN"] },
      { when: "Within 30–60 days", title: "First auditor and share certificates", text: "Board appoints the first auditor within 30 days; share certificates are issued within 60 days of incorporation.", forms: ["ADT-1", "SH-1"] },
      { when: "Within 180 days", title: "Commencement of business", text: "Subscribers pay in their capital to the company's bank account and we file the declaration with the bank proof.", forms: ["INC-20A"] }
    ],
    tiers: [
      { name: "Essential", for: "Two founders, standard objects, ready to file", price: 4999, priceNote: "professional fee", includes: ["Name check and SPICe+ Part A", "SPICe+ Part B with e-MoA and e-AoA", "DIN for up to 2 directors", "PAN, TAN, EPFO and ESIC via AGILE-PRO-S", "Practising professional certification"] },
      { name: "Growth", for: "Founders who want the company ready to operate", price: 9999, priceNote: "professional fee", featured: true, includes: ["Everything in Essential", "2 Class 3 DSCs included", "Custom objects clause and AoA review", "GSTIN application via AGILE-PRO-S", "INC-20A commencement filing", "Resubmission remarks handled at no extra fee"] },
      { name: "Investor-ready", for: "Funded or soon-to-be-funded startups", price: 14999, priceNote: "professional fee", includes: ["Everything in Growth", "Up to 3 directors including one foreign national", "First board meeting minutes and resolutions", "First auditor appointment and ADT-1", "Share certificates and statutory registers", "First-year compliance calendar"] }
    ],
    govFeesNote: "Government fees are extra and paid at actuals: SPICe+ Part A name fee, MCA filing fee, state stamp duty on the MoA and AoA, and DSC charges where not included. Stamp duty differs by state and rises with authorised capital, and the MCA filing fee also depends on authorised capital (it has been nil for small authorised capital under current fee rules). Use the incorporation cost calculator for an estimate.",
    deliverables: [
      "Certificate of Incorporation with CIN",
      "Company PAN and TAN",
      "Stamped e-MoA and e-AoA",
      "DIN allotment for directors",
      "EPFO and ESIC registration details",
      "Bank account opening request through AGILE-PRO-S",
      "GSTIN (Growth and Investor-ready plans, where applied for)",
      "INC-20A filing with challan (Growth and Investor-ready plans)",
      "Post-incorporation compliance checklist"
    ],
    faqs: [
      { q: "How long does Private Limited company registration take?", a: "Usually 7 to 15 working days from receiving complete documents: one to two days for DSCs, two to four days for name approval and about a week for SPICe+ Part B processing. Resubmission remarks from the ROC or Central Registration Centre add time, which is why we check names and documents carefully before filing." },
      { q: "What is the minimum capital for a Private Limited company?", a: "There is no minimum paid-up capital requirement under the Companies Act, 2013 since the 2015 amendment. Founders commonly start with an authorised capital of ₹1 lakh to ₹10 lakh. Authorised capital affects the MCA fee and state stamp duty, so we recommend a figure that matches your near-term funding plan rather than an inflated one." },
      { q: "Can a foreign national or NRI be a director or shareholder?", a: "Yes. A foreign national can be a director and shareholder, but at least one director must be resident in India. Foreign shareholding must comply with FEMA and the FDI policy for your sector, and the company reports the inflow of share capital to the RBI through the FIRMS portal after allotment. Foreign directors' identity and address documents must be notarised or apostilled as required." },
      { q: "Can I use my home address as the registered office?", a: "Yes, a residential address can be the registered office if you have a recent utility bill and, where you are not the owner, a no-objection certificate from the owner. Check that your housing society or lease does not prohibit it, and remember that ROC notices and verification will come to this address." },
      { q: "What happens if INC-20A is not filed within 180 days?", a: "Under section 10A the company cannot commence business or exercise borrowing powers until INC-20A is filed. Late filing attracts a penalty of ₹50,000 on the company and ₹1,000 per day on each officer in default, subject to a cap, and the ROC may initiate removal of the company's name if it is not carrying on business." },
      { q: "Is GST registration automatic with SPICe+?", a: "No. AGILE-PRO-S lets you apply for GSTIN with the incorporation, but it is optional. GST is mandatory only once you cross the turnover threshold or fall in a compulsory category such as inter-state supply of goods or selling through e-commerce operators. We help you decide based on your business model." },
      { q: "Which is better for a startup: Private Limited or LLP?", a: "If you plan to raise equity funding, issue ESOPs or bring in institutional investors, a Private Limited company is the usual choice. An LLP has lighter compliance and no tax on profit distribution, which suits professional and family businesses. Our Pvt Ltd vs LLP vs OPC comparison sets out the differences row by row." },
      { q: "Are the government fees included in your price?", a: "No. Our fees are professional fees. MCA fees, stamp duty and other statutory charges are paid at actuals and we share every challan with you. The total government cost depends on your state and authorised capital." }
    ],
    related: {
      services: ["cma-ca-cs-certification-services", "roc-annual-compliance", "msme-udyam-dpiit-startup-registration"],
      tools: ["incorporation-cost-calculator", "roc-compliance-calendar", "trademark-class-finder"],
      compare: ["pvt-ltd-vs-llp-vs-opc", "legacy-portals-vs-dedicated-cma-legal-desk"],
      blogs: ["spice-plus-part-a-name-rejection-rules-rule-8", "spice-plus-part-b-resubmission-remarks-mca-v3", "inc-20a-late-filing-penalty-after-180-days-condonation", "post-incorporation-compliance-checklist-first-60-days-sh1-adt1", "indian-subsidiary-registration-foreign-director-documents-fema"]
    }
  },
  {
    slug: 'llp-registration-india', icon: 'handshake', navLabel: 'LLP registration', navHint: 'FiLLiP, LLP agreement drafting and Form 3',
    title: "LLP Registration in India",
    metaTitle: "LLP Registration in India | RUN-LLP, FiLLiP & Form 3",
    metaDescription: "Register an LLP with RUN-LLP name approval, FiLLiP, DPIN for designated partners and a custom LLP agreement filed in Form 3 within 30 days. Fees from ₹4,999.",
    kicker: "LLP incorporation",
    lead: "Name approval, FiLLiP incorporation, a properly drafted LLP agreement and Form 3 filed inside the 30-day window — so your partnership starts with clear terms and no late fees.",
    chips: ["RUN-LLP name approval", "FiLLiP and DPIN", "LLP agreement drafting", "Form 3 within 30 days"],
    intro: {
      heading: "How LLP registration works",
      paragraphs: [
        "A Limited Liability Partnership is formed under the LLP Act, 2008. It is a separate legal entity whose partners' liability is limited to their agreed contribution, while the internal relationship is governed by an LLP agreement rather than by articles and board meetings. That makes it a popular choice for professional firms, consultancies, family businesses and joint ventures that do not need equity investors.",
        "The process starts with RUN-LLP, which reserves the name, followed by FiLLiP (Form for incorporation of LLP). An LLP needs at least two designated partners who are individuals, and at least one of them must be resident in India. Designated partners without a DIN are allotted a DPIN through FiLLiP; they also need DSCs to sign.",
        "After incorporation, the LLP agreement must be filed in Form 3 within 30 days. The agreement is stamped under the stamp law of the state where the LLP is registered, usually based on the capital contribution. We draft the agreement around your real arrangement — contribution, profit share, partner remuneration and interest, admission and exit, decision-making and dispute resolution — instead of a generic template."
      ]
    },
    documents: [
      { group: "Partners and designated partners", items: [
        { name: "PAN card", note: "Mandatory for Indian partners." },
        { name: "Aadhaar or passport / voter ID", note: "For DSC and DPIN verification." },
        { name: "Address proof not older than 2 months", note: "Bank statement or utility bill." },
        { name: "Photograph, email and mobile", note: "Separate contact details for each partner." },
        { name: "Body corporate partner: board resolution and nominee details", note: "If a company or another LLP is a partner." }
      ] },
      { group: "Registered office", items: [
        { name: "Utility bill not older than 2 months", note: "Electricity, water or gas bill of the premises." },
        { name: "Rent agreement or ownership proof", note: "With a no-objection certificate from the owner." }
      ] },
      { group: "LLP details and agreement inputs", items: [
        { name: "Proposed names and business activity", note: "RUN-LLP allows two name options per application." },
        { name: "Capital contribution of each partner", note: "Cash or other agreed contribution; drives stamp duty." },
        { name: "Profit-sharing ratio and remuneration terms", note: "Needed to draft clauses that work for tax and for the partners." }
      ] }
    ],
    timeline: [
      { when: "Day 1–2", title: "DSCs for designated partners", text: "Class 3 DSCs issued after identity verification.", forms: ["DSC"] },
      { when: "Day 2–5", title: "Name reservation", text: "Name and trademark search, then RUN-LLP. An approved name is typically reserved for 90 days.", forms: ["RUN-LLP"] },
      { when: "Day 5–12", title: "Incorporation filing", text: "FiLLiP with partner details, registered office and contribution, signed by partners and certified by a practising professional.", forms: ["FiLLiP"] },
      { when: "On approval", title: "Certificate of Incorporation", text: "The certificate shows the LLPIN; PAN and TAN for the LLP are issued alongside.", forms: ["COI", "PAN", "TAN"] },
      { when: "Within 30 days", title: "LLP agreement drafted, stamped and filed", text: "We finalise the agreement with you, arrange stamping as per your state and file it in Form 3 before the additional fee starts to run.", forms: ["Form 3"] },
      { when: "After filing", title: "Bank account and registrations", text: "Bank account, GST if needed, and the LLP's first-year compliance calendar.", forms: ["GST REG-01"] }
    ],
    tiers: [
      { name: "Essential", for: "Two partners, standard business", price: 4999, priceNote: "professional fee", includes: ["Name check and RUN-LLP", "FiLLiP filing", "DPIN for up to 2 designated partners", "LLP PAN and TAN", "Practising professional certification"] },
      { name: "Complete", for: "Partners who want the agreement done properly", price: 7999, priceNote: "professional fee", featured: true, includes: ["Everything in Essential", "2 Class 3 DSCs included", "Custom LLP agreement drafted on your terms", "Stamping coordination and Form 3 filing", "Resubmission remarks handled at no extra fee"] },
      { name: "Business-ready", for: "LLPs that will invoice from day one", price: 12999, priceNote: "professional fee", includes: ["Everything in Complete", "Up to 4 partners", "GST registration", "Bank account documentation", "First-year Form 11 and Form 8 calendar"] }
    ],
    govFeesNote: "Government fees are extra at actuals: RUN-LLP and FiLLiP fees (FiLLiP fee depends on the total contribution), Form 3 filing fee, and state stamp duty on the LLP agreement, which varies by state and usually by contribution amount. DSC charges apply where not included.",
    deliverables: [
      "Certificate of Incorporation with LLPIN",
      "LLP PAN and TAN",
      "DPIN for designated partners",
      "Drafted and stamped LLP agreement",
      "Form 3 filing with challan",
      "GST registration (Business-ready plan)",
      "Annual compliance calendar for Form 11 and Form 8"
    ],
    faqs: [
      { q: "What is the minimum number of partners for an LLP?", a: "At least two partners, and at least two designated partners who are individuals. At least one designated partner must be resident in India. There is no maximum number of partners." },
      { q: "What if the LLP agreement is not filed within 30 days?", a: "Form 3 is due within 30 days of incorporation. After that, an additional fee of ₹100 per day of delay applies, and it keeps accruing until you file. Until an agreement is filed, the default provisions in the First Schedule to the LLP Act govern the partners' relationship, which may not reflect what you agreed." },
      { q: "Is there a minimum capital contribution for an LLP?", a: "No minimum contribution is prescribed. Partners can start with a modest contribution and increase it later by amending the agreement and filing Form 3 again. The contribution affects FiLLiP fees and stamp duty." },
      { q: "How is an LLP taxed?", a: "An LLP is taxed as a firm at a flat 30%, plus surcharge where income exceeds ₹1 crore and health and education cess. The share of profit received by partners is exempt in their hands, and remuneration and interest paid to partners are deductible within the limits of the Income-tax Act if the agreement authorises them — another reason the agreement must be drafted carefully." },
      { q: "When does an LLP need an audit?", a: "Accounts must be audited if turnover exceeds ₹40 lakh or contribution exceeds ₹25 lakh in a financial year. A tax audit may separately apply under the Income-tax Act once turnover crosses the applicable limit." },
      { q: "What are the annual filings for an LLP?", a: "Form 11 (annual return) by 30 May and Form 8 (statement of account and solvency) by 30 October each year, plus the income-tax return. Late filing attracts an additional fee of ₹100 per day per form, so a dormant LLP that ignores filings builds up large dues." },
      { q: "Can an LLP raise venture capital?", a: "An LLP cannot issue shares, so it does not suit equity investment or ESOPs. If you expect to raise venture funding, start as a Private Limited company, or plan to convert the LLP into a company later under section 366 of the Companies Act." }
    ],
    related: {
      services: ["private-limited-company-registration", "roc-annual-compliance", "msme-udyam-dpiit-startup-registration"],
      tools: ["incorporation-cost-calculator", "roc-compliance-calendar", "trademark-class-finder"],
      compare: ["pvt-ltd-vs-llp-vs-opc"],
      blogs: ["spice-plus-part-a-name-rejection-rules-rule-8", "virtual-office-company-registration-mca-v3-geo-coordinates", "convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer", "legal-due-diligence-checklist-indian-seed-startups-cap-table"]
    }
  },
  {
    slug: 'cma-ca-cs-certification-services', icon: 'stamp', navLabel: 'CMA, CA & CS certification', navHint: 'SPICe+ Block 11, INC-20A, CAS-4, CRA-4, bank CMA',
    title: "CMA, CA & CS Certification Services",
    metaTitle: "CMA, CA & CS Certification | CAS-4, Cost Audit, MCA Forms",
    metaDescription: "Certificates from practising Cost Accountants, CAs and Company Secretaries: SPICe+, INC-20A, CAS-4, cost records, cost audit and bank CMA data, with UDIN.",
    kicker: "CMA & legal desk",
    lead: "When a form, a bank or a tax officer needs a certificate from a practising professional, you need someone who reads the underlying records — not just a signature. Every certificate we issue carries a UDIN.",
    chips: ["SPICe+ and INC-20A certification", "CAS-4 for captive consumption", "Cost records and cost audit", "Bank CMA data"],
    intro: {
      heading: "Which certificates we handle, and who may sign them",
      paragraphs: [
        "Many MCA forms must be certified by a practising professional. SPICe+ Part B carries both a declaration by the professional engaged in the formation and a certificate from a Chartered Accountant, Company Secretary or Cost and Management Accountant in practice. Other event-based forms, such as INC-20A, share allotment and charge filings, carry similar certifications. The professional who signs is confirming that they verified the facts against the records, so we check the underlying documents before we certify.",
        "Cost and Management Accountants have specific roles. CAS-4, the cost accounting standard on cost of production for captive consumption, is used to value goods transferred between units or related parties; under GST valuation rules such supplies are commonly valued at 110% of cost of production, so a CAS-4 certificate is the evidence. Companies in specified sectors must maintain cost records in Form CRA-1 once their turnover crosses the threshold in the Companies (Cost Records and Audit) Rules, 2014, and larger ones need a cost audit: appointment intimated in CRA-2, the report in CRA-3 and filing with MCA in CRA-4.",
        "We also prepare CMA (Credit Monitoring Arrangement) data and project reports for working-capital and term loans, and valuation reports. Note the legal line here: valuations required under the Companies Act — for example for preferential allotment of shares — must be done by a Registered Valuer registered with IBBI, while FEMA pricing for foreign investment can be certified by a Chartered Accountant, a SEBI-registered merchant banker or a practising Cost Accountant. We tell you which one your transaction needs before you pay for the wrong report."
      ]
    },
    documents: [
      { group: "For MCA form certification", items: [
        { name: "Draft form and its attachments", note: "We can prepare the form ourselves if you prefer." },
        { name: "Board or shareholder resolutions", note: "Certified copies relevant to the event." },
        { name: "Bank statement showing receipt of money", note: "For INC-20A and allotment-related certificates." },
        { name: "Statutory registers", note: "Register of members, directors and charges as applicable." }
      ] },
      { group: "For CAS-4, cost records and cost audit", items: [
        { name: "Financial statements and trial balance", note: "For the period being certified." },
        { name: "Production, consumption and inventory records", note: "Quantity and value data by product or plant." },
        { name: "Bill of materials and overhead allocation basis", note: "Needed to build cost of production under CAS-4." },
        { name: "Product-wise turnover and HSN/CETA classification", note: "Determines cost records and cost audit applicability." }
      ] },
      { group: "For bank CMA data and valuation", items: [
        { name: "Audited financials for the last 2–3 years", note: "Plus provisional figures for the current year." },
        { name: "Projections and business assumptions", note: "Sales, margins, capex and working-capital cycle." },
        { name: "Existing loan sanction letters", note: "Limits, security and repayment schedules." },
        { name: "Cap table and term sheet (for valuation)", note: "So the method fits the purpose of the report." }
      ] }
    ],
    timeline: [
      { when: "Day 0", title: "Scoping call", text: "We confirm which certificate is required, who is legally allowed to sign it and the evidence needed.", forms: [] },
      { when: "Day 1–2", title: "Records review", text: "We verify the documents against the declarations in the form or report and list gaps.", forms: [] },
      { when: "Day 2–4", title: "Form certification", text: "MCA forms are certified with the professional's DSC once the facts are verified.", forms: ["SPICe+ Part B", "INC-20A", "PAS-3", "CHG-1"] },
      { when: "Day 3–10", title: "CAS-4 and bank CMA data", text: "Cost of production is computed and certified; CMA data is prepared with ratios and working-capital assessment.", forms: ["CAS-4", "CMA data"] },
      { when: "Per statutory dates", title: "Cost audit cycle", text: "Cost auditor's appointment intimated within the due window, cost records reviewed, report issued and filed with MCA.", forms: ["CRA-1", "CRA-2", "CRA-3", "CRA-4"] },
      { when: "On issue", title: "UDIN generation", text: "Each certificate or report is registered on the relevant institute's UDIN portal so the recipient can verify it.", forms: ["UDIN"] }
    ],
    tiers: [
      { name: "Form certification", for: "One MCA form certified by a practising professional", price: 1999, priceNote: "per form, from", includes: ["Verification of supporting records", "Certification with professional DSC", "UDIN where applicable", "Response to ROC remarks on the certified facts"] },
      { name: "CAS-4 & bank CMA data", for: "Manufacturers, GST valuation and loan applications", price: 9999, priceNote: "per certificate or report, from", featured: true, includes: ["Cost of production computed under CAS-4", "Certificate with UDIN", "CMA data with ratio analysis and working-capital assessment", "One revision after banker or officer queries"] },
      { name: "Cost records & cost audit", for: "Companies covered by the cost rules", price: 35000, priceNote: "per year, from", includes: ["Applicability review by product and turnover", "Cost records set up in CRA-1 format", "Cost audit and report in CRA-3", "CRA-2 and CRA-4 filings"] }
    ],
    govFeesNote: "MCA filing fees for the forms we certify, and any additional fees for late filing, are paid at actuals. Fees for valuation by an IBBI Registered Valuer, where the law requires one, are quoted separately. Cost audit fees depend on the number of products, plants and the volume of records.",
    deliverables: [
      "Certified MCA forms with professional DSC",
      "CAS-4 cost of production certificate",
      "Cost records in CRA-1 format",
      "Cost audit report (CRA-3) and CRA-2 / CRA-4 filings",
      "Bank CMA data and project report",
      "Valuation report for FEMA or commercial purposes",
      "UDIN for every certificate and report",
      "Working papers retained for verification"
    ],
    faqs: [
      { q: "Who can certify SPICe+ Part B?", a: "A Chartered Accountant, Company Secretary or Cost and Management Accountant in whole-time practice can certify the form. The declaration by the professional engaged in the formation can also be given by an advocate. The certifying professional must have verified the documents and is accountable to their institute for the certificate." },
      { q: "What is a CAS-4 certificate and when is it required?", a: "CAS-4 is the cost accounting standard for determining the cost of production of goods used for captive consumption. It is commonly needed when goods move between distinct persons under GST (for example, units in different states) or to related parties where there is no transaction value, so the supply is valued on cost. The certificate shows how the cost was built up from materials, labour and overheads." },
      { q: "When must a company maintain cost records or get a cost audit?", a: "Cost records apply to companies producing goods or providing services listed in the Companies (Cost Records and Audit) Rules, 2014 when overall turnover in the preceding year is ₹35 crore or more. Cost audit applies at higher thresholds that differ for regulated and non-regulated sectors and also depend on the turnover of the individual product or service. We check applicability product by product." },
      { q: "What are CRA-2 and CRA-4?", a: "CRA-2 is the intimation to the Central Government of the cost auditor's appointment, filed within 30 days of the board meeting that appointed them or within 180 days of the start of the financial year, whichever is earlier. CRA-4 is the filing of the cost audit report within 30 days of the company receiving it from the cost auditor." },
      { q: "Do I need a Registered Valuer or can a CA or CMA value my shares?", a: "It depends on the purpose. Valuations required by the Companies Act, such as for preferential allotment or sweat equity, must be done by an IBBI Registered Valuer. For FEMA pricing on issue or transfer of shares involving non-residents, a Chartered Accountant, SEBI-registered merchant banker or practising Cost Accountant can value using an internationally accepted method. Tax rules have their own requirements, so we confirm before starting." },
      { q: "What is CMA data for a bank loan?", a: "Credit Monitoring Arrangement data is the set of historical and projected financial statements, ratios, fund flow and working-capital assessment banks use to sanction or renew limits. It is not a statutory certificate, but banks expect it to be prepared or reviewed by a professional and to reconcile with your audited accounts." },
      { q: "What is UDIN and why does it matter?", a: "UDIN (Unique Document Identification Number) is generated by the professional on their institute's portal for each certificate or report they sign. It lets banks, regulators and counterparties verify that the document was genuinely issued by that professional. Many authorities reject certificates that do not carry one." }
    ],
    related: {
      services: ["private-limited-company-registration", "roc-annual-compliance", "legal-staffing-virtual-compliance-officer"],
      tools: ["incorporation-cost-calculator", "roc-compliance-calendar"],
      compare: ["legacy-portals-vs-dedicated-cma-legal-desk"],
      blogs: ["practicing-cma-certification-mca-roc-forms-spice-plus", "cas-4-certificate-captive-consumption-gst-valuation", "cost-audit-applicability-turnover-limit-cra-1-cra-4", "cma-data-project-report-format-msme-bank-loan-cgtmse", "startup-share-valuation-report-registered-valuer-cma-fema"]
    }
  },
  {
    slug: 'roc-annual-compliance', icon: 'calendar', navLabel: 'ROC annual compliance', navHint: 'AOC-4, MGT-7, DIR-3 KYC, ADT-1, DPT-3',
    title: "ROC Annual Compliance for Private Limited Companies",
    metaTitle: "ROC Annual Compliance | AOC-4, MGT-7, DIR-3 KYC Filing",
    metaDescription: "Annual ROC compliance for Private Limited companies and OPCs: AOC-4, MGT-7/MGT-7A, DIR-3 KYC, ADT-1, DPT-3, MSME-1, board meetings, AGM and statutory registers.",
    kicker: "Annual compliance",
    lead: "A fixed-fee annual plan that keeps your board meetings, AGM, registers and MCA filings on schedule — so you never pay the ₹100-a-day additional fee or lose a director's DIN to a missed KYC.",
    chips: ["AOC-4 and MGT-7 / MGT-7A", "DIR-3 KYC for every director", "Board meetings, AGM and minutes", "DPT-3, MSME-1 and ADT-1"],
    intro: {
      heading: "What annual ROC compliance covers",
      paragraphs: [
        "Every company registered under the Companies Act, 2013 must file its financial statements and annual return with the Registrar of Companies, whether or not it did any business. Financial statements go in AOC-4 within 30 days of the AGM, and the annual return in MGT-7 (or the abridged MGT-7A for small companies and OPCs) within 60 days of the AGM. The AGM itself must be held within six months of the end of the financial year — by 30 September for most companies — and the first AGM within nine months of the close of the first financial year.",
        "Around these sit the event and periodic filings that are easy to miss: director KYC in DIR-3 KYC, the auditor's appointment in ADT-1 within 15 days of the AGM where an auditor is appointed, the annual return of deposits and exempted loans in DPT-3 by 30 June, and the half-yearly MSME-1 where the company owes micro or small enterprises for more than 45 days. Board meetings must be held at the required frequency and minuted, and statutory registers kept up to date.",
        "Late annual filings attract an additional fee of ₹100 per day per form with no upper limit, on top of penalties under the Act. Persistent non-filing can lead to directors being disqualified and the company being struck off. Our plan maps every date for your company, prepares the documents, coordinates with your statutory auditor and files on time."
      ]
    },
    documents: [
      { group: "Financial", items: [
        { name: "Audited financial statements", note: "Balance sheet, profit and loss, cash flow (if applicable), notes and auditor's report." },
        { name: "Board's report inputs", note: "Operations summary, related-party transactions, loans and investments." },
        { name: "Details of loans from directors and others", note: "Needed for DPT-3 and section 185/186 disclosures." },
        { name: "Dues to MSME suppliers older than 45 days", note: "For MSME-1." }
      ] },
      { group: "Corporate records", items: [
        { name: "Shareholding as on 31 March", note: "With any transfers or allotments during the year." },
        { name: "Board and general meeting minutes", note: "We can draft these if they are not maintained." },
        { name: "Statutory registers", note: "Members, directors and KMP, charges, contracts and loans." }
      ] },
      { group: "Directors", items: [
        { name: "PAN, Aadhaar, mobile and email of each director", note: "For DIR-3 KYC with OTP verification." },
        { name: "Valid DSC of the signing director", note: "We can arrange renewal if expired." },
        { name: "Disclosures of interest and non-disqualification", note: "Forms MBP-1 and DIR-8 for the board file." }
      ] }
    ],
    timeline: [
      { when: "April–June", title: "Books closed and audit started", text: "We share the year's checklist, collect loan and MSME data and file DPT-3 by 30 June where required.", forms: ["DPT-3", "MSME-1"] },
      { when: "By 30 September", title: "Director KYC", text: "DIR-3 KYC (or the web version for directors whose details have not changed) for every DIN holder.", forms: ["DIR-3 KYC"] },
      { when: "Before the AGM", title: "Board meeting to approve accounts", text: "Board approves financial statements and board's report and calls the AGM with proper notice.", forms: ["Board minutes"] },
      { when: "By 30 September", title: "Annual General Meeting", text: "Accounts adopted; auditor appointed or ratified as needed; minutes recorded.", forms: ["AGM minutes", "ADT-1"] },
      { when: "Within 30 days of AGM", title: "Financial statements filed", text: "AOC-4 with the audited accounts and board's report.", forms: ["AOC-4"] },
      { when: "Within 60 days of AGM", title: "Annual return filed", text: "MGT-7, or MGT-7A for small companies and OPCs, with shareholder and director details.", forms: ["MGT-7", "MGT-7A"] },
      { when: "Through the year", title: "Board meetings and registers", text: "Quarterly or half-yearly board meetings as applicable, minutes and register updates after every event.", forms: ["MBP-1", "DIR-8"] }
    ],
    tiers: [
      { name: "Small company / OPC", for: "Low-activity companies and OPCs", price: 9999, priceNote: "per year, from", includes: ["AOC-4 and MGT-7A", "DIR-3 KYC for up to 2 directors", "Board meeting and AGM minutes", "Compliance calendar with reminders"] },
      { name: "Standard", for: "Operating private companies", price: 14999, priceNote: "per year, from", featured: true, includes: ["Everything in Small company", "MGT-7 where applicable", "ADT-1, DPT-3 and MSME-1", "Board's report drafting", "Statutory registers maintained", "Coordination with your statutory auditor"] },
      { name: "Funded startup", for: "Companies with investors and ESOPs", price: 29999, priceNote: "per year, from", includes: ["Everything in Standard", "Up to 6 board meetings and resolutions", "Allotment and ESOP-related filings during the year", "Investor reporting pack for the board", "Dedicated compliance manager"] }
    ],
    govFeesNote: "MCA filing fees depend on the company's authorised capital and are paid at actuals; any additional fee for past delays is extra. The statutory audit fee is paid to your auditor and is not part of these plans. Income-tax and GST returns are quoted separately.",
    deliverables: [
      "AOC-4 filed with financial statements",
      "MGT-7 or MGT-7A filed",
      "DIR-3 KYC for every director",
      "ADT-1, DPT-3 and MSME-1 where applicable",
      "Board's report and AGM notice",
      "Minutes of board and general meetings",
      "Updated statutory registers",
      "Filing receipts (SRNs) and challans in one folder"
    ],
    faqs: [
      { q: "What is the due date for AOC-4 and MGT-7?", a: "AOC-4 is due within 30 days of the AGM and MGT-7 or MGT-7A within 60 days of the AGM. For a company holding its AGM on 30 September, that means AOC-4 by 30 October and MGT-7 by 29 November. OPCs, which do not hold an AGM, file AOC-4 within 180 days of the end of the financial year." },
      { q: "What is the penalty for late filing of annual returns?", a: "An additional fee of ₹100 per day of delay applies to each of AOC-4 and MGT-7, with no maximum. Separate penalties can apply to the company and officers under the Act, and continued default for three years can disqualify directors under section 164(2)." },
      { q: "Who must file DIR-3 KYC?", a: "Every individual holding a DIN, whether or not they are currently a director of any company, must complete director KYC. If it is not filed by the due date the DIN is marked deactivated and reactivation requires the late fee, currently ₹5,000. MCA has revised the KYC frequency and process from time to time, so check the current rule each year — we track it for our clients." },
      { q: "Do small companies need a statutory audit?", a: "Yes. Every company, including small companies and OPCs, must have its financial statements audited by a Chartered Accountant regardless of turnover. Small companies benefit from other relaxations, such as filing the abridged MGT-7A and fewer mandatory board meetings." },
      { q: "How many board meetings are required in a year?", a: "A company must hold at least four board meetings a year with no more than 120 days between two meetings. OPCs, small companies and dormant companies can instead hold at least one meeting in each half of the calendar year with a gap of at least 90 days between them; private companies recognised as startups have similar relaxations." },
      { q: "What is DPT-3 and does my company need to file it?", a: "DPT-3 is the return of deposits and of outstanding receipts of money or loans that are not deposits, such as loans from directors. Most companies that have such amounts outstanding at 31 March must file it by 30 June. Loans from directors must be backed by a declaration that the money is not borrowed by the director." },
      { q: "Is ROC compliance required if the company had no business this year?", a: "Yes. A company with no transactions still needs audited accounts, an AGM, AOC-4, MGT-7/MGT-7A and director KYC. If the company will not be used, consider applying for dormant status or closing it through strike-off rather than letting fees and penalties accumulate." }
    ],
    related: {
      services: ["private-limited-company-registration", "cma-ca-cs-certification-services", "legal-staffing-virtual-compliance-officer"],
      tools: ["roc-compliance-calendar", "incorporation-cost-calculator"],
      compare: ["in-house-cs-vs-virtual-compliance-officer", "pvt-ltd-vs-llp-vs-opc"],
      blogs: ["dir-3-kyc-deactivated-din-reactivation-fee-process", "director-loan-private-limited-company-section-185-dpt3", "post-incorporation-compliance-checklist-first-60-days-sh1-adt1", "inc-20a-late-filing-penalty-after-180-days-condonation"]
    }
  },
  {
    slug: 'msme-udyam-dpiit-startup-registration', icon: 'rocket', navLabel: 'Startup India, MSME & GST', navHint: 'DPIIT recognition, 80-IAC, Udyam, GST',
    title: "Startup India (DPIIT), Udyam MSME and GST Registration",
    metaTitle: "DPIIT Startup Recognition, 80-IAC, Udyam & GST Registration",
    metaDescription: "DPIIT Startup India recognition, the 80-IAC tax exemption application to the Inter-Ministerial Board, Udyam MSME registration and GST registration for startups.",
    kicker: "Recognition & registrations",
    lead: "Get recognised as a startup, apply for the 80-IAC tax holiday with an application the Inter-Ministerial Board can actually assess, and put Udyam and GST in place — in the right order for your business.",
    chips: ["DPIIT recognition", "80-IAC application to the IMB", "Udyam registration", "GST registration"],
    intro: {
      heading: "Recognition and registrations, and what each one gives you",
      paragraphs: [
        "DPIIT recognition under the Startup India scheme is available to a Private Limited company, LLP or registered partnership firm that is within ten years of incorporation, has not crossed the notified turnover limit (₹100 crore in any year under the current definition) and is working on innovation, development or improvement of products, processes or services, or on a scalable business model with high potential for employment or wealth creation. Recognition brings self-certification under certain labour and environment laws, relaxed public procurement norms, faster patent examination with fee rebates, and is the gateway to the tax benefits.",
        "The section 80-IAC deduction lets an eligible startup deduct 100% of its profits for any three consecutive years out of its first ten. It is not automatic: a recognised company or LLP incorporated within the eligible window must apply to the Inter-Ministerial Board, which looks for genuine innovation and evidence of it. Most rejections come from vague descriptions, so we write the application around your product, technology and traction. (The Income-tax Act, 2025, effective 1 April 2026, carries the startup deduction forward under new section numbering; we follow the current provision when we file.)",
        "Udyam registration is the free, Aadhaar-based self-declaration that classifies you as a micro, small or medium enterprise by investment and turnover. It unlocks MSME benefits such as protection against delayed payments under the MSMED Act, and buyers' tax deduction for payments to micro and small suppliers depends on paying within 45 days. GST registration is mandatory once turnover crosses the threshold or for compulsory categories such as inter-state supply of goods and e-commerce sellers."
      ]
    },
    documents: [
      { group: "Entity documents", items: [
        { name: "Certificate of Incorporation and PAN", note: "Company, LLP or partnership registration." },
        { name: "MoA/AoA or LLP agreement / partnership deed", note: "To confirm eligibility and objects." },
        { name: "Director or partner details", note: "Names, PAN and contact details." }
      ] },
      { group: "Innovation evidence (DPIIT and 80-IAC)", items: [
        { name: "Pitch deck or product write-up", note: "What problem you solve and how your solution is new or better." },
        { name: "Website, app links or product demo", note: "Working evidence carries more weight than plans." },
        { name: "Patents, trademarks, awards or grants", note: "Optional, but strengthens the application." },
        { name: "Audited accounts and revenue data", note: "Needed for 80-IAC and to confirm the turnover limit." }
      ] },
      { group: "Udyam and GST", items: [
        { name: "Aadhaar of the authorised signatory", note: "Udyam uses Aadhaar OTP authentication." },
        { name: "Bank account and principal place of business proof", note: "Utility bill, rent agreement and owner NOC." },
        { name: "Photograph and identity proof of authorised signatory", note: "For GST REG-01." }
      ] }
    ],
    timeline: [
      { when: "Day 1", title: "Eligibility review", text: "We check age, turnover, entity type and how your innovation story will read to DPIIT and the IMB.", forms: [] },
      { when: "Day 1–3", title: "Udyam registration", text: "Online self-declaration with Aadhaar authentication; certificate usually generated quickly.", forms: ["Udyam"] },
      { when: "Day 2–10", title: "GST registration", text: "Application with Aadhaar authentication; approval in about a week unless physical verification is ordered.", forms: ["GST REG-01"] },
      { when: "Day 3–7", title: "DPIIT application", text: "Startup India portal application with the innovation write-up and supporting evidence.", forms: ["DPIIT"] },
      { when: "Usually 2–4 weeks", title: "DPIIT recognition", text: "Certificate of recognition issued, or clarifications answered if the department asks.", forms: ["DPIIT certificate"] },
      { when: "After recognition", title: "80-IAC application", text: "Detailed application to the Inter-Ministerial Board with financials and evidence; we track it and answer queries.", forms: ["80-IAC Form 1"] }
    ],
    tiers: [
      { name: "Udyam + GST", for: "New businesses getting registered", price: 2999, priceNote: "professional fee", includes: ["Udyam registration", "GST registration", "HSN/SAC code guidance", "First GST return calendar"] },
      { name: "DPIIT recognition", for: "Startups wanting Startup India benefits", price: 6999, priceNote: "professional fee", featured: true, includes: ["Eligibility review", "Innovation write-up drafted with you", "Startup India portal application", "Responses to department clarifications", "Udyam registration included"] },
      { name: "DPIIT + 80-IAC", for: "Recognised startups with profits ahead", price: 19999, priceNote: "professional fee", includes: ["Everything in DPIIT recognition", "80-IAC application to the IMB", "Evidence pack and financial summary", "Re-application support if the Board asks for more"] }
    ],
    govFeesNote: "Udyam, DPIIT recognition, 80-IAC applications and GST registration carry no government fee. Costs for supporting documents (notarisation, DSC renewals) are extra at actuals. Recognition, the 80-IAC certificate and GSTIN are granted by the authorities; we prepare and file the strongest application we can, but approval is their decision.",
    deliverables: [
      "Udyam registration certificate",
      "GST registration certificate (GSTIN)",
      "DPIIT certificate of recognition",
      "Innovation write-up you can reuse for grants and investors",
      "80-IAC application and IMB correspondence",
      "Calendar of follow-on obligations (GST returns, Udyam updates)"
    ],
    faqs: [
      { q: "Who is eligible for DPIIT startup recognition?", a: "A Private Limited company, LLP or registered partnership firm that is not more than ten years old from incorporation, whose turnover has not exceeded the notified limit (₹100 crore in any financial year under the current definition), and which is working on innovation or a scalable business model. It must not be formed by splitting up or reconstructing an existing business. DPIIT revises the definition from time to time, so we confirm the current criteria before applying." },
      { q: "Does DPIIT recognition automatically give the 80-IAC tax exemption?", a: "No. Recognition is a prerequisite, but the tax holiday requires a separate application to the Inter-Ministerial Board. Only companies and LLPs incorporated within the eligible window qualify, and the Board certifies eligibility after assessing innovation. Registered partnership firms are not eligible for 80-IAC." },
      { q: "Why do 80-IAC applications get rejected?", a: "The common reasons are a business description that reads like a regular trading or service business, no evidence of the product working, missing financial statements, or claims of innovation that are not explained. A focused write-up with demonstrable evidence makes a significant difference." },
      { q: "Is Udyam registration free?", a: "Yes. Udyam registration on the government portal has no fee and is based on Aadhaar and PAN self-declaration. Be wary of look-alike websites that charge for it while appearing official. Our fee is for preparing and filing correctly and linking it to your other registrations." },
      { q: "What are the MSME limits for micro, small and medium enterprises?", a: "Classification is based on both investment in plant and machinery or equipment and annual turnover. The limits were revised upward with effect from 1 April 2025 — micro up to ₹2.5 crore investment and ₹10 crore turnover, small up to ₹25 crore and ₹100 crore, medium up to ₹125 crore and ₹500 crore. Check the current notification as these are reviewed periodically." },
      { q: "When is GST registration mandatory?", a: "When aggregate turnover crosses ₹40 lakh for suppliers of goods (in most states) or ₹20 lakh for service providers, with lower limits in some special category states. It is mandatory regardless of turnover for inter-state supplies of goods, sellers on e-commerce platforms and certain other categories. Voluntary registration is allowed and often needed to work with larger customers." },
      { q: "Can an LLP get DPIIT recognition?", a: "Yes. LLPs are eligible for DPIIT recognition and, if incorporated within the eligible window, can apply for the 80-IAC deduction. Some benefits aimed at companies, such as those linked to share issues, do not apply to LLPs." }
    ],
    related: {
      services: ["private-limited-company-registration", "llp-registration-india", "roc-annual-compliance"],
      tools: ["incorporation-cost-calculator", "trademark-class-finder"],
      compare: ["pvt-ltd-vs-llp-vs-opc"],
      blogs: ["80-iac-tax-exemption-rejection-reasons-startup-india-dpiit", "convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer", "startup-share-valuation-report-registered-valuer-cma-fema", "legal-due-diligence-checklist-indian-seed-startups-cap-table"]
    }
  },
  {
    slug: 'legal-staffing-virtual-compliance-officer', icon: 'users', navLabel: 'Legal staffing & compliance officer', navHint: 'Remote paralegals, CLM and virtual compliance officers',
    title: "Remote Paralegals, Contract Management and Virtual Compliance Officer",
    metaTitle: "Remote Paralegal & Virtual Compliance Officer Services India",
    metaDescription: "Dedicated remote paralegals, contract lifecycle management, legal research and a virtual compliance officer retainer for Indian startups, SMEs and law firms.",
    kicker: "Legal staffing",
    lead: "A trained paralegal or compliance officer who works inside your tools and processes, supervised by experienced professionals — without the cost and lead time of a full-time hire.",
    chips: ["Dedicated remote paralegals", "Contract lifecycle management", "Legal research", "Virtual compliance officer"],
    intro: {
      heading: "What our legal staffing and compliance retainers cover",
      paragraphs: [
        "Growing companies and law firms often have more legal operations work than a single in-house counsel can absorb: first-draft contracts from templates, redlines against a playbook, NDAs, vendor and customer agreements, tracking renewals and obligations, maintaining a contract repository, and research memos. A dedicated remote paralegal takes this volume on, works in your email, document and CLM tools, and follows your approval matrix. Work that requires an advocate — legal opinions, representation before courts and tribunals — remains with enrolled advocates, either your own counsel or ones you choose.",
        "Contract lifecycle management (CLM) is the process from request through drafting, negotiation, signature, storage, obligation tracking and renewal. We set up or tidy up the process: intake forms, clause and template libraries, a searchable repository with key dates, and a monthly report of what is expiring or overdue. If you already use a CLM platform, we work in it; if not, we can run the process in tools you already have.",
        "A virtual compliance officer is a fractional compliance function on a monthly retainer. It covers the company law calendar (board meetings, registers, MCA filings), coordination with auditors and tax advisers, statutory and labour-law registrations and returns, POSH policy and Internal Committee administration, and a monthly compliance status report for founders and the board. For companies that are legally required to appoint a whole-time Company Secretary, this supports but does not replace that appointment."
      ]
    },
    documents: [
      { group: "For a dedicated paralegal", items: [
        { name: "Scope of work and volumes", note: "Typical contracts per month, research requests, turnaround needs." },
        { name: "Templates, playbooks and approval matrix", note: "We build these with you if they do not exist." },
        { name: "Tool access", note: "Email, document storage, CLM or matter management, with role-based permissions." },
        { name: "Confidentiality and data-processing terms", note: "Signed before any documents are shared." }
      ] },
      { group: "For a virtual compliance officer", items: [
        { name: "Incorporation documents and MCA login", note: "Certificate, MoA/AoA, master data and past filings." },
        { name: "Statutory registers and minutes", note: "Or whatever exists — we rebuild gaps." },
        { name: "Registrations held", note: "GST, PF, ESI, professional tax, shops and establishment, licences." },
        { name: "Existing policies", note: "POSH, data protection, code of conduct and others." }
      ] }
    ],
    timeline: [
      { when: "Week 1", title: "Scoping and agreement", text: "We agree scope, volumes, response times, supervision and confidentiality terms.", forms: ["NDA", "Engagement letter"] },
      { when: "Week 1–2", title: "Matching and onboarding", text: "A paralegal or compliance officer with relevant experience is assigned and onboarded to your tools.", forms: [] },
      { when: "Week 2–3", title: "Audit of what exists", text: "Contract repository, templates, compliance calendar and registers reviewed; gaps listed with priorities.", forms: ["Gap report"] },
      { when: "Week 3–4", title: "Processes set up", text: "Intake, playbook, CLM workflow and compliance calendar go live with your team.", forms: ["Playbook", "Calendar"] },
      { when: "Monthly", title: "Run and report", text: "Day-to-day work plus a monthly report of contracts handled, renewals due and compliance status.", forms: ["Monthly report"] },
      { when: "Quarterly", title: "Review", text: "We review volumes, quality and scope and adjust the plan.", forms: [] }
    ],
    tiers: [
      { name: "Virtual compliance officer", for: "Startups and SMEs without a company secretary", price: 14999, priceNote: "per month, from", includes: ["Company law calendar and MCA filings coordination", "Board meeting notices, minutes and registers", "Registrations and labour-law returns tracking", "POSH policy and Internal Committee support", "Monthly compliance status report"] },
      { name: "Dedicated paralegal", for: "Teams with steady contract and research volume", price: 49999, priceNote: "per month, from", featured: true, includes: ["Full-time remote paralegal on your tools", "Drafting from templates and redlines to your playbook", "Contract repository and renewal tracking", "Legal research memos", "Supervision and quality review", "Replacement cover for leave"] },
      { name: "CLM project", for: "One-time contract clean-up and setup", price: 39999, priceNote: "per project, from", includes: ["Contract audit and data extraction", "Clause and template library", "Repository with key dates and owners", "Intake and approval workflow", "Handover training for your team"] }
    ],
    govFeesNote: "Retainers cover professional services only. Government fees for filings, stamp duty on agreements, CLM software subscriptions and fees of advocates engaged for opinions or representation are extra. Monthly pricing depends on hours, volume and required response times.",
    deliverables: [
      "Named paralegal or compliance officer with backup cover",
      "Contract templates and negotiation playbook",
      "Searchable contract repository with renewal dates",
      "Legal research memos with sources",
      "Annual compliance calendar for your entity",
      "Board meeting notices, minutes and registers",
      "Monthly compliance and contracts report",
      "Confidentiality agreement and access log"
    ],
    faqs: [
      { q: "Can a paralegal give legal advice or appear in court?", a: "No. In India, practising law — giving legal opinions as an advocate and appearing before courts and tribunals — is reserved for advocates enrolled with a Bar Council. Our paralegals prepare drafts, research and documentation under the supervision of your counsel or our professionals; advice and representation remain with advocates." },
      { q: "How is a virtual compliance officer different from an in-house company secretary?", a: "A virtual compliance officer is a fractional service on a monthly retainer, suited to companies that need the work done but not a full-time employee. Companies with paid-up share capital of ₹10 crore or more, and listed companies, must appoint a whole-time Company Secretary; for them, our service supports the CS rather than replacing them. See our comparison of the two models for details." },
      { q: "How do you protect confidentiality?", a: "We sign a confidentiality and data-processing agreement before work starts, use role-based access to your systems rather than copying documents, keep an access log and remove access at the end of the engagement. Staff are bound by confidentiality obligations. If your sector has specific data-localisation or security requirements, we work within them." },
      { q: "What is contract lifecycle management?", a: "CLM is the end-to-end handling of a contract: request, drafting, negotiation, approval, signature, storage, obligation tracking and renewal or termination. Good CLM means you can find any signed contract quickly, know when it renews and see who owes what under it." },
      { q: "How quickly can a paralegal start?", a: "Usually within one to two weeks of signing the engagement, depending on the experience and language skills you need. We start with a short audit of your templates and repository so the paralegal is productive from the first month." },
      { q: "Do you handle POSH compliance?", a: "We help draft the POSH policy, constitute the Internal Committee, maintain records and prepare the annual report your committee must submit. The Internal Committee must include an external member from an NGO or a person familiar with issues relating to sexual harassment; we can help you identify a suitable external member." },
      { q: "Can we scale the arrangement up or down?", a: "Yes. Plans are reviewed quarterly and can move between part-time, full-time and project-based scopes. Notice periods are set out in the engagement letter so both sides can plan." }
    ],
    related: {
      services: ["roc-annual-compliance", "cma-ca-cs-certification-services", "private-limited-company-registration"],
      tools: ["roc-compliance-calendar"],
      compare: ["in-house-cs-vs-virtual-compliance-officer", "legacy-portals-vs-dedicated-cma-legal-desk"],
      blogs: ["virtual-compliance-officer-vs-in-house-cs-cost-india", "hire-dedicated-remote-paralegal-india-clm-research", "saas-msa-vendor-influencer-contract-legal-review-india", "posh-external-committee-member-service-india-compliance", "legal-due-diligence-checklist-indian-seed-startups-cap-table"]
    }
  }
];
