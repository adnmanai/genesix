import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(size) {
  const width = size;
  const height = size;
  
  // 1 filter byte + width * 4 bytes per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Dark futuristic background (#0a0a0a)
      let r = 10;
      let g = 10;
      let b = 10;
      let a = 255;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer glowing ring & inner polyhedron-inspired geometry
      if (dist <= radius) {
        const factor = dist / radius;
        // Cyan (#00f2fe) to Purple (#7000ff) gradient based on angle and radius
        const angle = Math.atan2(dy, dx);
        const normAngle = (angle + Math.PI) / (2 * Math.PI);

        // Core polygon pattern
        const polyFactor = Math.abs(Math.sin(angle * 3));
        const ring = Math.abs(Math.sin(dist / 12));

        r = Math.floor(10 + (240 * (1 - factor) * polyFactor) + (112 * normAngle * factor));
        g = Math.floor(10 + (200 * (1 - factor) * (1 - polyFactor)) + (50 * (1 - normAngle)));
        b = Math.floor(20 + (255 * (1 - factor * 0.5)));
      } else if (dist <= radius + 10) {
        // Glow border
        const glow = 1 - (dist - radius) / 10;
        r = Math.floor(0 * glow);
        g = Math.floor(242 * glow);
        b = Math.floor(254 * glow);
      }

      rawData[pixelOffset] = Math.min(255, Math.max(0, r));
      rawData[pixelOffset + 1] = Math.min(255, Math.max(0, g));
      rawData[pixelOffset + 2] = Math.min(255, Math.max(0, b));
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192, 512x512, and apple-touch-icon (180x180)
const icon192 = generatePng(192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = generatePng(512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const appleIcon = generatePng(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Successfully generated PWA PNG icons!');
