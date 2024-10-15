import { Entry } from '../api/database/schema';

export function Ticket({ entry }: { entry: Entry }) {
	return <>THIS IS TICKET FOR {entry}</>;
}
