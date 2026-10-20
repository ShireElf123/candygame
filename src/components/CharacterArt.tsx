import { memo, useId } from 'react';

type Props = {
  kind?: 'buddy' | 'boss';
  mood?: 'happy' | 'determined' | 'dazed';
  color?: string;
  accent?: string;
  className?: string;
};

/** Small original cast portraits used for the guide character and chapter bosses. */
function CharacterArt({
  kind = 'buddy',
  mood = 'happy',
  color = '#66c87d',
  accent = '#258c58',
  className = '',
}: Props) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  const bodyGradient = `${id}-body`;
  const shineGradient = `${id}-shine`;
  const smile = mood === 'dazed' ? 'M41 62 Q50 56 59 62' : mood === 'determined' ? 'M42 63 Q50 67 58 63' : 'M40 58 Q50 70 60 58';

  return (
    <svg className={`character-art ${className}`.trim()} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={bodyGradient} x1="20" y1="15" x2="78" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <radialGradient id={shineGradient} cx="0" cy="0" r="1" gradientTransform="matrix(30 0 0 24 36 29)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="88" rx="27" ry="6" fill="#633d55" opacity=".13" />
      {kind === 'boss' ? <g className="character-horns" fill={accent} stroke="#71425b" strokeLinejoin="round" strokeWidth="2.5">
        <path d="M29 26 22 14q-2-4 2-4 8 3 14 13M71 26l7-12q2-4-2-4-8 3-14 13" />
      </g> : <g className="character-leaves" fill="#5daa55" stroke="#397f48" strokeLinejoin="round" strokeWidth="2">
        <path d="M47 21Q31 8 28 17q-2 8 17 11M52 20Q62 4 68 11q5 7-12 18" />
      </g>}
      <path d="M50 18c-19 0-33 13-33 34 0 20 12 32 33 32s33-12 33-32c0-21-14-34-33-34Z" fill={`url(#${bodyGradient})`} stroke={kind === 'boss' ? '#70445c' : '#438b56'} strokeWidth="3" />
      <path d="M50 18c-19 0-33 13-33 34 0 20 12 32 33 32s33-12 33-32c0-21-14-34-33-34Z" fill={`url(#${shineGradient})`} />
      <g className="character-eyes">
        <ellipse cx="37" cy="55" rx="3.4" ry="4.7" fill="#392840" />
        <ellipse cx="63" cy="55" rx="3.4" ry="4.7" fill="#392840" />
        <circle cx="36" cy="54" r="1.1" fill="#fff" />
        <circle cx="62" cy="54" r="1.1" fill="#fff" />
      </g>
      <ellipse cx="29" cy="64" rx="5" ry="2.6" fill="#ff9bb0" opacity=".72" />
      <ellipse cx="71" cy="64" rx="5" ry="2.6" fill="#ff9bb0" opacity=".72" />
      {kind === 'buddy' && <path className="character-glint" d="m72 27 2.4 6.6L81 36l-6.6 2.4L72 45l-2.4-6.6L63 36l6.6-2.4Z" fill="#fff4a8" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />}
      <path d={smile} fill="none" stroke="#4d3046" strokeLinecap="round" strokeWidth="3.2" />
      {kind === 'boss' && <path d="M39 44 45 42M61 42l-6 2" fill="none" stroke="#70445c" strokeLinecap="round" strokeWidth="2.5" />}
      {mood === 'dazed' && <g fill="#fff" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800">
        <text x="11" y="34">✦</text><text x="77" y="43">✧</text>
      </g>}
    </svg>
  );
}

export default memo(CharacterArt);
