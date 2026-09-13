/**
 * Tartalomvédelem az élő oldalon: nincs szövegkijelölés, másolás, kép-húzás,
 * jobb klikk és mentés-gyorsbillentyű. Az űrlapmezők kivételek, hogy a
 * belépés és a regisztráció működjön.
 *
 * A szerkesztő előnézetében (helyi cím) nem kapcsol be, mert ott a
 * formázáshoz szöveget kell kijelölni.
 */
export function vedelemBekapcsol() {
  if (typeof window === 'undefined') return
  const h = location.hostname
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return

  document.documentElement.classList.add('zc-vedett')

  const mezoben = (cel: EventTarget | null) => {
    const e = cel as HTMLElement | null
    return Boolean(e?.closest?.('input, textarea, select, [contenteditable="true"]'))
  }

  for (const nev of ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'] as const) {
    document.addEventListener(nev, (ev) => {
      if (!mezoben(ev.target)) ev.preventDefault()
    })
  }

  document.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey)) return
    const k = ev.key.toLowerCase()
    // mentés, forrás, nyomtatás, mindent kijelöl, másolás - mezőn kívül
    if (['s', 'u', 'p'].includes(k) || (['a', 'c', 'x'].includes(k) && !mezoben(ev.target))) ev.preventDefault()
  })
}
