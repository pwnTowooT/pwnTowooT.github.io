import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'WooT',
  description:
    'A university student who loves pwnable and dreams of being a security researcher.',
  href: 'https://pwntowoot.github.io',
  author: 'WooT',
  locale: 'en-US',
  featuredPostCount: 2,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'blog',
  },
  {
    href: '/categories/CTF',
    label: 'CTF',
  },
  {
    href: '/categories',
    label: 'categories',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/pwnTowooT',
    label: 'GitHub',
  },
  {
    href: 'mailto:wootpwnlab@gmail.com',
    label: 'Email',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
