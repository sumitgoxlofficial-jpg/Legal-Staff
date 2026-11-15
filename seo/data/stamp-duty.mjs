// State-wise stamp duty on MoA / AoA / LLP agreement + jurisdictional RoC, keyed by state slug.
// Used by the incorporation cost calculator (seo/pages/tools.mjs, static/tools.js) and the location pages.
//
// Shape: stampDuty[slug] = {
//   state, roc: { office, jurisdiction },
//   moa: { summary, calc }, aoa: { summary, calc }, llpAgreement: { summary, calc? },
//   confidence: 'indicative', note }
//
// `calc` is evaluated on authorised capital (₹) by evalStampCalc() below and by static/tools.js:
//   { type: 'flat', amount }
//   { type: 'percent', rate (in %), min?, max? }
//   { type: 'slab', slabs: [{ upTo, amount }], perExtra?: { per, amount }, max? }
//     -> amount of the first slab whose upTo >= capital; above the last slab, last amount
//        plus perExtra.amount for every perExtra.per (or part) beyond it; capped at max.
//
// IMPORTANT: these are INDICATIVE figures compiled from the state stamp schedules as commonly
// applied on the MCA portal. State stamp laws are amended frequently. Since SPICe+ (Feb 2020),
// stamp duty on MoA/AoA is paid electronically through the MCA portal (e-stamping integrated
// for most states and UTs); the amount the portal computes at the time of filing is the final figure.
// Where a schedule was not known with certainty, a conservative (higher-side) rule was chosen.

const COMMON_NOTE = 'Indicative only: stamp schedules change; the MCA portal computes the final stamp duty during SPICe+ filing (e-stamping is integrated for most states).';
const LLP_NOTE = 'LLP agreement stamp duty is paid on the state e-stamp / franking system (not through FiLLiP) and is usually linked to the partners’ contribution; confirm the current rate under the state Stamp Act (partnership article).';

const flat = (amount) => ({ type: 'flat', amount });
const pct = (rate, min, max) => ({ type: 'percent', rate, ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) });

export const stampDuty = {
  maharashtra: {
    state: 'Maharashtra',
    roc: { office: 'RoC Mumbai and RoC Pune', jurisdiction: 'RoC Mumbai covers Mumbai and most of Maharashtra; RoC Pune covers Pune and several western/central Maharashtra districts' },
    moa: { summary: '₹200 flat', calc: flat(200) },
    aoa: { summary: '0.2% of authorised share capital, capped at ₹50 lakh', calc: pct(0.2, 0, 5000000) },
    llpAgreement: { summary: 'Linked to contribution (1% of contribution, subject to a cap, as commonly applied) — confirm current rate', calc: pct(1, 500, 15000) },
    confidence: 'indicative', note: COMMON_NOTE
  },
  karnataka: {
    state: 'Karnataka',
    roc: { office: 'RoC Bengaluru', jurisdiction: 'State of Karnataka' },
    moa: { summary: '₹1,000 flat (indicative)', calc: flat(1000) },
    aoa: { summary: '₹1,000 for every ₹10 lakh of authorised capital or part (indicative)', calc: { type: 'slab', slabs: [{ upTo: 1000000, amount: 1000 }], perExtra: { per: 1000000, amount: 1000 }, max: 2500000 } },
    llpAgreement: { summary: 'Linked to contribution under the Karnataka Stamp Act partnership article — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Karnataka AoA slab and cap not fully verified.'
  },
  delhi: {
    state: 'Delhi',
    roc: { office: 'RoC Delhi', jurisdiction: 'NCT of Delhi and Haryana' },
    moa: { summary: '₹200 flat', calc: flat(200) },
    aoa: { summary: '0.15% of authorised share capital, capped at ₹25 lakh', calc: pct(0.15, 0, 2500000) },
    llpAgreement: { summary: 'Linked to contribution under the Indian Stamp Act (as applicable to Delhi) partnership article — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  haryana: {
    state: 'Haryana',
    roc: { office: 'RoC Delhi', jurisdiction: 'NCT of Delhi and Haryana (there is no separate RoC for Haryana)' },
    moa: { summary: '₹60 flat (older schedule; may have been revised)', calc: flat(60) },
    aoa: { summary: '₹120 flat (older schedule; may have been revised)', calc: flat(120) },
    llpAgreement: { summary: 'Linked to contribution under the Haryana stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Haryana figures are from an older schedule and may since have been increased.'
  },
  'uttar-pradesh': {
    state: 'Uttar Pradesh',
    roc: { office: 'RoC Kanpur', jurisdiction: 'State of Uttar Pradesh' },
    moa: { summary: '₹500 flat', calc: flat(500) },
    aoa: { summary: '₹500 flat (indicative)', calc: flat(500) },
    llpAgreement: { summary: 'Linked to contribution under the UP stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  telangana: {
    state: 'Telangana',
    roc: { office: 'RoC Hyderabad', jurisdiction: 'State of Telangana' },
    moa: { summary: '₹500 flat', calc: flat(500) },
    aoa: { summary: '0.15% of authorised capital, minimum ₹1,000, capped at ₹5 lakh (indicative)', calc: pct(0.15, 1000, 500000) },
    llpAgreement: { summary: 'Linked to contribution under the stamp schedule applied in Telangana — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Minimum and cap for AoA not fully verified.'
  },
  'andhra-pradesh': {
    state: 'Andhra Pradesh',
    roc: { office: 'RoC Vijayawada', jurisdiction: 'State of Andhra Pradesh' },
    moa: { summary: '₹500 flat', calc: flat(500) },
    aoa: { summary: '0.15% of authorised capital, minimum ₹1,000, capped at ₹5 lakh (indicative)', calc: pct(0.15, 1000, 500000) },
    llpAgreement: { summary: 'Linked to contribution under the AP stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Minimum and cap for AoA not fully verified.'
  },
  'tamil-nadu': {
    state: 'Tamil Nadu',
    roc: { office: 'RoC Chennai (RoC Coimbatore for western Tamil Nadu districts)', jurisdiction: 'State of Tamil Nadu (split between RoC Chennai and RoC Coimbatore by district)' },
    moa: { summary: '₹200 flat (older schedule; Tamil Nadu revised several stamp rates in 2023)', calc: flat(200) },
    aoa: { summary: '₹300 flat (older schedule; may have been revised)', calc: flat(300) },
    llpAgreement: { summary: 'Linked to contribution under the Tamil Nadu stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Tamil Nadu figures may be outdated after the 2023 revision; confirm on the portal.'
  },
  'west-bengal': {
    state: 'West Bengal',
    roc: { office: 'RoC Kolkata', jurisdiction: 'State of West Bengal' },
    moa: { summary: '₹60 flat', calc: flat(60) },
    aoa: { summary: '₹300 flat', calc: flat(300) },
    llpAgreement: { summary: 'Linked to contribution under the West Bengal stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  gujarat: {
    state: 'Gujarat',
    roc: { office: 'RoC Ahmedabad', jurisdiction: 'State of Gujarat (and Dadra & Nagar Haveli and Daman & Diu)' },
    moa: { summary: '₹100 flat', calc: flat(100) },
    aoa: { summary: '0.5% of authorised capital, capped at ₹5 lakh (indicative)', calc: pct(0.5, 0, 500000) },
    llpAgreement: { summary: 'Linked to contribution under the Gujarat Stamp Act partnership article — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Gujarat AoA cap not fully verified.'
  },
  bihar: {
    state: 'Bihar',
    roc: { office: 'RoC Patna', jurisdiction: 'State of Bihar' },
    moa: { summary: '₹500 flat (conservative estimate)', calc: flat(500) },
    aoa: { summary: '₹1,000 flat (conservative estimate)', calc: flat(1000) },
    llpAgreement: { summary: 'Linked to contribution under the Bihar stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Bihar MoA/AoA rates not verified — conservative estimate used.'
  },
  jharkhand: {
    state: 'Jharkhand',
    roc: { office: 'RoC Ranchi', jurisdiction: 'State of Jharkhand' },
    moa: { summary: '₹63 flat (as commonly applied)', calc: flat(63) },
    aoa: { summary: '₹105 flat (as commonly applied)', calc: flat(105) },
    llpAgreement: { summary: 'Linked to contribution under the stamp schedule applied in Jharkhand — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  rajasthan: {
    state: 'Rajasthan',
    roc: { office: 'RoC Jaipur', jurisdiction: 'State of Rajasthan' },
    moa: { summary: '₹500 flat', calc: flat(500) },
    aoa: { summary: '0.5% of authorised capital, capped at ₹25 lakh (indicative)', calc: pct(0.5, 0, 2500000) },
    llpAgreement: { summary: 'Linked to contribution under the Rajasthan Stamp Act — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  chandigarh: {
    state: 'Chandigarh',
    roc: { office: 'RoC Chandigarh', jurisdiction: 'UT of Chandigarh and the State of Punjab' },
    moa: { summary: '₹500 flat (indicative)', calc: flat(500) },
    aoa: { summary: '₹1,000 flat (indicative)', calc: flat(1000) },
    llpAgreement: { summary: 'Linked to contribution under the stamp schedule applied in Chandigarh — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  punjab: {
    state: 'Punjab',
    roc: { office: 'RoC Chandigarh', jurisdiction: 'UT of Chandigarh and the State of Punjab' },
    moa: { summary: '₹5,000 flat (conservative estimate)', calc: flat(5000) },
    aoa: { summary: '₹10,000 flat (conservative estimate)', calc: flat(10000) },
    llpAgreement: { summary: 'Linked to contribution under the Punjab stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Punjab rates not verified — conservative estimate used.'
  },
  'madhya-pradesh': {
    state: 'Madhya Pradesh',
    roc: { office: 'RoC Gwalior', jurisdiction: 'State of Madhya Pradesh' },
    moa: { summary: '₹2,500 flat (indicative)', calc: flat(2500) },
    aoa: { summary: '0.15% of authorised capital, minimum ₹5,000, capped at ₹25 lakh (indicative)', calc: pct(0.15, 5000, 2500000) },
    llpAgreement: { summary: 'Linked to contribution under the MP stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  kerala: {
    state: 'Kerala',
    roc: { office: 'RoC Ernakulam', jurisdiction: 'State of Kerala and UT of Lakshadweep' },
    moa: { summary: '₹1,000 for every ₹10 lakh of authorised capital or part (conservative estimate)', calc: { type: 'slab', slabs: [{ upTo: 1000000, amount: 1000 }], perExtra: { per: 1000000, amount: 1000 } } },
    aoa: { summary: '₹1,000 for every ₹10 lakh of authorised capital or part (conservative estimate)', calc: { type: 'slab', slabs: [{ upTo: 1000000, amount: 1000 }], perExtra: { per: 1000000, amount: 1000 } } },
    llpAgreement: { summary: 'Linked to contribution under the Kerala Stamp Act — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Kerala slab structure not verified — conservative estimate used.'
  },
  odisha: {
    state: 'Odisha',
    roc: { office: 'RoC Cuttack', jurisdiction: 'State of Odisha' },
    moa: { summary: '₹300 flat', calc: flat(300) },
    aoa: { summary: '₹300 flat', calc: flat(300) },
    llpAgreement: { summary: 'Linked to contribution under the Odisha stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE
  },
  assam: {
    state: 'Assam',
    roc: { office: 'RoC Shillong', jurisdiction: 'North-Eastern states including Assam, Meghalaya, Manipur, Tripura, Mizoram, Nagaland and Arunachal Pradesh' },
    moa: { summary: '₹500 flat (conservative estimate)', calc: flat(500) },
    aoa: { summary: '₹1,000 flat (conservative estimate)', calc: flat(1000) },
    llpAgreement: { summary: 'Linked to contribution under the Assam stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Assam rates not verified — conservative estimate used.'
  },
  chhattisgarh: {
    state: 'Chhattisgarh',
    roc: { office: 'RoC Bilaspur', jurisdiction: 'State of Chhattisgarh' },
    moa: { summary: '₹2,500 flat (conservative estimate)', calc: flat(2500) },
    aoa: { summary: '0.15% of authorised capital, minimum ₹5,000, capped at ₹25 lakh (conservative estimate)', calc: pct(0.15, 5000, 2500000) },
    llpAgreement: { summary: 'Linked to contribution under the Chhattisgarh stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Chhattisgarh rates not verified — conservative estimate (modelled on Madhya Pradesh) used.'
  },
  uttarakhand: {
    state: 'Uttarakhand',
    roc: { office: 'RoC Uttarakhand (Dehradun)', jurisdiction: 'State of Uttarakhand' },
    moa: { summary: '₹500 flat (conservative estimate)', calc: flat(500) },
    aoa: { summary: '₹1,000 flat (conservative estimate)', calc: flat(1000) },
    llpAgreement: { summary: 'Linked to contribution under the Uttarakhand stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Uttarakhand rates not verified — conservative estimate used.'
  },
  goa: {
    state: 'Goa',
    roc: { office: 'RoC Goa (Panaji)', jurisdiction: 'State of Goa' },
    moa: { summary: '₹1,000 flat (conservative estimate)', calc: flat(1000) },
    aoa: { summary: '₹1,000 flat (conservative estimate)', calc: flat(1000) },
    llpAgreement: { summary: 'Linked to contribution under the Goa stamp schedule — confirm current rate' },
    confidence: 'indicative', note: COMMON_NOTE + ' Goa rates not verified — conservative estimate used.'
  }
};

for (const v of Object.values(stampDuty)) v.llpAgreement.note = LLP_NOTE;

/** Evaluate a stamp `calc` rule on an amount (authorised capital or contribution, in ₹). */
export function evalStampCalc(calc, capital) {
  if (!calc) return null;
  const c = Math.max(0, Number(capital) || 0);
  let v = 0;
  if (calc.type === 'flat') v = calc.amount;
  else if (calc.type === 'percent') {
    v = Math.round(c * calc.rate / 100);
    if (calc.min != null) v = Math.max(v, calc.min);
    if (calc.max != null && calc.max > 0) v = Math.min(v, calc.max);
  } else if (calc.type === 'slab') {
    const slab = calc.slabs.find((s) => c <= s.upTo);
    if (slab) v = slab.amount;
    else {
      const last = calc.slabs[calc.slabs.length - 1];
      v = last.amount;
      if (calc.perExtra) v += Math.ceil((c - last.upTo) / calc.perExtra.per) * calc.perExtra.amount;
    }
    if (calc.max != null) v = Math.min(v, calc.max);
  }
  return v;
}

/** States sorted by name, for <select> lists. */
export const stampStates = Object.entries(stampDuty)
  .map(([slug, v]) => ({ slug, name: v.state }))
  .sort((a, b) => a.name.localeCompare(b.name));
