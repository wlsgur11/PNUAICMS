/**
 * src/lib/lookup.ts
 * ---------------------------------------------------------
 * 기업명만으로 외부 공개데이터에서 정보를 자동 수집한다.
 * (v1 LookupService.gs 의 Node/서버 버전 — HANDOFF.md 6장 이식)
 *
 * 빈 칸만 채우며 4개 소스를 모두 시도한다(부분 실패해도 나머지는 유지):
 *  1) 공개 임금데이터(salary.ts)  : 평균연봉·신입사원연봉  [키 불필요]
 *       └ v1 의 ALIO(공공기관)+클린아이(지방공기업) 통합을 번들 salary.json 으로 대체
 *  2) 위키피디아(요약)            : 기업 소개문            [키 불필요]
 *  3) 네이버 지역검색             : 소재지·홈페이지        [NAVER 키]
 *  4) DART OpenAPI               : 대표자·업종·설립일·매출 [DART 키 + corp_code 캐시]
 *       └ DartCorpCode 테이블(scripts/sync-dart.ts 로 동기화)에서 회사명→corp_code 매칭
 *
 * 서버 전용 모듈 (API 키는 절대 클라이언트로 안 나감).
 * 키가 없는 소스는 조용히 건너뛴다(위키·임금은 키 없이 항상 동작 → Vercel 데모 OK).
 *
 * v1 한계(HANDOFF 8장) 그대로 유효: 부산 AI 스타트업 대부분은 어떤 무료 데이터셋에도
 * 없어 소재지·홈페이지 정도만 채워지고 직원수/연봉 등은 수동 입력이 필요하다.
 */

import { salaryLookup } from './salary';
import { industryName } from './ksic';
import { prisma } from './db';
import { normName } from './normalize';

function formatDartDate(s: string): string {
  if (!s || s.length !== 8) return s || '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export type LookupResult = {
  enabled: boolean;
  name: string;
  addressDetail: string;
  homepage: string;
  ceo: string;
  industry: string;
  foundedAt: string;
  revenueScale: string;
  region: string;
  avgSalary: string; // 평균연봉 (공개 임금데이터)
  newcomerSalary: string; // 신입사원연봉 (공개 임금데이터)
  summary: string; // 위키피디아 요약 (소개문)
  sources: string[];
};

function keys() {
  return {
    dart: process.env.DART_API_KEY || '',
    naverId: process.env.NAVER_CLIENT_ID || '',
    naverSecret: process.env.NAVER_CLIENT_SECRET || '',
  };
}

export function lookupEnabled(): boolean {
  // 위키피디아는 키가 필요 없으므로 항상 최소 활성 (네이버/DART는 키 있을 때 추가)
  return true;
}

/** 매출액(원) → 사람이 읽는 범위 라벨 */
function salesLabel(amountKRW: number): string {
  if (!amountKRW || amountKRW <= 0) return '';
  const ek = amountKRW / 100_000_000; // 억
  if (ek < 10) return '10억 미만';
  if (ek < 50) return '10~50억';
  if (ek < 100) return '50~100억';
  if (ek < 500) return '100~500억';
  if (ek < 1000) return '500~1000억';
  if (ek < 5000) return '1000~5000억';
  if (ek < 10000) return '5000~1조';
  return '1조 이상';
}

function normalizeUrl(u: string): string {
  const s = (u || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}

function stripTags(s: string): string {
  return String(s || '').replace(/<[^>]+>/g, '');
}

/** 소재지 문자열 → 지역구분 추정 */
function guessRegion(addr: string): string {
  const a = addr || '';
  if (a.includes('부산')) return '부산';
  if (a.includes('울산')) return '울산';
  if (a.includes('경남') || a.includes('경상남도')) return '경남';
  if (a.includes('서울') || a.includes('경기') || a.includes('인천')) return '수도권';
  return '';
}

/** 네이버 지역검색 */
async function naverLocal(name: string): Promise<{ address: string; link: string } | null> {
  const k = keys();
  if (!k.naverId || !k.naverSecret) return null;
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(name)}&display=1`;
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': k.naverId, 'X-Naver-Client-Secret': k.naverSecret },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    address: item.roadAddress || item.address || '',
    link: item.link || '',
  };
}

// ── DART (corp_code 캐시 기반) ──────────────────────────
/** DartCorpCode 테이블에서 회사명 → corp_code. 정확일치 우선, 부분일치 보강. */
async function findDartCorpCode(name: string): Promise<string | null> {
  const target = normName(name);
  if (!target) return null;
  const exact = await prisma.dartCorpCode.findFirst({ where: { normName: target }, select: { corpCode: true } });
  if (exact) return exact.corpCode;
  if (target.length >= 3) {
    const part = await prisma.dartCorpCode.findFirst({ where: { normName: { contains: target } }, select: { corpCode: true } });
    if (part) return part.corpCode;
  }
  return null;
}

/** DART 회사개황: 대표자/주소/업종/설립일 */
async function dartCompanyInfo(corpCode: string): Promise<{ ceo: string; address: string; homepage: string; industry: string; foundedAt: string } | null> {
  const k = keys();
  const res = await fetch(`https://opendart.fss.or.kr/api/company.json?crtfc_key=${k.dart}&corp_code=${corpCode}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const d = await res.json();
  if (d.status !== '000') return null;
  return { ceo: d.ceo_nm || '', address: d.adres || '', homepage: normalizeUrl(d.hm_url || ''), industry: industryName(d.induty_code || ''), foundedAt: formatDartDate(d.est_dt || '') };
}

/** DART 단일회사 주요계정: 매출액 (최신 사업보고서, 없으면 직전연도) */
async function dartRevenue(corpCode: string): Promise<number> {
  const k = keys();
  const thisYear = new Date().getFullYear();
  for (let year = thisYear - 1; year >= thisYear - 3; year--) {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${k.dart}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) continue;
    const d = await res.json();
    if (d.status === '000' && Array.isArray(d.list)) {
      const item = d.list.find((x: { account_nm?: string }) => x.account_nm === '매출액');
      if (item?.thstrm_amount) return Number(String(item.thstrm_amount).replace(/[^0-9.-]/g, '')) || 0;
    }
  }
  return 0;
}

/** 위키피디아(한국어) 요약 조회. API 키 불필요 → Vercel 데모에서도 동작. */
async function wikipediaSummary(name: string): Promise<{ extract: string; url: string } | null> {
  const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'buulgyeong-ai-cms/2.0' }, cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.type === 'disambiguation' || !data?.extract) return null;
  return { extract: data.extract as string, url: data?.content_urls?.desktop?.page || '' };
}

/**
 * 기업명 → 통합 자동조회 결과.
 * 외부 API 가 느리거나 실패해도 부분 결과를 돌려준다.
 * 출처: 네이버(주소/홈페이지) + DART(재무·개황) + 위키피디아(소개문).
 */
export async function lookupCompany(name: string): Promise<LookupResult> {
  const result: LookupResult = {
    enabled: lookupEnabled(),
    name,
    addressDetail: '',
    homepage: '',
    ceo: '',
    industry: '',
    foundedAt: '',
    revenueScale: '',
    region: '',
    avgSalary: '',
    newcomerSalary: '',
    summary: '',
    sources: [],
  };
  if (!name) return result;

  // 공개 임금데이터 (지방공기업/공공기관) — 키 불필요, 로컬 번들
  try {
    const sal = salaryLookup(name);
    if (sal && (sal.avgSalary || sal.newcomerSalary)) {
      if (sal.avgSalary) result.avgSalary = sal.avgSalary;
      if (sal.newcomerSalary) result.newcomerSalary = sal.newcomerSalary;
      result.sources.push('SALARY');
    }
  } catch {
    /* 무시 */
  }

  // 위키피디아 (키 불필요)
  try {
    const wiki = await wikipediaSummary(name);
    if (wiki) {
      result.summary = wiki.extract;
      result.sources.push('WIKI');
    }
  } catch {
    /* 무시 */
  }

  // DART 를 먼저 적용 (상장/외감 기업은 공식 본사 주소가 가장 정확).
  // 매칭되지 않은(중소·스타트업) 회사는 다음 단계의 네이버가 보강한다.
  if (keys().dart) {
    try {
      const corpCode = await findDartCorpCode(name);
      if (corpCode) {
        const info = await dartCompanyInfo(corpCode);
        if (info) {
          result.ceo = info.ceo || result.ceo;
          if (info.address) result.addressDetail = info.address;
          if (info.homepage) result.homepage = info.homepage;
          result.industry = info.industry || result.industry;
          result.foundedAt = info.foundedAt || result.foundedAt;
        }
        const revenue = await dartRevenue(corpCode);
        if (revenue > 0) result.revenueScale = salesLabel(revenue);
        if (info || revenue > 0) result.sources.push('DART');
      }
    } catch {
      /* 무시: 캐시 미동기화/네트워크 오류여도 부분 결과 유지 */
    }
  }

  // 네이버 지역검색 — DART 가 못 채운 빈 칸만 보강 (지점/매장 결과가 본사 주소를 덮어쓰지 않도록)
  try {
    const nav = await naverLocal(name);
    if (nav) {
      const filledAddr = !result.addressDetail && nav.address;
      const filledLink = !result.homepage && nav.link;
      if (filledAddr) result.addressDetail = nav.address;
      if (filledLink) result.homepage = normalizeUrl(nav.link);
      if (filledAddr || filledLink) result.sources.push('NAVER');
    }
  } catch {
    /* 무시: 부분 결과 유지 */
  }

  // 지역 추정 (DART/네이버 주소 기준)
  if (result.addressDetail) {
    const g = guessRegion(result.addressDetail);
    if (g) result.region = g;
  }

  void stripTags; // (네이버 title 정제용 예비 유틸)
  return result;
}
