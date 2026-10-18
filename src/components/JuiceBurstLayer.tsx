import type { CSSProperties } from 'react';

export type JuiceBurst = {
  id: number;
  x: number;
  y: number;
  kind: 'match' | 'special' | 'cascade';
  strength?: number;
};

type Props = {
  effects: JuiceBurst[];
};

export default function JuiceBurstLayer({ effects }: Props) {
  return (
    <div className="juice-effects" aria-hidden="true">
      {effects.map(effect => (
        <span
          key={effect.id}
          className={'juice-burst juice-burst--' + effect.kind}
          style={{
            left: effect.x + '%',
            top: effect.y + '%',
            '--juice-strength': effect.strength ?? 1,
          } as CSSProperties}
        >
          {Array.from({ length: effect.kind === 'special' ? 12 : effect.kind === 'cascade' ? 9 : 6 }, (_, index) => (
            <i key={index} style={{ '--particle-index': index } as CSSProperties} />
          ))}
        </span>
      ))}
    </div>
  );
}
