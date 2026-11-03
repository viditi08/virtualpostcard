import type { ReactNode } from "react";

/** Tiny illustrated scenes, each drawn in a 0 0 80 80 viewBox. */
export const STAMP_ART: Record<string, ReactNode> = {
  plane: (
    <>
      <rect width="80" height="80" fill="#DCE8F2" />
      <circle cx="64" cy="16" r="7" fill="#F6D58E" />
      <path d="M8 58 q8 -8 16 0 q6 -6 12 0 z" fill="#fff" opacity=".9" />
      <path d="M48 68 q7 -7 14 0 q5 -5 10 0 z" fill="#fff" opacity=".9" />
      <path d="M10 64 Q30 50 40 42" fill="none" stroke="#2B4C6F" strokeWidth="1.4" strokeDasharray="2.5 3" />
      <path d="M40 42 L70 24 L52 50 L48 41 Z" fill="#fff" stroke="#2B4C6F" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M48 41 L70 24 L45 45 Z" fill="#B9CDE0" stroke="#2B4C6F" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  balloon: (
    <>
      <rect width="80" height="80" fill="#F7E3C6" />
      <path d="M0 66 q20 -10 40 0 t40 0 v14 h-80 z" fill="#7FA37E" />
      <path d="M0 72 q20 -8 40 0 t40 0 v8 h-80 z" fill="#5E8763" />
      <path d="M40 10 C24 10 18 24 22 34 C26 44 34 48 37 54 H43 C46 48 54 44 58 34 C62 24 56 10 40 10 Z" fill="#E36F4F" />
      <path d="M40 10 C33 14 31 30 37 54 H43 C49 30 47 14 40 10 Z" fill="#F4C25B" />
      <path d="M40 10 C38 18 38 36 40 54 C42 36 42 18 40 10 Z" fill="#3E7CB1" />
      <path d="M37 54 L36 60 M43 54 L44 60" stroke="#6E4A2F" strokeWidth="1" />
      <rect x="35" y="60" width="10" height="7" rx="1.2" fill="#8B5A3C" />
      <path d="M6 20 q5 -5 10 0 q4 -4 8 0 z" fill="#fff" />
    </>
  ),
  lighthouse: (
    <>
      <rect width="80" height="80" fill="#2E4A6B" />
      <circle cx="16" cy="14" r="1" fill="#fff" /><circle cx="66" cy="10" r="1.2" fill="#fff" /><circle cx="58" cy="28" r=".8" fill="#fff" />
      <path d="M40 20 L4 8 L4 28 Z" fill="#F6D58E" opacity=".45" />
      <path d="M40 20 L76 8 L76 28 Z" fill="#F6D58E" opacity=".45" />
      <path d="M34 26 h12 l3 40 h-18 z" fill="#FDFBF7" />
      <path d="M33.5 34 h13 l.6 7 h-14.2 z M32.4 49 h15.2 l.6 7 h-16.4 z" fill="#C24A35" />
      <rect x="35" y="16" width="10" height="10" fill="#F6D58E" stroke="#1E2F44" strokeWidth="1" />
      <path d="M33 16 L40 9 L47 16 Z" fill="#C24A35" />
      <path d="M0 66 q10 -5 20 0 t20 0 t20 0 t20 0 v14 h-80 z" fill="#4F7FAF" />
      <path d="M0 72 q10 -5 20 0 t20 0 t20 0 t20 0 v8 h-80 z" fill="#3B6A99" />
    </>
  ),
  envelope_heart: (
    <>
      <rect width="80" height="80" fill="#F9DCDD" />
      {[[14, 14], [64, 18], [12, 62], [68, 64]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x} ${y + 2} l-3 -3 a2 2 0 0 1 3 -2.5 a2 2 0 0 1 3 2.5 z`} fill="#E58A93" />
      ))}
      <rect x="16" y="26" width="48" height="32" rx="2" fill="#FDFBF7" stroke="#8E2C3B" strokeWidth="1.4" />
      <path d="M16 28 L40 46 L64 28" fill="none" stroke="#8E2C3B" strokeWidth="1.4" />
      <path d="M40 52 l-7 -7 a4.5 4.5 0 0 1 7 -5.5 a4.5 4.5 0 0 1 7 5.5 z" fill="#C8354B" />
    </>
  ),
  rose: (
    <>
      <rect width="80" height="80" fill="#FBEDE3" />
      <path d="M40 46 C40 58 38 66 36 76" stroke="#3D6B52" strokeWidth="2" fill="none" />
      <path d="M38 60 C28 56 22 60 20 64 C28 66 34 64 38 60 Z" fill="#5E8763" />
      <path d="M38 66 C48 62 56 64 58 68 C50 71 44 70 38 66 Z" fill="#5E8763" />
      <circle cx="40" cy="32" r="16" fill="#C8354B" />
      <path d="M28 30 C30 18 50 16 52 30 C48 24 34 24 28 30 Z" fill="#E15B6E" />
      <path d="M32 34 C34 26 46 24 48 34 C44 30 36 30 32 34 Z" fill="#9E2236" />
      <path d="M36 34 C38 30 42 30 44 34 C42 38 38 38 36 34 Z" fill="#E15B6E" />
      <path d="M26 38 C30 46 50 46 54 38 C50 48 30 48 26 38 Z" fill="#9E2236" />
    </>
  ),
  cake: (
    <>
      <rect width="80" height="80" fill="#E8E1F5" />
      {[[10, 14, "#E36F4F"], [66, 12, "#3E7CB1"], [14, 40, "#F4C25B"], [70, 44, "#5E8763"], [58, 30, "#C8354B"]].map(([x, y, c]) => (
        <rect key={`${x}${y}`} x={x as number} y={y as number} width="4" height="2" rx=".6" fill={c as string} transform={`rotate(30 ${x} ${y})`} />
      ))}
      <rect x="18" y="50" width="44" height="20" rx="2" fill="#F7B9C4" />
      <rect x="24" y="36" width="32" height="15" rx="2" fill="#FDFBF7" />
      <path d="M24 40 q4 4 8 0 t8 0 t8 0 t8 0" fill="none" stroke="#F7B9C4" strokeWidth="2.4" />
      <path d="M18 55 q5.5 5 11 0 t11 0 t11 0 t11 0" fill="none" stroke="#FDFBF7" strokeWidth="2.4" />
      <rect x="38.5" y="24" width="3" height="12" rx="1" fill="#3E7CB1" />
      <path d="M40 15 C43 19 43 22 40 23 C37 22 37 19 40 15 Z" fill="#F4C25B" />
      <rect x="12" y="70" width="56" height="3" rx="1.5" fill="#B6A7D6" />
    </>
  ),
  party_balloons: (
    <>
      <rect width="80" height="80" fill="#FFF1D6" />
      <path d="M26 44 C28 58 34 64 40 76 M40 40 C40 56 40 64 40 76 M54 44 C52 58 46 64 40 76" fill="none" stroke="#6E5E57" strokeWidth=".9" />
      <ellipse cx="26" cy="30" rx="11" ry="14" fill="#E36F4F" />
      <ellipse cx="54" cy="30" rx="11" ry="14" fill="#3E7CB1" />
      <ellipse cx="40" cy="24" rx="11" ry="14" fill="#F4C25B" />
      <path d="M22 22 q2 -5 6 -6 M50 22 q2 -5 6 -6 M36 16 q2 -5 6 -6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
      <path d="M24 44 l2 -2 l2 2 z M38 38 l2 -2 l2 2 z M52 44 l2 -2 l2 2 z" fill="#6E5E57" />
    </>
  ),
  moon: (
    <>
      <rect width="80" height="80" fill="#1F2A44" />
      {[[12, 14], [26, 30], [62, 12], [70, 36], [48, 22], [16, 46]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 3} l.9 2.1 l2.1 .9 l-2.1 .9 l-.9 2.1 l-.9 -2.1 l-2.1 -.9 l2.1 -.9 z`} fill="#F6D58E" />
      ))}
      <path d="M52 16 A18 18 0 1 0 60 46 A14 14 0 1 1 52 16 Z" fill="#F6D58E" />
      <path d="M0 64 q20 -12 40 -2 t40 -4 v22 h-80 z" fill="#2E4A3D" />
      <rect x="16" y="54" width="14" height="12" fill="#5C4033" />
      <path d="M14 55 L23 47 L32 55 Z" fill="#8B5A3C" />
      <rect x="20" y="58" width="4" height="4" fill="#F6D58E" />
    </>
  ),
  fern: (
    <>
      <rect width="80" height="80" fill="#E3EDDF" />
      <path d="M40 76 C40 56 42 34 46 10" stroke="#3D6B52" strokeWidth="1.8" fill="none" />
      {Array.from({ length: 7 }).map((_, i) => {
        const y = 66 - i * 8;
        const s = 1 - i * 0.1;
        return (
          <g key={i}>
            <path d={`M${40.6 + i * 0.7} ${y} q${-14 * s} ${-2} ${-18 * s} ${-9 * s} q${10 * s} ${1} ${18 * s} ${9 * s} z`} fill="#5E8763" />
            <path d={`M${40.6 + i * 0.7} ${y} q${14 * s} ${-4} ${18 * s} ${-11 * s} q${-10 * s} ${2} ${-18 * s} ${11 * s} z`} fill="#7FA37E" />
          </g>
        );
      })}
      <circle cx="16" cy="18" r="4" fill="#F4C25B" /><circle cx="16" cy="18" r="1.6" fill="#E36F4F" />
      <circle cx="66" cy="60" r="3.4" fill="#E58A93" /><circle cx="66" cy="60" r="1.3" fill="#F4C25B" />
    </>
  ),
  bird: (
    <>
      <rect width="80" height="80" fill="#F2E6D3" />
      <path d="M4 58 C24 52 46 56 76 46" stroke="#6E4A2F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M58 50 q4 -8 10 -6 q-2 6 -10 6 z M18 56 q-2 -8 4 -10 q2 6 -4 10 z" fill="#5E8763" />
      <path d="M26 50 C26 36 38 28 48 32 C56 35 56 44 52 50 C46 56 32 56 26 50 Z" fill="#3E7CB1" />
      <path d="M30 48 C34 40 44 38 48 44 C42 48 36 50 30 48 Z" fill="#2B4C6F" />
      <path d="M26 50 L14 46 L22 54 Z" fill="#2B4C6F" />
      <circle cx="49" cy="38" r="1.8" fill="#1C1714" />
      <path d="M54 39 l6 1.5 l-6 2 z" fill="#F4C25B" />
      <path d="M40 54 v4 M44 54 v4" stroke="#6E4A2F" strokeWidth="1.2" />
      <path d="M50 18 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#C8354B" strokeWidth="1.4" />
    </>
  ),
  fox: (
    <>
      <rect width="80" height="80" fill="#E9F0E4" />
      <path d="M8 80 V66 q8 -6 14 0 q6 -10 12 0 V80 z M52 80 V64 q8 -8 16 0 q4 -6 8 0 V80 z" fill="#B7CDB0" />
      <path d="M22 16 L30 34 L50 34 L58 16 L46 26 H34 Z" fill="#D9692F" />
      <path d="M25 21 L30 31 L33 27 Z M55 21 L50 31 L47 27 Z" fill="#2C1810" />
      <path d="M20 34 C22 50 32 62 40 64 C48 62 58 50 60 34 C52 30 28 30 20 34 Z" fill="#E87E3E" />
      <path d="M20 34 C26 46 34 54 40 64 C30 60 22 50 20 34 Z M60 34 C54 46 46 54 40 64 C50 60 58 50 60 34 Z" fill="#FDFBF7" />
      <circle cx="32" cy="42" r="2.2" fill="#2C1810" /><circle cx="48" cy="42" r="2.2" fill="#2C1810" />
      <path d="M37 54 h6 l-3 3.5 z" fill="#2C1810" />
      <circle cx="28" cy="49" r="2" fill="#F4A3A3" opacity=".7" /><circle cx="52" cy="49" r="2" fill="#F4A3A3" opacity=".7" />
    </>
  ),
};
