import { Seo, pageTitle } from '@/components/Seo'
import { LinkButton } from '@/components/ui'
import { IconArrowRight } from '@/components/Icons'

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="zc-grid-bg absolute inset-0" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,31,39,0.18),transparent_60%)]"
        aria-hidden
      />

      <div className="zc-container relative flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
        <Seo
          title={pageTitle('404 - Az oldal nem található')}
          description="A keresett oldal nem található a ZeroCode Mods oldalon."
          path="/404"
          noIndex
        />

        <p className="font-mono text-7xl font-black tracking-tighter text-blood-500 sm:text-9xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-black tracking-tight uppercase sm:text-3xl">
          Ez a mod eltűnt.
        </h1>
        <p className="mt-3 max-w-md text-sm text-ash-400">
          A keresett oldal nem található. Lehet, hogy átneveztem, vagy elgépelted a címet.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/" size="lg">
            Főoldal
            <IconArrowRight width={16} height={16} />
          </LinkButton>
          <LinkButton to="/modok" variant="secondary" size="lg">
            Modok böngészése
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
