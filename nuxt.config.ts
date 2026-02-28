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
    'nuxt-vitalizer',
  ],
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal', 'italic'],
    },
  },
  vitalizer: {
    disableStylesheets: 'entry',
  },
  turnstile: {
    siteKey: '',
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

  compatibilityDate: "2024-09-19",

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