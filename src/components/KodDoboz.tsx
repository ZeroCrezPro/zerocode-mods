import { useEffect, useRef, useState } from 'react'

/**
 * A tízmásodperces időablakhoz tartozó négyjegyű ellenőrző szám.
 *
 * Az idő tízmásodperces ablakának sorszámából készül egy keveréssel, hogy
 * ne egyszerű számláló legyen. Az eltolással az előző ablak száma is
 * kiszámolható - azt is elfogadjuk, hogy ne járjon rosszul, aki éppen a
 * váltás pillanatában üti be.
 */
function ellenorzoSzam(eltolas = 0): number {
  const ablak = Math.floor(Date.now() / 10_000) + eltolas
  let x = (ablak ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = (x ^ (x >>> 16)) >>> 0
  return 1000 + (x % 9000)
}

/**
 * Telepítési kód doboz - a letöltés gomb alatt.
 *
 * A kód nincs beleírva az oldal szövegébe: itt lapul elrejtve, és egy kis
 * ablak kéri hozzá a mellette látható, tíz másodpercenként változó
 * négyjegyű számot. Helyes szám után a kód megjelenik, és másolható.
 */
export function KodDoboz({ kod }: { kod: string }) {
  // A kiszolgálón renderelt oldalban még nincs szám - csak betöltés után.
  const [szam, setSzam] = useState<number | null>(null)
  const [hatra, setHatra] = useState(10)
  const [nyitva, setNyitva] = useState(false)
  const [felfedve, setFelfedve] = useState(false)
  const [beirt, setBeirt] = useState('')
  const [hiba, setHiba] = useState('')
  const [masolva, setMasolva] = useState(false)
  const mezo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frissit = () => {
      setSzam(ellenorzoSzam())
      setHatra(10 - (Math.floor(Date.now() / 1000) % 10))
    }
    frissit()
    const ora = setInterval(frissit, 250)
    return () => clearInterval(ora)
  }, [])

  useEffect(() => {
    if (nyitva) mezo.current?.focus()
  }, [nyitva])

  if (!kod) return null

  const proba = () => {
    const n = Number(beirt.trim())
    // Az éppen érvényes és az előző számot is elfogadjuk.
    if (n === ellenorzoSzam() || n === ellenorzoSzam(-1)) {
      setFelfedve(true)
      setNyitva(false)
      setHiba('')
    } else {
      setHiba('Nem egyezik - írd be a mellette látható négyjegyű számot.')
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

  return (
    <div className="mt-4 max-w-xl border border-ink-700 bg-ink-900/90 p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="zc-label text-ash-400">Telepítési kód</p>
          <p
            className={`mt-1 font-mono text-xl font-black tracking-widest ${
              felfedve ? 'text-ash-100' : 'text-ash-500'
            }`}
          >
            {felfedve ? kod : '•'.repeat(Math.min(Math.max(kod.length, 6), 12))}
          </p>
        </div>

        <div>
          <p className="zc-label text-ash-400">Ellenőrző szám</p>
          <p className="mt-1 font-mono text-xl font-black tracking-widest text-blood-400">
            {szam ?? '----'}
            <span className="ml-2 align-middle font-sans text-[11px] font-normal tracking-normal text-ash-500">
              {hatra} mp múlva változik
            </span>
          </p>
        </div>

        <div className="ml-auto">
          {felfedve ? (
            <button
              type="button"
              onClick={masol}
              className="h-9 border border-ink-600 bg-ink-800 px-3.5 text-[11px] font-bold tracking-[0.08em] text-ash-100 uppercase transition-colors hover:border-blood-600"
            >
              {masolva ? 'Kimásolva!' : 'Kód másolása'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNyitva((v) => !v)
                setHiba('')
                setBeirt('')
              }}
              aria-expanded={nyitva}
              className="h-9 bg-blood-600 px-3.5 text-[11px] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-blood-500"
            >
              Kód felfedése
            </button>
          )}
        </div>
      </div>

      {/* A kis ablak, ami a négyjegyű számot kéri */}
      {nyitva && !felfedve && (
        <div className="mt-3 border border-ink-600 bg-ink-850 p-3">
          <label htmlFor="kodEllenorzo" className="block text-xs text-ash-300">
            Írd be a fenti piros, négyjegyű ellenőrző számot:
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="kodEllenorzo"
              ref={mezo}
              value={beirt}
              onChange={(e) => setBeirt(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') proba()
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000"
              className="h-9 w-24 border border-ink-600 bg-ink-950 px-3 text-center font-mono text-base font-bold tracking-widest text-ash-100 outline-none focus:border-blood-600"
            />
            <button
              type="button"
              onClick={proba}
              className="h-9 bg-blood-600 px-4 text-[11px] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-blood-500"
            >
              Felfedés
            </button>
          </div>
          {hiba && <p className="mt-2 text-xs text-blood-400">{hiba}</p>}
        </div>
      )}
    </div>
  )
}
