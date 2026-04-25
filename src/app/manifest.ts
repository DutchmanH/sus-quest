import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SusQuest',
    short_name: 'SusQuest',
    description: 'trust no one.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D1F1A',
    theme_color: '#0D1F1A',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
