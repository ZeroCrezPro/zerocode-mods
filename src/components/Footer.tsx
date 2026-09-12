import { Link } from 'react-router-dom'
import { site } from '@/data/site'

/** Lábléc: csak a márkajel - se linkek, se leírás, se jogi szöveg. */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-700 bg-ink-900">
      <div className="zc-container flex items-center gap-4 py-10">
        <Link to="/" className="flex items-center gap-4" aria-label={`${site.name} - főoldal`}>
          {site.logo && (
            <img src={site.logo} alt="" aria-hidden className="h-12 w-12 object-contain" />
          )}
          <span>
            <span className="block text-[15px] font-black tracking-[0.18em] text-ash-100">
              {site.brandTop}
            </span>
            <span className="mt-1 block text-[10px] font-bold tracking-[0.42em] text-blood-400">
              {site.brandBottom}
            </span>
          </span>
        </Link>
      </div>
    </footer>
  )
}
