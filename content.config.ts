import { defineCollection, z } from '@nuxt/content'
import { asSeoCollection } from '@nuxtjs/seo/content'

const contentSchema = z.object({
  title: z.string().nonempty(),
  description: z.string().nonempty(),
  date: z.string().nonempty(),
})

const articleSchema = z.object({
  title: z.string().nonempty(),
  description: z.string().nonempty(),
  date: z.string().nonempty(),
  image: z.string().url(),
  readingTime: z.string().nonempty(),
  tags: z.array(z.string().nonempty()),
})

const projectSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
  image: z.string().url(),
  github: z.string().url(),
  link: z.string().url(),
  npm: z.string().url(),
  release: z.string().nonempty(),
  date: z.string().nonempty(),
  featured: z.boolean().optional(),
})

const faqSchema = z.object({
  title: z.string().nonempty(),
  subtitle: z.string().nonempty(),
  faqQuestions: z.array(
    z.object({
      title: z.string().nonempty(),
      questions: z.array(
        z.object({
          label: z.string().nonempty(),
          content: z.string().nonempty(),
        }),
      ),
    }),
  ),
})

export const collections = {
  content: defineCollection(
    asSeoCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        exclude: ['articles/*.md'],
      },
      schema: contentSchema,
    }),
  ),

  articles: defineCollection(
    asSeoCollection({
      type: 'page',
      source: {
        include: 'articles/*.md',
      },
      schema: articleSchema,
    }),
  ),

  projects: defineCollection(
    asSeoCollection({
      type: 'data',
      source: 'projects/*.json',
      schema: projectSchema,
    }),
  ),
  stack: defineCollection({
    type: 'data',
    source: 'stack.json',
    schema: z.object({
      items: z.array(
        z.object({
          name: z.string().nonempty(),
          link: z.string().url(),
          icon: z.string().nonempty(),
        }),
      ),
    }),
  }),
  faq: defineCollection({
    type: 'data',
    source: 'faq.json',
    schema: faqSchema,
  }),
}
