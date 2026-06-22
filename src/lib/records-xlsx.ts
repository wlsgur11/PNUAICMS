/**
 * src/lib/records-xlsx.ts
 * ---------------------------------------------------------
 * xlsx(zip) → 시트별 2차원 문자열 배열.
 * 이 실적 파일은 exceljs·SheetJS 가 worksheet 를 못 읽어(외부링크/비표준 메타),
 * zip 을 직접 풀고 OOXML XML 을 파싱한다. (파이썬 zip+XML 로 동작 검증된 방식의 TS 포팅)
 */
import AdmZip from 'adm-zip';

export type SheetRows = { name: string; rows: string[][] };

const M = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
void M; void R;

/** 태그 이름의 네임스페이스 접두사 제거: <x:sheet> → <sheet>, </x:row> → </row>.
 *  이 파일은 모든 요소에 x: 접두사를 써서, 제거 후 일반 OOXML 처럼 파싱한다.
 *  속성(r:id 등)과 <?xml?>·xmlns 선언은 영향받지 않는다. */
function stripNs(xml: string): string {
  return xml.replace(/<(\/?)[A-Za-z][\w.-]*:/g, '<$1');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

/** <si>..</si> 각 항목의 모든 <t> 텍스트를 이어 붙여 공유문자열 배열 생성 */
function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const inner = m[1];
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    let s = '';
    while ((t = tRe.exec(inner))) s += decodeEntities(t[1]);
    out.push(s);
  }
  return out;
}

function colToIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1; // 0-based
}

/** 큰 정수(학번 등)는 <v> 에 "2.02213511E8" 같은 과학적 표기로 저장된다.
 *  과학적 표기면 평문 숫자 문자열(예: 202213511)로 복원한다. 그 외 값은 그대로 둔다.
 *  복원하지 않으면 'E' 가 떨어져나가 학번/숫자가 깨진다(2.02213511E8 → 02213511). */
function expandSci(v: string): string {
  if (/^[+-]?\d+(\.\d+)?[Ee][+-]?\d+$/.test(v)) {
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
  }
  return v;
}

/** sheetN.xml → 행 배열 (열 위치 맞춰 빈칸 채움) */
function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml))) {
    const inner = rm[2];
    const cells: string[] = [];
    const cRe = /<c\b([^>]*?)>([\s\S]*?)<\/c>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cRe.exec(inner))) {
      const attrs = cm[1];
      const body = cm[2];
      const refM = attrs.match(/\br="([A-Z]+\d+)"/);
      if (!refM) continue;
      const idx = colToIndex(refM[1]);
      const tM = attrs.match(/\bt="([^"]*)"/);
      const type = tM ? tM[1] : '';
      let val = '';
      if (type === 's') {
        const vM = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vM) val = shared[parseInt(vM[1], 10)] ?? '';
      } else if (type === 'inlineStr') {
        const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
        let t: RegExpExecArray | null;
        while ((t = tRe.exec(body))) val += decodeEntities(t[1]);
      } else {
        const vM = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vM) val = expandSci(decodeEntities(vM[1]));
      }
      cells[idx] = val;
    }
    // 빈칸을 ''로 채워 밀도 있는 배열로
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
    rows.push(cells.map((c) => (c ?? '').trim()));
  }
  return rows;
}

export function readSheets(buf: ArrayBuffer): SheetRows[] {
  const zip = new AdmZip(Buffer.from(buf));
  const read = (path: string): string => {
    const e = zip.getEntry(path);
    return e ? stripNs(e.getData().toString('utf8')) : '';
  };
  const shared = parseSharedStrings(read('xl/sharedStrings.xml'));

  // 시트명 ↔ 파일 매핑: workbook.xml(name, r:id) + workbook.xml.rels(r:id → target)
  const wbXml = read('xl/workbook.xml');
  const relsXml = read('xl/_rels/workbook.xml.rels');
  const rid2target = new Map<string, string>();
  const relRe = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g;
  let r: RegExpExecArray | null;
  while ((r = relRe.exec(relsXml))) rid2target.set(r[1], r[2]);

  const sheets: SheetRows[] = [];
  const sheetRe = /<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"[^>]*\/?>/g;
  let sm: RegExpExecArray | null;
  while ((sm = sheetRe.exec(wbXml))) {
    const name = decodeEntities(sm[1]);
    const target = rid2target.get(sm[2]);
    if (!target) continue;
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const xml = read(path);
    sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}
