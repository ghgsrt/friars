import { drizzle } from 'drizzle-orm/neon-http';
import { Email, emails, entries, Entry, Hook } from './schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { seed } from './seed';
import { neon } from '@neondatabase/serverless';

export let db: ReturnType<typeof drizzle>;

if (process.env.DEMO === 'true') {
	const sqldb = neon(process.env.DEMO_NEON_DATABASE_URL!);
	db = drizzle(sqldb);
	if ((await db.select().from(entries)).length === 0) seed();
} else {
	const sqldb = neon(process.env.NEON_DATABASE_URL!);
	db = drizzle(sqldb);
}

export const getEntry = async (id: number) =>
	(await db.select().from(entries).limit(1).where(eq(entries.id, id)))[0];
export const getEntries = async (ids: number[]) =>
	await db.select().from(entries).where(inArray(entries.id, ids));
export const getAllEntries = async () => await db.select().from(entries);

export const getEntryByEmail = async (email: string) =>
	(await db.select().from(entries).limit(1).where(eq(entries.email, email)))[0];

export const insertEntries = async (_entries: Entry[]) => {
	const newEntries: Entry[] = [];
	const updatedEntries: Promise<Entry>[] = [];
	for (const entry of _entries) {
		const existing = await getEntryByEmail(entry.email);
		if (existing) {
			if (existing.event1) entry.event1 = true;
			if (existing.event2) entry.event2 = true;
			if (existing.event3) entry.event3 = true;

			updatedEntries.push(updateEntry(existing.id, entry));
		} else newEntries.push(entry);
	}

	const inserted = db.insert(entries).values(newEntries).returning();

	return [...(await Promise.all(updatedEntries)), ...(await inserted)];
};
export const updateEntry = async (id: number, entry: Partial<Entry>) =>
	(
		await db
			.update(entries)
			.set({ ...entry, updatedAt: sql`(current_timestamp)` })
			.where(eq(entries.id, id))
			.returning()
	)[0];
export const cancelEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ canceledAt: sql`(current_timestamp)` })
		.where(inArray(entries.id, ids));
export const reviveEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ canceledAt: null, deletedAt: null })
		.where(inArray(entries.id, ids));
export const softDeleteEntries = async (ids: number[]) =>
	await db
		.update(entries)
		.set({ deletedAt: sql`(current_timestamp)` })
		.where(inArray(entries.id, ids));
export const deleteEntries = async (ids: number[]) =>
	await db.delete(entries).where(inArray(entries.id, ids));

export const getAllEmails = async () => await db.select().from(emails);
export const getEmail = async (id: number) =>
	(await db.select().from(emails).limit(1).where(eq(emails.id, id)))[0];
export const insertEmail = async (email: Email) =>
	await db.insert(emails).values([email]);
export const updateEmail = async (id: number, email: Partial<Email>) =>
	await db.update(emails).set(email).where(eq(emails.id, id));
export const cancelEmail = async (id: number) =>
	await db
		.update(emails)
		.set({ canceledAt: sql`(current_timestamp)` })
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
