import type { CSSProperties } from 'react';

export type JuiceBurst = {
  id: number;
  x: number;
  y: number;
  kind: 'match' | 'special' | 'cascade';
  strength?: number;
  points?: number;
};

type Props = {
  effects: JuiceBurst[];
};

export default function JuiceBurstLayer({ effects }: Props) {
  return (
    <div className="juice-effects" aria-hidden="true">
      {effects.map(effect => {
        const particleCount = effect.kind === 'special' ? 14 : effect.kind === 'cascade' ? 10 : 8;
        return (
          <span
            key={effect.id}
            className={'juice-burst juice-burst--' + effect.kind}
            style={{
              left: effect.x + '%',
              top: effect.y + '%',
              '--juice-strength': effect.strength ?? 1,
            } as CSSProperties}
          >
            {Array.from({ length: particleCount }, (_, index) => (
              <i
                key={index}
                style={{
                  '--particle-index': index,
                  '--particle-angle': `${index * 360 / particleCount}deg`,
                  '--particle-travel': `${-22 - (index % 4) * 5}px`,
                  '--particle-delay': `${(index % 4) * 9}ms`,
                } as CSSProperties}
              />
            ))}
            {effect.points ? <b className="juice-points">+{effect.points.toLocaleString()}</b> : null}
          </span>
        );
      })}
    </div>
  );
}
