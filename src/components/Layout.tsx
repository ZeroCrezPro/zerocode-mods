import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

/** Oldalváltáskor visszagörget a tetejére (kivéve, ha van #horgony). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#tartalom"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:border focus:border-blood-500 focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        Ugrás a tartalomra
      </a>
      <ScrollToTop />
      <Header />
      <main id="tartalom" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
