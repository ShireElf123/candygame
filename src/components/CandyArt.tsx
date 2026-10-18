import { useId, type CSSProperties } from 'react';
import type { Special } from '../game/engine';

type Props = {
  color: number;
  special?: Special;
  className?: string;
};

const BODY_SHADES = [
  ['#e3b1ff', '#a64cda', '#64288f'],
  ['#fff1a6', '#f6c632', '#a96815'],
  ['#ffb5d1', '#ed4d88', '#9e244f'],
  ['#c7ffd7', '#58c879', '#237a4e'],
  ['#b8eaff', '#4a9ae9', '#2759a8'],
  ['#ffd5a0', '#f58c38', '#a94321'],
];

const SHAPES = [
  <g key="grape" className="candy-shape candy-shape-grapes" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M23 11c1-3 3-5 6-6" fill="none" strokeWidth="2.5" />
    <path d="M28 7c4-4 9-2 10 1-3 2-7 2-10-1Z" fill="var(--candy-leaf)" />
    <circle cx="17" cy="17" r="6.3" fill="currentColor" />
    <circle cx="29" cy="17" r="6.3" fill="currentColor" />
    <circle cx="12" cy="27" r="6.3" fill="currentColor" />
    <circle cx="24" cy="27" r="6.8" fill="currentColor" />
    <circle cx="36" cy="27" r="6.3" fill="currentColor" />
    <circle cx="18" cy="36" r="6.3" fill="currentColor" />
    <circle cx="30" cy="36" r="6.3" fill="currentColor" />
    <g fill="#fff" stroke="none" opacity=".75">
      <ellipse cx="15" cy="15" rx="2.2" ry="1.2" transform="rotate(-30 15 15)" />
      <ellipse cx="27" cy="15" rx="2.2" ry="1.2" transform="rotate(-30 27 15)" />
      <ellipse cx="22" cy="25" rx="2.4" ry="1.3" transform="rotate(-30 22 25)" />
      <ellipse cx="16" cy="34" rx="2.1" ry="1.2" transform="rotate(-30 16 34)" />
    </g>
  </g>,
  <g key="lemon" className="candy-shape candy-shape-lemon" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M6 24c6-2 8-12 18-15 10 3 12 13 18 15-6 2-8 12-18 15C14 36 12 26 6 24Z" fill="currentColor" />
    <path d="M13 22c3-4 6-8 11-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".68" />
    <path d="M10 24c4 1 6 3 8 6" fill="none" stroke="#fff7d8" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
  </g>,
  <g key="berry" className="candy-shape candy-shape-berry" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M18 13c-1-4 1-7 5-8l1 7 4-7c4 2 5 5 3 9 7 3 9 9 7 15-2 8-7 13-14 15-7-3-13-8-15-16-2-6 1-12 9-15Z" fill="currentColor" />
    <path d="M16 17c3-2 6-2 8-1" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".64" />
    <g fill="#fff4c9" stroke="none" opacity=".92">
      <ellipse cx="17" cy="23" rx="1.1" ry="2" transform="rotate(-24 17 23)" />
      <ellipse cx="27" cy="21" rx="1.1" ry="2" transform="rotate(15 27 21)" />
      <ellipse cx="33" cy="27" rx="1.1" ry="2" transform="rotate(24 33 27)" />
      <ellipse cx="21" cy="31" rx="1.1" ry="2" transform="rotate(-12 21 31)" />
      <ellipse cx="29" cy="35" rx="1.1" ry="2" transform="rotate(16 29 35)" />
    </g>
  </g>,
  <g key="mint" className="candy-shape candy-shape-mint" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M13 7h22c4 0 7 3 7 7v20c0 4-3 7-7 7H13c-4 0-7-3-7-7V14c0-4 3-7 7-7Z" fill="currentColor" />
    <path d="M14 15c4-4 9-4 13-2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".66" />
    <path d="M16 32c7-8 11-11 18-15M18 35c4-4 8-8 13-11" fill="none" stroke="#efffd7" strokeWidth="1.6" strokeLinecap="round" opacity=".72" />
  </g>,
  <g key="blueberry" className="candy-shape candy-shape-blueberry" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <circle cx="24" cy="26" r="17" fill="currentColor" />
    <path d="m24 7 3 5 6-1-3 5 2 5-6-2-4 4-1-6-5-3 6-1Z" fill="#d8f7ff" stroke="var(--candy-edge)" strokeWidth="1.2" />
    <ellipse cx="17" cy="21" rx="4.5" ry="2.4" fill="#fff" stroke="none" opacity=".7" transform="rotate(-35 17 21)" />
    <circle cx="30" cy="31" r="2.4" fill="#d5f4ff" stroke="none" opacity=".78" />
  </g>,
  <g key="orange" className="candy-shape candy-shape-orange" stroke="var(--candy-edge)" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M10 15c0-4 4-7 8-7h12c5 0 8 3 8 7v18c0 4-3 7-8 7H18c-4 0-8-3-8-7V15Z" fill="currentColor" transform="rotate(-18 24 24)" />
    <path d="M17 14c2-2 4-3 7-3" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    <path d="M16 28c5 2 11 2 17-1M17 33c4 2 8 2 12 1" fill="none" stroke="#fff5dc" strokeWidth="1.5" strokeLinecap="round" opacity=".78" />
  </g>,
];

function ColorBombArt() {
  return (
    <g className="candy-color-bomb">
      <circle cx="24" cy="25" r="17" fill="#44367f" stroke="#241b54" strokeWidth="2" />
      <circle cx="18" cy="19" r="5" fill="#fff" opacity=".5" />
      <circle cx="31" cy="30" r="2" fill="#ff6eac" />
      <circle cx="22" cy="33" r="2.2" fill="#ffca45" />
      <circle cx="32" cy="19" r="2.1" fill="#69e1a4" />
      <circle cx="17" cy="29" r="2.3" fill="#5ac8f0" />
      <circle cx="25" cy="15" r="1.8" fill="#fe8857" />
      <path d="m24 19 1.7 4.1 4.4.3-3.4 2.7 1.1 4.2-3.8-2.3-3.8 2.3 1.1-4.2-3.4-2.7 4.4-.3Z" fill="#fff4b4" />
    </g>
  );
}

export default function CandyArt({ color, special, className }: Props) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fillId = `candy-gloss-${instanceId}`;
  const [highlight, midtone, shadow] = BODY_SHADES[color] ?? BODY_SHADES[0];
  const candyClass = ['candy-art', className].filter(Boolean).join(' ');
  const artStyle = { '--candy-fill': `url(#${fillId})` } as CSSProperties;
  return (
    <svg className={candyClass} style={artStyle} viewBox="0 0 48 48" role="presentation" focusable="false">
      <defs>
        <linearGradient id={fillId} x1="12%" y1="2%" x2="82%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="42%" stopColor={midtone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
      </defs>
      {special === 'color' ? ColorBombArt() : SHAPES[color] ?? SHAPES[0]}
      {special === 'striped-h' && (
        <g className="candy-art-stripes candy-art-stripes-horizontal" fill="none" stroke="#fff9e9" strokeWidth="2.4" strokeLinecap="round">
          <path d="M13 20h22M11 24h26M13 28h22" />
        </g>
      )}
      {special === 'striped-v' && (
        <g className="candy-art-stripes candy-art-stripes-vertical" fill="none" stroke="#fff9e9" strokeWidth="2.4" strokeLinecap="round">
          <path d="M20 13v22M24 11v26M28 13v22" />
        </g>
      )}
      {special === 'wrapped' && (
        <g className="candy-art-wrap" fill="none" stroke="#fff4cb" strokeWidth="4" strokeLinecap="round">
          <path d="M13 16c8 2 14 14 22 16M35 16c-8 2-14 14-22 16" />
          <path d="M14 15c8 2 13 13 20 15M34 15c-8 2-13 13-20 15" stroke="#8e2c52" strokeWidth="1.2" opacity=".55" />
        </g>
      )}
    </svg>
  );
}
