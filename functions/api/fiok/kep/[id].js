/** GET /api/fiok/kep/<azonosító> - egy profilkép. Nyilvános (a cím nem árulja el az e-mailt). */
export async function onRequestGet({ params, env }) {
  const id = String(params.id ?? '')
  if (!/^[0-9a-f]{24}$/.test(id) || !env.FIOKOK) return new Response('Nincs ilyen kép', { status: 404 })
  const { value, metadata } = await env.FIOKOK.getWithMetadata(`kep:${id}`, 'arrayBuffer')
  if (!value) return new Response('Nincs ilyen kép', { status: 404 })
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.tipus ?? 'image/webp',
      // A cím a ?v= változattal együtt egyedi, ezért sokáig gyorsítótárazható.
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
