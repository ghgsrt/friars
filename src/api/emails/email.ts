import { EmailTo } from '../../views/Email';
import type { Request } from '../../types/types';
import {
	cancelEmail,
	deleteEmail,
	getAllEmails,
	getAllEntries,
	getEmail,
	getHook,
	insertEmail,
	reviveEmail,
	updateEmail,
} from '../db/db';
import { Email, Entry, Hook } from '../db/schema';
import {
	SendBulkTemplatedEmailCommand,
	SendBulkTemplatedEmailCommandInput,
	SendTemplatedEmailCommand,
	SendTemplatedEmailCommandInput,
	SESClient,
} from '@aws-sdk/client-ses';
import { dateStringToComponents, compareDateComponents } from '../../utils';
// import { sesClient } from './aws';

export async function GetHook(name: Hook) {
	return await getHook(name);
}

export async function sendEmail(email: Email, entry: Entry) {
	if (!email || !entry) return;

	const sesClient = new SESClient({
		region: process.env.AWS_REGION!,
		credentials: {
			accessKeyId: process.env.AWS_AK!,
			secretAccessKey: process.env.AWS_AK_SECRET!,
		},
	});

	const params: SendTemplatedEmailCommandInput = {
		Source: process.env.VERIFIED_EMAIL,
		Template: 'GenericTemplate',
		ConfigurationSetName: 'Email',
		Destination: { ToAddresses: [entry.email] },
		TemplateData: JSON.stringify({
			subject: await processTemplate(email.subject!, entry),
			htmlBody: await processTemplate(email.content, entry),
			textBody: 'Sorry! Please enable HTML to view this email properly.',
		}),
	};

	try {
		const command = new SendTemplatedEmailCommand(params);
		const response = await sesClient.send(command);

		if (email.status !== 'hook') updateEmail(email.id, { status: 'sent' });

		console.log('Email sent successfully:', response.$metadata);
		return response.$metadata;
	} catch (error) {
		if (email.status !== 'hook') updateEmail(email.id, { status: 'failed' });

		console.error('Error sending email:', error);
		throw error;
	} finally {
		sesClient.destroy();
	}
}

async function _sendBulkEmail(email: Email, entries: Entry[]) {
	if (entries.length === 0) return;

	const sesClient = new SESClient({
		region: process.env.AWS_REGION!,
		credentials: {
			accessKeyId: process.env.AWS_AK!,
			secretAccessKey: process.env.AWS_AK_SECRET!,
		},
	});

	const params: SendBulkTemplatedEmailCommandInput = {
		Source: process.env.VERIFIED_EMAIL,
		Template: 'GenericTemplate',
		ConfigurationSetName: 'Email',
		Destinations: await Promise.all(
			entries.map(async (entry) => ({
				Destination: { ToAddresses: [entry.email] },
				ReplacementTemplateData: JSON.stringify({
					subject: await processTemplate(email.subject!, entry),
					htmlBody: await processTemplate(email.content, entry),
				}),
			}))
		),
		DefaultTemplateData: JSON.stringify({
			subject: 'Error',
			htmlBody: 'Error',
			textBody: 'Sorry! Please enable HTML to view this email properly.',
		}),
	};

	try {
		const command = new SendBulkTemplatedEmailCommand(params);
		const response = await sesClient.send(command);

		if (email.status !== 'hook') updateEmail(email.id, { status: 'sent' });

		console.log('Bulk emails sent successfully:', response.Status);
		return response.Status;
	} catch (error) {
		if (email.status !== 'hook') updateEmail(email.id, { status: 'failed' });

		console.error('Error sending bulk emails:', error);
		throw error;
	} finally {
		sesClient.destroy();
	}
}

async function sendBulkEmail(email: Email, entries: Entries) {
	let to: Entry[] = [];
	if (entries[email.to as EmailTo]) to = entries[email.to as EmailTo];
	else {
		const temp = email.to!.split(',').map(Number);
		for (const id of temp) {
			const entry = entries.everyone.find((_entry) => _entry.id === id);
			if (entry) to.push(entry);
		}
	}

	_sendBulkEmail(email, to);
}

type Entries = {
	everyone: Entry[];
	registered: Entry[];
	canceled: Entry[];
};
async function getEntryEmails(): Promise<Entries> {
	const entries = (await getAllEntries()).filter((entry) => !entry.deletedAt);

	const everyone: Entry[] = [];
	const registered: Entry[] = [];
	const canceled: Entry[] = [];

	for (const entry of entries) {
		everyone.push(entry);
		if (entry.canceledAt) canceled.push(entry);
		else registered.push(entry);
	}

	return {
		everyone,
		registered,
		canceled,
	};
}

async function flushEmails() {
	console.log('flushing emails...');

	const emails = await getAllEmails();
	const entries = await getEntryEmails();

	const now = dateStringToComponents(new Date().toISOString().slice(0, -8));

	for (const email of emails) {
		if (email.status !== 'pending') continue;

		if (!email.sendDate) {
			console.error('No send date provided on outgoing email!: ', email);
			continue;
		}
		if (!email.to) {
			console.error('No to provided on outgoing email!: ', email);
			continue;
		}
		if (!email.subject) {
			console.error('No subject provided on outgoing email!: ', email);
			continue;
		}

		if (
			email.sendDate === 'immediate' ||
			compareDateComponents(dateStringToComponents(email.sendDate!), now)
		)
			sendBulkEmail(email, entries);
	}
}

type ImmutableEmailProps =
	| 'id'
	| 'createdAt'
	| 'canceledAt'
	| 'status'
	| 'deletedAt';
type RequiredEmailProps = {
	subject: string;
	content: string;
	sendDate: string;
};
export type EmailPostRequest = Request<Email, RequiredEmailProps>;
export type EmailPatchRequest = Partial<Omit<Email, ImmutableEmailProps>>;

export function GetEmail(id: number) {
	return getEmail(id);
}

export function PostEmail(email: EmailPostRequest) {
	if (!email.sendDate) email.sendDate = 'immediate';
	email.status = 'pending';

	return insertEmail(email as Email);
}

export function PatchEmail(id: number, email: EmailPatchRequest) {
	return updateEmail(id, email);
}

export function CancelEmail(id: number) {
	return cancelEmail(id);
}

export function DeleteEmail(id: number) {
	return deleteEmail(id);
}

export function ReviveEmail(id: number, email: EmailPatchRequest) {
	return reviveEmail(id, email);
}
export function listenForEmails() {
	setInterval(flushEmails, 10000);
}

export async function processTemplate(template: string, entry?: Entry) {
	const components = (await getAllEmails()).filter(
		(email) => email.status === 'component'
	);

	let result = '';
	let tokenStart = -1;

	for (let i = 0; i < template.length; i++) {
		if (template[i] === '{' && template[i + 1] === '{') {
			tokenStart = i + 2;
			i++; // Skip the next '{'
		} else if (
			template[i] === '}' &&
			template[i + 1] === '}' &&
			tokenStart !== -1
		) {
			const token = template.slice(tokenStart, i);
			if (entry && token in entry) {
				result += entry[token as keyof Entry];
			} else {
				const component = components.find((comp) => comp.name === token);
				if (component)
					result += await processTemplate(component.content, entry);
				else result += '{{' + token + '}}';
			}
			tokenStart = -1;
			i++; // Skip the next '}'
		} else if (tokenStart === -1) {
			result += template[i];
		}
	}

	return result;
}
