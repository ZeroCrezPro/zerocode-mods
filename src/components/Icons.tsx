/**
 * Kézzel írt SVG ikonok - így nem kell ikonkönyvtárat betölteni,
 * és a bundle is kicsi marad.
 */
import type { SVGProps } from 'react'

const p = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
})

export const IconSearch = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
)

export const IconDownload = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
)

export const IconArrowRight = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const IconChevronDown = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconClose = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </svg>
)

export const IconMenu = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </svg>
)

export const IconGithub = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)} strokeWidth={1.6}>
    <path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.6a3.1 3.1 0 0 0-.9-2.4c2.9-.3 6-1.4 6-6.4a5 5 0 0 0-1.4-3.4 4.6 4.6 0 0 0-.1-3.5S17.4 1.9 15 3.6a12 12 0 0 0-6.4 0C6.2 1.9 5.3 2 5.3 2a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.8 9c0 4.9 3 6 5.9 6.4a3.1 3.1 0 0 0-.9 2.4V21" />
  </svg>
)

export const IconExternal = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)

export const IconCheck = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="m4 12 5 5L20 6" />
  </svg>
)

export const IconWarning = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
)

export const IconGlobe = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
  </svg>
)

export const IconChevronLeft = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const IconChevronRight = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconGamepad = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="M6 12h4" />
    <path d="M8 10v4" />
    <path d="M15 13h.01" />
    <path d="M18 11h.01" />
    <rect x="2" y="6" width="20" height="12" rx="4" />
  </svg>
)

export const IconPackage = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z" />
    <path d="M3 7.5 12 12l9-4.5" />
    <path d="M12 12v9" />
  </svg>
)

export const IconClock = (s: SVGProps<SVGSVGElement>) => (
  <svg {...p(s)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
