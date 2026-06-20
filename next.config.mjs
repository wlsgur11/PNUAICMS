// 전역 보안 헤더. (CSP 스크립트 정책은 Next 인라인 스크립트와 충돌 위험이 커서
//  당장은 clickjacking 방지 frame-ancestors 만; 나머지는 안전한 표준 헤더로 구성)
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' }, // 클릭재킹: iframe 삽입 차단
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // MIME 스니핑 차단
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // 외부로 전체 URL 유출 방지
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, // 불필요 권한 차단
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }, // 클릭재킹(현대식)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }, // HTTPS 강제(HTTPS에서만 적용)
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: Vercel 배포에도 무해하고, 나중에 교내 서버 Docker로 옮길 때
  // 최소 의존성만 담은 독립 실행 번들을 만들어줘 전환이 매끄럽다.
  output: 'standalone',
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
