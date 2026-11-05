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
