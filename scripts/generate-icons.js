const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);

  const cx = width / 2;
  const cy = height / 2;
  const rBadge = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rBadge) {
        // Gradient background from Cyan (#06b6d4) to Indigo (#6366f1)
        const t = (x + y) / (width * 2);
        const r = Math.round(6 + (99 - 6) * t);
        const g = Math.round(182 + (102 - 182) * t);
        const b = Math.round(212 + (241 - 212) * t);

        // Friendly avatar face elements
        // Eyes
        const leftEyeDist = Math.sqrt((x - (cx - width * 0.16)) ** 2 + (y - (cy - height * 0.08)) ** 2);
        const rightEyeDist = Math.sqrt((x - (cx + width * 0.16)) ** 2 + (y - (cy - height * 0.08)) ** 2);
        const eyeRadius = width * 0.055;

        // Smile
        const mouthDx = x - cx;
        const mouthDy = y - (cy + height * 0.1);
        const mouthDist = Math.sqrt(mouthDx * mouthDx + mouthDy * mouthDy);
        const inMouthArc = (mouthDist > width * 0.14 && mouthDist < width * 0.18 && y > cy + height * 0.1);

        if (leftEyeDist <= eyeRadius || rightEyeDist <= eyeRadius || inMouthArc) {
          // White face features
          raw[px] = 255;
          raw[px + 1] = 255;
          raw[px + 2] = 255;
          raw[px + 3] = 255;
        } else {
          raw[px] = r;
          raw[px + 1] = g;
          raw[px + 2] = b;
          raw[px + 3] = 255;
        }
      } else {
        // Transparent
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      }
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Compression method (deflate)
  ihdrData.writeUInt8(0, 11); // Filter method (standard)
  ihdrData.writeUInt8(0, 12); // Interlace (no)
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function pngToIco(pngBuf, size = 256) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type 1
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width: 0 means 256
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height: 0 means 256
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // size of image data
  entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuf]);
}

console.log('Generating 256x256 and 512x512 icons...');
const png256 = generatePng(256);
const png512 = generatePng(512);
const ico = pngToIco(png256, 256);

// Write to desktop resources
fs.writeFileSync(path.join(__dirname, '../apps/desktop/resources/icon.png'), png256);
fs.writeFileSync(path.join(__dirname, '../apps/desktop/resources/icon.ico'), ico);

// Write to web public and web dist
fs.writeFileSync(path.join(__dirname, '../apps/web/public/icon-192.png'), png256);
fs.writeFileSync(path.join(__dirname, '../apps/web/public/icon-512.png'), png512);

console.log('Icons generated successfully! icon.ico size:', ico.length, 'png256 size:', png256.length);
