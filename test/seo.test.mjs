import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

export const read = (name) =>
  readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

export const html = read("index.html");
export const head = html.slice(0, html.indexOf("</head>"));
export const body = html.slice(html.indexOf("<body>"));

// Returns the value of `name="..."` on the first HTML tag matching `tag` (a regex source).
export function attr(tag, name) {
  const m = html.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

test("page is indexable: no noindex/nofollow robots meta", () => {
  assert.doesNotMatch(head, /name="robots"[^>]*noindex/i);
  assert.doesNotMatch(head, /name="robots"[^>]*nofollow/i);
});

test("robots.txt allows everything and names the sitemap", () => {
  assert.ok(existsSync(new URL("../robots.txt", import.meta.url)));
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/[^/\s]+\/sitemap\.xml$/m);
});

test("sitemap.xml lists the home page", () => {
  assert.ok(existsSync(new URL("../sitemap.xml", import.meta.url)));
  const sitemap = read("sitemap.xml");
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(sitemap, /<loc>https:\/\/[^/\s]+\/<\/loc>/);
});

test("test files are not deployed", () => {
  assert.match(read(".vercelignore"), /^test\/?$/m);
});

test("html lang is Australian English", () => {
  assert.match(html, /<html lang="en-AU">/);
});

test("title starts with the brand phrase", () => {
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  assert.ok(title.startsWith("Coffs Bark Diary"), `title was: ${title}`);
  assert.ok(title.length <= 70, `title too long (${title.length})`);
});

test("meta description mentions the brand and the suburb", () => {
  const d = attr('meta name="description"', "content");
  assert.ok(d, "no meta description");
  assert.match(d, /Coffs Bark Diary/);
  assert.match(d, /Coffs Harbour/);
  assert.ok(d.length >= 80 && d.length <= 160, `description length ${d.length}`);
});

test("canonical link points at the site root", () => {
  const href = attr('link rel="canonical"', "href");
  assert.match(href, /^https:\/\/[^/\s]+\/$/);
});

test("Open Graph title, description and url are set", () => {
  assert.equal(attr('meta property="og:title"', "content"), "Coffs Bark Diary");
  assert.ok(attr('meta property="og:description"', "content"));
  assert.equal(attr('meta property="og:url"', "content"), attr('link rel="canonical"', "href"));
  assert.equal(attr('meta property="og:type"', "content"), "website");
});

test("h1 is exactly the brand phrase", () => {
  assert.match(body, /<h1>Coffs Bark Diary<\/h1>/);
});

test("the brand phrase appears naturally in the body text at least three times", () => {
  const count = (body.match(/Coffs Bark Diary/g) || []).length;
  assert.ok(count >= 3, `found ${count}`);
});

test("street and council reference are still on the page", () => {
  assert.match(body, /Combine Street, Coffs Harbour/);
  assert.match(body, /02503\/27CR/);
});

test("JSON-LD describes the site with the brand name and canonical url", () => {
  const m = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, "no JSON-LD block");
  const data = JSON.parse(m[1]);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "WebSite");
  assert.equal(data.name, "Coffs Bark Diary");
  assert.deepEqual(data.alternateName, ["Bark Diary Coffs", "Coffs Barking Diary"]);
  assert.equal(data.url, attr('link rel="canonical"', "href"));
  assert.equal(data.inLanguage, "en-AU");
});

test("every absolute site URL uses the canonical origin", () => {
  const origin = new URL(attr('link rel="canonical"', "href")).origin;
  const csv = html.match(/const CSV_URL = "([^"]+)"/)[1];
  assert.equal(new URL(csv).origin, origin, "CSV_URL origin");
  assert.equal(csv, `${origin}/bark-diary.csv`);
  assert.match(read("robots.txt"), new RegExp(`^Sitemap: ${origin}/sitemap\\.xml$`, "m"));
  assert.match(read("sitemap.xml"), new RegExp(`<loc>${origin}/</loc>`));
  assert.equal(attr('meta property="og:url"', "content"), `${origin}/`);
  const ld = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.url, `${origin}/`);
});
