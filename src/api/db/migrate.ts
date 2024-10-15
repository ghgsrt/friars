import { migrate as migrateDrizzle } from 'drizzle-orm/neon-http/migrator';
import { db } from './db';

// export function migrate() {
// 	migrateDrizzle(db, { migrationsFolder: './drizzle' });
// }

export async function migrate() {
	try {
		await migrateDrizzle(db, { migrationsFolder: 'drizzle' });
		console.log('Migration completed');
	} catch (error) {
		console.error('Error during migration:', error);
		process.exit(1);
	}
}
