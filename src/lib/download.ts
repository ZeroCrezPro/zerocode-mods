import { site } from '@/data/site'
import type { DownloadSource } from '@/data/types'

/**
 * Egy verzió letöltési URL-jét állítja elő.
 *
 * github-latest -> https://github.com/USER/REPO/releases/latest/download/FILE
 *   Ez mindig a legfrissebb release-re mutat, ezért új kiadásnál NEM kell
 *   hozzányúlni az adatfájlhoz.
 *
 * github-tag    -> https://github.com/USER/REPO/releases/download/TAG/FILE
 * url           -> a megadott cím változtatás nélkül
 */
export function downloadUrl(src: DownloadSource): string {
  if (src.kind === 'url') return src.url

  const owner = src.owner ?? site.githubUser
  const repo = src.repo ?? site.releasesRepo

  if (src.kind === 'github-latest') {
    return `https://github.com/${owner}/${repo}/releases/latest/download/${src.file}`
  }
  return `https://github.com/${owner}/${repo}/releases/download/${src.tag}/${src.file}`
}

/** A letöltendő fájl neve, ha ismert. */
export function downloadFileName(src: DownloadSource): string | null {
  if (src.kind === 'url') {
    try {
      return decodeURIComponent(new URL(src.url).pathname.split('/').pop() ?? '') || null
    } catch {
      return null
    }
  }
  return src.file
}
