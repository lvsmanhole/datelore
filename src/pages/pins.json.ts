// Posting manifest for the Pinterest distribution engine, served at /pins.json.
// Each entry pairs a generated pin image (same-origin /pin/*.png) with its UTM'd
// destination, ready-to-post title + description, and a target board. Consumed by the
// owner (manual posting) and the auto-poster (scripts/post-to-pinterest.ts), which
// both build it from src/lib/pins-manifest. Built statically; no runtime cost.
import type { APIRoute } from 'astro';
import { buildPinManifest } from '../lib/pins-manifest';

export const GET: APIRoute = () => {
  const pins = buildPinManifest();
  return new Response(JSON.stringify({ count: pins.length, pins }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
