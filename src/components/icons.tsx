// Minimal stroke icons (no emoji) — currentColor, crisp at small sizes.
function S({
  children,
  size = 20,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const IconToday = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
  </S>
);

export const IconTrends = (p: P) => (
  <S {...p}>
    <path d="M3 17l5-5 4 3 6-7" />
    <path d="M21 8h-4M21 8v4" />
  </S>
);

export const IconFamily = (p: P) => (
  <S {...p}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.2" />
    <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M15 19c0-2 1.2-3.4 3-3.8" />
  </S>
);

export const IconPlan = (p: P) => (
  <S {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1" />
    <path d="M8.5 11l1.5 1.5L13 9M8.5 16l1.5 1.5L13 14" />
  </S>
);

export const IconRecords = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
);

export const IconAlert = (p: P) => (
  <S {...p}>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17v.5" />
  </S>
);

export const IconCalendar = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9h17M8 3v4M16 3v4" />
  </S>
);

export const IconPill = (p: P) => (
  <S {...p}>
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
    <path d="M9 9l6 6" />
  </S>
);

export const IconMap = (p: P) => (
  <S {...p}>
    <path d="M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10z" />
    <circle cx="12" cy="11" r="2" />
  </S>
);

export const IconSpark = (p: P) => (
  <S {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </S>
);

export const IconSound = (p: P) => (
  <S {...p}>
    <path d="M5 9v6h3l4 4V5L8 9z" />
    <path d="M16 9a4 4 0 010 6" />
  </S>
);
