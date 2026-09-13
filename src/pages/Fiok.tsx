import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Seo, pageTitle } from '@/components/Seo'
import { Button } from '@/components/ui'
import { cx } from '@/lib/format'
import { fiokHivas, fiokokBekapcsolva, useFiok, type Fiok } from '@/lib/fiok'

/*
 * Fiók-oldalak: belépés, regisztráció, elfelejtett jelszó, új jelszó a
 * levélben kapott linkkel, és a saját fiók (jelszóváltás, kilépés).
 * Mind ugyanazt a keskeny kártyát használja.
 */

/* ---------- közös elemek ---------- */

function Kartya({ cim, alcim, children }: { cim: string; alcim?: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="zc-grid-bg absolute inset-0" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,31,39,0.14),transparent_60%)]"
        aria-hidden
      />
      <div className="zc-container relative flex min-h-[62vh] items-start justify-center py-14 sm:py-20">
        <div className="w-full max-w-md border border-ink-600 bg-ink-900/95 p-6 shadow-2xl shadow-black/50 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight uppercase">{cim}</h1>
          {alcim && <p className="mt-2 text-sm text-ash-400">{alcim}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Mezo({
  cimke,
  ertek,
  beallit,
  tipus = 'text',
  autoComplete,
  segito,
}: {
  cimke: string
  ertek: string
  beallit: (v: string) => void
  tipus?: string
  autoComplete?: string
  segito?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="zc-label block text-ash-300">{cimke}</span>
      <input
        id={id}
        type={tipus}
        value={ertek}
        autoComplete={autoComplete}
        required
        onChange={(e) => beallit(e.target.value)}
        className="mt-1.5 h-11 w-full border border-ink-600 bg-ink-850 px-3 text-sm text-ash-100 focus:border-blood-600 focus:outline-none"
      />
      {segito && <span className="mt-1 block text-xs text-ash-400">{segito}</span>}
    </label>
  )
}

function Uzenet({ szoveg, tipus }: { szoveg: string; tipus: 'hiba' | 'siker' }) {
  if (!szoveg) return null
  return (
    <p
      role={tipus === 'hiba' ? 'alert' : 'status'}
      className={cx('text-sm', tipus === 'hiba' ? 'text-blood-400' : 'text-emerald-400')}
    >
      {szoveg}
    </p>
  )
}

function Kikapcsolva() {
  return (
    <Kartya cim="Fiókok" alcim="A bejelentkezés jelenleg nincs bekapcsolva ezen az oldalon.">
      <Link to="/" className="text-sm text-blood-400 hover:underline">
        Vissza a főoldalra
      </Link>
    </Kartya>
  )
}

/** Űrlap-állapot: küldés közben a gomb tiltva, hiba/siker szöveggel. */
function useUrlap() {
  const [kuldes, setKuldes] = useState(false)
  const [hiba, setHiba] = useState('')
  const [siker, setSiker] = useState('')
  const futtat = async (muvelet: () => Promise<{ ok: true } | { ok: false; hiba: string }>) => {
    setKuldes(true)
    setHiba('')
    setSiker('')
    const v = await muvelet()
    if (!v.ok) setHiba(v.hiba)
    setKuldes(false)
  }
  return { kuldes, hiba, siker, setSiker, futtat }
}

/* ---------- Belépés ---------- */

export function Belepes() {
  const { fiok, beallit } = useFiok()
  const navigate = useNavigate()
  const [azonosito, setAzonosito] = useState('')
  const [jelszo, setJelszo] = useState('')
  const u = useUrlap()

  if (!fiokokBekapcsolva) return <Kikapcsolva />
  if (fiok) return <Navigate to="/fiok" replace />

  const kuld = (e: FormEvent) => {
    e.preventDefault()
    u.futtat(async () => {
      const v = await fiokHivas<{ fiok: Fiok }>('belepes', { azonosito, jelszo })
      if (v.ok) {
        beallit(v.adat.fiok)
        navigate('/fiok', { replace: true })
      }
      return v
    })
  }

  return (
    <Kartya cim="Belépés" alcim="Névvel vagy e-mail címmel.">
      <Seo title={pageTitle('Belépés')} description="Belépés a ZeroCode Mods fiókodba." path="/belepes" noIndex />
      <form onSubmit={kuld} className="space-y-4">
        <Mezo cimke="Név vagy e-mail" ertek={azonosito} beallit={setAzonosito} autoComplete="username" />
        <Mezo cimke="Jelszó" ertek={jelszo} beallit={setJelszo} tipus="password" autoComplete="current-password" />
        <Uzenet szoveg={u.hiba} tipus="hiba" />
        <Button type="submit" size="lg" className="w-full" disabled={u.kuldes}>
          {u.kuldes ? 'Belépés…' : 'Belépés'}
        </Button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-sm text-ash-400 sm:flex-row sm:justify-between">
        <Link to="/elfelejtett-jelszo" className="hover:text-ash-100">
          Elfelejtett jelszó
        </Link>
        <Link to="/regisztracio" className="text-blood-400 hover:underline">
          Még nincs fiókom
        </Link>
      </div>
    </Kartya>
  )
}

/* ---------- Regisztráció ---------- */

export function Regisztracio() {
  const { fiok, beallit } = useFiok()
  const navigate = useNavigate()
  const [nev, setNev] = useState('')
  const [email, setEmail] = useState('')
  const [jelszo, setJelszo] = useState('')
  const [jelszo2, setJelszo2] = useState('')
  const u = useUrlap()

  if (!fiokokBekapcsolva) return <Kikapcsolva />
  if (fiok) return <Navigate to="/fiok" replace />

  const kuld = (e: FormEvent) => {
    e.preventDefault()
    u.futtat(async () => {
      if (jelszo !== jelszo2) return { ok: false, hiba: 'A két jelszó nem egyezik.' }
      const v = await fiokHivas<{ fiok: Fiok }>('regisztracio', { nev, email, jelszo })
      if (v.ok) {
        beallit(v.adat.fiok)
        navigate('/fiok', { replace: true })
      }
      return v
    })
  }

  return (
    <Kartya cim="Regisztráció" alcim="Név, e-mail, jelszó - ennyi kell.">
      <Seo title={pageTitle('Regisztráció')} description="Fiók létrehozása a ZeroCode Mods oldalon." path="/regisztracio" noIndex />
      <form onSubmit={kuld} className="space-y-4">
        <Mezo cimke="Név" ertek={nev} beallit={setNev} autoComplete="nickname" segito="3–32 karakter; ezzel is beléphetsz." />
        <Mezo
          cimke="E-mail"
          ertek={email}
          beallit={setEmail}
          tipus="email"
          autoComplete="email"
          segito="Ide megy a levél, ha elfelejted a jelszavad."
        />
        <Mezo cimke="Jelszó" ertek={jelszo} beallit={setJelszo} tipus="password" autoComplete="new-password" segito="Legalább 8 karakter." />
        <Mezo cimke="Jelszó még egyszer" ertek={jelszo2} beallit={setJelszo2} tipus="password" autoComplete="new-password" />
        <Uzenet szoveg={u.hiba} tipus="hiba" />
        <Button type="submit" size="lg" className="w-full" disabled={u.kuldes}>
          {u.kuldes ? 'Fiók készül…' : 'Fiók létrehozása'}
        </Button>
      </form>
      <p className="mt-5 text-sm text-ash-400">
        Van már fiókod?{' '}
        <Link to="/belepes" className="text-blood-400 hover:underline">
          Belépés
        </Link>
      </p>
    </Kartya>
  )
}

/* ---------- Elfelejtett jelszó ---------- */

/**
 * A regisztrált címre levél megy egy linkkel. A link igazolja, hogy a kérő
 * hozzáfér a fiók postaládájához: rákattintva az oldal új jelszót kér, az
 * felülírja a régit, és egyből be is lép.
 */
export function ElfelejtettJelszo() {
  const [email, setEmail] = useState('')
  const u = useUrlap()

  if (!fiokokBekapcsolva) return <Kikapcsolva />

  const kuld = (e: FormEvent) => {
    e.preventDefault()
    u.futtat(async () => {
      const v = await fiokHivas('elfelejtett', { email })
      if (v.ok) u.setSiker('Elküldtük a levelet. Nyisd meg, kattints a benne lévő linkre, és add meg az új jelszavad. Ha nem látod, nézd meg a levélszemetet is.')
      return v
    })
  }

  return (
    <Kartya cim="Elfelejtett jelszó" alcim="A regisztrált e-mail címedre küldünk egy linket, azzal adhatsz meg új jelszót.">
      <Seo title={pageTitle('Elfelejtett jelszó')} description="Új jelszó kérése e-mailben." path="/elfelejtett-jelszo" noIndex />
      {u.siker ? (
        <Uzenet szoveg={u.siker} tipus="siker" />
      ) : (
        <form onSubmit={kuld} className="space-y-4">
          <Mezo cimke="E-mail" ertek={email} beallit={setEmail} tipus="email" autoComplete="email" />
          <Uzenet szoveg={u.hiba} tipus="hiba" />
          <Button type="submit" size="lg" className="w-full" disabled={u.kuldes}>
            {u.kuldes ? 'Küldés…' : 'Link küldése'}
          </Button>
        </form>
      )}
      <p className="mt-5 text-sm text-ash-400">
        <Link to="/belepes" className="hover:text-ash-100">
          Vissza a belépéshez
        </Link>
      </p>
    </Kartya>
  )
}

/* ---------- Új jelszó (a levél linkjéről) ---------- */

export function UjJelszo() {
  const [params] = useSearchParams()
  const jegy = params.get('jegy') ?? ''
  const { beallit } = useFiok()
  const navigate = useNavigate()
  const [jelszo, setJelszo] = useState('')
  const [jelszo2, setJelszo2] = useState('')
  const u = useUrlap()

  if (!fiokokBekapcsolva) return <Kikapcsolva />

  const kuld = (e: FormEvent) => {
    e.preventDefault()
    u.futtat(async () => {
      if (jelszo !== jelszo2) return { ok: false, hiba: 'A két jelszó nem egyezik.' }
      const v = await fiokHivas<{ fiok: Fiok }>('uj-jelszo', { jegy, jelszo })
      if (v.ok) {
        beallit(v.adat.fiok)
        navigate('/fiok', { replace: true })
      }
      return v
    })
  }

  return (
    <Kartya cim="Jelszó módosítása" alcim="Add meg az új jelszavad - ez felülírja a régit, és egyből be is lépünk.">
      <Seo title={pageTitle('Jelszó módosítása')} description="Új jelszó megadása." path="/uj-jelszo" noIndex />
      {jegy ? (
        <form onSubmit={kuld} className="space-y-4">
          <Mezo cimke="Új jelszó" ertek={jelszo} beallit={setJelszo} tipus="password" autoComplete="new-password" segito="Legalább 8 karakter." />
          <Mezo cimke="Új jelszó megerősítése" ertek={jelszo2} beallit={setJelszo2} tipus="password" autoComplete="new-password" />
          <Uzenet szoveg={u.hiba} tipus="hiba" />
          <Button type="submit" size="lg" className="w-full" disabled={u.kuldes}>
            {u.kuldes ? 'Mentés…' : 'Jelszó mentése'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-ash-400">
          Ez az oldal a levélben kapott linkről nyílik. Ha nincs leveled, kérj újat az{' '}
          <Link to="/elfelejtett-jelszo" className="text-blood-400 hover:underline">
            elfelejtett jelszó
          </Link>{' '}
          oldalon.
        </p>
      )}
    </Kartya>
  )
}

/* ---------- Saját fiók ---------- */

export function FiokOldal() {
  const { fiok, beallit, kilep } = useFiok()
  const navigate = useNavigate()
  const [regi, setRegi] = useState('')
  const [uj, setUj] = useState('')
  const [uj2, setUj2] = useState('')
  const [torlesKerdes, setTorlesKerdes] = useState(false)
  const [torlesFut, setTorlesFut] = useState(false)
  const [torlesHiba, setTorlesHiba] = useState('')
  const u = useUrlap()

  useEffect(() => {
    if (fiokokBekapcsolva && fiok === null) navigate('/belepes', { replace: true })
  }, [fiok, navigate])

  if (!fiokokBekapcsolva) return <Kikapcsolva />
  if (!fiok) {
    return (
      <Kartya cim="Fiók">
        <p className="text-sm text-ash-400">Betöltés…</p>
      </Kartya>
    )
  }

  const jelszoValt = (e: FormEvent) => {
    e.preventDefault()
    u.futtat(async () => {
      if (uj !== uj2) return { ok: false, hiba: 'A két új jelszó nem egyezik.' }
      const v = await fiokHivas<{ fiok: Fiok }>('jelszo', { regi, uj })
      if (v.ok) {
        beallit(v.adat.fiok)
        setRegi('')
        setUj('')
        setUj2('')
        u.setSiker('A jelszavad megváltozott.')
      }
      return v
    })
  }

  return (
    <Kartya cim="Fiókom">
      <Seo title={pageTitle('Fiókom')} description="A saját fiókod." path="/fiok" noIndex />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="zc-label text-ash-400">Név</dt>
        <dd className="font-semibold text-ash-100">{fiok.nev}</dd>
        <dt className="zc-label text-ash-400">E-mail</dt>
        <dd className="text-ash-100">{fiok.email}</dd>
      </dl>

      <h2 className="zc-label mt-8 mb-3 text-ash-100">Jelszó módosítása</h2>
      <form onSubmit={jelszoValt} className="space-y-4">
        <Mezo cimke="Jelenlegi jelszó" ertek={regi} beallit={setRegi} tipus="password" autoComplete="current-password" />
        <Mezo cimke="Új jelszó" ertek={uj} beallit={setUj} tipus="password" autoComplete="new-password" segito="Legalább 8 karakter." />
        <Mezo cimke="Új jelszó még egyszer" ertek={uj2} beallit={setUj2} tipus="password" autoComplete="new-password" />
        <Uzenet szoveg={u.hiba} tipus="hiba" />
        <Uzenet szoveg={u.siker} tipus="siker" />
        <Button type="submit" variant="secondary" disabled={u.kuldes}>
          {u.kuldes ? 'Mentés…' : 'Jelszó módosítása'}
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-700 pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await kilep()
            navigate('/', { replace: true })
          }}
        >
          Kilépés
        </Button>
        <Button type="button" onClick={() => setTorlesKerdes(true)}>
          Fiók törlése
        </Button>
      </div>

      {torlesKerdes && (
        <TorlesMegerosites
          folyamatban={torlesFut}
          hiba={torlesHiba}
          nem={() => setTorlesKerdes(false)}
          igen={async () => {
            setTorlesFut(true)
            setTorlesHiba('')
            const v = await fiokHivas('torles', {})
            if (!v.ok) {
              setTorlesHiba(v.hiba)
              setTorlesFut(false)
              return
            }
            beallit(null)
            navigate('/', { replace: true })
          }}
        />
      )}
    </Kartya>
  )
}

/** Külön ablak: a törlés végleges, ezért IGEN / NEM kérdés. */
function TorlesMegerosites({
  igen,
  nem,
  folyamatban,
  hiba,
}: {
  igen: () => void
  nem: () => void
  folyamatban: boolean
  hiba: string
}) {
  // Az Igen gomb öt másodpercig tiltva van, hogy ne lehessen véletlenül rákattintani.
  const [hatra, setHatra] = useState(5)
  useEffect(() => {
    if (hatra <= 0) return
    const t = setTimeout(() => setHatra((h) => h - 1), 1000)
    return () => clearTimeout(t)
  }, [hatra])

  useEffect(() => {
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nem()
    }
    document.addEventListener('keydown', billentyu)
    return () => document.removeEventListener('keydown', billentyu)
  }, [nem])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="torles-cim"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !folyamatban) nem()
      }}
    >
      <div className="w-full max-w-sm border border-blood-600/70 bg-ink-900 p-6 shadow-2xl shadow-black/70">
        <h2 id="torles-cim" className="text-lg font-black tracking-tight uppercase text-ash-100">
          Biztos törlöd a fiókod?
        </h2>
        <p className="mt-2 text-sm text-ash-400">
          A törlés <span className="font-bold text-blood-400">végleges és azonnal megtörténik</span> - a
          fiókot nem lehet visszaállítani. Minden elvész, ami hozzá tartozik: az elért eredményeid, a
          hozzá kötött előnyök és minden adatod.
        </p>
        <Uzenet szoveg={hiba} tipus="hiba" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" onClick={igen} disabled={folyamatban || hatra > 0}>
            {folyamatban ? 'Törlés…' : hatra > 0 ? `Igen (${hatra})` : 'Igen'}
          </Button>
          <Button type="button" variant="secondary" onClick={nem} disabled={folyamatban} autoFocus>
            Nem
          </Button>
        </div>
      </div>
    </div>
  )
}
