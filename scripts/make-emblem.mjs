// scripts/make-emblem.mjs
// 사용: node scripts/make-emblem.mjs "<jpg경로>"
// 흰 배경(near-white) 픽셀을 투명 처리 후 public/emblem.png, src/app/icon.png 생성
import sharp from 'sharp';

const src = process.argv[2];
if (!src) { console.error('사용: node scripts/make-emblem.mjs <jpg경로>'); process.exit(1); }

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ch = info.channels; // 4 (RGBA)
for (let i = 0; i < data.length; i += ch) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (r > 235 && g > 235 && b > 235) data[i + 3] = 0; // 흰색 → 투명
}

const raw = { raw: { width: info.width, height: info.height, channels: ch } };
const make = (size, out) =>
  sharp(Buffer.from(data), raw)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);

await make(512, 'public/emblem.png');
await make(256, 'src/app/icon.png');
console.log('생성 완료: public/emblem.png, src/app/icon.png');
