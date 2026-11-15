// Comparison pages. Rendered by seo/pages/compare.mjs at /compare/<slug>.
// Shape: { slug, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead,
//   columns: [{ key, name, tagline }] (2–3),
//   rows: [{ label, values: { <columnKey>: string }, best: <columnKey> (optional) }] (10–14),
//   decide: [{ column: <columnKey>, title, points: [string] }],
//   verdict: { heading, paragraphs: [string] }, faqs: [{ q, a }] (5–6), related: { services: [slug], tools: [slug], blogs: [slug] } }
export const comparisons = [
  {
    slug: 'pvt-ltd-vs-llp-vs-opc', navLabel: 'Pvt Ltd vs LLP vs OPC', navHint: 'Tax, compliance cost, investors, liability',
    title: "Private Limited vs LLP vs OPC: Which Structure Fits Your Business?",
    metaTitle: "Pvt Ltd vs LLP vs OPC in India: Tax, Compliance, Funding",
    metaDescription: "Private Limited vs LLP vs One Person Company compared on liability, income-tax, profit distribution, annual ROC forms, compliance cost, audit and funding.",
    kicker: "Entity comparison",
    lead: "All three give you limited liability and a separate legal identity. They differ sharply in how profits are taxed, what you file every year and whether investors can come in. Here is the side-by-side view.",
    columns: [
      { key: "pvt", name: "Private Limited", tagline: "Companies Act, 2013" },
      { key: "llp", name: "LLP", tagline: "LLP Act, 2008" },
      { key: "opc", name: "One Person Company", tagline: "Companies Act, 2013" }
    ],
    rows: [
      { label: "Governing law and constitution", values: { pvt: "Companies Act, 2013; MoA and AoA", llp: "LLP Act, 2008; LLP agreement", opc: "Companies Act, 2013; MoA and AoA with a nominee" } },
      { label: "Minimum members", values: { pvt: "2 shareholders and 2 directors (max 200 members)", llp: "2 partners, including 2 designated partners", opc: "1 member, who must be a natural person and Indian citizen, plus a nominee" } },
      { label: "Liability", values: { pvt: "Limited to unpaid share capital", llp: "Limited to agreed contribution", opc: "Limited to unpaid share capital" } },
      { label: "Income-tax on profits", values: { pvt: "22% under section 115BAA plus 10% surcharge and 4% cess (about 25.17%), if no specified exemptions are claimed; or normal rates", llp: "Flat 30%, plus 12% surcharge if income exceeds ₹1 crore and 4% cess; alternate minimum tax can apply", opc: "Same as a company, including the 115BAA option" } },
      { label: "Tax when profits reach owners", values: { pvt: "Dividends taxed in shareholders' hands at their rates; salary to director-shareholders deductible", llp: "Share of profit exempt for partners; remuneration and interest deductible within limits", opc: "Dividends taxed in the member's hands; salary deductible" }, best: "llp" },
      { label: "Annual MCA filings", values: { pvt: "AOC-4, MGT-7 or MGT-7A, ADT-1, DIR-3 KYC, DPT-3 and MSME-1 where applicable", llp: "Form 11 by 30 May, Form 8 by 30 October, DIR-3 KYC for partners", opc: "AOC-4 (within 180 days of year-end), MGT-7A, DIR-3 KYC" }, best: "llp" },
      { label: "Meetings and minutes", values: { pvt: "4 board meetings a year (relaxed for small companies and startups) and an AGM", llp: "No mandatory board meetings or AGM", opc: "At least one board meeting in each half of the calendar year (none if it has a single director); no AGM" }, best: "llp" },
      { label: "Typical annual compliance cost (professional fees, indicative)", values: { pvt: "Roughly ₹25,000–₹75,000+, including statutory audit", llp: "Roughly ₹10,000–₹40,000; more if audit applies", opc: "Roughly ₹20,000–₹50,000, including statutory audit" }, best: "llp" },
      { label: "Statutory audit", values: { pvt: "Mandatory every year, regardless of turnover", llp: "Only if turnover exceeds ₹40 lakh or contribution exceeds ₹25 lakh", opc: "Mandatory every year, regardless of turnover" }, best: "llp" },
      { label: "Investor readiness", values: { pvt: "Equity shares, preference shares, convertibles and ESOPs; standard for venture capital", llp: "No shares or ESOPs; investors must become partners", opc: "Single member only; must convert before bringing in investors" }, best: "pvt" },
      { label: "Foreign investment (FDI)", values: { pvt: "100% under the automatic route in most sectors, subject to sectoral caps and reporting", llp: "Allowed under the automatic route only in sectors with 100% automatic FDI and no performance conditions", opc: "Member must be an Indian citizen, so not a vehicle for foreign shareholders" }, best: "pvt" },
      { label: "Conversion options", values: { pvt: "Can convert to an LLP (LLP Act, Third Schedule) or a public company", llp: "Can convert to a company under section 366 of the Companies Act", opc: "Can convert to a Private or Public company voluntarily at any time" } },
      { label: "Perpetual succession", values: { pvt: "Yes; continues despite changes in shareholders", llp: "Yes; continues despite changes in partners", opc: "Yes; the nominee becomes member if the member dies or is incapacitated" } },
      { label: "Ease of closure", values: { pvt: "Strike-off (STK-2) if no liabilities, or voluntary liquidation; several months", llp: "Strike-off through Form 24 if inactive, or winding up; several months", opc: "Strike-off (STK-2) or voluntary liquidation, as for a company" } }
    ],
    decide: [
      { column: "pvt", title: "You plan to raise money or hire with equity", points: ["You expect angel, VC or strategic investment", "You want to grant ESOPs to employees", "You may take foreign investors or set up a foreign-owned subsidiary", "Customers or tenders expect a company", "You want 115BAA's 22% base rate on retained profits"] },
      { column: "llp", title: "Partners will run it and take the profits out", points: ["Professional practice, consulting or family business", "Profits will be distributed rather than reinvested", "You want the lightest annual compliance", "Turnover may stay below the audit threshold early on", "No plans for equity funding in the near term"] },
      { column: "opc", title: "A solo founder who wants a company from day one", points: ["You are the only owner and an Indian citizen", "You want limited liability and corporate status without a co-founder", "You can name a nominee", "You accept converting to a Private Limited when investors or co-founders join"] }
    ],
    verdict: {
      heading: "Our view: start with the end state in mind",
      paragraphs: [
        "If outside equity is on your roadmap within two or three years, start as a Private Limited company. Converting an LLP later is possible, but it adds cost, paperwork and tax analysis exactly when you want to close a round. The compliance load of a small private company is manageable and the 115BAA regime makes the tax on retained profits competitive.",
        "If the business will be owned and run by its partners and most profit will be distributed, an LLP usually costs less to maintain and avoids the second layer of tax on dividends. An OPC suits a solo Indian founder who wants a company structure now, with a clear plan to convert when co-founders or investors arrive.",
        "Tax outcomes depend on your numbers, especially how much you will pay out as salary, remuneration or dividends. Run the figures for your expected profits before deciding, and confirm current rates for the tax year — the Income-tax Act, 2025 applies from 1 April 2026 and carries forward these regimes under new section numbers."
      ]
    },
    faqs: [
      { q: "Is an LLP cheaper to run than a Private Limited company?", a: "Usually, yes. An LLP files two annual MCA forms, has no mandatory board meetings or AGM, and needs an audit only above ₹40 lakh turnover or ₹25 lakh contribution. A private company needs an audit every year and more filings, so its annual professional fees are typically higher." },
      { q: "Which pays less tax: a company or an LLP?", a: "It depends on how profits are used. A company opting for section 115BAA pays about 25.17% on profits, but dividends are then taxed again in shareholders' hands. An LLP pays 30% plus surcharge and cess, but partners' profit share is exempt and remuneration within limits is deductible. If profits are retained for growth, a company often comes out ahead; if they are distributed, an LLP often does." },
      { q: "Can an OPC have more than one director?", a: "Yes. An OPC has only one member, but it can have up to 15 directors (more with a special resolution). The single member is usually also a director." },
      { q: "Can a foreigner or NRI form an OPC?", a: "Only a natural person who is an Indian citizen can form an OPC; since 2021 this includes Indian citizens who are not resident in India. Foreign nationals cannot be the member of an OPC and should consider a Private Limited company." },
      { q: "Can I convert my LLP into a Private Limited company later?", a: "Yes, under section 366 of the Companies Act through Form URC-1, with the consent of partners and a no-objection from creditors. Tax neutrality on conversion depends on conditions in the Income-tax Act, so plan the conversion with your adviser before a funding round rather than during it." },
      { q: "Do startups need a Private Limited company to get DPIIT recognition?", a: "No. Private Limited companies, LLPs and registered partnership firms can all be recognised. If you run an OPC, check eligibility carefully before applying; many OPC founders convert to a Private Limited company first, which also prepares them for investors." }
    ],
    keywords: ["pvt ltd vs llp", "llp vs private limited company", "opc vs private limited", "best business structure for startup India", "llp tax rate India", "section 115BAA company tax", "one person company compliance"],
    related: {
      services: ["private-limited-company-registration", "llp-registration-india", "roc-annual-compliance", "msme-udyam-dpiit-startup-registration"],
      tools: ["incorporation-cost-calculator", "roc-compliance-calendar"],
      blogs: ["convert-proprietorship-to-pvt-ltd-gst-itc-02-transfer", "indian-subsidiary-registration-foreign-director-documents-fema", "post-incorporation-compliance-checklist-first-60-days-sh1-adt1", "80-iac-tax-exemption-rejection-reasons-startup-india-dpiit"]
    }
  },
  {
    slug: 'in-house-cs-vs-virtual-compliance-officer', navLabel: 'In-house CS vs virtual compliance officer', navHint: 'Cost, coverage and risk for startups',
    title: "In-house Company Secretary vs Virtual Compliance Officer",
    metaTitle: "In-house Company Secretary vs Virtual Compliance Officer",
    metaDescription: "Compare a full-time in-house Company Secretary or counsel with a fractional virtual compliance officer on cost, legal mandate, coverage, continuity and risk.",
    kicker: "Compliance staffing",
    lead: "A whole-time Company Secretary is a legal requirement for some companies and a luxury for most early-stage ones. Here is how the two models compare, and where the law draws the line.",
    columns: [
      { key: "inhouse", name: "In-house CS / counsel", tagline: "Full-time employee" },
      { key: "virtual", name: "Virtual compliance officer", tagline: "Fractional retainer" }
    ],
    rows: [
      { label: "Annual cost (indicative)", values: { inhouse: "Roughly ₹4–8 lakh CTC for a newly qualified CS; ₹10–25 lakh+ for experienced CS or legal counsel, plus benefits and tools", virtual: "Roughly ₹1.5–6 lakh a year on retainer, depending on scope and volume" }, best: "virtual" },
      { label: "When legally mandatory", values: { inhouse: "Whole-time CS required for listed companies and for any company with paid-up share capital of ₹10 crore or more (section 203 read with rules 8 and 8A)", virtual: "Cannot substitute a mandatory whole-time CS; suits companies below the threshold" }, best: "inhouse" },
      { label: "Coverage of work", values: { inhouse: "Board and shareholder matters, filings, internal policies; breadth depends on one person", virtual: "Company law calendar, filings, registers, labour and POSH compliance, coordination with auditors" } },
      { label: "Availability", values: { inhouse: "On site, during working hours; immediate for urgent matters", virtual: "Agreed response times; scheduled availability for board meetings" }, best: "inhouse" },
      { label: "Continuity", values: { inhouse: "Single point of failure during leave or after resignation", virtual: "Team-backed; another professional covers leave and transitions" }, best: "virtual" },
      { label: "Breadth of expertise", values: { inhouse: "Deep knowledge of your company; limited exposure to other situations", virtual: "Exposure across many companies; access to CA, CMA and legal colleagues" } },
      { label: "Scalability", values: { inhouse: "Hiring needed to add capacity", virtual: "Scope can move up or down each quarter" }, best: "virtual" },
      { label: "Knowledge of the business", values: { inhouse: "Daily involvement; understands context and people", virtual: "Builds context through onboarding and monthly reviews" }, best: "inhouse" },
      { label: "Data security", values: { inhouse: "Data stays within your systems and staff policies", virtual: "Role-based access to your systems under a confidentiality and data-processing agreement" } },
      { label: "Accountability", values: { inhouse: "Employee; as KMP, a whole-time CS can be an officer in default", virtual: "Contractual responsibility under the engagement letter; professional accountability to their institute" } },
      { label: "Onboarding time", values: { inhouse: "Typically 1–3 months to hire, plus notice period", virtual: "Typically 1–2 weeks" }, best: "virtual" },
      { label: "Secretarial certifications", values: { inhouse: "An employee CS cannot issue certificates that require a CS in practice, such as MGT-8 or a secretarial audit report", virtual: "A practising professional on the team can certify where the law allows" } }
    ],
    decide: [
      { column: "inhouse", title: "Hire full-time when the law or your scale demands it", points: ["Paid-up share capital is ₹10 crore or more, or you are listing", "Board and investor activity is heavy and constant", "You need someone on site for daily governance and contracts", "You have the budget for salary, benefits and backup"] },
      { column: "virtual", title: "Go fractional while you are below the threshold", points: ["Paid-up share capital is below ₹10 crore", "Compliance work is steady but not full-time", "You want team cover instead of a single person", "You want to add or drop scope as you grow", "You need help fast, without a three-month hiring cycle"] }
    ],
    verdict: {
      heading: "Our view: match the model to the mandate and the workload",
      paragraphs: [
        "Most startups and SMEs below ₹10 crore paid-up capital are not required to employ a whole-time Company Secretary, and their compliance workload rarely fills a full-time role. A virtual compliance officer delivers the calendar, filings and records at a fraction of the cost, with team cover.",
        "Once the company crosses the paid-up capital threshold, lists, or reaches a level of board and investor activity that needs daily attention, a whole-time CS becomes either mandatory or sensible. At that stage a fractional team can still support the in-house CS with certifications, peak-season filings and specialist work.",
        "Check the threshold against your latest paid-up capital after each allotment: an appointment is required once you cross it, and a vacancy in the office of whole-time KMP must be filled within six months."
      ]
    },
    faqs: [
      { q: "When must a private company appoint a whole-time Company Secretary?", a: "Under section 203 read with rule 8A of the Companies (Appointment and Remuneration of Managerial Personnel) Rules, 2014, a company with paid-up share capital of ₹10 crore or more must have a whole-time Company Secretary. Listed companies and public companies with paid-up capital of ₹10 crore or more must also appoint other whole-time KMP. Confirm the current rule before relying on it, as thresholds are revised from time to time." },
      { q: "What is the penalty for not appointing a required Company Secretary?", a: "Section 203 provides penalties on the company and on every director and KMP in default, including a daily penalty for continuing default, subject to a maximum. It is cheaper to appoint on time than to regularise later." },
      { q: "Can a virtual compliance officer sign MCA forms?", a: "Forms are signed by a director or authorised officer with their DSC. Where a form needs certification by a professional in practice, a practising CS, CA or CMA on the virtual team can certify it after verifying the records." },
      { q: "Is a virtual compliance officer suitable for a funded startup?", a: "Often, yes, as long as paid-up capital is below the whole-time CS threshold. Funded startups have more allotments, ESOP actions and board meetings, so choose a retainer that includes them and agree response times for investor deadlines." },
      { q: "Does an in-house CS replace the need for a practising CS?", a: "Not entirely. Certain certifications, such as MGT-8 for larger companies and secretarial audit where applicable, must be given by a Company Secretary in practice, not an employee." }
    ],
    keywords: ["virtual compliance officer India", "in-house company secretary cost", "whole-time company secretary requirement", "rule 8A company secretary", "outsourced company secretary", "fractional compliance officer"],
    related: {
      services: ["legal-staffing-virtual-compliance-officer", "roc-annual-compliance", "cma-ca-cs-certification-services"],
      tools: ["roc-compliance-calendar"],
      blogs: ["virtual-compliance-officer-vs-in-house-cs-cost-india", "hire-dedicated-remote-paralegal-india-clm-research", "posh-external-committee-member-service-india-compliance", "dir-3-kyc-deactivated-din-reactivation-fee-process"]
    }
  },
  {
    slug: 'legacy-portals-vs-dedicated-cma-legal-desk', navLabel: 'Portals vs dedicated CMA & legal desk', navHint: 'Why funded startups switch',
    title: "Online Registration Portals vs a Dedicated CMA & Legal Desk",
    metaTitle: "Online Filing Portals vs Dedicated CMA, CS & Legal Desk",
    metaDescription: "How high-volume online registration portals compare with a dedicated CMA, CS and legal desk on who files, resubmission remarks, certification and pricing.",
    kicker: "Choosing a provider",
    lead: "High-volume online portals made company registration accessible. A dedicated desk works differently. Neither is right for everyone — here is a fair look at how the two models operate.",
    columns: [
      { key: "portal", name: "Online registration portal", tagline: "High-volume, process-led" },
      { key: "desk", name: "Dedicated CMA, CS & legal desk", tagline: "Named professionals" }
    ],
    rows: [
      { label: "Who prepares and files", values: { portal: "Operations teams working to a standard process; the professional who certifies may not be the one who prepared the form", desk: "The same practising professional or small team prepares, reviews and certifies" }, best: "desk" },
      { label: "Point of contact", values: { portal: "Ticketing, chat or call centre; contact may change between stages", desk: "A named professional for the whole engagement" }, best: "desk" },
      { label: "Resubmission remarks", values: { portal: "Handled in a queue; time to respond depends on volume", desk: "Read and answered by the person who drafted the form, usually within a day" }, best: "desk" },
      { label: "Certification by a practising professional", values: { portal: "Provided, often by an empanelled professional", desk: "Provided by the professional who reviewed the underlying records, with UDIN" } },
      { label: "Turnaround on queries", values: { portal: "Standard service levels; fast for routine questions", desk: "Direct answers from the professional; depends on agreed response times" } },
      { label: "Pricing model", values: { portal: "Low headline prices; add-ons and government fees can be listed separately", desk: "Fixed scope-based quote; government fees at actuals with receipts" } },
      { label: "Pricing transparency", values: { portal: "Varies; check what the package includes and excludes", desk: "Line-item quote agreed before work starts" } },
      { label: "Post-incorporation compliance", values: { portal: "Often sold as separate packages", desk: "Planned at the start: INC-20A, first auditor, share certificates, registers" }, best: "desk" },
      { label: "Complex cases", values: { portal: "Standard cases handled well; non-standard cases may be escalated", desk: "Foreign directors, FDI reporting, valuations and cost certifications handled in-house" }, best: "desk" },
      { label: "Specialist certifications", values: { portal: "May not offer CAS-4, cost audit or bank CMA data", desk: "CMA, CA and CS certifications under one roof" }, best: "desk" },
      { label: "Suitability for simple, low-budget registrations", values: { portal: "Good fit: standardised, quick to start, low cost", desk: "Works, but may cost more than you need" }, best: "portal" },
      { label: "Suitability for funded startups", values: { portal: "Possible, with your own team managing follow-ups", desk: "Built for investor timelines, due diligence and clean records" }, best: "desk" }
    ],
    decide: [
      { column: "portal", title: "A portal can be the right call when", points: ["Your case is simple: Indian founders, standard objects, home or owned office", "Price is the main deciding factor", "You or your team can track follow-up compliance yourselves", "You are comfortable with ticket-based support"] },
      { column: "desk", title: "A dedicated desk is worth it when", points: ["You have foreign directors or shareholders, or FDI reporting", "You are raising money and need clean records for due diligence", "You need CMA certifications such as CAS-4, cost audit or bank CMA data", "You want one named professional accountable from filing to INC-20A", "Previous filings came back with resubmission remarks"] }
    ],
    verdict: {
      heading: "Our view: pick the model that fits the complexity, not the headline price",
      paragraphs: [
        "For a straightforward incorporation with Indian founders, a well-run online portal can do the job quickly and cheaply. The trade-off is that you usually deal with a process rather than a person, and post-incorporation steps may be your responsibility.",
        "Where cases are non-standard, money is being raised or certifications carry real accountability, a dedicated desk reduces rework: the person who answers ROC remarks is the person who drafted the form, and the certificates are signed by someone who has seen your records.",
        "Whichever you choose, ask who will certify your forms, how resubmission remarks are handled, what is excluded from the quoted price and who tracks INC-20A and your first-year filings."
      ]
    },
    faqs: [
      { q: "Is it safe to register a company through an online portal?", a: "Yes, if the provider is reputable and the forms are certified by a practising professional. The filings themselves are made on the MCA portal and the certificate is issued by the Registrar. Check what is included, who certifies and how follow-up is handled before you pay." },
      { q: "What are SPICe+ resubmission remarks?", a: "When the Central Registration Centre finds an issue in SPICe+ — such as a document mismatch, an objects clause concern or an address proof problem — it marks the form for resubmission with remarks. The applicant must correct and resubmit within the allowed time, or the application can be rejected." },
      { q: "Why does certification by a practising professional matter?", a: "The certifying CA, CS or CMA confirms that they have verified the information in the form against the records. They are professionally accountable for it, and a careless certification can lead to action against them and problems for the company." },
      { q: "Can I switch providers after incorporation?", a: "Yes. You own your company's MCA login, records and filings. A new provider will ask for your incorporation documents, registers, past filings and DSCs, and should review open compliance items before taking over." },
      { q: "How should I compare quotes?", a: "Compare the full scope: name approval, DSCs, number of directors, drafting of objects and AoA, GST, INC-20A, first auditor and share certificates. Ask for government fees and stamp duty to be shown separately at actuals so you can see the professional fee clearly." }
    ],
    keywords: ["online company registration vs CA", "company registration service India", "dedicated company secretary service", "SPICe+ resubmission", "practising CMA certification", "startup compliance partner"],
    related: {
      services: ["private-limited-company-registration", "cma-ca-cs-certification-services", "roc-annual-compliance", "legal-staffing-virtual-compliance-officer"],
      tools: ["incorporation-cost-calculator", "roc-compliance-calendar"],
      blogs: ["spice-plus-part-b-resubmission-remarks-mca-v3", "practicing-cma-certification-mca-roc-forms-spice-plus", "inc-20a-late-filing-penalty-after-180-days-condonation", "legal-due-diligence-checklist-indian-seed-startups-cap-table"]
    }
  }
];
