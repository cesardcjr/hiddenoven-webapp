export function ShoppingCartIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 1.95 1.54h7.9a2 2 0 0 0 1.95-1.55L21 7H6" />
    </svg>
  );
}

export function CalendarClockIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2v3M17 2v3M3.5 9h17" />
      <path d="M5.5 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <circle cx="15.5" cy="14.5" r="3" />
      <path d="M15.5 13v1.7l1.2.8" />
    </svg>
  );
}

export function PackageStackIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 2 7 3.5-7 3.5-7-3.5L12 2Z" />
      <path d="m5 9.5 7 3.5 7-3.5M5 13.5l7 3.5 7-3.5M5 17.5l7 3.5 7-3.5" />
    </svg>
  );
}

export function PointOfSaleIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3h16v5H4zM5 8v13h14V8" />
      <path d="M8 12h8M8 16h3M15 16h1" />
    </svg>
  );
}

export function OrderQueueIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5h11M9 12h11M9 19h11" />
      <path d="m4 5 .8.8L6.5 4M4 12l.8.8 1.7-1.8M4 19l.8.8 1.7-1.8" />
    </svg>
  );
}
