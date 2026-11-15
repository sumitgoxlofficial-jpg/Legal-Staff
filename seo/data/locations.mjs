// Programmatic local pages at /company-registration-in-<slug>. Rendered by seo/pages/location.mjs.
// Shape: { slug, name, type: 'city'|'state', state (state name; for a state, itself), roc: { office, jurisdiction, address (city-level only) },
//   stampDuty: { summary, moaAoaNote, sourceNote }, ecosystem: [string] (3–5), highlights: [{ label, value }] (3–4, qualitative or well-established public facts only),
//   nearby: [slug] (3–5), intro (unique 2–3 sentences), faqs: [{ q, a }] (4) }
export const locations = [
  ['bangalore', 'Bangalore'], ['mumbai', 'Mumbai'], ['delhi-ncr', 'Delhi NCR'], ['gurgaon', 'Gurgaon'], ['noida', 'Noida'], ['hyderabad', 'Hyderabad'], ['pune', 'Pune'], ['chennai', 'Chennai'],
  ['kolkata', 'Kolkata'], ['ahmedabad', 'Ahmedabad'], ['patna', 'Patna'], ['ranchi', 'Ranchi'], ['bokaro', 'Bokaro'], ['jaipur', 'Jaipur'], ['lucknow', 'Lucknow'], ['chandigarh', 'Chandigarh'],
  ['indore', 'Indore'], ['kochi', 'Kochi'], ['surat', 'Surat'], ['coimbatore', 'Coimbatore'], ['visakhapatnam', 'Visakhapatnam'], ['bhubaneswar', 'Bhubaneswar'], ['guwahati', 'Guwahati'], ['raipur', 'Raipur'], ['dehradun', 'Dehradun'],
  ['maharashtra', 'Maharashtra'], ['karnataka', 'Karnataka'], ['delhi', 'Delhi'], ['jharkhand', 'Jharkhand'], ['bihar', 'Bihar'], ['uttar-pradesh', 'Uttar Pradesh'], ['gujarat', 'Gujarat'], ['tamil-nadu', 'Tamil Nadu'], ['telangana', 'Telangana'], ['west-bengal', 'West Bengal']
].map(([slug, name]) => ({ slug, name }));
