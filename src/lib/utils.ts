import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withBase(path: string) {
  if (
    !path ||
    path.startsWith('#') ||
    /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(path) ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:')
  ) {
    return path
  }

  const [pathnameWithQuery, hash = ''] = path.split('#')
  const [pathname, query = ''] = pathnameWithQuery.split('?')
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (base && (normalizedPath === base || normalizedPath.startsWith(`${base}/`))) {
    return path
  }

  const resolvedPath = `${base}${normalizedPath}` || '/'
  const querySuffix = query ? `?${query}` : ''
  const hashSuffix = hash ? `#${hash}` : ''

  return `${resolvedPath}${querySuffix}${hashSuffix}`
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function calculateWordCountFromHtml(
  html: string | null | undefined,
): number {
  if (!html) return 0
  const textOnly = html.replace(/<[^>]+>/g, '')
  return textOnly.split(/\s+/).filter(Boolean).length
}

export function readingTime(wordCount: number): string {
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200))
  return `${readingTimeMinutes} min read`
}

export function getHeadingMargin(depth: number): string {
  const margins: Record<number, string> = {
    3: 'ml-4',
    4: 'ml-8',
    5: 'ml-12',
    6: 'ml-16',
  }
  return margins[depth] || ''
}
