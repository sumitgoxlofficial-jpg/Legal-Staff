// Blog posts at /blog/<slug>, rendered by seo/pages/blog.mjs. Pillars 1–2 live in blogs-a.mjs, pillars 3–4 in blogs-b.mjs.
// Shape of each post (all fields required):
// { slug, pillar (id from pillars.mjs), title (H1), metaTitle (≤ 60 chars), metaDescription (140–160 chars), published 'YYYY-MM-DD', updated 'YYYY-MM-DD',
//   readMinutes, keywords: [string] (5–8), excerpt (1–2 sentences for cards),
//   summary: [string] (Executive summary, 2–3 paragraphs),
//   steps: { heading, items: [{ title, text }] } (Step-by-step guide, 5–8 steps),
//   rules: { heading, caption, headers: [string], rows: [[string]] } (Statutory rules / forms table, 4–8 rows),
//   sections: [{ heading, paragraphs: [string], bullets: [string] (optional) }] (1–3 extra sections of depth),
//   pitfalls: [{ title, text }] (Common pitfalls, 4–6),
//   faqs: [{ q, a }] (exactly 4),
//   related: { services: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
import { blogsA } from './blogs-a.mjs';
import { blogsB } from './blogs-b.mjs';
export const blogs = [...blogsA, ...blogsB];
