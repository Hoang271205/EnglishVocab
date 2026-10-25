import type { SVGProps } from 'react';
const paths = {
  plus: 'M12 5v14M5 12h14',
  refresh:
    'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2L20 8M4 16l2.4 3A7 7 0 0 0 18 17',
  'chevron-down': 'm6 9 6 6 6-6',
  mute: 'M3 9h4l5-4v14l-5-4H3V9Zm13 0 6 6m0-6-6 6',
  music:
    'M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3Zm12-2a3 3 0 1 1-3-3c2 0 3 1 3 3Z',
  play: 'm9 5 11 7-11 7V5Z',
  sparkles:
    'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7 0v4m-2-2h4',
  sprout:
    'M12 21v-9m0 4C5 16 3 12 3 7c6 0 9 3 9 7m0-3c0-6 3-9 9-9 0 6-3 9-9 9M7 21h10',
  review: 'M4 20V10h4v10M10 20V4h4v16M16 20V7h4v13',
  learn: 'm2 9 10-5 10 5-10 5-10-5m4 2v6c4 3 8 3 12 0v-6m4-2v7',
  notebook:
    'M7 3h13v18H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 0v18M2 8h4M2 13h4M2 18h4m4-10h6m-6 4h6',
  search: 'M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  close: 'm6 6 12 12M18 6 6 18',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  'eye-off':
    'm3 3 18 18M10 5h2c6 0 10 7 10 7a23 23 0 0 1-3 4M6 6a22 22 0 0 0-4 6s4 7 10 7c2 0 4-1 5-2',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  lock: 'M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3m-4 5v2',
  check: 'm5 12 4 4L19 6',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  volume: 'm3 9 5 0 5-5v16l-5-5H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  slow: 'M3 12h4l3-5h4l3 5h4M5 12v5h14v-5M8 17v3m8-3v3M10 7V4m4 3V4',
  logout: 'M9 3H3v18h6m6-15 6 6-6 6M7 12h14',
  spinner: 'M21 12a9 9 0 1 1-9-9',
} as const;
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  className = '',
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`ui-icon ${className}`}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
