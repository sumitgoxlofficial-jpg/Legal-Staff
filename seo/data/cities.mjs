// City pages at /advocate-software-in-<slug>, rendered by seo/pages/city.mjs.
// Shape: { slug, name, state, title (H1), metaTitle ('Best Practice & Case Management Software for Advocates in <City> | Legal Staff' style; ≤ ~65 chars before the brand suffix is fine), metaDescription,
//   intro: [string] (2 paragraphs, unique), courts: [{ name, court (slug in courts.mjs, optional), note }] (the High Court / bench and principal district courts and tribunals in or serving the city),
//   barNotes: [string] (3–4 local practice points: court complexes, bar associations by general name, typical case mix), benefits: [{ title, text }] (3–4 chamber workflow benefits framed for that city),
//   faqs: [{ q, a }] (4), nearby: [slug] (3–4) }
export const cities = [
  ['delhi', 'Delhi'], ['mumbai', 'Mumbai'], ['bengaluru', 'Bengaluru'], ['chennai', 'Chennai'], ['kolkata', 'Kolkata'], ['hyderabad', 'Hyderabad'], ['prayagraj', 'Prayagraj'],
  ['chandigarh', 'Chandigarh'], ['ahmedabad', 'Ahmedabad'], ['pune', 'Pune'], ['patna', 'Patna'], ['ranchi', 'Ranchi'], ['jaipur', 'Jaipur'], ['lucknow', 'Lucknow'], ['kochi', 'Kochi'],
  ['indore', 'Indore'], ['nagpur', 'Nagpur'], ['guwahati', 'Guwahati'], ['cuttack', 'Cuttack'], ['jodhpur', 'Jodhpur'], ['bilaspur', 'Bilaspur'], ['shimla', 'Shimla'], ['dehradun', 'Dehradun'], ['bokaro', 'Bokaro'], ['dhanbad', 'Dhanbad']
].map(([slug, name]) => ({ slug, name }));
