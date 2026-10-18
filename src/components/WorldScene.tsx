import { useId } from 'react';

type Props = { chapter: number };

type ScenePalette = {
  skyTop: string;
  skyBottom: string;
  farHill: string;
  nearHill: string;
  deepHill: string;
  accent: string;
  accentLight: string;
  sun: string;
};

const SCENES: ScenePalette[] = [
  { skyTop: '#9bdbec', skyBottom: '#e9f8ef', farHill: '#8bd2a0', nearHill: '#64b978', deepHill: '#37885b', accent: '#e94c91', accentLight: '#ffb1d1', sun: '#ffd56a' },
  { skyTop: '#8ed8f3', skyBottom: '#e5fbff', farHill: '#72cce0', nearHill: '#51a9ca', deepHill: '#317ba3', accent: '#de4380', accentLight: '#ffb5d1', sun: '#ffe07a' },
  { skyTop: '#8ad8e8', skyBottom: '#effadf', farHill: '#b1dc7b', nearHill: '#82c152', deepHill: '#548e42', accent: '#ffc640', accentLight: '#fff0a6', sun: '#ffda64' },
  { skyTop: '#9fe0d0', skyBottom: '#e8f9dd', farHill: '#99d889', nearHill: '#66bc74', deepHill: '#39895c', accent: '#71c9b2', accentLight: '#c8fff0', sun: '#ffda72' },
  { skyTop: '#8e87cb', skyBottom: '#e8c6e5', farHill: '#9d8bd1', nearHill: '#7364ad', deepHill: '#51477f', accent: '#f2a356', accentLight: '#ffe1a7', sun: '#ffcf67' },
  { skyTop: '#8fd1e8', skyBottom: '#e4f7fc', farHill: '#86c7d7', nearHill: '#5aa8bd', deepHill: '#397d99', accent: '#9b72d1', accentLight: '#dcc1ff', sun: '#fff0a2' },
  { skyTop: '#6f8bd5', skyBottom: '#e0c2ed', farHill: '#8e7bc7', nearHill: '#705ca8', deepHill: '#4b417f', accent: '#ed5997', accentLight: '#ffa9db', sun: '#ffda60' },
  { skyTop: '#9bdcf2', skyBottom: '#f4fbff', farHill: '#c5e9f4', nearHill: '#93cade', deepHill: '#5c9bb9', accent: '#69aee0', accentLight: '#dcf4ff', sun: '#ffe9a6' },
  { skyTop: '#7579c8', skyBottom: '#f3c4dd', farHill: '#b48dd1', nearHill: '#866db7', deepHill: '#5c4b91', accent: '#f28fa9', accentLight: '#ffd0cf', sun: '#ffe492' },
  { skyTop: '#f0acd2', skyBottom: '#fff1cf', farHill: '#d28cba', nearHill: '#ae659e', deepHill: '#774d83', accent: '#e7a83a', accentLight: '#fff0a4', sun: '#fff0a4' },
];

export default function WorldScene({ chapter }: Props) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = SCENES[((chapter % SCENES.length) + SCENES.length) % SCENES.length];
  const skyId = `world-sky-${instanceId}`;
  const hillId = `world-hill-${instanceId}`;
  const roadId = `world-road-${instanceId}`;

  return (
    <svg className="world-scene" viewBox="0 0 720 170" preserveAspectRatio="xMidYMid slice" role="presentation" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.skyTop} />
          <stop offset="100%" stopColor={scene.skyBottom} />
        </linearGradient>
        <linearGradient id={hillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.nearHill} />
          <stop offset="100%" stopColor={scene.deepHill} />
        </linearGradient>
        <linearGradient id={roadId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff5dc" />
          <stop offset="50%" stopColor="#fffdf3" />
          <stop offset="100%" stopColor="#ffe8c4" />
        </linearGradient>
      </defs>
      <rect width="720" height="170" rx="22" fill={`url(#${skyId})`} />
      <circle cx="602" cy="39" r="22" fill={scene.sun} opacity=".92" />
      <circle cx="602" cy="39" r="31" fill={scene.sun} opacity=".18" />
      <path d="M-15 91c67-39 112-32 170-8 43 18 89 8 141-15 71-31 119-18 170 7 59 30 108 14 150-4 45-19 80-8 125 15v87H-15Z" fill={scene.farHill} opacity=".68" />
      <path d="M-18 121c72-39 141-38 209-8 59 27 98 20 160-8 73-33 128-22 186 7 63 32 108 26 201-7v75H-18Z" fill={`url(#${hillId})`} />
      <path d="M-22 150c84-30 146-31 217-7 63 22 111 18 173-4 66-24 120-20 179 2 58 21 115 18 195-10v48H-22Z" fill={scene.deepHill} opacity=".48" />

      <g fill="#fff" opacity=".72">
        <path d="M94 42c0-9 7-15 16-15 6 0 11 3 14 8 3-2 6-3 10-3 10 0 17 7 17 16H95c-1-2-1-4-1-6Z" />
        <path d="M274 31c0-7 6-12 13-12 5 0 9 3 11 7 2-1 5-2 7-2 8 0 13 5 13 12h-44Z" />
      </g>

      {/* A little winding path makes each chapter feel like a place to travel through. */}
      <path d="M-9 147c95-61 146-52 224-22 67 26 119 18 181-13 65-32 114-33 180-8 55 21 95 18 155-13" fill="none" stroke="#b27847" strokeWidth="22" strokeLinecap="round" opacity=".36" />
      <path d="M-9 143c95-61 146-52 224-22 67 26 119 18 181-13 65-32 114-33 180-8 55 21 95 18 155-13" fill="none" stroke={`url(#${roadId})`} strokeWidth="16" strokeLinecap="round" />
      <path d="M-9 143c95-61 146-52 224-22 67 26 119 18 181-13 65-32 114-33 180-8 55 21 95 18 155-13" fill="none" stroke="#d9b880" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" opacity=".8" />

      {/* Original candy-tree landmarks; color changes with the selected world. */}
      <g transform="translate(132 83)">
        <path d="M0 33v27" stroke="#8b5b42" strokeWidth="7" strokeLinecap="round" />
        <circle cx="0" cy="15" r="20" fill={scene.accent} />
        <circle cx="-13" cy="23" r="12" fill={scene.accentLight} />
        <circle cx="11" cy="25" r="11" fill={scene.accent} />
        <ellipse cx="-7" cy="5" rx="6" ry="3" fill="#fff" opacity=".55" transform="rotate(-25 -7 5)" />
      </g>
      <g transform="translate(358 95)">
        <path d="M0 27v26" stroke="#8b5b42" strokeWidth="6" strokeLinecap="round" />
        <path d="M0-7c15 0 23 12 20 23-3 12-14 16-20 16S-17 28-20 16C-23 5-15-7 0-7Z" fill={scene.accentLight} />
        <path d="M-9 3c3-3 7-3 10-1" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </g>
      <g transform="translate(554 91)">
        <path d="M0 30v27" stroke="#8b5b42" strokeWidth="6" strokeLinecap="round" />
        <circle cx="0" cy="9" r="17" fill={scene.accent} />
        <circle cx="-11" cy="17" r="10" fill={scene.accentLight} />
        <circle cx="10" cy="19" r="9" fill={scene.accent} />
        <ellipse cx="-5" cy="1" rx="5" ry="2.5" fill="#fff" opacity=".56" transform="rotate(-25 -5 1)" />
      </g>

      <g fill={scene.sun} opacity=".9">
        <path d="m224 50 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" />
        <path d="m476 54 2 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" />
      </g>
    </svg>
  );
}
