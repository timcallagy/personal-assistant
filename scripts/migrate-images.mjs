#!/usr/bin/env node
/**
 * Image migration script: Oregon pa-api → Frankfurt pa-api
 *
 * Usage:
 *   node scripts/migrate-images.mjs <session-cookie>
 *
 * The session cookie is the value of the `pa_session` cookie from your
 * logged-in PA web app (Frankfurt).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OREGON_API = 'https://pa-api-6uyh.onrender.com/api/v1';
const FRANKFURT_API = 'https://pa-api-2fwl.onrender.com/api/v1';

const SESSION_COOKIE = process.argv[2];
if (!SESSION_COOKIE) {
  console.error('Usage: node scripts/migrate-images.mjs <session-cookie-value>');
  process.exit(1);
}

const headers = { Cookie: `pa_session=${SESSION_COOKIE}` };

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

// 1. Get all blog posts from Frankfurt (public endpoint, no auth)
async function getAllPosts() {
  let page = 1;
  const all = [];
  while (true) {
    const data = await fetchJson(`${FRANKFURT_API}/blog/posts?page=${page}&limit=50`);
    const posts = data.data?.posts ?? [];
    all.push(...posts);
    if (posts.length < 50) break;
    page++;
  }
  return all;
}

// 2. Download image from Oregon as Buffer
async function downloadImage(oregonUrl) {
  const res = await fetch(oregonUrl);
  if (!res.ok) throw new Error(`Failed to download ${oregonUrl}: HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: res.headers.get('content-type') || 'image/jpeg' };
}

// 3. Upload image buffer to Frankfurt admin API
async function uploadImage(buffer, contentType, filename) {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append('image', blob, filename);

  const res = await fetch(`${FRANKFURT_API}/blog/admin/images`, {
    method: 'POST',
    headers, // Cookie only, no Content-Type (browser sets multipart boundary)
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.url;
}

// 4. Update post featuredImage via admin API
async function updatePostImage(postId, newImageUrl) {
  const res = await fetch(`${FRANKFURT_API}/blog/admin/posts/${postId}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ featuredImage: newImageUrl }),
  });
  if (!res.ok) throw new Error(`Update post ${postId} failed: HTTP ${res.status}: ${await res.text()}`);
}

// 5. Update blog config promo banner image
async function updateConfigImage(newImageUrl) {
  const res = await fetch(`${FRANKFURT_API}/blog/admin/config`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoBannerImage: newImageUrl }),
  });
  if (!res.ok) throw new Error(`Update config failed: HTTP ${res.status}: ${await res.text()}`);
}

async function migrateImage(oregonUrl, label) {
  const filename = path.basename(oregonUrl);
  console.log(`  Oregon: ${oregonUrl}`);
  const { buffer, contentType } = await downloadImage(oregonUrl);
  console.log(`  Downloaded ${buffer.length} bytes (${contentType})`);
  const newUrl = await uploadImage(buffer, contentType, filename);
  console.log(`  Frankfurt: ${newUrl}`);
  return newUrl;
}

async function main() {
  // --- Migrate blog post featured images ---
  console.log('Fetching all blog posts from Frankfurt...');
  const posts = await getAllPosts();
  console.log(`Found ${posts.length} posts`);

  const oregonPosts = posts.filter(p => p.featuredImage?.includes('pa-api-6uyh.onrender.com'));
  console.log(`Posts with Oregon images: ${oregonPosts.length}`);

  for (const post of oregonPosts) {
    console.log(`\n[${post.id}] "${post.title}"`);
    try {
      const newUrl = await migrateImage(post.featuredImage, `post ${post.id}`);
      await updatePostImage(post.id, newUrl);
      console.log(`  ✓ Updated post ${post.id}`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  // --- Migrate blog config promo banner image ---
  console.log('\nChecking blog config for Oregon promo banner image...');
  try {
    const configRes = await fetchJson(`${FRANKFURT_API}/blog/admin/config`, { headers });
    const promoBannerImage = configRes.data?.promoBannerImage;
    if (promoBannerImage?.includes('pa-api-6uyh.onrender.com')) {
      console.log('Found Oregon promo banner image:');
      const newUrl = await migrateImage(promoBannerImage, 'config promo banner');
      await updateConfigImage(newUrl);
      console.log('  ✓ Updated blog config promo banner');
    } else {
      console.log('No Oregon image in blog config.');
    }
  } catch (err) {
    console.error(`  ✗ Config error: ${err.message}`);
  }

  console.log('\nMigration complete!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
