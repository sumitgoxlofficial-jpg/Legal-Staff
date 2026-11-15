// Programmatic local pages at /company-registration-in-<slug>. Rendered by seo/pages/location.mjs.
// Shape: { slug, name, type: 'city'|'state', state (state name; for a state, itself), stateKey (key into seo/data/stamp-duty.mjs),
//   roc: { office, jurisdiction, address (city-level only) } — optional; omit to use stampDuty[stateKey].roc. Set it only to refine a state
//        that has more than one RoC (Maharashtra: Mumbai/Pune; Tamil Nadu: Chennai/Coimbatore). Addresses are left out on purpose:
//        MCA offices move, and every incorporation filing is online, so we point readers to the MCA "Contact us" page instead.
//   stampDuty: { summary, moaAoaNote, sourceNote } — summary comes from stamp-duty.mjs at render time (so the calculator and these
//        pages never disagree); moaAoaNote is the local note for this place; sourceNote is optional.
//   ecosystem: [string] (3–5), highlights: [{ label, value }] (3–4, qualitative or well-established public facts only),
//   officeTips: [string] (2–3, registered-office tips for this place), nearby: [slug] (3–5), intro (unique 2–3 sentences),
//   hook (short phrase used in the meta description), faqs: [{ q, a }] (4) }
// Keep slug and name stable: lib.mjs (footer) and other pages link by slug.

const data = {
  /* ============================ CITIES ============================ */
  bangalore: {
    name: 'Bangalore', type: 'city', state: 'Karnataka', stateKey: 'karnataka',
    hook: 'RoC Bengaluru, Karnataka stamp duty and the city’s SaaS and deep-tech ecosystem',
    intro: 'Bengaluru (still widely called Bangalore) is where many Indian software, SaaS and deep-tech founders choose to incorporate, because the hiring pool, investor networks and customer base for technology businesses are concentrated here. A Bengaluru registered office also places the company under RoC Bengaluru, which handles a very large volume of startup filings, so routine post-incorporation changes are well-trodden ground.',
    stampDuty: { moaAoaNote: 'Karnataka stamp duty on the MoA and AoA is paid electronically with the SPICe+ filing. Office lease or leave-and-licence agreements for a Bengaluru office are a separate stamp-duty event and are usually executed on Karnataka e-stamp paper.' },
    ecosystem: [
      'Technology corridors such as Whitefield, Electronics City, Outer Ring Road and Koramangala/HSR Layout host product companies, global capability centres and early-stage startups.',
      'The Karnataka Startup Cell, under the state’s IT/BT department, runs the Karnataka startup policy and grant schemes such as Elevate for early-stage ventures.',
      'Research and academic institutions including the Indian Institute of Science (IISc) and IIIT Bangalore anchor deep-tech, biotech and hardware incubation.',
      'The state government hosts the annual Bengaluru Tech Summit, a common venue for startup showcases and investor meetings.'
    ],
    highlights: [{ label: 'Typical founders', value: 'SaaS, fintech, deep-tech, D2C' }, { label: 'State nodal agency', value: 'Karnataka Startup Cell' }, { label: 'Professional tax', value: 'Levied in Karnataka' }],
    officeTips: [
      'Co-working spaces in Koramangala, HSR Layout and Indiranagar routinely issue a registered-office NOC with a utility bill; ask for both before you file, since SPICe+ needs the bill in the owner’s or operator’s name.',
      'If you use a founder’s rented flat, get the landlord’s NOC in writing — many Bengaluru rental agreements prohibit commercial use, and a later dispute can force an INC-22 change of address.',
      'Karnataka levies professional tax on salaries, so register the company under the Karnataka professional tax law as soon as you hire (AGILE-PRO-S can be used to apply at incorporation).'
    ],
    nearby: ['karnataka', 'chennai', 'hyderabad', 'coimbatore', 'kochi'],
    faqs: [
      { q: 'Which RoC registers a company with a Bangalore address?', a: 'Incorporation applications filed on SPICe+ are processed centrally by the Central Registration Centre, but once incorporated a company with its registered office anywhere in Karnataka — including Bengaluru — falls under the Registrar of Companies, Bengaluru. Later filings such as INC-22, MGT-7 and AOC-4 are tracked against that RoC.' },
      { q: 'Can I register my Bangalore startup at a co-working space?', a: 'Yes. The Companies Act only requires a registered office capable of receiving communications. A co-working operator’s NOC, a recent utility bill for the premises and your agreement with the operator are normally accepted. Keep the agreement current, because the RoC can physically verify the office.' },
      { q: 'Do I need a Shops and Establishments registration in Bengaluru?', a: 'Commercial establishments in Karnataka are covered by the Karnataka Shops and Commercial Establishments Act, 1961. Once you operate from an office with staff, registration under that Act is generally required; we confirm the current process with the labour department portal when we set up your compliances.' },
      { q: 'Is a Karnataka company eligible for state startup grants?', a: 'Karnataka’s startup policy offers recognition and grant schemes such as Elevate to eligible startups registered in the state. Eligibility rules and calls for applications change each round, so check the Karnataka Startup Cell’s current notification before applying; DPIIT recognition under Startup India is a separate, national scheme.' }
    ]
  },
  mumbai: {
    name: 'Mumbai', type: 'city', state: 'Maharashtra', stateKey: 'maharashtra',
    roc: { office: 'RoC Mumbai', jurisdiction: 'Companies with a registered office in Mumbai, Thane and the other Maharashtra districts that are not assigned to RoC Pune' },
    hook: 'RoC Mumbai, Maharashtra stamp duty and India’s financial-services hub',
    intro: 'Mumbai is India’s financial capital, so founders building fintech, capital-markets, media and consumer brands often incorporate here to sit close to banks, regulators and institutional investors. A Mumbai registered office places the company under RoC Mumbai, one of two Registrars in Maharashtra, which matters if you later want to move the office to Pune.',
    stampDuty: { moaAoaNote: 'Maharashtra stamp duty on the MoA and AoA is paid through SPICe+; the AoA duty in Maharashtra depends on authorised capital, so raising capital later also needs a stamp-duty check. Leave-and-licence agreements for Mumbai premises must be registered, and online e-registration is commonly used.' },
    ecosystem: [
      'Mumbai is home to the headquarters of the Reserve Bank of India, SEBI, BSE and the National Stock Exchange, which is why fintech and wealth-tech companies cluster here.',
      'Bandra Kurla Complex (BKC), Lower Parel and Andheri host financial, media and consumer-brand businesses, with Navi Mumbai and Thane offering lower-cost office space.',
      'The Maharashtra State Innovation Society (MSInS) runs the state startup policy, including the Maharashtra Startup Week and related schemes.',
      'IIT Bombay and its incubator, SINE, support deep-tech and engineering startups.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Fintech, media, consumer, capital markets' }, { label: 'State nodal agency', value: 'Maharashtra State Innovation Society' }, { label: 'Registrars in the state', value: 'Two (Mumbai and Pune)' }],
    officeTips: [
      'Register the leave-and-licence agreement for your office or flat; an unregistered agreement in Maharashtra is a common reason banks and GST officers ask for more documents.',
      'Housing-society flats can be used as a registered office, but get an NOC from the owner and check the society’s bye-laws if staff or visitors will come to the premises.',
      'Navi Mumbai and Thane addresses are also under RoC Mumbai, so a move between these and Mumbai city does not change your Registrar.'
    ],
    nearby: ['maharashtra', 'pune', 'ahmedabad', 'surat'],
    faqs: [
      { q: 'Is a Mumbai company registered with RoC Mumbai or RoC Pune?', a: 'A company whose registered office is in Mumbai is under RoC Mumbai. Maharashtra has two Registrars, and RoC Pune covers Pune and a group of other districts, so the district of your registered office decides which Registrar your company belongs to.' },
      { q: 'How is stamp duty on the AoA calculated in Maharashtra?', a: 'Maharashtra charges stamp duty on the Articles of Association with reference to the company’s authorised share capital, subject to a ceiling, while the MoA attracts a fixed amount. The amount is computed and paid inside SPICe+. Use our cost calculator for the current estimate and confirm on the MCA fee page before filing.' },
      { q: 'Can I shift my registered office from Mumbai to Pune later?', a: 'Yes, but because Pune is under a different Registrar within the same state, the shift needs confirmation from the Regional Director in Form INC-23 before you file INC-22. Budget a few weeks for this. A move within Mumbai, Thane or Navi Mumbai only needs a board resolution and INC-22 within 30 days.' },
      { q: 'Do Mumbai companies need professional tax registration?', a: 'Yes. Maharashtra levies professional tax, so a company needs an enrolment certificate (PTEC) for itself and a registration certificate (PTRC) once it pays salaries above the threshold. AGILE-PRO-S lets you apply for Maharashtra professional tax at incorporation.' }
    ]
  },
  'delhi-ncr': {
    name: 'Delhi NCR', type: 'city', state: 'Delhi', stateKey: 'delhi',
    hook: 'choosing between a Delhi, Gurugram or Noida address, RoC jurisdiction and stamp duty',
    intro: 'The National Capital Region spans three jurisdictions — the NCT of Delhi, Haryana (Gurugram, Faridabad) and Uttar Pradesh (Noida, Ghaziabad) — so the first decision for an NCR founder is which side of the border the registered office sits on. That choice fixes your Registrar, your state stamp duty, your Shops and Establishments law and even whether professional tax applies.',
    stampDuty: { moaAoaNote: 'In NCR, stamp duty follows the state of the registered office, not the city you operate from: a Delhi address pays Delhi duty, a Gurugram or Faridabad address pays Haryana duty and a Noida or Ghaziabad address pays Uttar Pradesh duty. Compare the three in the calculator before you choose.' },
    ecosystem: [
      'Delhi houses central ministries, regulators and DPIIT itself, which suits govtech, policy, legal-tech and B2G businesses.',
      'Gurugram’s Cyber City and Udyog Vihar host many consumer-internet companies and multinational offices, while Noida’s sectors along the expressway host IT services and electronics manufacturing.',
      'IIT Delhi, Delhi University and other institutions run incubators that support technology and social-impact startups.',
      'Haryana and Uttar Pradesh each run their own startup policies, so incentives differ depending on where in NCR you register.'
    ],
    highlights: [{ label: 'Jurisdictions in NCR', value: 'Delhi, Haryana, Uttar Pradesh' }, { label: 'Registrars involved', value: 'RoC Delhi & Haryana; RoC Kanpur (for UP)' }, { label: 'Key choice', value: 'Which state your registered office is in' }],
    officeTips: [
      'Decide the registered-office state first: shifting later from Delhi to Noida (UP) or vice versa is a change of state that needs a special resolution, MoA alteration and Regional Director approval.',
      'Many NCR founders live in one state and work in another. You can register at a co-working space in the state you prefer, provided you hold a valid NOC and utility bill for it.',
      'Delhi and Gurugram are both under RoC Delhi & Haryana, so moving between them changes your state (and stamp duty and labour laws) but not your Registrar.'
    ],
    nearby: ['delhi', 'gurgaon', 'noida', 'chandigarh', 'jaipur'],
    faqs: [
      { q: 'Should I register my NCR startup in Delhi, Gurugram or Noida?', a: 'There is no single answer. Delhi and Gurugram share one Registrar (RoC Delhi & Haryana), while Noida falls under the Uttar Pradesh Registrar at Kanpur. Stamp duty, Shops and Establishments rules and state incentives differ in all three. Most founders pick the state where their main office and team will actually be, so that GST and labour registrations line up with the registered office.' },
      { q: 'Does professional tax apply in Delhi NCR?', a: 'Delhi, Haryana and Uttar Pradesh do not currently levy professional tax on salaried employees, which keeps payroll compliance simpler than in states such as Maharashtra or Karnataka. Confirm the position each year, as state laws can change.' },
      { q: 'Can my GST registration be in Gurugram if the company is registered in Delhi?', a: 'Yes. GST is registered state-wise for each place of business, so a Delhi company with an office in Gurugram registers for GST in Haryana for that office (and in Delhi too if it supplies from there). The registered office and the GST address do not have to be the same.' },
      { q: 'How long does company registration in Delhi NCR take?', a: 'Once DSCs are ready and the name is approved, SPICe+ applications are typically approved in 7–15 working days, regardless of which NCR state you choose. Delays usually come from address-proof mismatches or name objections, not from the location.' }
    ]
  },
  gurgaon: {
    name: 'Gurgaon', type: 'city', state: 'Haryana', stateKey: 'haryana',
    hook: 'Haryana stamp duty, RoC Delhi & Haryana and Gurugram’s corporate corridors',
    intro: 'Gurugram (officially renamed from Gurgaon in 2016) is the NCR’s corporate office hub, and many consumer-internet, mobility and SaaS companies, as well as Indian subsidiaries of multinationals, are registered here. A Gurugram address puts you in Haryana for stamp duty and labour law, while your Registrar is still RoC Delhi & Haryana — the same office as for a Delhi company.',
    stampDuty: { moaAoaNote: 'A Gurugram registered office pays Haryana stamp duty on the MoA and AoA, collected through SPICe+. Office leases in Gurugram are typically executed on Haryana e-stamp paper.' },
    ecosystem: [
      'Cyber City, Golf Course Road, Sohna Road and Udyog Vihar host a dense mix of startups, multinational regional offices and global capability centres.',
      'The automobile and auto-components cluster around Gurugram and IMT Manesar supports mobility, logistics and manufacturing-tech businesses.',
      'Haryana’s startup policy and its industrial development corporation (HSIIDC) offer incentives and industrial plots for eligible units.',
      'Proximity to Indira Gandhi International Airport makes Gurugram a common base for companies with overseas parents or clients.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Consumer internet, mobility, SaaS, foreign subsidiaries' }, { label: 'Registrar', value: 'Shared with Delhi' }, { label: 'Professional tax', value: 'Not levied in Haryana' }],
    officeTips: [
      'Gurugram has a large supply of co-working and serviced offices; make sure the NOC is issued by the entity named on the electricity bill, since operators often sub-lease from a landlord.',
      'Indian subsidiaries of foreign companies often use a serviced office at first; keep the agreement and NOC renewed, because banks and FEMA reporting (FC-GPR) rely on a valid registered address.',
      'If your team works from Gurugram but you want a Delhi registered office, remember that GST registration in Haryana is still needed for the Gurugram office.'
    ],
    nearby: ['delhi-ncr', 'delhi', 'noida', 'chandigarh'],
    faqs: [
      { q: 'Which RoC handles companies registered in Gurugram?', a: 'Companies with a registered office in Haryana, including Gurugram, are under the Registrar of Companies, NCT of Delhi & Haryana. Incorporation itself is processed by the Central Registration Centre, and the company is then mapped to that Registrar.' },
      { q: 'Is registering in Gurugram cheaper than in Delhi?', a: 'Government fees to MCA are the same everywhere; the difference is state stamp duty on the MoA and AoA, which follows Haryana’s schedule for a Gurugram address. The gap is usually small for a startup with modest authorised capital — compare both states in our calculator.' },
      { q: 'Can a foreign company set up a subsidiary in Gurugram?', a: 'Yes. A wholly owned subsidiary is incorporated as a private limited company through SPICe+, with at least one resident Indian director. Foreign investment must follow FEMA and the FDI policy for the sector, and the inward remittance is reported to the RBI in Form FC-GPR after shares are allotted.' },
      { q: 'Do I need a Shops and Establishments registration for a Gurugram office?', a: 'Offices with employees in Haryana are generally covered by the Punjab Shops and Commercial Establishments Act, 1958 as applicable in Haryana, with registration done online through the state labour department. We confirm the current requirement when setting up post-incorporation compliances.' }
    ]
  },
  noida: {
    name: 'Noida', type: 'city', state: 'Uttar Pradesh', stateKey: 'uttar-pradesh',
    hook: 'Uttar Pradesh stamp duty, the Kanpur RoC and Noida’s IT and electronics clusters',
    intro: 'Noida and Greater Noida are planned industrial townships in Uttar Pradesh where IT services firms, electronics manufacturers and edtech and media companies have set up large campuses. Founders choose Noida for lower office costs than Delhi or Gurugram while staying within NCR, and a Noida address places the company under the Uttar Pradesh Registrar at Kanpur.',
    stampDuty: { moaAoaNote: 'A Noida registered office pays Uttar Pradesh stamp duty on the MoA and AoA through SPICe+. Office leases in Noida are executed on UP e-stamp paper, and leases of authority-allotted property may also need the development authority’s permission.' },
    ecosystem: [
      'IT and ITeS campuses are concentrated in Noida’s Sectors 62 and 63 and along the Noida–Greater Noida Expressway.',
      'Noida and Greater Noida host a large electronics and mobile-phone manufacturing cluster, supported by central production-linked incentive schemes.',
      'Uttar Pradesh’s startup policy and the state’s incubator network support early-stage ventures, alongside the Noida, Greater Noida and Yamuna Expressway development authorities that allot industrial land.',
      'The Noida International Airport project at Jewar is expected to add logistics and warehousing demand to the region.'
    ],
    highlights: [{ label: 'Typical founders', value: 'IT services, electronics, edtech, media' }, { label: 'Land allotment', value: 'Development authorities (Noida, Greater Noida, YEIDA)' }, { label: 'Professional tax', value: 'Not levied in Uttar Pradesh' }],
    officeTips: [
      'Much of Noida is leasehold land allotted by the development authority. If you rent an industrial or institutional plot, check that the lease deed permits your use and sub-letting before you rely on it as a registered office.',
      'Residential addresses in Noida sectors are accepted by the RoC with an owner’s NOC, but local authority rules may restrict running a commercial office from them — use the address only for registered-office purposes if in doubt.',
      'Noida and Ghaziabad are both under RoC Kanpur; moving to Delhi or Gurugram later is a change of state that needs Regional Director approval.'
    ],
    nearby: ['delhi-ncr', 'uttar-pradesh', 'lucknow', 'gurgaon'],
    faqs: [
      { q: 'Which RoC is a Noida company registered under?', a: 'Even though Noida is in NCR, companies with a registered office in Uttar Pradesh fall under the Registrar of Companies at Kanpur, not the Delhi Registrar. Since filings are online, this rarely affects day-to-day work, but it matters for any matter that needs the RoC’s attention.' },
      { q: 'Is Noida a good place to register an electronics or hardware startup?', a: 'Noida has an established electronics manufacturing ecosystem and authority-allotted industrial land, which is why many hardware businesses register here. Factory licences, pollution-board consents and land allotment run separately from company incorporation, so plan those in parallel.' },
      { q: 'Can I use my Noida flat as the registered office?', a: 'Yes, the Companies Act allows a residential address as a registered office. You need proof of address (a recent utility bill) and an NOC from the owner if the flat is not in a director’s name. Using the flat as a working office with staff may need permissions under local rules.' },
      { q: 'What does it cost to register a company in Noida?', a: 'Costs are MCA fees (often nil for small authorised capital under SPICe+), Uttar Pradesh stamp duty on the MoA and AoA, DSCs, and professional fees. Our incorporation cost calculator gives a line-by-line estimate for an Uttar Pradesh address.' }
    ]
  },
  hyderabad: {
    name: 'Hyderabad', type: 'city', state: 'Telangana', stateKey: 'telangana',
    hook: 'RoC Hyderabad, Telangana stamp duty and the T-Hub and Genome Valley ecosystem',
    intro: 'Hyderabad combines a large technology workforce with one of India’s strongest life-sciences clusters, so SaaS, pharma, biotech and global capability centre teams frequently incorporate here. A Hyderabad registered office places the company under RoC Hyderabad, which covers the state of Telangana.',
    stampDuty: { moaAoaNote: 'Telangana stamp duty on the MoA and AoA is paid with SPICe+. Lease deeds for Hyderabad offices are a separate instrument and attract Telangana stamp duty and, for longer terms, registration.' },
    ecosystem: [
      'T-Hub, the state-backed innovation hub, along with WE Hub for women entrepreneurs and T-Works for hardware prototyping, anchor the startup ecosystem.',
      'HITEC City, Gachibowli and the Financial District host large technology campuses and global capability centres.',
      'Genome Valley on the city’s outskirts is a long-established cluster for biotech, vaccines and life-sciences research.',
      'Institutions such as IIIT Hyderabad, the Indian School of Business and IIT Hyderabad run incubators and research parks.'
    ],
    highlights: [{ label: 'Typical founders', value: 'SaaS, pharma and biotech, GCCs' }, { label: 'Innovation hubs', value: 'T-Hub, WE Hub, T-Works' }, { label: 'Professional tax', value: 'Levied in Telangana' }],
    officeTips: [
      'T-Hub and many private incubators can provide a registered address for resident startups — confirm that they will issue an NOC and a utility bill in their name before you file.',
      'Gated-community flats are common registered offices for early-stage founders; get the owner’s NOC, and check association rules before receiving visitors or deliveries.',
      'Telangana levies professional tax, so register once you start paying salaries.'
    ],
    nearby: ['telangana', 'bangalore', 'visakhapatnam', 'chennai'],
    faqs: [
      { q: 'Which RoC handles companies registered in Hyderabad?', a: 'Companies with a registered office in Telangana are under the Registrar of Companies, Hyderabad. Andhra Pradesh has its own Registrar, so a company moving from Hyderabad to Visakhapatnam or Vijayawada changes both state and Registrar.' },
      { q: 'Is Hyderabad a good base for a pharma or biotech company?', a: 'Hyderabad has a deep pharma and life-sciences ecosystem, including Genome Valley. Incorporation is the same as for any company; the additional work is sectoral — drug licences, CDSCO approvals, pollution-control consents and, for foreign investment in pharma, the FDI conditions that apply to brownfield projects.' },
      { q: 'Do I need a Telangana Shops and Establishments registration?', a: 'Offices with employees in Telangana generally register under the Telangana Shops and Establishments Act, 1988 through the state labour department’s online portal. We add it to your post-incorporation checklist.' },
      { q: 'Can a T-Hub startup get DPIIT recognition?', a: 'Yes. DPIIT recognition under Startup India is open to any eligible private limited company, LLP or registered partnership, wherever it is incorporated. Being incubated at T-Hub can help with the supporting documents, but recognition is applied for separately on the Startup India portal.' }
    ]
  },
  pune: {
    name: 'Pune', type: 'city', state: 'Maharashtra', stateKey: 'maharashtra',
    roc: { office: 'RoC Pune', jurisdiction: 'Companies with a registered office in Pune district and the other Maharashtra districts assigned to RoC Pune' },
    hook: 'RoC Pune, Maharashtra stamp duty and Pune’s IT and automotive clusters',
    intro: 'Pune pairs a large IT and engineering workforce with one of India’s oldest automotive manufacturing belts, so product, SaaS and industrial-tech founders often incorporate here. Unlike Mumbai, a Pune registered office places the company under RoC Pune, Maharashtra’s second Registrar.',
    stampDuty: { moaAoaNote: 'Pune companies pay the same Maharashtra stamp duty on the MoA and AoA as Mumbai companies, through SPICe+. Leave-and-licence agreements for Pune premises must be registered, usually through Maharashtra’s online e-registration.' },
    ecosystem: [
      'The Rajiv Gandhi Infotech Park at Hinjewadi, Kharadi and Magarpatta host large IT and product-engineering campuses.',
      'Chakan, Pimpri-Chinchwad and Talegaon form an established automotive and auto-components manufacturing belt.',
      'Research institutions such as IISER Pune and the National Chemical Laboratory, with its Venture Center incubator, support science-led startups.',
      'The Maharashtra State Innovation Society runs the state startup policy for Pune founders as well as Mumbai.'
    ],
    highlights: [{ label: 'Typical founders', value: 'SaaS, engineering services, EV and auto-tech' }, { label: 'Registrar', value: 'RoC Pune (separate from Mumbai)' }, { label: 'Professional tax', value: 'Levied in Maharashtra' }],
    officeTips: [
      'Many Pune founders start from a home in Baner, Wakad or Kharadi. A registered leave-and-licence agreement plus the owner’s NOC usually satisfies both the RoC and the bank.',
      'Pimpri-Chinchwad MIDC plots are leasehold; check the MIDC lease permits your activity before using an industrial unit as the registered office.',
      'If you may move to Mumbai later, note that shifting from RoC Pune to RoC Mumbai needs Regional Director confirmation (INC-23), so choose the registered city with that in mind.'
    ],
    nearby: ['maharashtra', 'mumbai', 'surat', 'bangalore'],
    faqs: [
      { q: 'Is a Pune company registered under RoC Mumbai?', a: 'No. Maharashtra has two Registrars, and companies with a registered office in Pune fall under RoC Pune. Incorporation is processed centrally through SPICe+, after which the company is mapped to RoC Pune for its ongoing filings.' },
      { q: 'Does the Pune RoC affect stamp duty?', a: 'No. Stamp duty depends on the state, not the Registrar, so Pune and Mumbai companies pay the same Maharashtra stamp duty on the MoA and AoA. The Maharashtra AoA duty is linked to authorised capital, so keep that in mind when you set capital.' },
      { q: 'Can I register an auto-components or EV company in Pune with a factory in Chakan?', a: 'Yes. The registered office can be in Pune city while the factory is in Chakan or another MIDC area. The factory will need its own licences — factory registration, pollution-control consent and GST for that place of business — in addition to company incorporation.' },
      { q: 'How do I register for professional tax in Pune?', a: 'Maharashtra professional tax has two registrations: PTEC for the company itself and PTRC once you deduct tax from employee salaries. You can apply through AGILE-PRO-S at incorporation or later on the Maharashtra GST department’s portal.' }
    ]
  },
  chennai: {
    name: 'Chennai', type: 'city', state: 'Tamil Nadu', stateKey: 'tamil-nadu',
    roc: { office: 'RoC Chennai', jurisdiction: 'Companies with a registered office in Chennai and the Tamil Nadu districts not assigned to RoC Coimbatore' },
    hook: 'RoC Chennai, Tamil Nadu stamp duty and the city’s SaaS and manufacturing base',
    intro: 'Chennai has produced many of India’s best-known bootstrapped SaaS companies and remains a major centre for automobile, electronics and engineering manufacturing. Founders incorporate here for that combination of B2B software talent and industrial customers, and a Chennai registered office places the company under RoC Chennai.',
    stampDuty: { moaAoaNote: 'Tamil Nadu stamp duty on the MoA and AoA is paid through SPICe+. Office lease deeds in Chennai attract Tamil Nadu stamp duty and are registered at the sub-registrar for longer terms.' },
    ecosystem: [
      'The Old Mahabalipuram Road (OMR) IT corridor and TIDEL Park host a large share of the city’s software and SaaS companies.',
      'Sriperumbudur, Oragadam and the Chennai–Bengaluru industrial corridor form one of India’s major automobile and electronics manufacturing belts.',
      'IIT Madras, with its Research Park and incubation cell, supports a large number of deep-tech and engineering startups.',
      'StartupTN, the Tamil Nadu Startup and Innovation Mission, runs the state startup policy and seed-grant schemes.'
    ],
    highlights: [{ label: 'Typical founders', value: 'B2B SaaS, auto and electronics, deep-tech' }, { label: 'State nodal agency', value: 'StartupTN' }, { label: 'Registrars in the state', value: 'Two (Chennai and Coimbatore)' }],
    officeTips: [
      'In Chennai, professional tax is collected by the local body (Greater Chennai Corporation), so register the office with the corporation once you have staff.',
      'IIT Madras Research Park and other incubators can serve as a registered office for incubated startups if they issue an NOC; check the term of the incubation agreement.',
      'Tamil Nadu has two Registrars. A later move from Chennai to Coimbatore changes the Registrar and needs Regional Director confirmation.'
    ],
    nearby: ['tamil-nadu', 'coimbatore', 'bangalore', 'hyderabad'],
    faqs: [
      { q: 'Which RoC registers a company in Chennai?', a: 'Companies with a registered office in Chennai are under the Registrar of Companies, Chennai. Tamil Nadu also has a Registrar at Coimbatore for western districts, so the district of your registered office decides which one applies.' },
      { q: 'Is professional tax payable for a Chennai company?', a: 'Yes. In Tamil Nadu, professional tax is levied by local bodies under the state’s local-body laws, and in Chennai it is administered by the Greater Chennai Corporation. Both the company and its employees are covered, subject to the constitutional cap of ₹2,500 per person per year.' },
      { q: 'Can I get a StartupTN grant after registering in Chennai?', a: 'StartupTN runs seed-grant and support schemes for startups registered in Tamil Nadu that meet its criteria. Calls for applications open periodically, so check the current guidelines; DPIIT recognition is usually a prerequisite or an advantage.' },
      { q: 'Should a SaaS company selling overseas register in Chennai or abroad?', a: 'Many Chennai SaaS companies sell globally from an Indian private limited company. Export of services can be zero-rated under GST with a Letter of Undertaking, and foreign customers can pay into an Indian bank account. A foreign holding company is a separate decision that depends on fundraising and should be planned with FEMA and tax advice.' }
    ]
  },
  kolkata: {
    name: 'Kolkata', type: 'city', state: 'West Bengal', stateKey: 'west-bengal',
    hook: 'RoC Kolkata, West Bengal stamp duty and the city’s trading and IT base',
    intro: 'Kolkata is the commercial centre of eastern India, with long-established trading houses, tea, jute and engineering businesses alongside a growing IT and services sector in Salt Lake and New Town. Founders and family businesses incorporate here to serve the east and North East, and a Kolkata registered office places the company under RoC Kolkata.',
    stampDuty: { moaAoaNote: 'West Bengal stamp duty on the MoA and AoA is paid through SPICe+. Office tenancy agreements in Kolkata attract West Bengal stamp duty and, for longer terms, registration.' },
    ecosystem: [
      'Salt Lake Sector V and New Town (Rajarhat) host the city’s IT and ITeS companies, including the state-backed Webel facilities.',
      'Kolkata is a traditional base for tea, jute, steel and engineering businesses, many of them long-running family enterprises.',
      'IIM Calcutta’s Innovation Park and the incubators at IIT Kharagpur (in the same state) support startups.',
      'The Port of Kolkata and its Haldia dock complex support trading, import-export and logistics businesses.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Trading, IT services, family-business spin-offs' }, { label: 'IT hubs', value: 'Salt Lake Sector V, New Town' }, { label: 'Professional tax', value: 'Levied in West Bengal' }],
    officeTips: [
      'Many Kolkata businesses operate from family-owned property. If the premises are in a relative’s name, an NOC from the owner and a recent electricity bill (often CESC or WBSEDCL) are enough for the RoC.',
      'For an older building with joint or disputed ownership, use an address where the NOC-giver clearly holds title, to avoid problems at physical verification.',
      'West Bengal levies professional tax; AGILE-PRO-S lets you apply for it at incorporation.'
    ],
    nearby: ['west-bengal', 'bhubaneswar', 'guwahati', 'patna', 'ranchi'],
    faqs: [
      { q: 'Which RoC handles companies registered in Kolkata?', a: 'Companies with a registered office in West Bengal, including Kolkata, are under the Registrar of Companies, Kolkata. Filings are online, so you do not need to visit the office for incorporation or annual returns.' },
      { q: 'Can a family business in Kolkata convert into a private limited company?', a: 'Yes. A partnership firm can be converted into a company under Part I of Chapter XXI of the Companies Act, and a proprietorship can transfer its business to a new company under a business-transfer agreement. Stamp duty, GST and income-tax treatment of the transfer should be planned before you file.' },
      { q: 'Do I need West Bengal professional tax registration?', a: 'Yes. West Bengal levies professional tax on employers and employees, subject to the ₹2,500 annual cap. The company enrols itself and registers as an employer once it pays salaries.' },
      { q: 'Is Kolkata a good base for a business serving the North East?', a: 'Kolkata is the traditional gateway for trade with the North East and neighbouring countries, and many distribution and logistics companies are registered here for that reason. GST registrations will still be needed in each state where you keep a place of business.' }
    ]
  },
  ahmedabad: {
    name: 'Ahmedabad', type: 'city', state: 'Gujarat', stateKey: 'gujarat',
    hook: 'RoC Ahmedabad, Gujarat stamp duty, GIFT City and the city’s manufacturing base',
    intro: 'Ahmedabad is Gujarat’s commercial capital, with strong textile, pharmaceutical, chemicals and engineering industries and a fast-growing startup scene. Proximity to GIFT City in Gandhinagar also attracts fintech and financial-services founders, and an Ahmedabad registered office places the company under RoC Ahmedabad.',
    stampDuty: { moaAoaNote: 'Gujarat stamp duty on the MoA and AoA is paid through SPICe+. Leave-and-licence and lease agreements for Ahmedabad premises attract Gujarat stamp duty, typically on e-stamp paper.' },
    ecosystem: [
      'GIFT City near Gandhinagar hosts India’s International Financial Services Centre (IFSC), regulated by IFSCA, for banking, fund-management and fintech entities.',
      'Gujarat’s Student Startup and Innovation Policy (SSIP) and the state-backed iCreate centre support early-stage and technology ventures.',
      'IIM Ahmedabad’s incubator, CIIE.CO, has supported many Indian startups across sectors.',
      'Pharmaceuticals, chemicals and textiles are long-standing industries in and around Ahmedabad, supported by GIDC industrial estates.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Manufacturing, pharma, fintech (GIFT City), D2C' }, { label: 'Special zone nearby', value: 'GIFT City IFSC' }, { label: 'Professional tax', value: 'Levied in Gujarat' }],
    officeTips: [
      'A unit inside GIFT IFSC has additional IFSCA requirements; incorporate with a GIFT City address only once the premises and the IFSCA licensing route are confirmed.',
      'GIDC estate plots are leasehold; check that the allotment letter permits your activity before using the unit as a registered office.',
      'For a home office in Ahmedabad, the owner’s NOC and a recent Torrent Power or other electricity bill are normally sufficient.'
    ],
    nearby: ['gujarat', 'surat', 'mumbai', 'indore', 'jaipur'],
    faqs: [
      { q: 'Which RoC handles companies registered in Ahmedabad?', a: 'Companies with a registered office in Gujarat, including Ahmedabad and Gandhinagar, are under the Registrar of Companies, Ahmedabad. The same office also covers the Union Territory of Dadra and Nagar Haveli and Daman and Diu.' },
      { q: 'Can I register a fintech company in GIFT City?', a: 'Yes, but an IFSC unit is a regulated entity: in addition to company incorporation with a GIFT City address, it needs registration or a licence from the International Financial Services Centres Authority (IFSCA) for its activity. Plan the IFSCA application alongside incorporation.' },
      { q: 'Does Gujarat charge professional tax?', a: 'Yes. Gujarat levies professional tax, administered through municipal corporations in cities such as Ahmedabad, so both company enrolment and employer registration are needed once you hire.' },
      { q: 'Is a private limited company or an LLP better for a Gujarat manufacturing business?', a: 'A private limited company is usually preferred when you need bank finance, equity investors or government subsidies that require a company. An LLP suits closely held businesses that want lighter compliance. Our Pvt Ltd vs LLP vs OPC comparison sets out the trade-offs.' }
    ]
  },
  patna: {
    name: 'Patna', type: 'city', state: 'Bihar', stateKey: 'bihar',
    hook: 'RoC Patna, Bihar stamp duty and the state’s startup policy',
    intro: 'Patna is Bihar’s capital and its main commercial centre, and founders incorporate here for agri and food-processing ventures, edtech, healthcare, construction and businesses that supply state government projects. A Patna registered office places the company under RoC Patna, which covers the whole of Bihar.',
    stampDuty: { moaAoaNote: 'Bihar stamp duty on the MoA and AoA is paid with the SPICe+ filing. Rent agreements for Patna premises attract Bihar stamp duty separately.' },
    ecosystem: [
      'Bihar’s startup policy, administered through the state Department of Industries, offers recognition, seed funding and incubation support to eligible startups.',
      'IIT Patna and NIT Patna run incubation centres for technology ventures.',
      'Agri and food processing is a priority sector, with Bihar known for produce such as makhana and Muzaffarpur litchi.',
      'The Bihar Industrial Area Development Authority (BIADA) allots plots in industrial areas around Patna and other districts.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Agri and food processing, edtech, health, contracting' }, { label: 'Industrial land', value: 'BIADA industrial areas' }, { label: 'Professional tax', value: 'Levied in Bihar' }],
    officeTips: [
      'If the registered office is in a family-owned house, make sure the electricity bill is recent (not older than two months) and the NOC is signed by the person named on it.',
      'Companies bidding for state tenders often need a local registered office and GST registration in Bihar; keep the address consistent across both.',
      'Bihar levies professional tax, so register once you start paying salaries.'
    ],
    nearby: ['bihar', 'ranchi', 'kolkata', 'lucknow'],
    faqs: [
      { q: 'Which RoC handles companies registered in Patna?', a: 'Companies with a registered office anywhere in Bihar are under the Registrar of Companies, Patna. Incorporation is processed online by the Central Registration Centre, so no office visit is needed.' },
      { q: 'Can a Patna startup get support under the Bihar startup policy?', a: 'Startups registered in Bihar that meet the policy’s eligibility criteria can apply for recognition and support such as seed funding through the state’s startup portal. Benefits and conditions are revised from time to time, so check the current policy before applying.' },
      { q: 'Should a Patna contractor register as a company to bid for government work?', a: 'Many tenders require bidders to be a registered company or firm with GST, PAN and a minimum turnover or experience. A private limited company makes it easier to build a track record that survives changes in ownership. Check the specific tender’s eligibility clauses.' },
      { q: 'How long does company registration in Patna take?', a: 'The location does not change the MCA timeline: once DSCs are issued and documents are in order, SPICe+ approval typically takes 7–15 working days. Most delays come from name objections or address-proof issues.' }
    ]
  },
  ranchi: {
    name: 'Ranchi', type: 'city', state: 'Jharkhand', stateKey: 'jharkhand',
    hook: 'RoC Ranchi, Jharkhand stamp duty and the state’s mining and engineering base',
    intro: 'Ranchi is Jharkhand’s capital and the base for many businesses serving the state’s mining, heavy-engineering and public-sector economy, as well as a growing edtech and services community. A Ranchi registered office places the company under RoC Ranchi, which covers all of Jharkhand.',
    stampDuty: { moaAoaNote: 'Jharkhand stamp duty on the MoA and AoA is collected through SPICe+. Lease agreements for Ranchi premises attract Jharkhand stamp duty separately.' },
    ecosystem: [
      'Ranchi is home to Heavy Engineering Corporation (HEC) and serves the wider Jharkhand mining and metals belt, supporting engineering, contracting and supply businesses.',
      'Institutions such as IIM Ranchi and BIT Mesra run programmes and incubation support for founders.',
      'Jharkhand’s startup policy offers recognition and support schemes for eligible startups registered in the state.',
      'The Jharkhand Industrial Area Development Authority (JIADA) allots plots in industrial areas across the state.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Engineering services, mining supply, edtech' }, { label: 'Industrial land', value: 'JIADA' }, { label: 'Professional tax', value: 'Levied in Jharkhand' }],
    officeTips: [
      'Vendors to PSUs often need a registered office and GST in Jharkhand to be empanelled; use the same address for both to avoid mismatches in vendor registration.',
      'For premises in a family home, provide a recent electricity bill and the owner’s NOC; the RoC may verify the address physically.',
      'Jharkhand levies professional tax, so register as an employer once you pay salaries.'
    ],
    nearby: ['jharkhand', 'bokaro', 'patna', 'kolkata', 'raipur'],
    faqs: [
      { q: 'Which RoC handles companies registered in Ranchi?', a: 'Companies with a registered office anywhere in Jharkhand — Ranchi, Jamshedpur, Dhanbad or Bokaro — are under the Registrar of Companies, Ranchi.' },
      { q: 'Can a Ranchi company become a vendor to PSUs?', a: 'Yes. Vendor registration with public-sector companies is separate from incorporation and typically asks for the certificate of incorporation, PAN, GST registration, bank details and, in many cases, Udyam registration to claim MSE benefits under public procurement policy.' },
      { q: 'Should I register under Udyam after incorporating in Ranchi?', a: 'Udyam registration is free and recommended for micro, small and medium enterprises. It helps with priority-sector lending, the MSME delayed-payment protections and public-procurement preferences for micro and small enterprises.' },
      { q: 'What is the cost of company registration in Ranchi?', a: 'You pay MCA fees (often nil for small authorised capital), Jharkhand stamp duty on the MoA and AoA, DSCs for directors and our professional fee. Use the incorporation cost calculator with Jharkhand selected for a line-by-line estimate.' }
    ]
  },
  bokaro: {
    name: 'Bokaro', type: 'city', state: 'Jharkhand', stateKey: 'jharkhand',
    hook: 'RoC Ranchi jurisdiction, Jharkhand stamp duty and the Bokaro steel ancillary belt',
    intro: 'Bokaro Steel City grew around the SAIL-owned Bokaro Steel Plant, and many local companies are ancillary suppliers, fabricators, transporters and service contractors to the plant and to the coal belt around Dhanbad. Founders here usually incorporate to qualify for vendor registration and larger contracts, and a Bokaro registered office falls under RoC Ranchi.',
    stampDuty: { moaAoaNote: 'A Bokaro company pays Jharkhand stamp duty on the MoA and AoA through SPICe+ — the same as a Ranchi company. Leases of township or industrial-area premises are separate stamped instruments.' },
    ecosystem: [
      'The Bokaro Steel Plant, operated by Steel Authority of India Limited (SAIL), anchors a cluster of ancillary units, fabrication shops and service contractors.',
      'The nearby Dhanbad coal belt and IIT (ISM) Dhanbad support mining services, equipment and engineering businesses.',
      'Industrial plots in the Bokaro area are now allotted by the Jharkhand Industrial Area Development Authority (JIADA).',
      'Jharkhand’s startup policy and MSME schemes apply to eligible enterprises registered anywhere in the state, including Bokaro.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Steel ancillaries, fabrication, transport, contracting' }, { label: 'Anchor industry', value: 'Bokaro Steel Plant (SAIL)' }, { label: 'Registrar', value: 'RoC Ranchi' }],
    officeTips: [
      'Many premises in the steel township are company-owned quarters or allotted plots; confirm that the allotment permits commercial use and that the occupant can give an NOC before using it as a registered office.',
      'Suppliers to SAIL and other PSUs should keep the registered office, GST address and Udyam address consistent to avoid vendor-registration queries.',
      'If your workshop is in a JIADA area but you want the registered office at home, that is allowed — just register the workshop as an additional place of business for GST.'
    ],
    nearby: ['jharkhand', 'ranchi', 'kolkata', 'patna'],
    faqs: [
      { q: 'Which RoC handles a company registered in Bokaro?', a: 'Bokaro is in Jharkhand, so companies with a registered office there are under the Registrar of Companies, Ranchi. Everything is filed online, so you do not need to travel to Ranchi for incorporation or annual filings.' },
      { q: 'Should a SAIL ancillary supplier in Bokaro register as a private limited company?', a: 'A company is not mandatory for vendor registration, but it separates business liabilities from the promoter’s personal assets, makes it easier to bring in partners and borrow, and helps when tender conditions ask for a company with audited accounts. A proprietorship that has grown can transfer its business to a new company.' },
      { q: 'Is an LLP a good option for a small Bokaro contracting firm?', a: 'An LLP gives limited liability with lighter compliance than a company and no mandatory audit below the turnover and contribution thresholds. It is less suitable if you plan equity investment. Compare the options in our Pvt Ltd vs LLP vs OPC guide.' },
      { q: 'Do I need Udyam registration for a Bokaro business?', a: 'It is optional but useful. Udyam registration gives micro and small enterprises access to public-procurement preferences, MSME delayed-payment protection under the MSMED Act and priority-sector lending. It is free and done online after incorporation.' }
    ]
  },
  jaipur: {
    name: 'Jaipur', type: 'city', state: 'Rajasthan', stateKey: 'rajasthan',
    hook: 'RoC Jaipur, Rajasthan stamp duty and the city’s crafts, tourism and IT base',
    intro: 'Jaipur blends traditional export industries — gems and jewellery, handicrafts and block-printed textiles — with a growing community of D2C, IT and travel-tech startups. Founders incorporate here to build on those artisan supply chains and tourism economy, and a Jaipur registered office places the company under RoC Jaipur.',
    stampDuty: { moaAoaNote: 'Rajasthan stamp duty on the MoA and AoA is collected through SPICe+. Rent agreements for Jaipur premises attract Rajasthan stamp duty separately, usually on e-stamp paper.' },
    ecosystem: [
      'iStart Rajasthan, the state startup programme, offers recognition and support, and the Techno Hub incubator in Jaipur hosts early-stage ventures.',
      'Gems and jewellery, handicrafts and textiles such as Sanganeri block printing are long-established export industries.',
      'RIICO (Rajasthan State Industrial Development and Investment Corporation) runs industrial areas such as Sitapura and Mahindra World City Jaipur.',
      'Tourism and hospitality drive demand for travel, experiences and hotel-tech businesses.'
    ],
    highlights: [{ label: 'Typical founders', value: 'D2C crafts and jewellery, travel-tech, IT services' }, { label: 'State programme', value: 'iStart Rajasthan' }, { label: 'Professional tax', value: 'Not levied in Rajasthan' }],
    officeTips: [
      'Exporters should keep the registered office address identical on the IEC, GST and bank records; mismatches delay export incentives and bank realisation certificates.',
      'Walled-city and heritage-zone premises may have restrictions on commercial use; an RoC-acceptable NOC does not override local building rules.',
      'If you rent in an RIICO area, check that the allotment permits sub-letting before taking the premises as a registered office.'
    ],
    nearby: ['delhi-ncr', 'ahmedabad', 'gurgaon', 'indore'],
    faqs: [
      { q: 'Which RoC handles companies registered in Jaipur?', a: 'Companies with a registered office in Rajasthan are under the Registrar of Companies, Jaipur. Incorporation is processed online through SPICe+ and the Central Registration Centre.' },
      { q: 'Do I need an IEC to export jewellery or handicrafts from Jaipur?', a: 'Yes. An Importer-Exporter Code from the DGFT is required to export goods. It is issued online against the company’s PAN, usually within a few days of incorporation, and should carry the same registered-office address.' },
      { q: 'Is there professional tax in Rajasthan?', a: 'Rajasthan does not currently levy professional tax on salaried employees, so Jaipur companies have one fewer payroll registration than companies in states such as Maharashtra or West Bengal. Confirm each year in case the position changes.' },
      { q: 'Can a Jaipur startup get iStart recognition?', a: 'Startups registered in Rajasthan that meet the programme’s criteria can apply for iStart recognition, which unlocks state schemes and incubation support. It is separate from DPIIT recognition under Startup India; many founders hold both.' }
    ]
  },
  lucknow: {
    name: 'Lucknow', type: 'city', state: 'Uttar Pradesh', stateKey: 'uttar-pradesh',
    hook: 'Uttar Pradesh stamp duty, RoC Kanpur jurisdiction and Lucknow’s research and services base',
    intro: 'Lucknow is the capital of Uttar Pradesh, India’s most populous state, and founders incorporate here for healthcare, edtech, food, chikankari and textile brands, and businesses that serve state government departments. A Lucknow registered office places the company under the Uttar Pradesh Registrar at Kanpur — the same office as for Noida.',
    stampDuty: { moaAoaNote: 'A Lucknow company pays Uttar Pradesh stamp duty on the MoA and AoA through SPICe+, the same as a Noida company. Lease agreements for Lucknow premises are executed on UP e-stamp paper.' },
    ecosystem: [
      'Uttar Pradesh’s startup policy offers recognition, incubator support and incentives to eligible startups registered in the state.',
      'Lucknow hosts national research laboratories such as CSIR-CDRI (drug research), CSIR-NBRI (botanical research) and CSIR-CIMAP (medicinal and aromatic plants), relevant to pharma, nutraceutical and agri startups.',
      'IIM Lucknow and other institutions run incubators and entrepreneurship programmes.',
      'Lucknow’s chikankari embroidery is a GI-tagged craft, supporting fashion and D2C apparel brands.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Health, edtech, apparel, government services' }, { label: 'Research base', value: 'CSIR laboratories' }, { label: 'Professional tax', value: 'Not levied in Uttar Pradesh' }],
    officeTips: [
      'Companies supplying to state departments are often asked for a UP registered office or GST registration; keep the addresses consistent across your tender documents.',
      'For a home office in Gomti Nagar or Aliganj, a recent electricity bill and the owner’s NOC are usually enough for the RoC.',
      'Lucknow and Noida share the Kanpur Registrar, so a move between them only needs a board resolution and INC-22 within 30 days.'
    ],
    nearby: ['uttar-pradesh', 'noida', 'patna', 'dehradun'],
    faqs: [
      { q: 'Which RoC handles companies registered in Lucknow?', a: 'Companies with a registered office anywhere in Uttar Pradesh, including Lucknow, are under the Registrar of Companies, Kanpur. All filings are online, so you do not need to visit Kanpur.' },
      { q: 'Can I move my company from Lucknow to Noida later?', a: 'Yes. Since both are in Uttar Pradesh and under the same Registrar, the board can approve the change and you file INC-22 within 30 days with the new address proof. No Regional Director approval is needed.' },
      { q: 'Is a Lucknow nutraceutical or herbal startup subject to extra licences?', a: 'Incorporation is the same as for any company, but food and nutraceutical products need an FSSAI licence, and Ayurvedic or herbal medicines need a licence from the state AYUSH licensing authority. Plan these alongside incorporation.' },
      { q: 'What does it cost to register a company in Lucknow?', a: 'MCA fees, Uttar Pradesh stamp duty, DSCs and our professional fee. Stamp duty depends on authorised capital, so our calculator shows the estimate for your chosen capital with Uttar Pradesh selected.' }
    ]
  },
  chandigarh: {
    name: 'Chandigarh', type: 'city', state: 'Chandigarh', stateKey: 'chandigarh',
    hook: 'the tri-city choice between Chandigarh, Mohali and Panchkula, RoC and stamp duty',
    intro: 'Chandigarh is a Union Territory and the shared capital of Punjab and Haryana, and with Mohali (Punjab) and Panchkula (Haryana) it forms the tri-city — a base for IT services, healthcare, education and agri-business founders across north-west India. Because the tri-city spans three jurisdictions, the exact address you register decides your Registrar and stamp duty.',
    stampDuty: { moaAoaNote: 'A Chandigarh address pays the Union Territory’s stamp duty; a Mohali address pays Punjab duty; a Panchkula address pays Haryana duty. Check the address before you file, because the three can differ.' },
    ecosystem: [
      'Chandigarh’s IT Park and Mohali’s IT city host IT and ITeS companies across the tri-city.',
      'Institutions such as PGIMER, Panjab University and Punjab Engineering College support healthcare and technology ventures.',
      'Mohali has a growing electronics and pharma presence, and Punjab and Haryana each run their own startup policies for tri-city founders.',
      'The region serves the agri economy of Punjab and Haryana, supporting agri-tech, food processing and farm-equipment businesses.'
    ],
    highlights: [{ label: 'Jurisdictions in the tri-city', value: 'UT Chandigarh, Punjab (Mohali), Haryana (Panchkula)' }, { label: 'Typical founders', value: 'IT services, health, agri-tech, education' }, { label: 'Key choice', value: 'Which side of the boundary you register' }],
    officeTips: [
      'Mohali and Panchkula look like Chandigarh suburbs but are in different states: a Panchkula company is under RoC Delhi & Haryana, while Chandigarh and Mohali companies fall under the Chandigarh Registrar.',
      'Sector-wise residential properties in Chandigarh can be used as a registered office with the owner’s NOC, but running an office with staff may need permission under Chandigarh’s building rules.',
      'Shifting between Chandigarh, Mohali and Panchkula is a change of state or UT, which needs a special resolution and Regional Director approval — choose carefully at the start.'
    ],
    nearby: ['delhi-ncr', 'gurgaon', 'dehradun', 'delhi'],
    faqs: [
      { q: 'Which RoC handles companies registered in Chandigarh?', a: 'Companies with a registered office in the Union Territory of Chandigarh are under the Registrar of Companies, Chandigarh, which also covers Punjab (including Mohali). A Panchkula address is in Haryana and falls under RoC Delhi & Haryana instead.' },
      { q: 'Should I register in Chandigarh, Mohali or Panchkula?', a: 'Pick the jurisdiction where your main office will be, because GST, labour registrations and stamp duty follow the state or UT. Compare the stamp duty for Chandigarh, Punjab and Haryana in our calculator before you decide.' },
      { q: 'Can I change my registered office from Mohali to Chandigarh later?', a: 'Yes, but it is a shift from a state to a Union Territory, which requires a special resolution, alteration of the MoA and Regional Director approval under section 13. Budget a few months for the process.' },
      { q: 'Is professional tax payable in Chandigarh?', a: 'Professional tax rules differ across the tri-city, since Punjab, Haryana and the UT each set their own position. We confirm the current requirement for your registered address during post-incorporation setup.' }
    ]
  },
  indore: {
    name: 'Indore', type: 'city', state: 'Madhya Pradesh', stateKey: 'madhya-pradesh',
    hook: 'RoC Gwalior jurisdiction, Madhya Pradesh stamp duty and Indore’s trading and auto base',
    intro: 'Indore is Madhya Pradesh’s commercial capital, with a strong trading community, the Pithampur automotive and pharma cluster nearby, and a growing IT sector along the Super Corridor. Founders incorporate here for central-India distribution, manufacturing and IT services, and an Indore registered office falls under the Madhya Pradesh Registrar at Gwalior.',
    stampDuty: { moaAoaNote: 'Madhya Pradesh stamp duty on the MoA and AoA is paid through SPICe+. Lease agreements for Indore premises attract MP stamp duty, usually paid through the state’s e-stamping system.' },
    ecosystem: [
      'The Pithampur industrial area near Indore hosts automobile, auto-components and pharmaceutical manufacturers.',
      'IIM Indore and IIT Indore run incubation and entrepreneurship programmes.',
      'The Super Corridor and IT SEZs host software and IT-enabled services companies.',
      'Madhya Pradesh’s startup policy offers recognition and support to eligible startups registered in the state.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Trading and distribution, auto and pharma, IT services' }, { label: 'Industrial cluster', value: 'Pithampur' }, { label: 'Registrar', value: 'RoC Gwalior' }],
    officeTips: [
      'Traders in Indore’s markets often use the shop as the registered office; that is fine, but the electricity bill and NOC must match the exact shop number you file.',
      'Units in Pithampur are on industrial-development land; check that your allotment permits the activity and any sub-letting.',
      'Madhya Pradesh levies professional tax, so register as an employer once you pay salaries.'
    ],
    nearby: ['ahmedabad', 'raipur', 'jaipur', 'mumbai'],
    faqs: [
      { q: 'Which RoC handles companies registered in Indore?', a: 'Companies with a registered office anywhere in Madhya Pradesh, including Indore and Bhopal, are under the Registrar of Companies, Gwalior. Filings are online, so you will not need to travel to Gwalior.' },
      { q: 'Should an Indore trading business become a private limited company?', a: 'A company gives limited liability, makes it easier to raise bank finance and bring in partners, and is often preferred by large distributors and brands. A small, closely held trading business may find an LLP simpler. Our comparison guide sets out the trade-offs.' },
      { q: 'Is professional tax payable in Madhya Pradesh?', a: 'Yes. Madhya Pradesh levies professional tax on employers and employees, subject to the constitutional cap of ₹2,500 per person per year.' },
      { q: 'How long does company registration in Indore take?', a: 'Once DSCs are issued and documents are in order, SPICe+ approval typically takes 7–15 working days. The location has little effect on the timeline.' }
    ]
  },
  kochi: {
    name: 'Kochi', type: 'city', state: 'Kerala', stateKey: 'kerala',
    hook: 'RoC Kerala jurisdiction, Kerala stamp duty and Kerala Startup Mission support',
    intro: 'Kochi is Kerala’s commercial capital and home to the Kerala Startup Mission’s main startup complex, making it the natural base for many of the state’s tech, marine, spices and tourism founders. A Kochi registered office places the company under the Registrar of Companies for Kerala, which is located in Kochi (Ernakulam).',
    stampDuty: { moaAoaNote: 'Kerala stamp duty on the MoA and AoA is paid with the SPICe+ filing. Lease or rent agreements for Kochi premises attract Kerala stamp duty separately.' },
    ecosystem: [
      'The Kerala Startup Mission (KSUM), the state’s nodal agency, runs the Integrated Startup Complex at Kalamassery and a range of grant and incubation schemes.',
      'Infopark Kochi and SmartCity Kochi host IT and ITeS companies.',
      'Cochin Shipyard and the Port of Kochi support marine engineering, logistics and export businesses, and the city has a long history in the spice trade.',
      'Kerala’s large overseas diaspora means many founders set up companies with NRI shareholders or directors.'
    ],
    highlights: [{ label: 'Typical founders', value: 'IT and SaaS, marine and logistics, spices and food, tourism' }, { label: 'State nodal agency', value: 'Kerala Startup Mission' }, { label: 'Professional tax', value: 'Levied by local bodies in Kerala' }],
    officeTips: [
      'KSUM incubation spaces can be used as a registered office by incubated startups if KSUM issues an NOC; check the incubation term so you are not forced to change address soon after.',
      'In Kerala, professional tax is collected by the local body (for Kochi, the Kochi Municipal Corporation), so register once you have staff.',
      'If an NRI founder owns the premises, they can sign the NOC from abroad; have it notarised or apostilled as required by your bank.'
    ],
    nearby: ['coimbatore', 'bangalore', 'chennai'],
    faqs: [
      { q: 'Which RoC handles companies registered in Kochi?', a: 'Companies with a registered office in Kerala are under the Registrar of Companies, Kerala, located at Kochi (Ernakulam), which also covers Lakshadweep. Incorporation is processed online through SPICe+.' },
      { q: 'Can an NRI be a director or shareholder of a Kochi company?', a: 'Yes. NRIs can hold shares and be directors; a private limited company needs at least one director resident in India. Investment by NRIs is governed by FEMA — on a repatriation basis it is treated like foreign investment and reported to the RBI, while non-repatriable investment is treated like domestic investment.' },
      { q: 'Do Kerala Startup Mission benefits require a Kerala registered office?', a: 'KSUM schemes are generally aimed at startups registered in Kerala, and many also require KSUM or DPIIT recognition. Check the eligibility conditions of the specific scheme or grant call before applying.' },
      { q: 'Do I need a Shops and Establishments registration in Kochi?', a: 'Commercial establishments in Kerala are covered by the Kerala Shops and Commercial Establishments Act, 1960, with registration done online through the state labour department. We include it in your post-incorporation checklist.' }
    ]
  },
  surat: {
    name: 'Surat', type: 'city', state: 'Gujarat', stateKey: 'gujarat',
    hook: 'RoC Ahmedabad jurisdiction, Gujarat stamp duty and Surat’s diamond and textile trades',
    intro: 'Surat is known worldwide for diamond cutting and polishing and is one of India’s largest centres for synthetic textiles, so most companies here are manufacturers, traders and exporters in those trades, with a newer wave of D2C apparel and fintech founders. A Surat registered office falls under RoC Ahmedabad, which covers all of Gujarat.',
    stampDuty: { moaAoaNote: 'A Surat company pays Gujarat stamp duty on the MoA and AoA through SPICe+, the same as an Ahmedabad company. Leases for units in textile markets and diamond hubs attract Gujarat stamp duty separately.' },
    ecosystem: [
      'Surat is a global centre for diamond cutting and polishing, and the Surat Diamond Bourse was built to consolidate diamond trading in the city.',
      'The city’s textile markets and powerloom clusters make it a leading hub for synthetic fabrics and sarees.',
      'The Hazira industrial area hosts large steel, petrochemical and port operations.',
      'SVNIT Surat and Gujarat’s SSIP-backed incubators support local technology startups.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Diamonds and jewellery, textiles, D2C apparel' }, { label: 'Registrar', value: 'RoC Ahmedabad' }, { label: 'Professional tax', value: 'Levied in Gujarat' }],
    officeTips: [
      'Textile-market shops and diamond-hub offices are often held on long leases; confirm that the person giving the NOC holds the lease and the electricity connection.',
      'Diamond and jewellery exporters need an IEC and should keep the registered office identical across IEC, GST and bank records.',
      'If your manufacturing unit is in a GIDC estate and your registered office is in the city, register the unit as an additional place of business for GST.'
    ],
    nearby: ['gujarat', 'ahmedabad', 'mumbai', 'pune'],
    faqs: [
      { q: 'Which RoC handles companies registered in Surat?', a: 'Companies with a registered office in Gujarat, including Surat, are under the Registrar of Companies, Ahmedabad. All filings are online.' },
      { q: 'Should a Surat diamond trader register as a company or an LLP?', a: 'Both give limited liability. A private limited company suits businesses that need bank finance, plan to bring in outside investors or want a clearer path to scale. An LLP suits partner-run firms that want lighter compliance. We usually recommend deciding after looking at your banking and export plans.' },
      { q: 'Do I need an IEC for a Surat textile export company?', a: 'Yes. Export of goods requires an Importer-Exporter Code from the DGFT, issued online against the company’s PAN. You may also want registration with the relevant export promotion council to access certain benefits.' },
      { q: 'What does it cost to register a company in Surat?', a: 'MCA fees, Gujarat stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator, with Gujarat selected, gives a line-by-line estimate for your authorised capital.' }
    ]
  },
  coimbatore: {
    name: 'Coimbatore', type: 'city', state: 'Tamil Nadu', stateKey: 'tamil-nadu',
    roc: { office: 'RoC Coimbatore', jurisdiction: 'Companies with a registered office in Coimbatore and the neighbouring western Tamil Nadu districts assigned to RoC Coimbatore' },
    hook: 'RoC Coimbatore, Tamil Nadu stamp duty and the city’s pumps, textiles and engineering base',
    intro: 'Coimbatore is a major centre for textiles and spinning mills, pumps and motors, foundries and precision engineering, with a growing IT and SaaS presence. Many family manufacturing businesses and second-generation founders incorporate here, and a Coimbatore registered office falls under RoC Coimbatore rather than RoC Chennai.',
    stampDuty: { moaAoaNote: 'A Coimbatore company pays the same Tamil Nadu stamp duty on the MoA and AoA as a Chennai company, through SPICe+. Lease deeds for factory or office premises attract Tamil Nadu stamp duty and registration where applicable.' },
    ecosystem: [
      'Coimbatore is widely known for its pumps and motors industry, foundries and engineering units supplying national and export markets.',
      'Textiles and spinning mills have long been central to the regional economy, linked to the knitwear cluster in nearby Tiruppur.',
      'Institutions such as PSG College of Technology and Amrita Vishwa Vidyapeetham run incubators for engineering and technology startups.',
      'StartupTN, the Tamil Nadu Startup and Innovation Mission, covers Coimbatore founders, and TIDEL Park Coimbatore hosts IT companies.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Pumps and engineering, textiles, SaaS' }, { label: 'Registrar', value: 'RoC Coimbatore' }, { label: 'State nodal agency', value: 'StartupTN' }],
    officeTips: [
      'Family-owned factory premises are commonly used as registered offices. If title is with a parent or relative, get a signed NOC and a recent electricity bill in their name.',
      'Professional tax in Tamil Nadu is collected by the local body, so register with the Coimbatore City Municipal Corporation (or the relevant local body) once you have employees.',
      'Moving the registered office from Coimbatore to Chennai later changes the Registrar and needs Regional Director confirmation (INC-23).'
    ],
    nearby: ['tamil-nadu', 'chennai', 'kochi', 'bangalore'],
    faqs: [
      { q: 'Is a Coimbatore company registered with RoC Chennai or RoC Coimbatore?', a: 'Companies with a registered office in Coimbatore are under RoC Coimbatore, which covers a group of western Tamil Nadu districts. Chennai and the remaining districts are under RoC Chennai. Incorporation itself is processed centrally through SPICe+.' },
      { q: 'Can a Coimbatore partnership firm convert into a company?', a: 'Yes. A partnership firm can convert into a company under Part I of Chapter XXI of the Companies Act, or into an LLP under the LLP Act. Conversion can carry tax benefits if the conditions of the Income-tax Act are met, so plan it with your auditor.' },
      { q: 'Do I need Udyam registration for a Coimbatore manufacturing company?', a: 'It is optional but strongly recommended for MSMEs. Udyam helps with priority-sector lending, protection against delayed payments under the MSMED Act and public-procurement preferences for micro and small enterprises.' },
      { q: 'What does it cost to register a company in Coimbatore?', a: 'MCA fees, Tamil Nadu stamp duty on the MoA and AoA, DSCs and our professional fee. The cost is the same as for a Chennai company with the same authorised capital.' }
    ]
  },
  visakhapatnam: {
    name: 'Visakhapatnam', type: 'city', state: 'Andhra Pradesh', stateKey: 'andhra-pradesh',
    hook: 'the Andhra Pradesh RoC, AP stamp duty and Vizag’s port, steel and pharma base',
    intro: 'Visakhapatnam (Vizag) is Andhra Pradesh’s largest city, built around a major port, the Visakhapatnam Steel Plant, a refinery and a pharmaceutical manufacturing zone. Founders incorporate here for logistics, marine, pharma, steel-ancillary and IT businesses, and a Vizag registered office places the company under the Registrar for Andhra Pradesh — not the Hyderabad Registrar.',
    stampDuty: { moaAoaNote: 'Andhra Pradesh stamp duty on the MoA and AoA is paid with SPICe+. Lease deeds for Vizag premises attract AP stamp duty and, for longer terms, registration.' },
    ecosystem: [
      'The Visakhapatnam Port and nearby port facilities support logistics, shipping and import-export businesses.',
      'The Visakhapatnam Steel Plant (Rashtriya Ispat Nigam Limited) anchors steel-ancillary and engineering suppliers.',
      'A pharmaceutical manufacturing cluster operates near Parawada, alongside petroleum refining.',
      'Andhra University and IIM Visakhapatnam support entrepreneurship programmes, and the city is home to the Indian Navy’s Eastern Naval Command.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Logistics and marine, pharma, steel ancillaries, IT' }, { label: 'Anchor assets', value: 'Port, steel plant, refinery' }, { label: 'Professional tax', value: 'Levied in Andhra Pradesh' }],
    officeTips: [
      'If you previously operated from Hyderabad, note that moving the registered office to Vizag is a change of state and needs Regional Director approval.',
      'Port-area and industrial-estate premises may be held on long-term leases from the port or the state industrial corporation; check that sub-letting is allowed.',
      'Andhra Pradesh levies professional tax, so register as an employer once you start payroll.'
    ],
    nearby: ['hyderabad', 'bhubaneswar', 'chennai', 'telangana'],
    faqs: [
      { q: 'Which RoC handles companies registered in Visakhapatnam?', a: 'Companies with a registered office in Andhra Pradesh are under the Registrar of Companies for Andhra Pradesh, located at Vijayawada, not the Hyderabad Registrar that covers Telangana.' },
      { q: 'Can I start a logistics or shipping company in Vizag as a private limited company?', a: 'Yes. Incorporation is the standard SPICe+ process. Depending on the activity you may also need customs broker, multimodal transport or freight-forwarding registrations, and an IEC for import-export.' },
      { q: 'Is Vizag a good base for a pharma company?', a: 'Vizag has an established pharmaceutical manufacturing cluster. Beyond incorporation, a pharma unit needs drug manufacturing licences, pollution-control consents and, for exports, regulatory approvals in target markets.' },
      { q: 'How long does company registration in Visakhapatnam take?', a: 'Once DSCs are issued and documents are complete, SPICe+ approval typically takes 7–15 working days, the same as elsewhere in India.' }
    ]
  },
  bhubaneswar: {
    name: 'Bhubaneswar', type: 'city', state: 'Odisha', stateKey: 'odisha',
    hook: 'the Odisha RoC at Cuttack, Odisha stamp duty and Startup Odisha support',
    intro: 'Bhubaneswar, Odisha’s capital, has grown into an education and IT hub, with institutions such as IIT Bhubaneswar, AIIMS Bhubaneswar and KIIT and a state startup programme that actively courts founders. Companies here also serve Odisha’s large mining and metals sector, and a Bhubaneswar registered office falls under the Registrar at Cuttack.',
    stampDuty: { moaAoaNote: 'Odisha stamp duty on the MoA and AoA is paid with SPICe+. Rent agreements for Bhubaneswar premises attract Odisha stamp duty separately.' },
    ecosystem: [
      'Startup Odisha, the state’s startup programme, offers recognition, incentives and incubation, including the O-Hub incubation centre in Bhubaneswar.',
      'Institutions such as IIT Bhubaneswar, AIIMS Bhubaneswar, KIIT and NISER support research-led and healthcare ventures.',
      'Infocity and Chandaka industrial estate host IT and ITeS companies.',
      'Odisha’s mining, steel and aluminium industries create demand for engineering, logistics and services companies.'
    ],
    highlights: [{ label: 'Typical founders', value: 'IT services, edtech, health, mining services' }, { label: 'State programme', value: 'Startup Odisha' }, { label: 'Professional tax', value: 'Levied in Odisha' }],
    officeTips: [
      'O-Hub and university incubators may provide a registered address for incubated startups if they issue an NOC; keep the incubation agreement current.',
      'For a home office, a recent TPCODL electricity bill and the owner’s NOC are normally sufficient.',
      'Odisha levies professional tax, so register once you pay salaries.'
    ],
    nearby: ['kolkata', 'visakhapatnam', 'raipur', 'ranchi'],
    faqs: [
      { q: 'Which RoC handles companies registered in Bhubaneswar?', a: 'Companies with a registered office in Odisha are under the Registrar of Companies, Cuttack. Filings are online, so you rarely need to visit the office.' },
      { q: 'Can a Bhubaneswar startup get Startup Odisha recognition?', a: 'Startups registered in Odisha that meet the programme’s criteria can apply for Startup Odisha recognition, which unlocks state incentives such as monthly allowances or grants under the current policy. The benefits are revised periodically, so check the latest guidelines.' },
      { q: 'Should I register for DPIIT recognition as well?', a: 'Usually yes. DPIIT recognition under Startup India is national and opens up benefits such as self-certification under certain labour and environmental laws and eligibility to apply for the section 80-IAC tax holiday. It complements state recognition.' },
      { q: 'What does it cost to register a company in Bhubaneswar?', a: 'MCA fees, Odisha stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator gives a line-by-line estimate with Odisha selected.' }
    ]
  },
  guwahati: {
    name: 'Guwahati', type: 'city', state: 'Assam', stateKey: 'assam',
    hook: 'the North East RoC, Assam stamp duty and Guwahati’s role as the gateway to the North East',
    intro: 'Guwahati is the largest city in the North East and the region’s main commercial and logistics hub, so founders incorporate here for tea, agri and food processing, tourism, logistics and businesses serving the wider North East. A Guwahati registered office falls under the Registrar of Companies for Assam and the North-Eastern states, located at Shillong.',
    stampDuty: { moaAoaNote: 'Assam stamp duty on the MoA and AoA is paid with the SPICe+ filing. Rent agreements for Guwahati premises attract Assam stamp duty separately.' },
    ecosystem: [
      'Assam Startup – The Nest, the state-backed incubator, supports early-stage ventures in Guwahati.',
      'IIT Guwahati runs a technology incubation centre and research partnerships with industry.',
      'Assam is India’s largest tea-producing state, and tea, agri and food processing are long-established industries.',
      'Central schemes for the North Eastern Region offer additional incentives to eligible industrial units.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Tea and agri, logistics, tourism, regional services' }, { label: 'Incubator', value: 'Assam Startup – The Nest' }, { label: 'Professional tax', value: 'Levied in Assam' }],
    officeTips: [
      'If the premises are in a family home, provide a recent APDCL electricity bill and the owner’s NOC; land records in some areas take time to update, so use the utility bill as primary proof.',
      'Units hoping to claim North East industrial incentives should check whether the scheme requires the unit, the registered office or both to be in the region.',
      'Assam levies professional tax, so register once you pay salaries.'
    ],
    nearby: ['kolkata', 'west-bengal', 'bhubaneswar', 'patna'],
    faqs: [
      { q: 'Which RoC handles companies registered in Guwahati?', a: 'Companies with a registered office in Assam fall under the Registrar of Companies located at Shillong, which serves Assam and other North-Eastern states. All incorporation and annual filings are online.' },
      { q: 'Can a Guwahati company claim North East industrial incentives?', a: 'Central and state schemes for the North East offer benefits such as capital and interest subsidies to eligible units. The conditions — new unit, sector, investment size and location — differ by scheme and change over time, so check the current notification before planning around them.' },
      { q: 'Should a tea or agri business in Assam register as a company or an LLP?', a: 'A company suits businesses that need bank finance, investors or government contracts. An LLP suits partner-run businesses that want limited liability with lighter compliance. Agricultural income has special tax treatment, so take tax advice for tea or plantation activity.' },
      { q: 'How long does company registration in Guwahati take?', a: 'Once DSCs are issued and documents are complete, SPICe+ approval typically takes 7–15 working days, the same as elsewhere in India.' }
    ]
  },
  raipur: {
    name: 'Raipur', type: 'city', state: 'Chhattisgarh', stateKey: 'chhattisgarh',
    hook: 'the Chhattisgarh RoC at Bilaspur, state stamp duty and Raipur’s steel and rice-milling base',
    intro: 'Raipur is Chhattisgarh’s capital and commercial centre, surrounded by steel, sponge-iron and power plants and a large rice-milling industry. Founders incorporate here for manufacturing, mining services, agri-processing and contracting businesses, and a Raipur registered office falls under the Chhattisgarh Registrar at Bilaspur.',
    stampDuty: { moaAoaNote: 'Chhattisgarh stamp duty on the MoA and AoA is paid with SPICe+. Leases of industrial-area plots or city offices attract Chhattisgarh stamp duty separately.' },
    ecosystem: [
      'Industrial areas such as Urla, Siltara and Bhanpuri host steel, sponge-iron and engineering units.',
      'Chhattisgarh is a major rice-producing state, and rice milling and food processing are significant local industries.',
      'IIM Raipur, NIT Raipur and AIIMS Raipur support entrepreneurship and healthcare ventures.',
      'Nava Raipur Atal Nagar, the planned new capital, hosts government offices and new institutional and IT developments.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Steel and engineering, rice milling, contracting' }, { label: 'Planned city', value: 'Nava Raipur Atal Nagar' }, { label: 'Registrar', value: 'RoC Bilaspur (Chhattisgarh)' }],
    officeTips: [
      'Industrial-area plots are allotted by the state industrial development corporation; confirm that the allotment permits the activity and any sub-letting before using the unit as your registered office.',
      'Contractors to state departments and PSUs should keep the registered office, GST and vendor-registration addresses identical.',
      'For a home office, a recent electricity bill and the owner’s NOC are normally sufficient.'
    ],
    nearby: ['bhubaneswar', 'ranchi', 'indore', 'hyderabad'],
    faqs: [
      { q: 'Which RoC handles companies registered in Raipur?', a: 'Companies with a registered office in Chhattisgarh are under the Registrar of Companies located at Bilaspur. Since filings are online, you will not normally need to visit the office.' },
      { q: 'Should a Raipur rice mill register as a company?', a: 'Many rice mills run as partnerships or proprietorships. Converting to a company or LLP helps with bank finance, succession and limited liability. The right choice depends on your partners, borrowing plans and tax position.' },
      { q: 'Do I need Udyam registration for a Raipur manufacturing unit?', a: 'It is optional but useful: Udyam gives access to MSME benefits such as priority-sector lending, protection against delayed payments under the MSMED Act and public-procurement preferences for micro and small enterprises.' },
      { q: 'What does it cost to register a company in Raipur?', a: 'MCA fees, Chhattisgarh stamp duty on the MoA and AoA, DSCs and our professional fee. Use the incorporation cost calculator with Chhattisgarh selected for an estimate.' }
    ]
  },
  dehradun: {
    name: 'Dehradun', type: 'city', state: 'Uttarakhand', stateKey: 'uttarakhand',
    hook: 'the Uttarakhand RoC, state stamp duty and Dehradun’s research, education and tourism base',
    intro: 'Dehradun is Uttarakhand’s capital and a long-standing centre for national research institutes, boarding schools and colleges, as well as a base for tourism, wellness and hill-state manufacturing businesses. Founders incorporate here to build on that institutional ecosystem and the state’s industrial estates, and the company is registered with the Registrar that has jurisdiction over Uttarakhand.',
    stampDuty: { moaAoaNote: 'Uttarakhand stamp duty on the MoA and AoA is paid with the SPICe+ filing. Rent agreements for Dehradun premises attract Uttarakhand stamp duty separately.' },
    ecosystem: [
      'National institutions such as the Forest Research Institute and CSIR-Indian Institute of Petroleum are based in Dehradun, and ONGC has major establishments in the city.',
      'SIDCUL industrial estates such as Selaqui near Dehradun host pharma, FMCG and packaging units.',
      'Uttarakhand’s startup policy offers recognition and support to eligible startups registered in the state, and IIT Roorkee in the same state runs a major incubator.',
      'Tourism, adventure travel and wellness businesses serve visitors to Mussoorie, Rishikesh and the wider Garhwal region.'
    ],
    highlights: [{ label: 'Typical founders', value: 'Tourism and wellness, pharma and FMCG, edtech' }, { label: 'Industrial estates', value: 'SIDCUL (e.g. Selaqui)' }, { label: 'Professional tax', value: 'Check the current state position' }],
    officeTips: [
      'Homestay and tourism founders often register at the property itself; make sure the property owner’s NOC and electricity bill match the address exactly.',
      'Units in SIDCUL estates are on allotted land; check that the lease permits the activity and any sub-letting.',
      'If you operate across Dehradun and Rishikesh, the registered office can be at either; register any second premises as an additional place of business for GST.'
    ],
    nearby: ['delhi-ncr', 'chandigarh', 'lucknow', 'uttar-pradesh'],
    faqs: [
      { q: 'Which RoC handles companies registered in Dehradun?', a: 'Companies with a registered office in Uttarakhand are under the Registrar that has jurisdiction over the state — see the RoC section above, and confirm the current office on the MCA website, as jurisdictions are occasionally reorganised.' },
      { q: 'Can I register a homestay or tour business in Dehradun as a company?', a: 'Yes. A private limited company or LLP can run homestays, tours and wellness retreats. You may separately need registration under the state’s tourism or homestay scheme, GST, and FSSAI if you serve food.' },
      { q: 'Is an LLP better than a company for a small Dehradun tourism business?', a: 'An LLP is simpler to run and does not need an audit below the prescribed turnover and contribution thresholds, which suits partner-run tourism businesses. Choose a company if you plan to raise equity investment.' },
      { q: 'How long does company registration in Dehradun take?', a: 'Once DSCs are issued and documents are complete, SPICe+ approval typically takes 7–15 working days, the same as elsewhere in India.' }
    ]
  },

  /* ============================ STATES ============================ */
  maharashtra: {
    name: 'Maharashtra', type: 'state', state: 'Maharashtra', stateKey: 'maharashtra',
    roc: { office: 'RoC Mumbai and RoC Pune', jurisdiction: 'Maharashtra has two Registrars: RoC Mumbai (Mumbai, Thane and the districts not assigned to Pune) and RoC Pune (Pune and a group of western and central Maharashtra districts)' },
    hook: 'two Registrars (Mumbai and Pune), Maharashtra stamp duty linked to capital, and professional tax',
    intro: 'Maharashtra combines India’s financial capital with major IT, automotive and manufacturing centres in Pune, Nashik, Aurangabad and Nagpur, which makes it one of the states with the most company incorporations. It is also one of the few states with two Registrars, so the district of your registered office decides whether RoC Mumbai or RoC Pune administers your company.',
    stampDuty: { moaAoaNote: 'Maharashtra’s AoA stamp duty is linked to authorised share capital, subject to a ceiling, so a later increase in authorised capital can also attract duty. Leave-and-licence agreements in Maharashtra must be registered.' },
    ecosystem: [
      'The Maharashtra State Innovation Society (MSInS) is the nodal agency for the state startup policy.',
      'Mumbai hosts the Reserve Bank of India, SEBI, BSE and NSE, while Pune, Nashik, Aurangabad (Chhatrapati Sambhajinagar) and Nagpur have strong manufacturing and IT bases.',
      'MIDC (Maharashtra Industrial Development Corporation) allots industrial plots across the state.',
      'IIT Bombay, IISER Pune and the National Chemical Laboratory support deep-tech and science-led startups.'
    ],
    highlights: [{ label: 'Registrars', value: 'RoC Mumbai and RoC Pune' }, { label: 'State nodal agency', value: 'Maharashtra State Innovation Society' }, { label: 'Professional tax', value: 'Levied (PTEC and PTRC)' }],
    officeTips: [
      'Check which Registrar covers your district before filing; shifting later between RoC Mumbai and RoC Pune within the state requires Regional Director confirmation in INC-23.',
      'Register your leave-and-licence agreement — it is compulsory in Maharashtra and banks and GST officers often ask for it.',
      'MIDC plots are leasehold; confirm the allotment terms before using an industrial unit as the registered office.'
    ],
    nearby: ['mumbai', 'pune', 'gujarat', 'karnataka'],
    faqs: [
      { q: 'How many RoCs are there in Maharashtra?', a: 'Two: RoC Mumbai and RoC Pune. Which one applies depends on the district of your registered office. Both are reached online through the MCA portal, so the difference matters mainly when you shift the office between their jurisdictions.' },
      { q: 'Why is Maharashtra stamp duty on the AoA higher for larger companies?', a: 'Maharashtra links the duty on Articles of Association to authorised share capital, with a ceiling, rather than charging a flat amount. Setting a realistic authorised capital at incorporation keeps the cost down; you can increase it later, paying the differential duty.' },
      { q: 'What professional tax registrations does a Maharashtra company need?', a: 'Two: an enrolment certificate (PTEC) for the company itself, and a registration certificate (PTRC) as an employer once it pays salaries above the threshold. Both can be applied for through AGILE-PRO-S at incorporation.' },
      { q: 'Which Shops and Establishments law applies in Maharashtra?', a: 'The Maharashtra Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2017. Establishments with fewer than ten workers file an intimation, while larger ones register; both are done online.' }
    ]
  },
  karnataka: {
    name: 'Karnataka', type: 'state', state: 'Karnataka', stateKey: 'karnataka',
    hook: 'RoC Bengaluru, Karnataka stamp duty, Elevate grants and professional tax',
    intro: 'Karnataka is synonymous with Bengaluru’s startup scene, but Mysuru, Mangaluru, Hubballi-Dharwad and Belagavi also have growing IT, manufacturing and education ecosystems. Every Karnataka company, wherever in the state its registered office is, is administered by RoC Bengaluru.',
    stampDuty: { moaAoaNote: 'Karnataka stamp duty applies to the MoA and AoA and is paid through SPICe+. Office leases are separately stamped, commonly on Karnataka e-stamp paper.' },
    ecosystem: [
      'The Karnataka Startup Cell under the state IT/BT department runs the startup policy and grant programmes such as Elevate.',
      'Beyond Bengaluru, the state promotes clusters in Mysuru, Mangaluru and Hubballi-Dharwad under its “Beyond Bengaluru” initiatives.',
      'KIADB (Karnataka Industrial Areas Development Board) allots industrial land across the state.',
      'IISc Bengaluru, the IITs at Dharwad and the NITK at Surathkal support research and engineering ventures.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Bengaluru (whole state)' }, { label: 'State nodal agency', value: 'Karnataka Startup Cell' }, { label: 'Professional tax', value: 'Levied in Karnataka' }],
    officeTips: [
      'A registered office anywhere in Karnataka is under RoC Bengaluru, so moving from Mysuru to Bengaluru only needs a board resolution and INC-22 within 30 days.',
      'KIADB plots are allotted on lease-cum-sale terms; check that your allotment permits the intended use before registering there.',
      'Register for Karnataka professional tax once you start paying salaries; AGILE-PRO-S supports this at incorporation.'
    ],
    nearby: ['bangalore', 'tamil-nadu', 'telangana', 'maharashtra'],
    faqs: [
      { q: 'Is there more than one RoC in Karnataka?', a: 'No. RoC Bengaluru administers all companies with a registered office in Karnataka, whether in Bengaluru, Mysuru, Mangaluru or elsewhere.' },
      { q: 'Can a startup outside Bengaluru get Karnataka startup benefits?', a: 'Yes. The state startup policy covers eligible startups registered anywhere in Karnataka, and some initiatives specifically target clusters outside Bengaluru. Eligibility and benefits are set out in each scheme’s current guidelines.' },
      { q: 'What is the Karnataka professional tax requirement for a new company?', a: 'Karnataka levies professional tax; the company enrols, and as an employer deducts and pays tax on salaries above the threshold, subject to the ₹2,500 annual cap per person.' },
      { q: 'Which Shops and Establishments law applies in Karnataka?', a: 'The Karnataka Shops and Commercial Establishments Act, 1961. Offices with employees generally need to register under it through the state labour department’s online system.' }
    ]
  },
  delhi: {
    name: 'Delhi', type: 'state', state: 'Delhi', stateKey: 'delhi',
    hook: 'RoC Delhi & Haryana, Delhi stamp duty, no professional tax and the Delhi Shops Act',
    intro: 'The National Capital Territory of Delhi is home to central ministries, regulators and many national trade bodies, so founders building govtech, legal, policy, consulting and trading businesses often register here. A Delhi registered office places the company under RoC Delhi & Haryana and under Delhi’s own stamp duty and labour laws.',
    stampDuty: { moaAoaNote: 'Delhi stamp duty on the MoA and AoA is paid through SPICe+. Rent agreements for Delhi premises are typically executed on e-stamp paper issued through the authorised e-stamping system.' },
    ecosystem: [
      'Central ministries, regulators and DPIIT — which runs Startup India — are based in Delhi, which suits B2G and policy-facing businesses.',
      'Commercial districts such as Connaught Place, Nehru Place, Okhla and Saket host offices for services, IT and trading businesses.',
      'IIT Delhi, Delhi University and other institutions run incubators supporting technology and social-impact ventures.',
      'Delhi is a major wholesale and distribution centre for north India, with long-established trading markets.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Delhi & Haryana' }, { label: 'Professional tax', value: 'Not levied in Delhi' }, { label: 'Typical founders', value: 'Govtech, consulting, trading, D2C' }],
    officeTips: [
      'Delhi has a large stock of mixed-use and commercial properties. If you use a residential property, the RoC accepts it with an owner’s NOC, but municipal rules on commercial use still apply.',
      'Virtual offices are common in Delhi; the GST department may physically verify them, so choose a provider that can show a real, staffed address.',
      'Moving the registered office from Delhi to Gurugram stays under the same Registrar but is a change of state, which needs MoA alteration and Regional Director approval.'
    ],
    nearby: ['delhi-ncr', 'gurgaon', 'noida', 'uttar-pradesh'],
    faqs: [
      { q: 'Which RoC handles companies registered in Delhi?', a: 'Companies with a registered office in the NCT of Delhi are under the Registrar of Companies, NCT of Delhi & Haryana, which also covers Haryana.' },
      { q: 'Is there professional tax in Delhi?', a: 'No. Delhi does not currently levy professional tax, so a Delhi company has no professional tax registration or monthly deduction for employees.' },
      { q: 'Which Shops and Establishments law applies in Delhi?', a: 'The Delhi Shops and Establishments Act, 1954. Registration is done online through the Delhi labour department; we include it in your post-incorporation checklist.' },
      { q: 'Is the Delhi page different from the Delhi NCR page?', a: 'Yes. This page covers registering with a registered office inside the NCT of Delhi. If you are still deciding between Delhi, Gurugram and Noida, our Delhi NCR page compares the three jurisdictions.' }
    ]
  },
  jharkhand: {
    name: 'Jharkhand', type: 'state', state: 'Jharkhand', stateKey: 'jharkhand',
    hook: 'RoC Ranchi, Jharkhand stamp duty and the state’s mining, steel and MSME economy',
    intro: 'Jharkhand has some of India’s largest mineral reserves and steel and heavy-engineering centres in Jamshedpur, Bokaro, Dhanbad and Ranchi, so many companies here are suppliers, contractors and service providers to that industrial base. Every Jharkhand company is administered by RoC Ranchi.',
    stampDuty: { moaAoaNote: 'Jharkhand stamp duty on the MoA and AoA is collected through SPICe+, wherever in the state your registered office is.' },
    ecosystem: [
      'Jamshedpur (Tata Steel), Bokaro (SAIL’s Bokaro Steel Plant) and Ranchi (Heavy Engineering Corporation) anchor large supplier ecosystems.',
      'The Dhanbad coal belt and IIT (ISM) Dhanbad support mining services and equipment businesses.',
      'JIADA (Jharkhand Industrial Area Development Authority) allots industrial plots across the state.',
      'Jharkhand’s startup policy and institutions such as IIM Ranchi, BIT Mesra and XLRI Jamshedpur support founders.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Ranchi (whole state)' }, { label: 'Industrial land', value: 'JIADA' }, { label: 'Professional tax', value: 'Levied in Jharkhand' }],
    officeTips: [
      'Moving the registered office between Jamshedpur, Bokaro, Dhanbad and Ranchi stays under RoC Ranchi, so it needs only a board resolution and INC-22.',
      'PSU vendor empanelment typically checks the registered office, GST and Udyam details; keep them identical.',
      'Jharkhand levies professional tax; register as an employer once you start payroll.'
    ],
    nearby: ['ranchi', 'bokaro', 'bihar', 'west-bengal'],
    faqs: [
      { q: 'Is RoC Ranchi the only Registrar for Jharkhand?', a: 'Yes. Companies with a registered office anywhere in Jharkhand — including Jamshedpur, Bokaro and Dhanbad — are under the Registrar of Companies, Ranchi.' },
      { q: 'Should a Jamshedpur or Bokaro supplier register as a company?', a: 'A company separates business and personal liabilities and is often preferred by large buyers and banks. Partner-run businesses may prefer an LLP for lighter compliance. Our comparison guide covers the trade-offs.' },
      { q: 'Do Jharkhand startup policy benefits apply across the state?', a: 'The policy applies to eligible startups registered anywhere in Jharkhand. Check the current scheme guidelines for eligibility and the application process.' },
      { q: 'Is Udyam registration useful for Jharkhand MSMEs?', a: 'Yes. Udyam is free and gives access to MSME benefits including protection against delayed payments and public-procurement preferences for micro and small enterprises, which matter for PSU suppliers.' }
    ]
  },
  bihar: {
    name: 'Bihar', type: 'state', state: 'Bihar', stateKey: 'bihar',
    hook: 'RoC Patna, Bihar stamp duty, the Bihar startup policy and BIADA industrial areas',
    intro: 'Bihar’s economy is anchored in agriculture, food processing, construction and services, and a growing number of founders from the state are building edtech, agri and consumer businesses at home rather than in metros. Every Bihar company — whether in Patna, Gaya, Muzaffarpur or Bhagalpur — is administered by RoC Patna.',
    stampDuty: { moaAoaNote: 'Bihar stamp duty on the MoA and AoA is collected through SPICe+, the same across the state.' },
    ecosystem: [
      'The Bihar startup policy, run through the state Department of Industries, offers recognition, seed funding and incubation to eligible startups.',
      'BIADA (Bihar Industrial Area Development Authority) allots plots in industrial areas across the state.',
      'Agri and food processing is a priority sector, including makhana from Mithila and litchi from Muzaffarpur.',
      'IIT Patna, NIT Patna and other institutions run incubation centres.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Patna (whole state)' }, { label: 'Industrial land', value: 'BIADA' }, { label: 'Professional tax', value: 'Levied in Bihar' }],
    officeTips: [
      'For family-owned property in smaller towns, a recent electricity bill in the owner’s name with an NOC is usually the easiest address proof.',
      'Food-processing units seeking state incentives should check whether the incentive needs the unit to be in a BIADA area.',
      'Bihar levies professional tax; register once you start payroll.'
    ],
    nearby: ['patna', 'jharkhand', 'uttar-pradesh', 'west-bengal'],
    faqs: [
      { q: 'Is RoC Patna the only Registrar for Bihar?', a: 'Yes. Companies with a registered office anywhere in Bihar are under the Registrar of Companies, Patna.' },
      { q: 'Can a startup outside Patna get Bihar startup policy support?', a: 'Yes. The policy applies to eligible startups registered anywhere in Bihar. Applications are made through the state’s startup portal, and benefits are revised from time to time.' },
      { q: 'Do I need FSSAI registration for a food-processing company in Bihar?', a: 'Yes. Any food business, including processing and packaging, needs FSSAI registration or a licence depending on its size. This is separate from company incorporation and is usually done right after.' },
      { q: 'What does it cost to register a company in Bihar?', a: 'MCA fees (often nil for small authorised capital), Bihar stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator gives an estimate with Bihar selected.' }
    ]
  },
  'uttar-pradesh': {
    name: 'Uttar Pradesh', type: 'state', state: 'Uttar Pradesh', stateKey: 'uttar-pradesh',
    hook: 'RoC Kanpur, UP stamp duty, no professional tax and the state startup policy',
    intro: 'Uttar Pradesh is India’s most populous state, with business centres from Noida and Ghaziabad in NCR to Lucknow, Kanpur, Agra and Varanasi. Founders choose UP for its large consumer market, industrial land and state incentives, and every UP company is administered by the Registrar of Companies at Kanpur.',
    stampDuty: { moaAoaNote: 'Uttar Pradesh stamp duty on the MoA and AoA is collected through SPICe+. Leases are executed on UP e-stamp paper.' },
    ecosystem: [
      'Uttar Pradesh’s startup policy offers recognition, incubator support and incentives for eligible startups.',
      'Noida and Greater Noida host IT and electronics manufacturing, while Kanpur has long-established leather and textile industries and Agra is a footwear and leather centre.',
      'Industrial land is allotted by development authorities such as Noida, Greater Noida and YEIDA, and by UPSIDA elsewhere in the state.',
      'IIT Kanpur, IIT (BHU) Varanasi and IIM Lucknow run incubators and research parks.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Kanpur (whole state)' }, { label: 'Professional tax', value: 'Not levied in Uttar Pradesh' }, { label: 'Typical founders', value: 'Electronics, consumer, leather and textiles' }],
    officeTips: [
      'A move between Noida, Lucknow, Kanpur or any other UP city stays under RoC Kanpur and needs only a board resolution and INC-22.',
      'Authority-allotted land in Noida, Greater Noida and YEIDA is leasehold; check the lease permits your use and sub-letting.',
      'UP does not levy professional tax, which simplifies payroll compared with neighbouring Bihar or Madhya Pradesh.'
    ],
    nearby: ['noida', 'lucknow', 'delhi', 'bihar'],
    faqs: [
      { q: 'Which RoC handles companies in Uttar Pradesh?', a: 'All companies with a registered office in Uttar Pradesh — including Noida, Ghaziabad and Lucknow — are under the Registrar of Companies, Kanpur.' },
      { q: 'Is there professional tax in Uttar Pradesh?', a: 'No. Uttar Pradesh does not currently levy professional tax on salaried employees.' },
      { q: 'Does a Noida company get UP startup policy benefits?', a: 'Yes, if it meets the policy’s eligibility criteria. Noida is in Uttar Pradesh, so startups registered there are covered by the UP policy, not by Delhi or Haryana schemes.' },
      { q: 'What does it cost to register a company in Uttar Pradesh?', a: 'MCA fees, UP stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator gives a line-by-line estimate with Uttar Pradesh selected.' }
    ]
  },
  gujarat: {
    name: 'Gujarat', type: 'state', state: 'Gujarat', stateKey: 'gujarat',
    hook: 'RoC Ahmedabad, Gujarat stamp duty, GIFT City IFSC and SSIP support',
    intro: 'Gujarat is one of India’s most industrialised states, with chemicals, pharmaceuticals, textiles, diamonds, ceramics and ports spread across Ahmedabad, Surat, Vadodara, Rajkot and the coast. It is also home to GIFT City, India’s International Financial Services Centre, and every Gujarat company is administered by RoC Ahmedabad.',
    stampDuty: { moaAoaNote: 'Gujarat stamp duty on the MoA and AoA is collected through SPICe+, the same across the state including GIFT City.' },
    ecosystem: [
      'GIFT City near Gandhinagar hosts the International Financial Services Centre, regulated by IFSCA.',
      'Gujarat’s Student Startup and Innovation Policy (SSIP) and iCreate support student and technology founders.',
      'Industrial clusters include chemicals and pharma (Ahmedabad, Vadodara, Ankleshwar, Vapi), ceramics (Morbi), diamonds and textiles (Surat) and engineering (Rajkot).',
      'GIDC (Gujarat Industrial Development Corporation) allots plots across many industrial estates.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Ahmedabad (whole state)' }, { label: 'Special zone', value: 'GIFT City IFSC' }, { label: 'Professional tax', value: 'Levied in Gujarat' }],
    officeTips: [
      'A GIFT IFSC entity needs IFSCA registration or a licence in addition to incorporation; plan both together.',
      'GIDC plots are leasehold; check that your allotment permits the activity before using the unit as a registered office.',
      'Moving between Ahmedabad, Surat, Vadodara and Rajkot stays under RoC Ahmedabad and needs only a board resolution and INC-22.'
    ],
    nearby: ['ahmedabad', 'surat', 'maharashtra', 'jaipur'],
    faqs: [
      { q: 'Which RoC handles companies in Gujarat?', a: 'All companies with a registered office in Gujarat are under the Registrar of Companies, Ahmedabad, which also covers Dadra and Nagar Haveli and Daman and Diu.' },
      { q: 'Is professional tax payable in Gujarat?', a: 'Yes. Gujarat levies professional tax, administered through local bodies such as municipal corporations, subject to the ₹2,500 annual cap per person.' },
      { q: 'Which Shops and Establishments law applies in Gujarat?', a: 'The Gujarat Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2019, with registration or intimation depending on the number of employees.' },
      { q: 'Can a Gujarat company set up a unit in GIFT City later?', a: 'Yes. An existing company can set up an IFSC unit, or a separate subsidiary can be incorporated with a GIFT City address. Either route needs approval or registration from IFSCA for the regulated activity.' }
    ]
  },
  'tamil-nadu': {
    name: 'Tamil Nadu', type: 'state', state: 'Tamil Nadu', stateKey: 'tamil-nadu',
    roc: { office: 'RoC Chennai and RoC Coimbatore', jurisdiction: 'Tamil Nadu has two Registrars: RoC Chennai (Chennai and most districts) and RoC Coimbatore (Coimbatore and neighbouring western districts)' },
    hook: 'two Registrars (Chennai and Coimbatore), Tamil Nadu stamp duty and StartupTN',
    intro: 'Tamil Nadu is among India’s most industrialised states, with automobiles and electronics around Chennai, textiles and engineering in Coimbatore, Tiruppur and Erode, and a strong SaaS and deep-tech community. Like Maharashtra, it has two Registrars, so the district of your registered office decides whether RoC Chennai or RoC Coimbatore administers your company.',
    stampDuty: { moaAoaNote: 'Tamil Nadu stamp duty on the MoA and AoA is the same statewide and paid through SPICe+, whichever Registrar you fall under.' },
    ecosystem: [
      'StartupTN, the Tamil Nadu Startup and Innovation Mission, runs the state startup policy and seed-grant schemes.',
      'The Chennai–Sriperumbudur–Oragadam belt is a major automobile and electronics manufacturing region, and Tiruppur is a leading knitwear export cluster.',
      'SIPCOT and SIDCO allot industrial land and estates across the state.',
      'IIT Madras, Anna University and PSG College of Technology support deep-tech and engineering ventures.'
    ],
    highlights: [{ label: 'Registrars', value: 'RoC Chennai and RoC Coimbatore' }, { label: 'State nodal agency', value: 'StartupTN' }, { label: 'Professional tax', value: 'Levied by local bodies' }],
    officeTips: [
      'Check which Registrar covers your district; a later shift between RoC Chennai and RoC Coimbatore within the state needs Regional Director confirmation.',
      'Professional tax in Tamil Nadu is collected by the local body (corporation, municipality or panchayat), so register with the body where your office is.',
      'SIPCOT plots are leasehold; confirm the allotment terms before registering an industrial unit as your office.'
    ],
    nearby: ['chennai', 'coimbatore', 'karnataka', 'kochi'],
    faqs: [
      { q: 'How many RoCs are there in Tamil Nadu?', a: 'Two: RoC Chennai and RoC Coimbatore. The district of your registered office decides which one administers your company. Both work through the same MCA online portal.' },
      { q: 'Who collects professional tax in Tamil Nadu?', a: 'Local bodies — corporations, municipalities and panchayats — collect professional tax in Tamil Nadu, so the company registers with the local body where its office is located.' },
      { q: 'Which Shops and Establishments law applies in Tamil Nadu?', a: 'The Tamil Nadu Shops and Establishments Act, 1947. Registration is done online through the state labour department.' },
      { q: 'Can a startup anywhere in Tamil Nadu apply to StartupTN?', a: 'Yes. StartupTN schemes cover eligible startups registered anywhere in the state, and some calls prioritise founders from outside Chennai. Check each scheme’s current guidelines.' }
    ]
  },
  telangana: {
    name: 'Telangana', type: 'state', state: 'Telangana', stateKey: 'telangana',
    hook: 'RoC Hyderabad, Telangana stamp duty, T-Hub and the state’s life-sciences cluster',
    intro: 'Telangana’s economy is centred on Hyderabad’s technology and life-sciences industries, supported by state institutions such as T-Hub, WE Hub and the Telangana State Innovation Cell. Every company with a registered office in Telangana is administered by RoC Hyderabad.',
    stampDuty: { moaAoaNote: 'Telangana stamp duty on the MoA and AoA is collected through SPICe+, statewide.' },
    ecosystem: [
      'T-Hub, WE Hub, T-Works and the Telangana State Innovation Cell form the state’s startup support network.',
      'Genome Valley and pharma clusters around Hyderabad make Telangana a leading life-sciences region.',
      'TSIIC (Telangana State Industrial Infrastructure Corporation) allots industrial land and parks.',
      'IIIT Hyderabad, ISB, IIT Hyderabad and the University of Hyderabad support research and incubation.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Hyderabad (whole state)' }, { label: 'Innovation hubs', value: 'T-Hub, WE Hub, T-Works' }, { label: 'Professional tax', value: 'Levied in Telangana' }],
    officeTips: [
      'Moving the registered office from Hyderabad to Warangal or another Telangana town stays under RoC Hyderabad and needs only a board resolution and INC-22.',
      'A move to Andhra Pradesh is a change of state and Registrar, needing a special resolution and Regional Director approval.',
      'Telangana levies professional tax; register as an employer once you pay salaries.'
    ],
    nearby: ['hyderabad', 'karnataka', 'visakhapatnam', 'maharashtra'],
    faqs: [
      { q: 'Which RoC handles companies in Telangana?', a: 'All companies with a registered office in Telangana are under the Registrar of Companies, Hyderabad. Andhra Pradesh has a separate Registrar.' },
      { q: 'Which Shops and Establishments law applies in Telangana?', a: 'The Telangana Shops and Establishments Act, 1988, with registration through the state labour department’s online system.' },
      { q: 'Is professional tax payable in Telangana?', a: 'Yes. Telangana levies professional tax on employers and employees, subject to the ₹2,500 annual cap per person.' },
      { q: 'What does it cost to register a company in Telangana?', a: 'MCA fees, Telangana stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator gives an estimate with Telangana selected.' }
    ]
  },
  'west-bengal': {
    name: 'West Bengal', type: 'state', state: 'West Bengal', stateKey: 'west-bengal',
    hook: 'RoC Kolkata, West Bengal stamp duty, professional tax and the state’s industrial base',
    intro: 'West Bengal combines Kolkata’s trading houses and IT corridor with tea gardens in the north, a port at Haldia and engineering and MSME clusters around Howrah and Durgapur. Every company with a registered office in the state is administered by RoC Kolkata.',
    stampDuty: { moaAoaNote: 'West Bengal stamp duty on the MoA and AoA is collected through SPICe+, statewide.' },
    ecosystem: [
      'Salt Lake Sector V and New Town host the state’s IT and ITeS companies, supported by Webel.',
      'Tea gardens in Darjeeling and the Dooars, jute mills and Howrah’s engineering units are long-standing industries.',
      'Durgapur and Asansol host steel and engineering, and Haldia hosts port-linked petrochemical industries.',
      'IIM Calcutta, IIT Kharagpur and other institutions run incubators and innovation parks.'
    ],
    highlights: [{ label: 'Registrar', value: 'RoC Kolkata (whole state)' }, { label: 'Professional tax', value: 'Levied in West Bengal' }, { label: 'Typical founders', value: 'IT services, trading, tea and jute, engineering' }],
    officeTips: [
      'Moving between Kolkata, Howrah, Siliguri or Durgapur stays under RoC Kolkata and needs only a board resolution and INC-22.',
      'West Bengal professional tax can be applied for through AGILE-PRO-S at incorporation.',
      'For older properties with joint family ownership, get the NOC from the person named on the electricity bill to avoid verification issues.'
    ],
    nearby: ['kolkata', 'bihar', 'jharkhand', 'guwahati'],
    faqs: [
      { q: 'Which RoC handles companies in West Bengal?', a: 'All companies with a registered office in West Bengal are under the Registrar of Companies, Kolkata.' },
      { q: 'Is professional tax payable in West Bengal?', a: 'Yes. West Bengal levies professional tax on employers and employees, subject to the ₹2,500 annual cap per person.' },
      { q: 'Which Shops and Establishments law applies in West Bengal?', a: 'The West Bengal Shops and Establishments Act, 1963. Registration is done online through the state labour department.' },
      { q: 'What does it cost to register a company in West Bengal?', a: 'MCA fees, West Bengal stamp duty on the MoA and AoA, DSCs and our professional fee. Our calculator gives an estimate with West Bengal selected.' }
    ]
  }
};

const ORDER = [
  ['bangalore', 'Bangalore'], ['mumbai', 'Mumbai'], ['delhi-ncr', 'Delhi NCR'], ['gurgaon', 'Gurgaon'], ['noida', 'Noida'], ['hyderabad', 'Hyderabad'], ['pune', 'Pune'], ['chennai', 'Chennai'],
  ['kolkata', 'Kolkata'], ['ahmedabad', 'Ahmedabad'], ['patna', 'Patna'], ['ranchi', 'Ranchi'], ['bokaro', 'Bokaro'], ['jaipur', 'Jaipur'], ['lucknow', 'Lucknow'], ['chandigarh', 'Chandigarh'],
  ['indore', 'Indore'], ['kochi', 'Kochi'], ['surat', 'Surat'], ['coimbatore', 'Coimbatore'], ['visakhapatnam', 'Visakhapatnam'], ['bhubaneswar', 'Bhubaneswar'], ['guwahati', 'Guwahati'], ['raipur', 'Raipur'], ['dehradun', 'Dehradun'],
  ['maharashtra', 'Maharashtra'], ['karnataka', 'Karnataka'], ['delhi', 'Delhi'], ['jharkhand', 'Jharkhand'], ['bihar', 'Bihar'], ['uttar-pradesh', 'Uttar Pradesh'], ['gujarat', 'Gujarat'], ['tamil-nadu', 'Tamil Nadu'], ['telangana', 'Telangana'], ['west-bengal', 'West Bengal']
];

export const locations = ORDER.map(([slug, name]) => ({ slug, ...data[slug], name }));
