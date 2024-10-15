import { InferSelectModel, sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type Entry = InferSelectModel<typeof entries>;
export type Email = InferSelectModel<typeof emails>;

export const entries = sqliteTable('entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	firstName: text('first_name').notNull(),
	lastName: text('last_name'),
	email: text('email').notNull(),
	event1: integer({ mode: 'boolean' }),
	event2: integer({ mode: 'boolean' }),
	event3: integer({ mode: 'boolean' }),
	registeredAt: text('created_at')
		.default(sql`(current_timestamp)`)
		.notNull(),
	canceledAt: text('canceled_at'),
	updatedAt: text('updated_at'),
	deletedAt: text('deleted_at'),
});

export const emails = sqliteTable('emails', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	to: text('to'),
	name: text('name'),
	subject: text('subject'),
	content: text('content').notNull(),
	sendDate: text('send_date'),
	status: text('status').default('pending').notNull(),
	createdAt: text('created_at')
		.default(sql`(current_timestamp)`)
		.notNull(),
	canceledAt: text('canceled_at'),
});

export enum Hook {
	AfterRegistration = 'After Registration',
}
