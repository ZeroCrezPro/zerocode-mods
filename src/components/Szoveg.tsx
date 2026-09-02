import type { ElementType } from 'react'
import { site } from '@/data'
import { tisztitHtml } from '@/lib/gazdagSzoveg'

/**
 * Formázható szöveg.
 *
 * A szerkesztőben megadott színek és animációk <span> elemekként vannak a
 * szövegben; a tisztitHtml mindent kiszűr, ami nem a saját formázásunk.
 *
 * A data-zc-mezo jelölőből tudja a szerkesztő előnézete, melyik adatot
 * szerkeszti a felhasználó, amikor kijelöl benne egy szövegrészt. Az éles
 * weboldalon ez csak egy ártalmatlan adat-attribútum.
 */
export function Szoveg({
  ertek,
  mezo,
  elem: Elem = 'span',
  className,
}: {
  ertek: string | undefined
  mezo: string
  elem?: ElementType
  className?: string
}) {
  return (
    <Elem
      className={className}
      data-zc-mezo={mezo}
      dangerouslySetInnerHTML={{ __html: tisztitHtml(ertek ?? '') }}
    />
  )
}

/**
 * Állandó felirat (szekciócím, oszlopnév, gombfelirat).
 *
 * Ezek alapból a beépített szövegek, de a szerkesztőben ugyanúgy lehet nekik
 * színt és animációt adni - az eltérést a site.json feliratok mezője őrzi.
 */
export function Felirat({
  kulcs,
  alap,
  elem,
  className,
}: {
  kulcs: string
  alap: string
  elem?: ElementType
  className?: string
}) {
  return (
    <Szoveg
      ertek={site.feliratok?.[kulcs] || alap}
      mezo={`site:feliratok:${kulcs}`}
      elem={elem}
      className={className}
    />
  )
}
