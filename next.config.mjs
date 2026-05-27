/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: Vercel 배포에도 무해하고, 나중에 교내 서버 Docker로 옮길 때
  // 최소 의존성만 담은 독립 실행 번들을 만들어줘 전환이 매끄럽다.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
