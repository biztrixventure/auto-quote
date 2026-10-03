#!/usr/bin/env node
// Command-line client for the blog publishing API (/api/blog-api/v1).
//
// Setup: create a key in Admin → API keys, then put this in .env.blog (git-ignored):
//   BLOG_API_URL=https://vertexautocare.com
//   BLOG_API_KEY=vak_...
//
// Usage:
//   node scripts/blog-api.mjs site [--out site.json]          pages, state guides, posts, tags (for internal links)
//   node scripts/blog-api.mjs get <id-or-slug> [--out post.json]
//   node scripts/blog-api.mjs create <post.json>                create a post
//   node scripts/blog-api.mjs update <id-or-slug> <post.json>   change only the fields in the file
//   node scripts/blog-api.mjs upload <image> --alt "Alt text"   returns the image id
//   node scripts/blog-api.mjs category "Name" [--description "..."]
//
// post.json: { "title", "contentFile": "post.html" (or "content"), "slug", "excerpt", "category",
//   "tags": [..], "coverImageId", "coverAlt", "seoTitle", "seoDescription", "status": "draft"|"review"|"publish", "publishAt" }
// The key is never printed.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function loadEnv() {
  const file = path.resolve(process.cwd(), ".env.blog");
  let text = "";
  try {
    text = await readFile(file, "utf8");
  } catch {
    fail(`Missing ${file}. Create it with BLOG_API_URL and BLOG_API_KEY.`);
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!env.BLOG_API_URL || !/^https?:\/\//.test(env.BLOG_API_URL)) fail("BLOG_API_URL is missing or not a URL in .env.blog");
  if (!env.BLOG_API_KEY?.startsWith("vak_")) fail("BLOG_API_KEY is missing in .env.blog (it starts with vak_)");
  return { base: env.BLOG_API_URL.replace(/\/$/, "") + "/api/blog-api/v1", key: env.BLOG_API_KEY };
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function flag(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

async function call(env, method, route, body, isForm = false) {
  const headers = { Authorization: `Bearer ${env.key}` };
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(env.base + route, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 300) };
  }
  if (!res.ok) fail(`${res.status} ${data.error ?? res.statusText}`);
  return data;
}

async function readPost(file) {
  const dir = path.dirname(path.resolve(file));
  const post = JSON.parse(await readFile(file, "utf8"));
  if (post.contentFile) {
    post.content = await readFile(path.resolve(dir, post.contentFile), "utf8");
    delete post.contentFile;
  }
  return post;
}

async function output(data, out) {
  const json = JSON.stringify(data, null, 2);
  if (out) {
    await writeFile(out, json);
    console.log(`Saved to ${out}`);
  } else console.log(json);
}

const [cmd, ...args] = process.argv.slice(2);
const env = await loadEnv();
const out = flag(args, "--out");

switch (cmd) {
  case "site":
    await output(await call(env, "GET", "/site"), out);
    break;
  case "get":
    if (!args[0]) fail("Usage: get <id-or-slug>");
    await output(await call(env, "GET", `/posts/${encodeURIComponent(args[0])}`), out);
    break;
  case "create": {
    if (!args[0]) fail("Usage: create <post.json>");
    const r = await call(env, "POST", "/posts", await readPost(args[0]));
    console.log(JSON.stringify({ message: r.message, id: r.post.id, slug: r.post.slug, state: r.post.state, url: r.post.url, adminUrl: r.post.adminUrl }, null, 2));
    break;
  }
  case "update": {
    if (!args[0] || !args[1]) fail("Usage: update <id-or-slug> <post.json>");
    const r = await call(env, "PATCH", `/posts/${encodeURIComponent(args[0])}`, await readPost(args[1]));
    console.log(JSON.stringify({ message: r.message, id: r.post.id, slug: r.post.slug, state: r.post.state, url: r.post.url }, null, 2));
    break;
  }
  case "upload": {
    const alt = flag(args, "--alt");
    if (!args[0] || !alt) fail('Usage: upload <image> --alt "Alt text"');
    const bytes = await readFile(args[0]);
    const form = new FormData();
    form.append("file", new Blob([bytes]), path.basename(args[0]));
    form.append("alt", alt);
    console.log(JSON.stringify(await call(env, "POST", "/media", form, true), null, 2));
    break;
  }
  case "category": {
    const description = flag(args, "--description");
    if (!args[0]) fail('Usage: category "Name" [--description "..."]');
    console.log(JSON.stringify(await call(env, "POST", "/categories", { name: args[0], description }), null, 2));
    break;
  }
  default:
    fail("Commands: site | get | create | update | upload | category (see the top of scripts/blog-api.mjs)");
}
