import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* Vocab
 * One collection per slug vocabulary. The actual YAML content lives under
 * src/content/vocab/*.yaml, this defines the shape every vocab file must
 * follow so schema validation and listing-page filter options share one
 * source of truth instead of drifting.
 */
const vocabEntrySchema = z.union([
  z.string(),
  z.array(z.string()),
  z.object({
    label: z.string(),
    short: z.string().optional(),
    url: z.string().optional(),
  }),
]);

const vocab = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/vocab" }),
  schema: z.record(z.string(), vocabEntrySchema),
});

// A single `vocab` collection (id = filename minus extension) lets lib/search/vocab.ts
// index by collection-entry id instead of this file hardcoding every vocab filename.

/**
 * CONTENT COLLECTIONS
 *
 * Slug fields are validated as plain z.string(), not z.enum(), because their
 * valid values live in the vocab YAML, which this file can't statically
 * import without a build-order dependency loop.
 */

const linkSchema = z.object({
  label: z.string().optional(),
  url: z.string().url(),
});

const games = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/games" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Co-located with the game's index.md (e.g. "grid.png"); image() returns ImageMetadata (use .src for a plain <img>).
      grid: image(),
      icon: image(),
      language: z.string(),
      developers: z.array(z.string()).min(1),
      publishers: z.array(z.string()).min(1),
      nsfw: z.boolean().default(false),
      date: z.coerce.date(),
      version: z.string(),
      regions: z.array(z.string()).min(1),
      players: z.number().int().min(1),
      platforms: z.array(z.string()).min(1),
      links: z.array(linkSchema).default([]),
      tags: z.array(z.string()).min(1),
    }),
});

const creditRoleSchema = z.object({
  role: z.string(),
  characters: z.array(z.string()).optional(),
});

const creditSchema = z.union([
  z.object({
    author: z.string(),
    roles: z.array(creditRoleSchema).min(1),
  }),
  z.object({
    circle: z.string(),
    roles: z.array(creditRoleSchema).min(1),
  }),
]);

const downloadSchema = z
  .object({
    platform: z.string(),
    type: z.string().optional(),
    provider: z.string(),
    variant: z.string().optional(),
    format: z.string().optional(),
    filesize: z.string().optional(),
    version: z.string(),
    gameversion: z.string(),
    region: z.string(),
    status: z.string(),
    completion: z.number().min(0).max(100),
    date: z.coerce.date(),
    url: z.string().url(),
    sha256: z.string().optional(),
    install: z.string().optional(),
    install_custom: z.array(z.string()).optional(),
    archive: z.boolean().default(false),
  })
  .refine((d) => !(d.install && d.install_custom), {
    message: "install and install_custom are mutually exclusive",
  });

const progressSchema = z.object({
  label: z.string().optional(),
  value: z.number().min(0).max(100),
});

const patches = defineCollection({
  // Patches live one level deeper than games (games/{game}/{patch}/index.md); the resulting
  // id is "{game}/{patch}", which db.ts's gameIdForPatch()/patchSlug() split back apart.
  loader: glob({ pattern: "*/*/index.md", base: "./src/content/games" }),
  schema: ({ image }) =>
    z
    .object({
      circles: z.array(z.string()).default([]),
      authors: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      title: z.string().optional(),
      title_type: z.enum(["translation", "version"]).optional(),
      publishers: z.array(z.string()).default([]),
      platforms: z.array(z.string()).min(1),
      lost_source: z.boolean().default(false),
      lost_media: z.boolean().default(false),
      official: z.boolean().default(false),
      mtl: z.boolean().default(false),
      external: z.boolean().default(false),
      date: z.coerce.date().optional(),
      status: z.string(),
      origin: z.string(),
      subs: z.string(),
      graphics: z.string(),
      dub: z.string(),
      credits: z.array(creditSchema).default([]),
      downloads: z.array(downloadSchema).default([]),
      links: z.array(linkSchema).default([]),
      license: z.string().optional(),
      license_custom: z.array(z.string()).optional(),
      progress: z.array(progressSchema).default([]),
      screenshots: z.array(image()).default([]),
    })
    .refine((d) => d.circles.length > 0 || d.authors.length > 0, {
      message: "at least one author or circle is required",
    })
    .refine((d) => !(d.title && !d.title_type), {
      message: "title_type is required when title is set",
    })
    .refine((d) => !(d.license && d.license_custom), {
      message: "license and license_custom are mutually exclusive",
    }),
});

const memberSchema = z.object({
  author: z.string().optional(),
  roles: z.array(z.string()).default([]),
});

const circles = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/circles" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Co-located with the circle's index.md (e.g. "logo.png").
      logo: image().optional(),
      date: z.coerce.date().optional(),
      activity: z.string().optional(),
      members: z.array(memberSchema).default([]),
      links: z.array(linkSchema).default([]),
    }),
});

const authors = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/authors" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      avatar: image().optional(),
      activity: z.string().optional(),
      links: z.array(linkSchema).default([]),
    }),
});

const resources = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/resources" }),
  schema: z.object({
    title: z.string(),
    writers: z.array(z.string()).min(1),
    categories: z.array(z.string()).min(1),
    date: z.coerce.date(),
    lastmod: z.coerce.date(),
  }),
});

export const collections = { vocab, games, patches, circles, authors, resources };
