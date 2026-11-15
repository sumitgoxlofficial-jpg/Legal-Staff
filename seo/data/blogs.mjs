// Blog posts at /blog/<slug>, rendered by seo/pages/blog.mjs. Posts 1–10 live in blogs-a.mjs, 11–20 in blogs-b.mjs.
// Shape of each post (all fields required):
// { slug, pillar (id from pillars.mjs), title (H1), metaTitle (≤ 60 chars), metaDescription (140–160 chars), published 'YYYY-MM-DD', updated 'YYYY-MM-DD',
//   readMinutes, keywords: [string] (5–8), excerpt (1–2 sentences for cards),
//   summary: [string] (2–3 paragraphs), steps: { heading, items: [{ title, text }] } (5–8 steps),
//   rules: { heading, caption, headers: [string], rows: [[string]] } (procedural / statutory table, 4–8 rows),
//   sections: [{ heading, paragraphs: [string], bullets: [string] (optional) }] (1–3), pitfalls: [{ title, text }] (4–6),
//   faqs: [{ q, a }] (exactly 4), related: { features: [slug], courts: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
import { blogsA } from './blogs-a.mjs';
import { blogsB } from './blogs-b.mjs';
export const blogs = [...blogsA, ...blogsB];
