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
  telemetry: false,

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
      langs: [
        'ts',
        'js',
        "mjs",
        "mts",
        'vue',
        'diff',
        'pascal',
        'docker',
        "c",
        "makefile",
        "perl",
        "cmake",
        "ini",
        "py",
        'json',
        "yml",
        'yaml',
        'dockerfile',
        'dotenv',
        'bash',
        "sh",
        "http",
        'html',
        'css',
        "xml",
        'md',
        'sql',
      ],
      theme: {
        dark: 'github-dark',
        default: 'github-dark',
        light: 'github-light',
      },
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/api/contact': { prerender: false, cors: true },
    '/repo/*/commit/**': { ssr: false },
    '/repo/*/tree/**': { ssr: false },
    '/repo/*/blob/**': { ssr: false },
    '/repo/*/commits/**':{ ssr: false },
    '/repo/*/commit': { ssr: false },
    '/repo/*/tree': { ssr: false },
    '/repo/*/blob': { ssr: false },
    '/repo/*/commits': { ssr: false },
  },

  experimental: {
    viewTransition: true,
    payloadExtraction: true
  },

  compatibilityDate: "2024-09-20",

  nitro: {
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      routes: [
      '/',
      '/repo/nuxt', 
      '/repo/curl',  
    ],
    
      ignore: ['/repo/**'],
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
    serverBundle: {
      collections: ['vscode-icons', 'lucide'],
    },
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
    reposDir: '',
    turnstile: {
      secretKey: '',
    },
    webhookSecret: '',
    githubToken: '',
    privateResendApiKey: '',
  },
  ogImage: {
    zeroRuntime: true,
  },
})