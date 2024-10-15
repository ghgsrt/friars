import {
	deleteEmailTemplate,
	createGenericTemplate,
} from '../emails/templates';
import { migrate } from './migrate';

await deleteEmailTemplate('GenericTemplate');
await createGenericTemplate();

migrate();

