import { getAllEntries } from '../api/database/db';
import { Entry } from '../api/database/schema';
import { Tab, TabGroup } from '../components/Tabs';
import { RefreshIcon } from '../icons/icon';

export function EntryRow({
	entry,
	selected,
}: {
	entry: Entry;
	selected?: boolean;
}) {
	return (
		<tr>
			<td>
				<input
					type='checkbox'
					name='selected'
					checked={selected}
					onclick='setSelectedCounter(this.checked);'
				/>
			</td>
			{Object.entries(entry).map(([column, entry], i) => (
				<td data-column={column} data-type={keyMap[i][1][1]}>
					{keyMap[i][1][1] === 'checkbox' ? (
						<input
							readonly
							type='checkbox'
							name={keyMap[i][0]}
							checked={!!entry}
						/>
					) : (
						entry
					)}
				</td>
			))}
		</tr>
	);
}

type EntryType = 'number' | 'checkbox' | 'string' | 'timestamp' | 'email';
const keyToName: Record<keyof Entry, [string, EntryType]> = {
	id: ['ID', 'number'],
	firstName: ['First', 'string'],
	lastName: ['Last', 'string'],
	email: ['E-Mail', 'email'],
	event1: ['Event 1', 'checkbox'],
	event2: ['Event 2', 'checkbox'],
	event3: ['Event 3', 'checkbox'],
	registeredAt: ['Registered', 'timestamp'],
	canceledAt: ['Canceled', 'timestamp'],
	updatedAt: ['Last Updated', 'timestamp'],
	deletedAt: ['Deleted', 'timestamp'],
};
const keyMap = Object.entries(keyToName);

export function EntriesTable({
	entries,
	selectedEntries,
}: {
	entries: Entry[];
	selectedEntries?: string[];
}) {
	return (
		<div>
			<table>
				<thead>
					<tr>
						<th data-type='checkbox'>Select</th>
						{keyMap.map(([column, [name, type]], i) => (
							<th
								class={i === 0 ? 'sorted-asc' : ''}
								data-column={column}
								data-type={type}
								onclick={`sortTable(${i + 1}, '${type}');`}
								safe
							>
								{name}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{entries.map((entry, i) => (
						<EntryRow
							entry={entry}
							selected={selectedEntries?.includes(entry.id.toString())}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

export async function EntriesView({
	selectedTab,
	selectedEntries,
}: {
	selectedTab?: number;
	selectedEntries?: [string[], string[], string[]];
}) {
	const _entries = await getAllEntries();

	console.log(_entries.length);

	const entries: Entry[] = [];
	const canceledEntries: Entry[] = [];
	const deletedEntries: Entry[] = [];

	let csvString = Object.keys(_entries[0]).join(',') + '\n';

	for (const entry of _entries) {
		csvString += Object.values(entry).join(',') + '\n';

		if (entry.deletedAt) {
			console.log(entry.email, entry.deletedAt);
			deletedEntries.push(entry);
		} else if (entry.canceledAt) canceledEntries.push(entry);
		else entries.push(entry);
	}

	return (
		<div id='entries-container'>
			<script>{`entriesAsCSV = \`${csvString}\`; refreshEntries();`}</script>
			<span class='flex between'>
				<span class='flex align-center'>
					<h2>Registry</h2>
				</span>
				<span
					id='refresh-registry'
					title='Manually Refresh Registry'
					class='self-end big'
					hx-post='/admin/entries-view'
					hx-target='#entries-container'
					hx-trigger='click'
					hx-swap='outerHTML'
					hx-on:htmx-config-request='event.detail.parameters.tabState = tabState[0]; event.detail.parameters.selected = JSON.stringify(getSelectedCache());'
				>
					<RefreshIcon />
				</span>
			</span>
			<TabGroup id='0' title='entries' selected={selectedTab}>
				<Tab title='Registered'>
					<EntriesTable
						entries={entries}
						selectedEntries={selectedEntries?.[0]}
					/>
				</Tab>
				<Tab title='Canceled'>
					<EntriesTable
						entries={canceledEntries}
						selectedEntries={selectedEntries?.[1]}
					/>
				</Tab>
				<Tab title='Deleted'>
					<EntriesTable
						entries={deletedEntries}
						selectedEntries={selectedEntries?.[2]}
					/>
				</Tab>
			</TabGroup>
			<div class='entries-actions'>
				<span class='flex'>
					<button class='entries-action deselect' onclick='deselectSelected()'>
						Deselect All
					</button>
					<button
						title='Select only one (1) entry'
						class='entries-action edit'
						hx-patch='/admin/entry'
						hx-swap='none'
						hx-on:htmx-config-request='event.detail.parameters.id = getSelected()[0];'
					>
						Edit
					</button>
					<button
						class='entries-action cancel'
						hx-post='/admin/entry/cancel'
						hx-swap='none'
						hx-on:htmx-config-request='event.detail.parameters.ids = JSON.stringify(getSelected());'
						hx-on:htmx-after-request="document.getElementById('refresh-registry').click();"
					>
						Cancel
					</button>
					<button
						class='entries-action uncancel'
						hx-post='/admin/entry/revive'
						hx-swap='none'
						hx-on:htmx-config-request='event.detail.parameters.ids = JSON.stringify(getSelected());'
						hx-on:htmx-after-request="document.getElementById('refresh-registry').click();"
					>
						Un-Cancel
					</button>
					<button
						class='entries-action delete'
						hx-delete='/admin/entry'
						hx-swap='none'
						hx-on:htmx-config-request='event.detail.parameters.ids = JSON.stringify(getSelected());'
						hx-on:htmx-after-request="document.getElementById('refresh-registry').click();"
					>
						Delete
					</button>
					<button
						class='entries-action revive'
						hx-post='/admin/entry/revive'
						hx-swap='none'
						hx-on:htmx-config-request='event.detail.parameters.ids = JSON.stringify(getSelected());'
						hx-on:htmx-after-request="document.getElementById('refresh-registry').click();"
					>
						Revive
					</button>
				</span>
				<button onclick='downloadCSVFile();'>Export CSV</button>
			</div>
		</div>
	);
}
