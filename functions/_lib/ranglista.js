/**
 * A Csillagraj ranglistája - a KV-ban egyetlen dokumentum (ranglista), a
 * legjobb 50 játékos: név, profilkép, pont. Fiókonként a legjobb eredmény
 * számít; a bejegyzést az e-mail azonosítja, a név és a kép frissül.
 */
import { emailKulcs, nyilvanosFiok } from './fiok.js'

const KULCS = 'ranglista'
const HOSSZ = 50
/** A játékban elérhető legnagyobb pontszám (efölött hibás a beküldés). */
export const PONT_HATAR = 999_999_999_999_999

export async function ranglistaBetolt(kv) {
  const l = await kv.get(KULCS, 'json')
  return Array.isArray(l) ? l : []
}

/** A látogatónak kimenő alak: e-mail nélkül. */
export const nyilvanosRanglista = (lista) => lista.map((r, i) => ({ hely: i + 1, nev: r.nev, kepUrl: r.kepUrl ?? '', pont: r.pont }))

/** Új eredmény: ha jobb a fiók eddigi legjobbjánál, bekerül; a lista rendezve, levágva. */
export async function ranglistaFrissit(kv, fiok, pont) {
  const lista = await ranglistaBetolt(kv)
  const e = emailKulcs(fiok.email)
  const meglevo = lista.find((r) => r.email === e)
  const nyilvanos = nyilvanosFiok(fiok)
  if (meglevo) {
    meglevo.nev = nyilvanos.nev
    meglevo.kepUrl = nyilvanos.kepUrl
    if (pont > meglevo.pont) {
      meglevo.pont = pont
      meglevo.ido = Date.now()
    }
  } else {
    lista.push({ email: e, nev: nyilvanos.nev, kepUrl: nyilvanos.kepUrl, pont, ido: Date.now() })
  }
  lista.sort((a, b) => b.pont - a.pont || a.ido - b.ido)
  const uj = lista.slice(0, HOSSZ)
  await kv.put(KULCS, JSON.stringify(uj))
  return uj
}

/** Fiók törlésekor a bejegyzése is megy. */
export async function ranglistaTorol(kv, email) {
  const lista = await ranglistaBetolt(kv)
  const e = emailKulcs(email)
  const uj = lista.filter((r) => r.email !== e)
  if (uj.length !== lista.length) await kv.put(KULCS, JSON.stringify(uj))
}
