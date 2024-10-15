import { InferSelectModel, sql } from 'drizzle-orm';
import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';

export type Entry = InferSelectModel<typeof entries>;
export type Email = InferSelectModel<typeof emails>;

export const entries = pgTable('entries', {
	id: serial('id').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name'),
	email: text('email').notNull(),
	event1: boolean(),
	event2: boolean(),
	event3: boolean(),
	registeredAt: timestamp('created_at', { mode: 'string' })
		.defaultNow()
		.notNull(),
	canceledAt: timestamp('canceled_at', { mode: 'string' }),
	updatedAt: timestamp('updated_at', { mode: 'string' }),
	deletedAt: timestamp('deleted_at', { mode: 'string' }),
});

export const emails = pgTable('emails', {
	id: serial('id').primaryKey(),
	to: text('to'),
	name: text('name'),
	subject: text('subject'),
	content: text('content').notNull(),
	sendDate: text('send_date'),
	status: text('status').default('pending').notNull(),
	createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
	canceledAt: timestamp('canceled_at', { mode: 'string' }),
});

export enum Hook {
	AfterRegistration = 'After Registration',
}
