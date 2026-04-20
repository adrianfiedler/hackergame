// icons.jsx — SVG glyphs (retro wireframe style)
export const I = {
  Terminal: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="5" width="28" height="22" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="5" width="28" height="3.5" fill="currentColor"/>
      <path d="M6 14l4 3-4 3M12 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  ),
  Browser: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="5" width="28" height="22" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 11h28" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="6" cy="8" r="1" fill="currentColor"/>
      <circle cx="10" cy="8" r="1" fill="currentColor"/>
      <circle cx="16" cy="19" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M11 19h10M16 14v10M12.5 15.5c1 1.5 6 1.5 7 0M12.5 22.5c1-1.5 6-1.5 7 0" stroke="currentColor" strokeWidth="0.9"/>
    </svg>
  ),
  Notepad: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 3h18l4 4v22H6z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 3v4h4M10 12h14M10 16h14M10 20h14M10 24h8" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Calculator: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="5" y="3" width="22" height="26" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="8" y="6" width="16" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <g fill="currentColor">
        <rect x="8" y="13" width="3" height="3"/><rect x="12.5" y="13" width="3" height="3"/>
        <rect x="17" y="13" width="3" height="3"/><rect x="21" y="13" width="3" height="3"/>
        <rect x="8" y="17" width="3" height="3"/><rect x="12.5" y="17" width="3" height="3"/>
        <rect x="17" y="17" width="3" height="3"/><rect x="21" y="17" width="3" height="3"/>
        <rect x="8" y="21" width="3" height="3"/><rect x="12.5" y="21" width="3" height="3"/>
        <rect x="17" y="21" width="3" height="3"/><rect x="21" y="21" width="3" height="3"/>
      </g>
    </svg>
  ),
  Irc: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="4" width="28" height="20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 10h28" stroke="currentColor" strokeWidth="1"/>
      <path d="M6 15h12M6 19h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
      <path d="M22 24l4 4" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="26" r="4" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Trash: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 8h20M12 4h8v4M8 8l2 20h12l2-20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13 13v11M16 13v11M19 13v11" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  TrashFull: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 8h20M12 4h8v4M8 8l2 20h12l2-20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 12l2 4M16 12v5M20 12l-1 5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  File: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 2h12l4 4v20H6z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M18 2v4h4M10 12h8M10 16h8M10 20h6" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Doc: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 2h12l4 4v20H6z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 10h10M10 14h10M10 18h10M10 22h6" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Exe: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="18" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3 9h22" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 14h3v3H7zM13 14l3 3M16 14l-3 3" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Img: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="4" width="22" height="20" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="11" r="2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M3 20l6-5 5 4 4-3 7 5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  NetMap: ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="5" width="28" height="22" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 12h28M2 19h28M12 5v22M20 5v22" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 10v12M10 16h12" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
}