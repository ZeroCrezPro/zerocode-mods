/** GET /api/jatek/ranglista -> a Csillagraj legjobb 50 játékosa (nyilvános) */
import { jsonValasz } from '../../_lib/fiok.js'
import { nyilvanosRanglista, ranglistaBetolt } from '../../_lib/ranglista.js'

export async function onRequestGet({ env }) {
  if (!env.FIOKOK) return jsonValasz({ ok: true, lista: [] })
  return jsonValasz({ ok: true, lista: nyilvanosRanglista(await ranglistaBetolt(env.FIOKOK)) })
}
