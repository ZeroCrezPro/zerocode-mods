import { useEffect, useRef, useState } from 'react'
import { useFiok } from '@/lib/fiok'

/**
 * Az időablakhoz tartozó ellenőrző szám.
 *
 * Az idő ablakának sorszámából készül egy keveréssel, hogy ne egyszerű
 * számláló legyen. Az eltolással az előző ablak száma is kiszámolható -
 * azt is elfogadjuk, hogy ne járjon rosszul, aki éppen a váltás
 * pillanatában üti be.
 *
 * Vendégnek: 4 számjegy, 10 másodperces ablak. Bejelentkezve könnyebb:
 * 2 számjegy, 15 másodperces ablak.
 */
interface Nehezseg {
  jegyek: number
  masodperc: number
}
const VENDEG: Nehezseg = { jegyek: 4, masodperc: 10 }
const BELEPVE: Nehezseg = { jegyek: 2, masodperc: 15 }

function ellenorzoSzam(n: Nehezseg, eltolas = 0): number {
  const ablak = Math.floor(Date.now() / (n.masodperc * 1000)) + eltolas
  let x = (ablak ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = (x ^ (x >>> 16)) >>> 0
  const also = 10 ** (n.jegyek - 1)
  return also + (x % (also * 9))
}

/**
 * Telepítési kód mező - a Telepítési útmutató gomb mellett, vele egy
 * magasságban.
 *
 * Sorrend balról jobbra: az ellenőrző szám, a visszaszámláló, majd a
 * hely, ahova a látogató beírja. Helyes szám után ugyanitt jelenik meg a
 * kód (kattintásra másolható), és csak ekkor élednek fel a letöltés
 * gombok (lásd ModDetail).
 */
export function KodDoboz({
  kod,
  feloldva = false,
  onFeloldas,
  osztaly = '',
}: {
  kod: string
  /** A szülő mondja meg, fel van-e már oldva - így minden példány együtt vált. */
  feloldva?: boolean
  onFeloldas?: () => void
  osztaly?: string
}) {
  const { fiok } = useFiok()
  const n = fiok ? BELEPVE : VENDEG

  // A kiszolgálón renderelt oldalban még nincs szám - csak betöltés után.
  const [szam, setSzam] = useState<number | null>(null)
  const [hatra, setHatra] = useState(n.masodperc)
  const [beirt, setBeirt] = useState('')
  const [hibas, setHibas] = useState(false)
  const [masolva, setMasolva] = useState(false)
  const mezo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frissit = () => {
      setSzam(ellenorzoSzam(n))
      setHatra(n.masodperc - (Math.floor(Date.now() / 1000) % n.masodperc))
    }
    frissit()
    const ora = setInterval(frissit, 250)
    return () => clearInterval(ora)
  }, [n])

  if (!kod) return null

  const gepel = (nyers: string) => {
    const ertek = nyers.replace(/\D/g, '').slice(0, n.jegyek)
    setBeirt(ertek)
    setHibas(false)
    if (ertek.length < n.jegyek) return

    // Az utolsó számjegynél rögtön ellenőrzünk - nem kell külön gomb.
    const sz = Number(ertek)
    if (sz === ellenorzoSzam(n) || sz === ellenorzoSzam(n, -1)) {
      onFeloldas?.()
    } else {
      setHibas(true)
      setBeirt('')
      mezo.current?.focus()
    }
  }

  const masol = async () => {
    try {
      await navigator.clipboard.writeText(kod)
      setMasolva(true)
      setTimeout(() => setMasolva(false), 1600)
    } catch {
      /* ha nem engedi a böngésző, kézzel is kimásolható */
    }
  }

  if (feloldva) {
    return (
      <div className={`flex h-13 items-center gap-3 border border-blood-600/60 bg-ink-900 px-5 ${osztaly}`}>
        <span className="zc-label text-ash-400">Kód</span>
        <button
          type="button"
          onClick={masol}
          title="Kattints a másoláshoz"
          className="font-mono text-base font-black tracking-widest text-ash-100 transition-colors hover:text-blood-400"
        >
          {masolva ? 'Kimásolva!' : kod}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`flex h-13 items-center gap-3 border border-ink-600 bg-ink-900 px-4 ${osztaly}`}
      title={
        fiok
          ? 'Bejelentkezve könnyebb: írd be a piros két számjegyet, és megkapod a telepítési kódot.'
          : 'Írd be a piros számot, és megkapod a telepítési kódot - utána él a letöltés.'
      }
    >
      <span
        className="font-mono text-lg font-black tracking-widest text-blood-400"
        aria-label="Ellenőrző szám"
      >
        {szam ?? '-'.repeat(n.jegyek)}
      </span>
      <span className="w-6 text-center font-mono text-[11px] text-ash-500" aria-hidden>
        {hatra}s
      </span>
      <input
        ref={mezo}
        value={beirt}
        onChange={(e) => gepel(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="írd be"
        aria-label={`Írd be a mellette látható ${n.jegyek === 2 ? 'kétjegyű' : 'négyjegyű'} ellenőrző számot`}
        className={`h-9 border bg-ink-950 px-2 text-center font-mono text-base font-bold tracking-widest text-ash-100 outline-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal ${
          n.jegyek === 2 ? 'w-16' : 'w-22'
        } ${
          hibas
            ? 'zc-anim-shake border-blood-500 placeholder:text-blood-400'
            : 'border-ink-600 focus:border-blood-600 placeholder:text-ash-500'
        }`}
      />
    </div>
  )
}
