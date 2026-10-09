const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="50" fill="#1A4D44"/>
  <circle cx="50" cy="50" r="28" fill="#CCFF00" stroke="#0D2E27" stroke-width="2"/>
  <path d="M 50 22 Q 50 50 50 78" stroke="#0D2E27" stroke-width="1.5" fill="none"/>
  <path d="M 32 30 Q 50 50 68 30" stroke="#0D2E27" stroke-width="1.5" fill="none"/>
  <path d="M 32 70 Q 50 50 68 70" stroke="#0D2E27" stroke-width="1.5" fill="none"/>
</svg>`;

const DEFAULT_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#123E38"/>
      <stop offset="100%" stop-color="#1A4D44"/>
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#bg)"/>
  <circle cx="200" cy="100" r="40" fill="none" stroke="#CCFF00" stroke-width="2" opacity="0.6"/>
  <circle cx="200" cy="100" r="30" fill="#CCFF00" opacity="0.15"/>
  <path d="M 200 70 Q 200 100 200 130" stroke="#CCFF00" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 180 78 Q 200 100 220 78" stroke="#CCFF00" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 180 122 Q 200 100 220 122" stroke="#CCFF00" stroke-width="1.5" fill="none" opacity="0.5"/>
  <text x="200" y="170" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#CCFF00" opacity="0.4">TENNIS CLUB</text>
</svg>`;

export const DEFAULT_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_LOGO_SVG)}`;
export const DEFAULT_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_COVER_SVG)}`;
