/** POST /api/fiok/kilepes -> a süti törlése */
import { jsonValasz, kilepesSuti } from '../../_lib/fiok.js'

export async function onRequestPost() {
  return jsonValasz({ ok: true }, 200, kilepesSuti())
}
