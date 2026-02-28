export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@nuxt/ui',
    '@nuxtjs/seo',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/turnstile',
    '@nuxt/fonts',
  ],
  fonts: {
    families: [
      { name: 'Geist', display: 'swap', preload: true },
      { name: 'Newsreader', display: 'swap', preload: true },
    ],
  },
  turnstile: {
    siteKey: '0x4AAAAAACi5J_aDDxg04Jkl',
  },
  imports: {
    presets: [
      {
        from: 'vue-sonner',
        imports: ['toast'],
      },
    ],
  },

  devtools: {
    enabled: true,
  },

  css: ['~/assets/style/main.css'],

  site: {
    url: 'https://riavzon.com',
    defaultLocale: 'en',
    indexable: true,
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  mdc: {
    highlight: {
      theme: {
        dark: 'github-dark',
        default: 'github-dark',
        light: 'github-light',
      },
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/api/contact': { prerender: false, cors: true }
  },

  experimental: {
    viewTransition: true,
  },

  compatibilityDate: "2024-09-20",

  nitro: {
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      routes: ['/'],
    },
    preset: "cloudflare-pages",
    cloudflare: {
      deployConfig: true,
      nodeCompat:true
    }
  },

  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
    ],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        strictNullChecks: true,
        strict: true
      }
    }
  },
  runtimeConfig: {
    turnstile: {
      secretKey: '',
    },
    privateResendApiKey: '',
  },
  ogImage: {
    zeroRuntime: true,
  },
})