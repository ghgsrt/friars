import { migrate as migrateDrizzle } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './db';

export function migrate() {
	migrateDrizzle(db, { migrationsFolder: './drizzle' });
}
