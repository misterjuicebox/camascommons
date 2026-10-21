// Shrinks oversized photos in public/images in place (same filename and format,
// so CMS references keep working). Safe to run repeatedly: files that are already
// within limits are left untouched.
//
//   node scripts/compress-images.mjs                 # check every image
//   node scripts/compress-images.mjs path/a.jpg ...  # only these files
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/images';
const MAX_EDGE = 2000;          // regular photos: longest side
const PANORAMA_HEIGHT = 1000;   // photos more than 2:1 wide
const SLIDESHOW_HEIGHT = 800;   // slideshow strip shows photos 360px tall
const MAX_BYTES = 1.5 * 1024 * 1024; // re-encode anything bigger than this
const JPEG_QUALITY = 80;

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

function listImages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listImages(full);
    return EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

function targetSize(file, width, height) {
  if (file.includes(`${path.sep}slideshow${path.sep}`)) {
    return height > SLIDESHOW_HEIGHT ? { height: SLIDESHOW_HEIGHT } : null;
  }
  if (width > height * 2) {
    return height > PANORAMA_HEIGHT ? { height: PANORAMA_HEIGHT } : null;
  }
  if (Math.max(width, height) > MAX_EDGE) {
    return width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE };
  }
  return null;
}

async function compress(file) {
  const input = fs.readFileSync(file);
  const meta = await sharp(input).metadata();
  // Phone photos often store rotation in EXIF; account for it when measuring
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const resize = targetSize(file, width, height);
  if (!resize && input.length <= MAX_BYTES) return null;

  // .rotate() bakes in the EXIF orientation; metadata (incl. GPS location) is dropped
  let pipeline = sharp(input).rotate();
  if (resize) pipeline = pipeline.resize(resize);
  pipeline = meta.format === 'png'
    ? pipeline.png({ compressionLevel: 9, effort: 10 })
    : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

  const output = await pipeline.toBuffer();
  // Only keep the result if it is meaningfully smaller
  if (output.length > input.length * 0.9) return null;

  fs.writeFileSync(file, output);
  return { before: input.length, after: output.length };
}

const args = process.argv.slice(2);
const files = (args.length ? args : listImages(ROOT))
  .filter((f) => fs.existsSync(f) && EXTENSIONS.has(path.extname(f).toLowerCase()));

const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';
let changed = 0;
for (const file of files) {
  try {
    const result = await compress(file);
    if (result) {
      changed++;
      console.log(`compressed ${file}: ${mb(result.before)} -> ${mb(result.after)}`);
    }
  } catch (err) {
    console.error(`skipped ${file}: ${err.message}`);
  }
}
console.log(`${changed} of ${files.length} image(s) compressed.`);
