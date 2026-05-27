/**
 * scripts/sync-dart.ts
 * ---------------------------------------------------------
 * DART 전체 기업 corp_code 매핑(~10만건)을 받아 DartCorpCode 테이블에 캐싱.
 * (v1 syncDartCorpCodes 이식)
 *
 * 사전조건: .env 에 DART_API_KEY 설정, DB 마이그레이션(npm run db:push) 완료.
 * 실행:    npx tsx scripts/sync-dart.ts   (한 달 1회 권장)
 */
import AdmZip from 'adm-zip';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normName(s: string): string {
  return (s || '').replace(/[\s㈜()（）　]/g, '').replace(/주식회사/g, '').toLowerCase();
}

async function main() {
  const key = process.env.DART_API_KEY;
  if (!key) { console.error('DART_API_KEY 가 .env 에 없습니다.'); process.exit(1); }

  console.log('DART corp_code ZIP 다운로드 중...');
  const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${key}`);
  if (!res.ok) { console.error(`DART API 실패 (HTTP ${res.status})`); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());

  let xml: string;
  try {
    const zip = new AdmZip(buf);
    const entry = zip.getEntries()[0];
    xml = entry.getData().toString('utf-8');
  } catch {
    console.error('응답이 ZIP 이 아닙니다. API 키를 확인하세요:', buf.toString('utf-8').slice(0, 200));
    process.exit(1);
  }

  // 정규식 파싱 (XML 파서보다 빠름)
  const rows: { corpCode: string; corpName: string; normName: string; stockCode: string | null }[] = [];
  const blockRe = /<list>([\s\S]*?)<\/list>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const b = m[1];
    const code = b.match(/<corp_code>([^<]*)<\/corp_code>/)?.[1]?.trim();
    const name = b.match(/<corp_name>([^<]*)<\/corp_name>/)?.[1]?.trim();
    const stock = b.match(/<stock_code>([^<]*)<\/stock_code>/)?.[1]?.trim() || '';
    // corp_code 는 8자리(leading zero 포함). 혹시 손실됐을 경우 대비 패딩 (HANDOFF 함정)
    if (code && name) rows.push({ corpCode: code.padStart(8, '0'), corpName: name, normName: normName(name), stockCode: stock || null });
  }
  if (rows.length === 0) { console.error('파싱 결과 0건. 응답 형식이 바뀌었을 수 있습니다.'); process.exit(1); }

  console.log(`파싱 ${rows.length.toLocaleString()}건. DB 적재 중...`);
  await prisma.dartCorpCode.deleteMany({});
  const CHUNK = 5000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.dartCorpCode.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}`);
  }
  console.log(`\n✅ DART corp_code ${rows.length.toLocaleString()}건 동기화 완료`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
