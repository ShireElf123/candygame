import { memo, useId } from 'react';

function IngredientArt() {
  const gradientId = `jam-jar-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className="ingredient-art candy-art" viewBox="0 0 48 48" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`${gradientId}-glass`} x1="10%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#fff5ca" />
          <stop offset="54%" stopColor="#f3d98f" />
          <stop offset="100%" stopColor="#cb925c" />
        </linearGradient>
        <linearGradient id={`${gradientId}-jam`} x1="15%" y1="0%" x2="84%" y2="100%">
          <stop offset="0%" stopColor="#ff9b91" />
          <stop offset="48%" stopColor="#dc426b" />
          <stop offset="100%" stopColor="#8e2851" />
        </linearGradient>
      </defs>
      <path d="M17 9h14c0 4 5 5 5 11v16c0 5-3 8-8 8h-8c-5 0-8-3-8-8V20c0-6 5-7 5-11Z" fill={`url(#${gradientId}-glass)`} stroke="#6b4051" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 22c6 2 14-2 20 0v13c0 3-2 5-6 5h-8c-4 0-6-2-6-5V22Z" fill={`url(#${gradientId}-jam)`} stroke="#8e3657" strokeWidth="1.2" />
      <rect x="15" y="5" width="18" height="8" rx="2.5" fill="#6db986" stroke="#346f58" strokeWidth="1.8" />
      <path d="M17 7h14M18 10h12" stroke="#d9f7ce" strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
      <path d="M18 25h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" fill="#fff1c5" stroke="#8f5a50" strokeWidth="1.2" />
      <path d="M24 27c-1.1-1.4-3.4-.5-3.4 1.1 0 1.8 3.4 3.9 3.4 3.9s3.4-2.1 3.4-3.9c0-1.6-2.3-2.5-3.4-1.1Z" fill="#d63c67" />
      <path d="M16 18c.8-2.3 2.1-3.5 3.4-4.4" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" opacity=".82" />
      <ellipse cx="30.5" cy="20.5" rx="2" ry="1.1" transform="rotate(-28 30.5 20.5)" fill="#fff" opacity=".72" />
      <path d="M20 39h8" stroke="#ffe7ba" strokeWidth="1.2" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

export default memo(IngredientArt);
