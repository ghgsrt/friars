import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const entries = sqliteTable(
	'entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		firstName: text('first_name').notNull(),
		lastName: text('last_name'),
		email: text('email').notNull(),
		event1: integer('event1', { mode: 'boolean' }), // SQLite doesn't have native boolean
		event2: integer('event2', { mode: 'boolean' }),
		event3: integer('event3', { mode: 'boolean' }),
		registeredAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		canceledAt: text('canceled_at'),
		updatedAt: text('updated_at'),
		deletedAt: text('deleted_at'),
	},
	(table) => ({
		// Add indexes for common queries
		emailIdx: index('entries_email_idx').on(table.email),
		statusIdx: index('entries_status_idx').on(table.deletedAt),
	})
);

export const emails = sqliteTable(
	'emails',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		to: text('to'),
		name: text('name'),
		subject: text('subject'),
		content: text('content').notNull(),
		sendDate: text('send_date'),
		status: text('status').default('pending').notNull(),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		canceledAt: text('canceled_at'),
	},
	(table) => ({
		// Add index for pending email checks
		statusIdx: index('email_status_idx').on(table.status),
		// Compound index for hook queries
		hookIdx: index('hook_idx').on(table.status, table.name),
	})
);

// Type definitions for better TypeScript support
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;

export enum Hook {
	AfterRegistration = 'After Registration',
}
