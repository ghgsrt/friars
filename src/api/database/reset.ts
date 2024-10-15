import {
	deleteEmailTemplate,
	createGenericTemplate,
} from '../emails/templates';
import { migrate } from './migrate';
import { seed } from './seed';

await deleteEmailTemplate('GenericTemplate');
await createGenericTemplate();

migrate();

seed();
