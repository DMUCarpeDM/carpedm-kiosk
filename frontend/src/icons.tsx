/**
 * 아이콘 시스템 — 이모지 대신 일관된 선 굵기(2.2px)의 SVG를 쓴다.
 * 모두 currentColor를 따르므로 배경에 맞춰 자동으로 색이 정해진다.
 */

type P = { size?: number };

export function IconMic({ size = 44 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconDineIn({ size = 56 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 4v5M5 4v5M4 9v11M3 6.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20.5 4c-1.4.8-2 2.4-2 4v3h2v9M20.5 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTakeout({ size = 56 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h14l-1.2 12.2a1.6 1.6 0 01-1.6 1.3H7.8a1.6 1.6 0 01-1.6-1.3L5 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.5 10.5V6.5a3.5 3.5 0 017 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTouch({ size = 56 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.5 11.5V5.2a1.7 1.7 0 113.4 0v5.6l3.9.9c1 .25 1.7 1.15 1.7 2.18v2.3c0 .5-.08.98-.25 1.44l-.9 2.4a2 2 0 01-1.87 1.3H10.6a2 2 0 01-1.53-.72l-3.3-3.95a1.55 1.55 0 012.15-2.2l1.58 1.2z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M7.2 5.5a4.4 4.4 0 017.9-.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconHome({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ size = 26 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWarning({ size = 26 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5L22 20H2L12 3.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9.5v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function IconSpeaker({ size = 26 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h3.5L12 19V5L7.5 9H4z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
      <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconWheelchair({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="4.6" r="2" fill="currentColor" />
      <path d="M10 7.5v5h5.5l2.2 5.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9.5h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M13.4 15.7a5 5 0 11-6.9-6.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4a6 6 0 00-6 6v3.2L4.5 16.5a.9.9 0 00.8 1.35h13.4a.9.9 0 00.8-1.35L18 13.2V10a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9.8 20a2.4 2.4 0 004.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowLeft({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 5.5L8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCart({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h2.2l2.2 11.2a1.6 1.6 0 001.6 1.3h7.9a1.6 1.6 0 001.57-1.26L20.5 8.5H7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20.2" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20.2" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconTextSize({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 18L7.5 6.5 12 18M4.8 14h5.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18l3.2-8 3.2 8M15.3 15.3h3.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
