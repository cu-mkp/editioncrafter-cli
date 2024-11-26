import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// this is an old file from an attempt to use drizzle
// should delete before merging the PR

export const documents = sqliteTable('documents', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
})

export const surfaces = sqliteTable('surfaces', {
  id: int().primaryKey({ autoIncrement: true }),
  position: int().notNull(),
  document_id: int().references(() => documents.id),
})

export const layers = sqliteTable('layers', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  surface_id: int().references(() => surfaces.id),
})

export const taxonomies = sqliteTable('taxonomies', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  xml_id: text().notNull(),
})

export const categories = sqliteTable('categories', {
  id: int().primaryKey({ autoIncrement: true }),
  xml_id: text().notNull(),
  parent_id: int().references(() => categories.id),
  taxonomy_id: int().references(() => taxonomies.id),
})
