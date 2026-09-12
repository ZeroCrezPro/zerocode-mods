/**
 * POST /api/fiok/elfelejtett  { email }
 *
 * Ha van ilyen fiók, egy óráig élő visszaállító linket küldünk e-mailben
 * (Gmailen át). A válasz mindig ugyanaz, hogy a címekből ne lehessen
 * kitalálni, kinek van fiókja.
 */
import site from '../../../src/data/site.json' with { type: 'json' }
import {
  fiokBetolt,
  fiokRendszerHiba,
  jsonValasz,
  keresTest,
  tulSokProba,
  ujJelszoJegy,
  ujJelszoKodKeszit,
} from '../../_lib/fiok.js'
import { levelKuldes } from '../../_lib/level.js'

export async function onRequestPost({ request, env }) {
  const rendszerHiba = fiokRendszerHiba(env)
  if (rendszerHiba) return jsonValasz({ ok: false, hiba: rendszerHiba }, 500)
  if (!env.GMAIL_CIM || !env.GMAIL_JELSZO) {
    return jsonValasz({ ok: false, hiba: 'A jelszó-visszaállító levél küldése nincs beállítva.' }, 500)
  }
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  if (await tulSokProba(env.FIOKOK, request, 'elfelejtett', 5)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok próbálkozás - várj tíz percet.' }, 429)
  }

  const fiok = await fiokBetolt(env.FIOKOK, test.email)
  if (fiok) {
    const jegy = await ujJelszoJegy(fiok, env.FIOK_TITOK)
    const kod = await ujJelszoKodKeszit(env.FIOKOK, fiok)
    const eredet = new URL(request.url).origin
    const link = `${eredet}/uj-jelszo?jegy=${encodeURIComponent(jegy)}`
    try {
      await levelKuldes({
        felhasznalo: env.GMAIL_CIM,
        jelszo: env.GMAIL_JELSZO,
        kiszolgalo: env.SMTP_PROBA,
        feladoNev: site.name,
        cimzett: fiok.email,
        targy: `${site.name} - új jelszó`,
        szoveg:
          `Szia ${fiok.nev}!\n\n` +
          `Valaki (remélhetőleg te) új jelszót kért a ${site.name} fiókodhoz.\n\n` +
          `Az igazoló kódod: ${kod}\n\n` +
          `Ezt írd be az oldalon az e-mail címeddel együtt - vagy egyszerűen nyisd meg ezt a linket:\n${link}\n\n` +
          `A kód és a link egy óráig érvényes.\n\n` +
          `Ha nem te kérted, nincs teendőd - a jelszavad változatlan marad.\n\n${site.name}`,
      })
    } catch (e) {
      return jsonValasz({ ok: false, hiba: `A levelet nem sikerült elküldeni (${e.message}).` }, 502)
    }
  }
  return jsonValasz({ ok: true })
}
