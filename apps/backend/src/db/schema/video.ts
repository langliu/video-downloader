import { sql } from 'drizzle-orm'
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// 定义任务状态枚举
export const taskStatusEnum = pgEnum('task_status', [
  'pending', // 等待开始
  'processing', // 进行中
  'completed', // 已完成
  'failed', // 失败
])

export const videosTable = pgTable('videos', {
  createAt: timestamp('create_at').notNull().defaultNow(),
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  link: text('link').notNull().unique(),
  name: text('name'),
  ossKey: text('oss_key').notNull().unique(),
  updateAt: timestamp('update_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const tasksTable = pgTable('tasks', {
  createAt: timestamp('create_at').notNull().defaultNow(),
  failedCount: integer('failed_count').notNull().default(0),
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  links: text('links').notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
  successCount: integer('success_count').notNull().default(0),
  total: integer('total').notNull().default(0),
  updateAt: timestamp('update_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
