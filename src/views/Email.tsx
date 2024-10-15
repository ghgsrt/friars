import { getAllEmails } from '../api/db/db';
import { Email } from '../api/db/schema';
import { processTemplate } from '../api/emails/email';
import { Tab, TabGroup } from '../components/Tabs';
import { DeleteIcon, EditIcon, RefreshIcon } from '../icons/icon';
import { parseTimestamp } from '../utils';

export type EmailStatus = 'sent' | 'errored' | 'pending';
export type EmailTo = 'everyone' | 'registered' | 'canceled';
type ScheduledEmailType = 'outgoing' | 'sent' | 'canceled' | 'failed';
type AutomatedEmailType = 'hook' | 'component';

function EmailContentWrapper({ children }: { children: JSX.Element }) {
	return <div class='email-wrapper'>{children}</div>;
}

const toOptions = ['everyone', 'registered', 'canceled', 'selected'];

const now = () => new Date().toISOString().slice(0, -8);

export function EmailForm({
	action,
	endpoint,
	email,
}: {
	action: 'post' | 'patch';
	endpoint: string;
	email?: Email;
}) {
	const toSelected = !Number.isNaN(parseInt(email?.to!));

	return (
		<>
			<form
				id='email-editor'
				hx-post={action === 'post' ? endpoint : undefined}
				hx-patch={action === 'patch' ? endpoint : undefined}
				// hx-swap={email ? 'none' : 'outerHTML'}
				hx-swap='none'
				hx-on:htmx-config-request="if (event.detail.parameters.to === 'selected') event.detail.parameters.to = getSelected().toString();"
			>
				<input
					id='new-email'
					role='new-slave'
					hx-get='/admin/email/new'
					hx-trigger='click'
					hx-target='#email-editor'
					hx-swap='outerHTML'
				/>
				{toSelected && (
					<script>{`deselectSelected(true); setSelected([${
						email!.to
					}], true)`}</script>
				)}
				<span class='email-form-header flex between'>
					<span class='flex align-center'>
						<h2>
							{email
								? `Edit ${
										email.status === 'hook'
											? 'Hook'
											: email.status === 'component'
											? 'Component'
											: 'Email'
								  }${email.name ? `: ${email.name}` : ''}`
								: 'New Email'}
						</h2>
						&emsp;
					</span>
					{email && (
						<span
							title='Close Edit'
							style={{
								cursor: 'pointer',
							}}
							hx-post='/admin/email/close-edit'
							hx-target='#email-editor'
							hx-swap='none'
						>
							X
						</span>
					)}
				</span>
				<div class='flex between'>
					{(email === undefined ||
						(email.status !== 'hook' && email.status !== 'component')) && (
						<label class='email-to-label'>
							To:
							{toOptions.map((option) => (
								<button onclick='this.lastChild.checked = true; event.preventDefault(); event.stopPropagation();'>
									{(option[0].toUpperCase() + option.slice(1)) as 'safe'}
									<input
										role='value-slave'
										type='radio'
										value={option}
										checked={
											option ===
											(email
												? toSelected
													? 'selected'
													: email.to
												: 'registered')
										}
										name='to'
									/>
								</button>
							))}
						</label>
					)}
					{(email === undefined ||
						(email.status !== 'hook' && email.status !== 'component')) && (
						<label class='email-when-label'>
							Send&nbsp;At:
							<input
								type='datetime-local'
								name='sendDate'
								min={now()}
								value={email ? email.sendDate! : undefined}
							/>
						</label>
					)}
					<button type='submit'>Save</button>
				</div>
				{(email === undefined || email.subject) && (
					<label>
						Subject:
						<input name='subject' value={email ? email.subject! : undefined} />
					</label>
				)}
				{/* <label> */}
				<textarea name='content'>{email ? email.content : undefined}</textarea>
				{/* </label> */}
			</form>
		</>
	);
}

export function NewEmail() {
	return <EmailForm action='post' endpoint='/admin/email' />;
}

export async function EmailItem({
	email,
	type,
	meta,
}: {
	email: Email;
	type: AutomatedEmailType | ScheduledEmailType;
	meta: Record<string, any>;
}) {
	const t = email.sendDate
		? parseTimestamp(email.sendDate, meta.today, meta.yesterday)
		: undefined;

	let timestamp: string;
	if (!t) timestamp = '';
	else timestamp = t.date === 'te' ? 'immediate' : t.date + ' ' + t.time;

	return (
		<details class='email-item'>
			<summary>
				{type === 'outgoing' && (
					<span
						title='Cancel'
						class='email-item-icon outgoing'
						hx-post={`/admin/email/${email.id}/cancel`}
						hx-trigger='click'
						hx-swap='none'
						onclick='event.stopPropagation(); event.preventDefault();'
						// hx-on:htmx-after-request="document.getElementById('refresh-emails').click();"
					>
						<DeleteIcon />
					</span>
				)}
				{(type === 'canceled' || type === 'failed') && (
					<span
						title='Revive'
						class='email-item-icon revivable'
						hx-post={`/admin/email/${email.id}/revive`}
						hx-trigger='click'
						hx-swap='none'
						onclick='event.stopPropagation(); event.preventDefault();'

						// hx-on:htmx-after-request="document.getElementById('refresh-emails').click();"
					>
						<RefreshIcon />
					</span>
				)}
				<span class='email-item-subject'>{email.name ?? email.subject}</span>
				<span class='email-item-sendDate'>{timestamp as 'safe'}</span>
				{type !== 'sent' && (
					<span
						title='Edit'
						class='email-item-edit'
						hx-get={`/admin/email/${email.id}/edit`}
						hx-trigger='click'
						hx-target='#email-editor'
						hx-swap='outerHTML'
						onclick='event.stopPropagation(); event.preventDefault();'
					>
						<EditIcon />
					</span>
				)}
			</summary>
			<div class='email-item-preview'>
				{email.name ? (
					<>
						<div>{email.subject}</div>
						<br />
						<div>{(await processTemplate(email.content)) as 'safe'}</div>
					</>
				) : (
					((await processTemplate(email.content)) as 'safe')
				)}
			</div>
		</details>
	);
}

export function EmailList({
	emails,
	type,
	meta,
}: {
	emails: Email[];
	type: AutomatedEmailType | ScheduledEmailType;
	meta: Record<string, any>;
}) {
	return (
		<EmailContentWrapper>
			<div class='email-list'>
				{emails.map((email) => (
					<EmailItem email={email} type={type} meta={meta} />
				))}
			</div>
		</EmailContentWrapper>
	);
}

export async function EmailLists({
	selectedTabs,
}: {
	selectedTabs?: [number, number];
}) {
	const _emails = await getAllEmails();

	const emails: {
		automated: Record<AutomatedEmailType, Email[]>;
		scheduled: Record<ScheduledEmailType, Email[]>;
	} = {
		automated: {
			hook: [],
			component: [],
		},
		scheduled: { outgoing: [], sent: [], failed: [], canceled: [] },
	};

	for (const email of _emails) {
		if (email.canceledAt) emails.scheduled.canceled.push(email);
		else if (email.status === 'hook') emails.automated.hook.push(email);
		else if (email.status === 'component')
			emails.automated.component.push(email);
		else if (email.status === 'errored') emails.scheduled.failed.push(email);
		else if (email.status === 'pending') emails.scheduled.outgoing.push(email);
		else emails.scheduled.sent.push(email);
	}

	const _today = new Date();
	const _yesterday = new Date(_today.getDate() - 1);
	const today = _today.toLocaleDateString();
	const yesterday = _yesterday.toLocaleDateString();
	const meta = {
		today,
		yesterday,
	};

	return (
		<div id='email-lists'>
			<TabGroup id='1' title='email-components' selected={selectedTabs?.[0]}>
				{Object.entries(emails.automated).map(([key, emails]) => (
					<Tab title={key[0].toUpperCase() + key.slice(1)}>
						<EmailList
							emails={emails}
							type={key as AutomatedEmailType}
							meta={meta}
						/>
					</Tab>
				))}
			</TabGroup>
			<div class='flex column'>
				<span
					id='refresh-emails'
					title='Manually Refresh Emails'
					class='self-end big bad'
					hx-post='/admin/email-lists'
					hx-target='#email-lists'
					hx-trigger='click'
					hx-swap='outerHTML'
					hx-on:htmx-config-request='event.detail.parameters.tabState = JSON.stringify([tabState[TAB_GROUP_AUTOMATED_EMAILS], tabState[TAB_GROUP_SCHEDULED_EMAILS]]);'
				>
					<RefreshIcon />
				</span>
				<TabGroup id='2' title='email' selected={selectedTabs?.[1]} row>
					{Object.entries(emails.scheduled).map(([key, emails]) => (
						<Tab title={key[0].toUpperCase() + key.slice(1)}>
							<EmailList
								emails={emails}
								type={key as ScheduledEmailType}
								meta={meta}
							/>
						</Tab>
					))}
				</TabGroup>
			</div>
		</div>
	);
}

export async function EmailView({
	selectedTabs,
}: {
	selectedTabs?: [number, number];
}) {
	return (
		<div id='email-container'>
			<NewEmail />
			<span class='flex between'>
				<span class='flex align-center'>{/* <h2>Emails</h2> */}</span>
			</span>
			<EmailLists selectedTabs={selectedTabs} />
		</div>
	);
}
