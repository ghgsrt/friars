import { Entry } from '../db/schema';
import type { Request } from '../../types/types';
import {
	cancelEntries,
	deleteEntries,
	getEntries,
	getEntry,
	getEntryByEmail,
	insertEntries,
	reviveEntries,
	softDeleteEntries,
	updateEntry,
} from '../db/db';

type ImmutableEntryProps =
	| 'id'
	| 'registeredAt'
	| 'updatedAt'
	| 'canceledAt'
	| 'deletedAt';

type RequiredEntryProps = {
	firstName: string;
	email: string;
};
export type EntryPostRequest = Request<
	Omit<Entry, ImmutableEntryProps>,
	RequiredEntryProps
>;
export type EntryPatchRequest = Partial<Omit<Entry, ImmutableEntryProps>>;

export function GetEntry(id: number) {
	return getEntry(id);
}

export function GetEntries(ids: number[]) {
	return getEntries(ids);
}

export function GetEntryByEmail(email: string) {
	return getEntryByEmail(email);
}

export function PostEntries(entries: EntryPostRequest[]) {
	return insertEntries(entries as Entry[]);
}

export function PatchEntry(id: number, entry: EntryPatchRequest) {
	return updateEntry(id, entry);
}

export function CancelEntries(ids: number[]) {
	return cancelEntries(ids);
}

export function DeleteEntries(ids: number[]) {
	return softDeleteEntries(ids);
}

export function HardDeleteEntries(ids: number[]) {
	return deleteEntries(ids);
}

export function ReviveEntries(ids: number[]) {
	return reviveEntries(ids);
}
