import { drizzle } from 'drizzle-orm/bun-sqlite';
import {
	Email,
	emails,
	entries,
	Entry,
	Hook,
	NewEmail,
	NewEntry,
} from './schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { seed } from './seed';
import Database from 'bun:sqlite';
import { join } from 'path';
import { migrate } from './migrate';

export let db: ReturnType<typeof drizzle>;

const DB_PATH =
	process.env.NODE_ENV === 'production'
		? '/data/sqlite.db' // Path in the Fly.io volume
		: join(import.meta.dir, '../sqlite.db'); // Local development path

const sqldb = new Database(DB_PATH);

sqldb.exec(`
	PRAGMA journal_mode = WAL;
	PRAGMA synchronous = NORMAL;
	PRAGMA temp_store = MEMORY;
	PRAGMA mmap_size = 30000000000;
	PRAGMA page_size = 4096;
	PRAGMA cache_size = -2000; -- 2MB cache
  `);

db = drizzle(sqldb, { logger: process.env.NODE_ENV === 'development' });
migrate();

const preparedGetEntryByEmail = db
	.select()
	.from(entries)
	.where(eq(entries.email, sql.placeholder('email')))
	.limit(1)
	.prepare();

const preparedGetPendingEmails = db
	.select()
	.from(emails)
	.where(eq(emails.status, 'pending'))
	.prepare();

const preparedGetAllActiveEntries = db
	.select()
	.from(entries)
	.where(sql`deleted_at IS NULL`)
	.prepare();

// Entries queries
export const getEntry = async (id: number) =>
	(await db.select().from(entries).limit(1).where(eq(entries.id, id)))[0];

export const getEntries = async (ids: number[]) =>
	await db.select().from(entries).where(inArray(entries.id, ids));

export const getAllEntries = async () => await db.select().from(entries);

export const getAllActiveEntries = async () =>
	await preparedGetAllActiveEntries.execute();

export const getEntryByEmail = async (email: string) =>
	(await preparedGetEntryByEmail.execute({ email }))[0];

export const insertEntries = async (_entries: NewEntry[]) => {
	const newEntries: NewEntry[] = [];
	const updatedEntries: Promise<Entry>[] = [];

	return await db.transaction(async (tx) => {
		for (const entry of _entries) {
			const existing = await getEntryByEmail(entry.email);
			if (existing) {
				if (existing.event1) entry.event1 = true;
				if (existing.event2) entry.event2 = true;
				if (existing.event3) entry.event3 = true;
				updatedEntries.push(updateEntry(existing.id, entry));
			} else {
				newEntries.push(entry);
			}
		}

		if (newEntries.length > 0) {
			const inserted = await tx.insert(entries).values(newEntries).returning();
			return [...(await Promise.all(updatedEntries)), ...inserted];
		}

		return await Promise.all(updatedEntries);
	});
};

export const updateEntry = async (id: number, entry: Partial<Entry>) =>
	(
		await db
			.update(entries)
			.set({
				...entry,
				updatedAt: sql`DATETIME('now')`,
			})
			.where(eq(entries.id, id))
			.returning()
	)[0];

export const cancelEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ canceledAt: sql`DATETIME('now')` })
		.where(inArray(entries.id, ids));

export const reviveEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ canceledAt: null, deletedAt: null })
		.where(inArray(entries.id, ids));

export const softDeleteEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ deletedAt: sql`DATETIME('now')` })
		.where(inArray(entries.id, ids));

export const deleteEntries = async (ids: number[]) =>
	await db.delete(entries).where(inArray(entries.id, ids));

// Emails queries
export const getAllEmails = async () => await db.select().from(emails);

export const getPendingEmails = async () =>
	await preparedGetPendingEmails.execute();

export const getEmail = async (id: number) =>
	(await db.select().from(emails).limit(1).where(eq(emails.id, id)))[0];

export const insertEmail = async (email: NewEmail) =>
	await db.insert(emails).values([email]);

export const updateEmail = async (id: number, email: Partial<Email>) =>
	await db.update(emails).set(email).where(eq(emails.id, id));

export const cancelEmail = async (id: number) =>
	await db
		.update(emails)
		.set({ canceledAt: sql`DATETIME('now')` })
		.where(eq(emails.id, id));

export const reviveEmail = async (id: number, changes: Partial<Email>) =>
	await db
		.update(emails)
		.set({ ...changes, canceledAt: null, status: 'pending' })
		.where(eq(emails.id, id));

export const deleteEmail = async (id: number) =>
	await db.delete(emails).where(eq(emails.id, id));

export const getHook = async (name: Hook) =>
	(
		await db
			.select()
			.from(emails)
			.limit(1)
			.where(and(eq(emails.status, 'hook'), eq(emails.name, name)))
	)[0];

if (process.env.DEMO === 'true')
	if ((await db.select().from(entries)).length === 0) await seed();

// export const getEntry = async (id: number) =>
// 	(await db.select().from(entries).limit(1).where(eq(entries.id, id)))[0];
// export const getEntries = async (ids: number[]) =>
// 	await db.select().from(entries).where(inArray(entries.id, ids));
// export const getAllEntries = async () => await db.select().from(entries);
// export const getAllActiveEntries = async () =>
// 	await db.select().from(entries).where(eq(entries.deletedAt, ''));

// export const getEntryByEmail = async (email: string) =>
// 	(await db.select().from(entries).limit(1).where(eq(entries.email, email)))[0];

// export const insertEntries = async (_entries: Entry[]) => {
// 	const newEntries: Entry[] = [];
// 	const updatedEntries: Promise<Entry>[] = [];
// 	for (const entry of _entries) {
// 		const existing = await getEntryByEmail(entry.email);
// 		if (existing) {
// 			if (existing.event1) entry.event1 = true;
// 			if (existing.event2) entry.event2 = true;
// 			if (existing.event3) entry.event3 = true;

// 			updatedEntries.push(updateEntry(existing.id, entry));
// 		} else newEntries.push(entry);
// 	}

// 	const inserted = db.insert(entries).values(newEntries).returning();

// 	return [...(await Promise.all(updatedEntries)), ...(await inserted)];
// };
// export const updateEntry = async (id: number, entry: Partial<Entry>) =>
// 	(
// 		await db
// 			.update(entries)
// 			.set({ ...entry, updatedAt: sql`(current_timestamp)` })
// 			.where(eq(entries.id, id))
// 			.returning()
// 	)[0];
// export const cancelEntries = async (ids: number[]) =>
// 	await db
// 		.update(entries)
// 		.set({ canceledAt: sql`(current_timestamp)` })
// 		.where(inArray(entries.id, ids));
// export const reviveEntries = async (ids: number[]) =>
// 	await db
// 		.update(entries)
// 		.set({ canceledAt: null, deletedAt: null })
// 		.where(inArray(entries.id, ids));
// export const softDeleteEntries = async (ids: number[]) =>
// 	await db
// 		.update(entries)
// 		.set({ deletedAt: sql`(current_timestamp)` })
// 		.where(inArray(entries.id, ids));
// export const deleteEntries = async (ids: number[]) =>
// 	await db.delete(entries).where(inArray(entries.id, ids));

// export const getAllEmails = async () => await db.select().from(emails);
// export const getPendingEmails = async () =>
// 	await db.select().from(emails).where(eq(emails.status, 'pending'));
// export const getEmail = async (id: number) =>
// 	(await db.select().from(emails).limit(1).where(eq(emails.id, id)))[0];
// export const insertEmail = async (email: Email) =>
// 	await db.insert(emails).values([email]);
// export const updateEmail = async (id: number, email: Partial<Email>) =>
// 	await db.update(emails).set(email).where(eq(emails.id, id));
// export const cancelEmail = async (id: number) =>
// 	await db
// 		.update(emails)
// 		.set({ canceledAt: sql`(current_timestamp)` })
// 		.where(eq(emails.id, id));
// export const reviveEmail = async (id: number, changes: Partial<Email>) =>
// 	await db
// 		.update(emails)
// 		.set({ ...changes, canceledAt: null, status: 'pending' })
// 		.where(eq(emails.id, id));
// export const deleteEmail = async (id: number) =>
// 	await db.delete(emails).where(eq(emails.id, id));

// export const getHook = async (name: Hook) =>
// 	(
// 		await db
// 			.select()
// 			.from(emails)
// 			.limit(1)
// 			.where(and(eq(emails.status, 'hook'), eq(emails.name, name)))
// 	)[0];
