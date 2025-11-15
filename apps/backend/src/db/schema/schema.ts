import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

export const usersTable = pgTable('videos', {
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  ossKey: varchar({ length: 255 }).unique(),
})
