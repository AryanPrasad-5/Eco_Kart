#!/usr/bin/env node
/**
 * Generate the Issue #6 first-invocation fixture: an unmistakable plastic
 * water bottle drawn programmatically as a PNG (pure Node zlib — zero deps).
 *
 * PIPELINE PROOF ONLY — not an accuracy benchmark. Flat-color shapes:
 * clear plastic-tint body, blue cap, white highlight band, plain light
 * background. No text, no logos, no labels, no embedded instructions.
 *
 * Usage: node scripts/make-bottle-fixture.mjs [outPath]
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const W = 480;
const H = 640;
const bytes = Buffer.alloc(H * (1 + W * 4)); // RGBA, filter byte 0 per row

const px = (x, y, r, g, b, a = 255) => {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const off = y * (1 + W * 4) + 1 + x * 4;
  bytes[off] = r;
  bytes[off + 1] = g;
  bytes[off + 2] = b;
  bytes[off + 3] = a;
};

// Background: plain light gray
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, 235, 238, 240);

// Bottle geometry (centered, fills most of the frame)
const cx = W / 2;
const bottleTop = 70;    // cap top
const capH = 64;         // cap height
const neckTop = bottleTop + capH;
const neckH = 60;        // neck ring
const shoulder = neckTop + neckH;
const bodyTop = shoulder + 90;
const bodyBottom = H - 70;
const halfBody = 120;    // body half-width
const halfNeck = 42;     // neck half-width

const inRange = (v, a, b) => v >= a && v <= b;

for (let y = bottleTop; y <= bodyBottom; y++) {
  for (let x = cx - halfBody - 2; x <= cx + halfBody + 2; x++) {
    // Cap: solid blue with subtle vertical ribs (no text)
    if (inRange(y, bottleTop, neckTop - 1)) {
      const half = 52;
      if (Math.abs(x - cx) <= half) {
        const rib = Math.abs(((x - (cx - half)) % 16) - 8) < 2 ? 58 : 0;
        px(x, y, 30 + rib, 110 + rib, 210 + rib);
      }
    }
    // Neck: clear plastic-tint ring
    else if (inRange(y, neckTop, shoulder - 1)) {
      const t = (y - neckTop) / neckH;
      const half = Math.round(halfNeck + t * 34); // flare toward shoulder
      if (Math.abs(x - cx) <= half) px(x, y, 208, 224, 230);
    }
    // Shoulder: trapezoid from neck width to body width
    else if (inRange(y, shoulder, bodyTop - 1)) {
      const t = (y - shoulder) / (bodyTop - shoulder);
      const half = Math.round(halfNeck + 34 + t * (halfBody - halfNeck - 34));
      if (Math.abs(x - cx) <= half) px(x, y, 205, 226, 234);
    }
    // Body: clear plastic-tint with rounded corners
    else if (inRange(y, bodyTop, bodyBottom)) {
      const edge = Math.min(y - bodyTop, bodyBottom - y);
      const round = edge < 26 ? Math.round((1 - edge / 26) * 30) : 0;
      if (Math.abs(x - cx) <= halfBody - round) {
        px(x, y, 205, 226, 234);
        // Vertical highlight band on the left third (translucency cue)
        if (x > cx - 78 && x < cx - 40) px(x, y, 238, 248, 252);
        // Horizontal grip indent near the bottom
        if (y > bodyBottom - 96 && y < bodyBottom - 78) px(x, y, 186, 210, 222);
      }
    }
  }
}

// PNG assembly (IHDR truecolor+alpha, single IDAT, IEND)
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(bytes, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = process.argv[2] ?? new URL('./bottle-fixture.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes, ${W}x${H} RGBA PNG)`);
