import { Entry } from '../api/db/schema';

export function Ticket({ entry }: { entry: Entry }) {
	return <>THIS IS TICKET FOR {entry}</>;
}
