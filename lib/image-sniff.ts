/**
 * Detects common image formats from magic bytes.
 * The first 512 bytes of a file are enough for all supported formats.
 */
export function sniffImageMimeType(buf: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf.readUInt32BE(0) === 0x89504e47 &&
    buf.readUInt32BE(4) === 0x0d0a1a0a
  ) {
    return "image/png";
  }
  // GIF: "GIF8"
  if (buf.length >= 6 && buf.toString("ascii", 0, 4) === "GIF8") {
    return "image/gif";
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // BMP: "BM"
  if (buf.length >= 2 && buf.toString("ascii", 0, 2) === "BM") {
    return "image/bmp";
  }
  // ICO: 00 00 01 00
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x00000100) {
    return "image/x-icon";
  }
  // AVIF: "ftyp" box with avif/avis brand
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  // SVG: text-based, look for "<svg" near the start
  const head = buf
    .toString("utf8", 0, Math.min(buf.length, 256))
    .replace(/^﻿/, "")
    .trimStart()
    .toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}
