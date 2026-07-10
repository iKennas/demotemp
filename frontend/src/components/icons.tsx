import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 18, className = '', ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...props,
  }
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconLedger(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="17" y2="13" />
      <line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  )
}

export function IconJournal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v5h5" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  )
}

export function IconReports(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="13" width="3" height="7" />
      <rect x="11" y="9" width="3" height="11" />
      <rect x="16" y="5" width="3" height="15" />
    </svg>
  )
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  )
}

export function IconStorefront(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8l1.5-4h13L20 8" />
      <rect x="5" y="8" width="14" height="12" rx="1" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <rect x="10" y="14" width="4" height="6" />
    </svg>
  )
}

export function IconReceipt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="16" x2="13" y2="16" />
    </svg>
  )
}

export function IconCard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  )
}

export function IconExpense(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v8" />
      <path d="M8 11l4 4 4-4" />
    </svg>
  )
}

export function IconRevenue(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 17V9" />
      <path d="M8 13l4-4 4 4" />
    </svg>
  )
}

export function IconBank(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10l9-6 9 6" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="5" y1="10" x2="5" y2="19" />
      <line x1="9.5" y1="10" x2="9.5" y2="19" />
      <line x1="14.5" y1="10" x2="14.5" y2="19" />
      <line x1="19" y1="10" x2="19" y2="19" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

export function IconBox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4.5 7.5 12 12l7.5-4.5" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 8.2a2.8 2.8 0 1 1 0 5.6" />
      <path d="M15 14.5c2.5.3 4.5 2.5 4.5 5.5" />
    </svg>
  )
}

export function IconHistory(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4.5h4.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="15" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="9" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function IconChevronStart(props: IconProps) {
  return (
    <svg {...base(props)} className={`rtl:-scale-x-100 ${props.className ?? ''}`}>
      <polyline points="15 4 7 12 15 20" />
    </svg>
  )
}

export function IconChevronEnd(props: IconProps) {
  return (
    <svg {...base(props)} className={`rtl:-scale-x-100 ${props.className ?? ''}`}>
      <polyline points="9 4 17 12 9 20" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points="5 13 10 18 19 7" />
    </svg>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M6 5h12l3 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l3-7z" />
    </svg>
  )
}
