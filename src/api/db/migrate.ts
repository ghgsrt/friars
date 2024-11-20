import { migrate as migrateDrizzle } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './db';

export function migrate() {
	try {
		migrateDrizzle(db, { migrationsFolder: 'drizzle' });
		console.log('Migration completed');
	} catch (error) {
		console.error('Error during migration:', error);
		process.exit(1);
	}
}
