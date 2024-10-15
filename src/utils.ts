export function parseTimestamp(
	isoDate: string,
	today: string,
	yesterday: string
) {
	const timestamp = new Date(isoDate);

	const date = timestamp.toLocaleDateString();
	const time = timestamp.toLocaleTimeString().split(':');
	const suffix = time.pop()!.split(' ')[1];

	return {
		group: date,
		date:
			date === today
				? 'Today at '
				: date === yesterday
				? 'Yesterday at '
				: date
						.split('/')
						.map((piece) => piece.padStart(2, '0').slice(-2))
						.join('/')
						,
		time: `${time.join(':')} ${suffix}`,
	};
}

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export function toPrettyDate(date: string) {
	const pieces = date.split('/');
	return `${months[Number(pieces[0]) - 1]} ${pieces[1]}, ${pieces[2]}`;
}

export function padRandom(
	str: string,
	maxLength: number,
	fillChoices: (string | number)[]
) {
	for (let i = str.length; i < maxLength; i++) {
		str += fillChoices[Math.random() * fillChoices.length];
	}

	return str;
}

function getType(obj: any) {
	var type = typeof obj;

	if (type !== 'object') return type; // primitive or function
	if (Array.isArray(obj)) return 'array';
	if (obj === null) return 'null'; // null

	// Everything else, check for a constructor
	var ctor = obj.constructor;
	var name = typeof ctor === 'function' && ctor.name;

	return typeof name === 'string' && name.length > 0 ? name : 'object';
}

export function defaultVal(type: any) {
	if (typeof type !== 'string') type = getType(type);

	// Handle simple types (primitives and plain function/object)
	switch (type) {
		case 'bigint':
			return BigInt(0);
		case 'boolean':
			return false;
		case 'function':
			return function () {};
		case 'null':
			return null;
		case 'number':
			return 0;
		case 'array':
			return [];
		case 'object':
			return {};
		case 'string':
			return '';
		case 'symbol':
			return Symbol();
		case 'undefined':
			return void 0;
	}

	try {
		// Look for constructor in this or current scope
		//@ts-ignore
		var ctor = typeof this[type] === 'function' ? this[type] : eval(type);

		return new ctor();

		// Constructor not found, return new object
	} catch (e) {
		return {};
	}
}

export const deepClone = (obj: {}) => JSON.parse(JSON.stringify(obj));

// slow for very large objects
export const clearObject = (obj: {}): {} => {
	for (const key in obj) delete obj[key as keyof typeof obj];
	return obj;
};

export const replaceKeyOrdered = <
	O extends {},
	F extends keyof O,
	T extends string
>(
	obj: O,
	from: F,
	to: T
) => {
	const entries = Object.entries(obj);

	const newObj: Record<string, any> = {};
	for (const [key, value] of entries) {
		if (key === from) newObj[to] = value;
		else newObj[key] = value;
	}

	clearObject(obj);
	Object.assign(obj, newObj);

	return obj as {
		[K in keyof O as K extends F ? T : K]: O[K];
	};
};

export function escape(str: undefined): undefined;
export function escape(str: string): string;
export function escape(str?: string) {
	return str?.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

export const removeFromArray = <A extends any[]>(item: A, value: A[number]) => {
	const idx = item.findIndex(equals(value));
	if (idx === -1) return false;

	item.splice(idx, 1);
	return true;
};

export const byName =
	(name: string) =>
	(item: { name: string } | { settings: { displayName: string } }) =>
		((item as any).name ?? (item as any).settings.displayName) === name;
export const byId = (id: string) => (item: { id: string }) => item.id === id;
export const byReserved = (id: string) => (item: { reserved: string }) =>
	item.reserved === id;
export const equals =
	<T>(value1: T) =>
	(value2: T) =>
		value1 === value2;
export const notEquals =
	<T>(value1: T) =>
	(value2: T) =>
		value1 !== value2;

export type DateComponents = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
};

export function dateStringToComponents(date: string): DateComponents {
	// yyyy-mm-ddThh:mm
	return {
		year: parseInt(date.slice(0, 4)),
		month: parseInt(date.slice(5, 7)),
		day: parseInt(date.slice(8, 10)),
		hour: parseInt(date.slice(11, 13)),
		minute: parseInt(date.slice(14, 16)),
	};
}
export function compareDateComponents(
	date1: DateComponents,
	date2: DateComponents
) {
	if (date1.year < date2.year) return true;
	if (date1.year > date2.year) return false;

	if (date1.month < date2.month) return true;
	if (date1.month > date2.month) return false;

	if (date1.day < date2.day) return true;
	if (date1.day > date2.day) return false;

	if (date1.hour < date2.hour) return true;
	if (date1.hour > date2.hour) return false;

	if (date1.minute <= date2.minute) return true;

	return false;
}
