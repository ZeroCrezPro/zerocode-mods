/**
 * /premium/*  - a fizetős fájlok helye. Közvetlenül NEM érhető el.
 *
 * A fájlokat a build másolja ide a "kiadasok" mappából; ez a függvény
 * minden közvetlen kérést elutasít. A fájlt csak a /api/fizetos/letoltes
 * adja ki, érvényes licenckulcs után - az az ASSETS kötésen át olvassa,
 * ami megkerüli ezt a függvényt.
 */
import { jsonValasz } from '../_lib/fizetos.js'

export function onRequest() {
  return jsonValasz(
    { ok: false, hiba: 'Ez a tartalom csak vásárlás után, a mod oldaláról tölthető le.' },
    403,
  )
}
