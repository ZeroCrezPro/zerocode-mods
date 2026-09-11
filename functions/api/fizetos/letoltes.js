/**
 * GET /api/fizetos/letoltes?mod=<slug>&kulcs=<licenckulcs>
 *
 * Érvényes kulcs esetén kiadja a fizetős fájlt. A fájl a kiszolgált oldal
 * /premium/... útvonalán van, de azt az útvonalat egy másik függvény zárja -
 * ide csak az ASSETS kötésen át, a függvényeket megkerülve érünk el.
 */
import {
  fizetosBeallitas,
  fizetosFajlUt,
  jegyEllenorzes,
  jsonValasz,
  kulcsEllenorzes,
} from '../../_lib/fizetos.js'

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const beallitas = fizetosBeallitas(url.searchParams.get('mod') ?? '')
  if (!beallitas) return jsonValasz({ ok: false, hiba: 'Ehhez a modhoz nincs fizetős letöltés.' }, 404)

  // Sikeres fizetés után aláírt jegy jön; aki később, kulccsal jön, azt a
  // szolgáltatónál ellenőrizzük.
  const jegy = url.searchParams.get('jegy')
  if (jegy) {
    if (!(await jegyEllenorzes(beallitas.slug, jegy, env.FIZETOS_TITOK))) {
      return jsonValasz({ ok: false, hiba: 'A letöltési jegy érvénytelen vagy lejárt.' }, 403)
    }
  } else {
    const eredmeny = await kulcsEllenorzes(beallitas, url.searchParams.get('kulcs'))
    if (!eredmeny.ok) return jsonValasz({ ok: false, hiba: eredmeny.hiba }, 403)
  }

  const fajl = await env.ASSETS.fetch(new URL(fizetosFajlUt(beallitas), url.origin))
  if (!fajl.ok || !fajl.body) {
    return jsonValasz(
      { ok: false, hiba: 'A fájl még nincs feltöltve - szólj a készítőnek.' },
      404,
    )
  }

  // A böngésző mentse fájlként, a mod eredeti nevével (ékezet nélkül és vele is).
  const ascii = beallitas.fajl.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
  const fejlec = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(beallitas.fajl)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const hossz = fajl.headers.get('content-length')
  if (hossz) fejlec.set('Content-Length', hossz)

  return new Response(fajl.body, { status: 200, headers: fejlec })
}
