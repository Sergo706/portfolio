export default defineAppConfig({
  global: {
    meetingLink: 'https://cal.com/sergey-riavzon/15min',
    available: true,
  },
  profile: {
    name: 'Sergey Riavzon',
    job: 'Full-stack engineer',
    email: 'sergo998826@gmail.com',
    phone: '+972-52-466-0210',
    picture: '/profile.jpg',
  },
  socials: {
    github: 'https://github.com/Sergo706',
    linkedin: 'https://www.linkedin.com/in/sergey-riavzon-b5a50737b',
  },
  seo: {
    title: 'Sergey Riavzon portfolio',
    description: `Serge'y work & blog`,
    url: 'https://riavzon.com',
  },
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'neutral',
    },
    notifications: {
      position: 'top-0 bottom-auto',
    },
    notification: {
      progress: {
        base: 'absolute bottom-0 end-0 start-0 h-0',
        background: 'bg-transparent dark:bg-transparent',
      },
    },
    button: {
      slots: {
        base: 'cursor-pointer',
      },
      defaultVariants: {
        color: 'neutral',
      },
    },
    input: {
      defaultVariants: {
        color: 'neutral',
      },
    },
    textarea: {
      defaultVariants: {
        color: 'neutral',
      },
    },
    icons: {
      loading: 'lucide:loader',
    },
  },
  link: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest',
    },
  ],
});
