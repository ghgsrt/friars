const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (IS_IOS) document.documentElement.classList.add('is-mobile');

const SEL_TYPE_UNSELECTED = 'Caret';
const SEL_TYPE_SELECTED = 'Range';

const TAB_GROUP_REGISTRY = 0;
const TAB_REGISTERED = 0;
const TAB_CANCELED = 1;
const TAB_DELETED = 2;

const TAB_GROUP_AUTOMATED_EMAILS = 1;
const TAB_GROUP_SCHEDULED_EMAILS = 2;

let entriesAsCSV;

//== MODAL STUFF ==-------------------------------------------------------------------

const modalActions = {
	refresh: {
		entries: () => entriesRefresher().click(),
		emails: () => emailsRefresher().click(),
	},
	replace: {
		emailEditor: {
			new: () => newEmail().click(),
		},
	},
};
function handleModalResponse(message) {
	if (!message) return;

	const actions = message.split(';');
	for (const action of actions) {
		const parts = action.split(':');

		let layer = modalActions;
		for (const part of parts) layer = layer[part];

		if (typeof layer !== 'function')
			return console.log('Not callable: ', layer);

		layer();
	}
}

//== SELECT STUFF ==------------------------------------------------------------------

const DROPDOWN_MARGIN = '0.25rem';

function toggleSelect(id, teleport, targetId, openDown) {
	let dropdown = document.getElementById(teleport ? `teleported_${id}` : id);

	if (teleport) {
		const target = document.getElementById(targetId);

		const bb = target.getBoundingClientRect();
		dropdown.style.left = `${bb.left}px`;
		if (openDown)
			dropdown.style.top = `calc(${bb.bottom}px + ${DROPDOWN_MARGIN})`;
		else
			dropdown.style.bottom = `calc(100% - ${bb.top}px + ${DROPDOWN_MARGIN})`;
	}

	dropdown.classList.toggle('hide');

	if (!dropdown.classList.contains('hide'))
		setTimeout(() =>
			window.addEventListener('click', () => dropdown.classList.add('hide'), {
				once: true,
			})
		);
}

let selected;
function setSelectSelected(dd, id) {
	const select = document.getElementById(id);
	select.firstChild.remove();
	if (select.firstChild?.nodeName === 'INPUT')
		select.firstChild.value = dd.dataset.value;

	const clone = dd.firstChild.cloneNode(true);
	select.insertBefore(clone, select.firstChild);
	htmx.process(clone);

	selected?.classList.remove('selected');
	dd.classList.add('selected');
	selected = dd;
}

function setCustomSelected(dd, id, datasetOnly = false) {
	setSelectSelected(dd, `select-${id}`);
	if (!datasetOnly) {
		setSelectSelected(dd, id);
	} else {
		const customSelect = document.getElementById(id);
		customSelect.dataset.selected = dd.dataset.value;
	}
}

function teleportSelectDropdown(id) {
	const oldDropdown = document.getElementById(`teleported_${id}`)?.remove();

	const dropdown = document.getElementById(id);

	const clone = dropdown.cloneNode(true);
	dropdown.remove();
	clone.setAttribute('id', `teleported_${id}`);
	document.getElementById('portal').appendChild(clone);
	htmx.process(clone);
}

//== TAB STUFF =====------------------------------------------------------------------

const tabState = [0, 0, 0];
const tabContentOffset = 1; // + 1 for the header (no break) // + 2 for the header and a break

const _onTabChange = [[], [], []];

function onTabChange(group, cb) {
	_onTabChange[group].push(cb);
}

function selectTab(group, idx) {
	const tabHeader = document.getElementById(`tab-${group}-header`);

	if (!tabHeader) return;

	const tabs = tabHeader.children;
	tabs[tabState[group] ?? 0].classList.remove('selected');
	tabs[idx].classList.add('selected');

	const tabContents = tabHeader.parentElement.children;
	tabContents[(tabState[group] ?? 0) + tabContentOffset].classList.remove(
		'selected'
	);

	const selected = tabContents[idx + tabContentOffset];
	selected.classList.add('selected');

	tabState[group] = idx;

	if (selected.firstChild.firstChild.tagName !== 'TABLE') return;

	const childHeight = selected.firstChild.firstChild.offsetHeight;
	if (selected.offsetHeight > childHeight)
		selected.style.setProperty('height', childHeight + 'px', 'important');

	for (const cb of _onTabChange[group]) cb();
}

function refreshTabs() {
	for (let i = 0; i < tabState.length; i++) selectTab(i, tabState[i]);
}

//== TOOLTIP STUFF ==-----------------------------------------------------------------

function showTooltip(item, targetId, side) {
	item.setAttribute(
		'data-timeoutId',
		setTimeout(() => {
			const rect = item.getBoundingClientRect();
			const target = document.getElementById(targetId);

			target.style.display = 'block';
			target.style.top = rect.top + 'px';
			target.style[side] =
				side === 'right' ? `calc(100% - ${rect.left}px)` : rect.right + 'px';
		}, 100)
	);
}

function hideTooltip(item, targetId) {
	clearTimeout(item.getAttribute('data-timeoutId'));
	const target = document.getElementById(targetId);
	target.style.display = 'none';
}

//== ENTRIES STUFF ==-----------------------------------------------------------------

let selectedCache;
let selectedCacheInvalid = true;

const getSelectedCache = () => {
	if (selectedCacheInvalid) return getSelected(true);
	return selectedCache;
};

const entrySingletons = {
	'entries-container': undefined,
	'refresh-registry': undefined,
};
const getEntrySingleton = (name) => () =>
	entrySingletons[name] ??
	(entrySingletons[name] = document.getElementById(name));

const entriesContainer = getEntrySingleton('entries-container');
const entriesRefresher = getEntrySingleton('refresh-registry');

const currentRegistryTab = () => tabState[TAB_GROUP_REGISTRY];

function refreshEntries() {
	// setTimeout(() => {
	for (const name in entrySingletons) entrySingletons[name] = undefined;

	sortTable(currentSortColumn, currentSortType, true);
	// setTimeout(() => {

	selectedCounter = getSelected(true).map((tab) => tab.length);
	setTimeout(() => setSelectedCounter(undefined, undefined, true), 25);
	// }, 50);
	// });
}

onTabChange(TAB_GROUP_REGISTRY, () => {
	setSelectedCounter(selectedCounter[currentRegistryTab()]);
});

let currentSortColumn = 1;
let currentSortType = 'number';
let currentSortOrder = 'asc';

function sortTable(column, type, refresh) {
	if (!refresh) {
		if (column === currentSortColumn) {
			currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			currentSortColumn = column;
			currentSortOrder = 'asc';
			currentSortType = type;
		}
	}

	const tables = entriesContainer().querySelectorAll('table');
	for (const table of tables) {
		const tbody = table.querySelector('tbody');
		const rows = Array.from(tbody.querySelectorAll('tr'));

		rows.sort((a, b) => {
			let aValue = a.children[column];
			let bValue = b.children[column];

			if (type === 'checkbox') {
				aValue = aValue.firstChild.checked;
				bValue = bValue.firstChild.checked;

				return bValue - aValue;
			} else {
				aValue = aValue.textContent;
				bValue = bValue.textContent;
			}

			if (type === 'string' || type === 'email') {
				return aValue.localeCompare(bValue);
			} else if (type === 'number') {
				return aValue - bValue;
			} else {
				return new Date(aValue) - new Date(bValue);
			}
		});

		if (currentSortOrder === 'desc') {
			rows.reverse();
		}

		tbody.innerHTML = '';
		for (const row of rows) tbody.appendChild(row);

		const ths = table.firstChild.firstChild.children;
		for (const th of ths) th.classList.remove('sorted-asc', 'sorted-desc');

		ths[column].classList.add(`sorted-${currentSortOrder}`);
	}
}

let selectedCounter = [0, 0, 0]; //? for tracking the current number of selected items
//? don't want to use arrays; would invalidate the below but could cause selecting
//? to feel sluggish for very large datasets/selections
function setSelectedCounter(checked, tab, refresh) {
	tab ??= currentRegistryTab();
	checked ??= selectedCounter[tab];

	if (typeof checked === 'number') selectedCounter[tab] = checked;
	else checked ? selectedCounter[tab]++ : selectedCounter[tab]--;

	console.log(selectedCounter[tab]);
	if (selectedCounter[tab] === 1) {
		entriesContainer().classList.add('only-one-selected');
	} else {
		entriesContainer().classList.remove('only-one-selected');
	}

	if (!refresh) selectedCacheInvalid = true;
}

function getRows(tab) {
	return entriesContainer().querySelectorAll(
		`article:nth-of-type(${tab + 1}) tbody tr`
	);
}

function __getSelected(tab) {
	const selected = [];
	const rows = getRows(tab);

	for (const row of rows) {
		if (row.firstChild.firstChild.checked)
			selected.push(row.children[1].firstChild.data); //? children[1] == id column, firstChild == input
	}

	return selected;
}
function _getSelected(all = false) {
	if (all)
		return [
			__getSelected(TAB_REGISTERED),
			__getSelected(TAB_CANCELED),
			__getSelected(TAB_DELETED),
		];

	return __getSelected(currentRegistryTab());
}
function getSelected(all = false) {
	selectedCache = _getSelected(true);
	selectedCacheInvalid = false;

	if (all) return selectedCache;
	return selectedCache[currentRegistryTab()];
}

function _setSelected(ids, tab) {
	const rows = getRows(tab);

	for (const row of rows) {
		if (ids.includes(Number(row.children[1].firstChild.data)))
			row.firstChild.firstChild.click();
	}
}
function setSelected(ids, acrossTabs = false) {
	selectedCacheInvalid = true;

	if (acrossTabs) {
		_setSelected(ids, TAB_REGISTERED);
		_setSelected(ids, TAB_CANCELED);
		_setSelected(ids, TAB_DELETED);
	} else _setSelected(ids, currentRegistryTab());
}

function _deselectSelected(tab) {
	const rows = getRows(tab);

	for (const row of rows) row.firstChild.firstChild.checked = false; //? firstChild == select column, firstChild == input

	setSelectedCounter(0, tab);
}
function deselectSelected(all = false) {
	if (all) {
		_deselectSelected(TAB_REGISTERED);
		_deselectSelected(TAB_CANCELED);
		_deselectSelected(TAB_DELETED);
	} else _deselectSelected(currentRegistryTab());
}

//== CSV STUFF ==---------------------------------------------------------------------

function downloadCSVFile() {
	CSVFile = new Blob([entriesAsCSV], { type: 'text/csv' });

	let temp_link = document.createElement('a');

	temp_link.download = 'friars.csv';
	let url = window.URL.createObjectURL(CSVFile);
	temp_link.href = url;

	temp_link.style.display = 'none';
	document.body.appendChild(temp_link);

	temp_link.click();
	document.body.removeChild(temp_link);
}

//== EMAIL STUFF ==-------------------------------------------------------------------

const emailSingletons = {
	'emails-container': undefined,
	'refresh-emails': undefined,
	'new-email': undefined,
};
const getEmailSingleton = (name) => () =>
	emailSingletons[name] ??
	(emailSingletons[name] = document.getElementById(name));

const emailsContainer = getEmailSingleton('emails-container');
const emailsRefresher = getEmailSingleton('refresh-emails');
const newEmail = getEmailSingleton('new-email');

function refreshEmails() {
	for (const name in emailSingletons) emailSingletons[name] = undefined;
}

//== SCROLL STUFF ==------------------------------------------------------------------

let mainScroll;
function handleScroll(event) {
	if (
		event.target === document.documentElement ||
		event.target === document.body
	) {
		event.preventDefault();
		mainScroll.scrollTop += event.deltaY;
	}
}

window.addEventListener('load', () => {
	refreshTabs();

	mainScroll = document.getElementById('app').firstChild;

	document.documentElement.addEventListener('wheel', handleScroll, {
		passive: false,
	});
	document.body.addEventListener('wheel', handleScroll, { passive: false });
});
