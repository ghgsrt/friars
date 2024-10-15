import { randomUUID } from 'crypto';
import { html } from '@elysiajs/html';
import Elysia, { redirect, t } from 'elysia';
import Modal, { modal } from './src/components/Modal';
import { HomeView, Index } from './src/AdminIndex';
import {
	CancelEmail,
	DeleteEmail,
	EmailPatchRequest,
	EmailPostRequest,
	GetEmail,
	listenForEmails,
	PatchEmail,
	PostEmail,
	ReviveEmail,
} from './src/api/emails/email';
import {
	CancelEntries,
	DeleteEntries,
	EntryPatchRequest,
	EntryPostRequest,
	GetEntry,
	GetEntryByEmail,
	PatchEntry,
	PostEntries,
	ReviveEntries,
} from './src/api/entries/entry';
import { EmailView, EmailForm, NewEmail, EmailLists } from './src/views/Email';
import { EntriesView } from './src/views/Entries';
import { ProcessingView, RegisterView, ReturnView } from './src/RegIndex';
import { createCheckoutSession, webhooks } from './src/api/stripe/stripe';
import { Processing } from './src/views/Processing';
import { Ticket } from './src/views/Ticket';
import { Return } from './src/views/Return';
import { RegisterForm, RegisterFormControls } from './src/views/Register';

let app = new Elysia()
	.use(html())
	.use(modal)

	.get('/reset.css', () => Bun.file('./src/styles/reset.css'))
	.get('/styles.css', () => Bun.file('./src/styles/styles.css'))
	.get('/clientJS.js', () => Bun.file('./src/scripts/clientJS.js'))

	.get('/', () => <RegisterView />)
	.get('/return/:email', async ({ params }) => {
		const entry = await GetEntryByEmail(params.email);

		if (!entry) return <ProcessingView email={params.email} />;

		return <ReturnView entry={entry} />;
	})

	.get('/ticket/:email', async ({ params, query, set }) => {
		const entry = await GetEntryByEmail(params.email);

		if (!entry) {
			if (query['after-payment']) return <Processing email={params.email} />;

			return (set.status = 404);
		}

		if (query['after-payment']) return <Return entry={entry} />;

		return <Ticket entry={entry} />;
	})

	.get('/register', () => <RegisterForm />)
	.post('/register', async ({ body }) => {
		if (!(body as any).firstName) return 'fn:This field is required';
		if (!(body as any).email) return 'em:This field is required';
		(body as any).event1 = undefined;
		(body as any).event2 = undefined;
		(body as any).event3 = undefined;

		const entry = (await PostEntries([body] as EntryPostRequest[]))[0];

		return <Return entry={entry} />;
	})

	.group('/stripe', (app) =>
		app
			.post('/create-checkout-session', ({ body }) =>
				createCheckoutSession(body as EntryPostRequest)
			)
			.post('/webhooks', webhooks)
	)

	.group('/admin', (app) =>
		app
			.get('/', ({ cookie }) => {
				cookie.userId.value ??= randomUUID();
				cookie.userId.httpOnly = true;
				cookie.userId.secure = true;
				cookie.userId.sameSite = 'lax';
				cookie.userId.expires = new Date(Date.now() + 86400000 * 31);

				return <HomeView />;
			})

			.guard({
				cookie: t.Object({ userId: t.String() }),
			})

			.get('/styles.css', () => Bun.file('./src/styles/adminStyles.css'))
			.get('/clientJS.js', () => Bun.file('./src/scripts/adminJS.js'))

			.post('/entries-view', ({ body }) => {
				return (
					<EntriesView
						selectedTab={Number((body as any)?.tabState)}
						selectedEntries={JSON.parse((body as any)?.selected)}
					/>
				);
			})
			.post('/email-lists', ({ body }) => {
				const tabState = JSON.parse((body as any)?.tabState);
				return <EmailLists selectedTabs={tabState} />;
			})

			.group('/email', (app) =>
				app
					.post('/', ({ body, cookie, set }) => {
						if (!(body as any).subject) return (set.status = 'Bad Request');
						if (!(body as any).content) return (set.status = 'Bad Request');

						return (
							<Modal
								uid={cookie.userId.value}
								message='Create Email'
								onConfirm={() => {
									PostEmail(body as EmailPostRequest);
									return 'refresh:emails;replace:emailEditor:new';
								}}
							/>
						);
					})

					.get('/new', () => <NewEmail />)
					.post('/close-edit', ({ cookie }) => (
						<Modal
							uid={cookie.userId.value}
							message='Cancel Edit'
							warning='Any unsaved progress will be lost'
							onConfirm={() => {
								return 'replace:emailEditor:new';
							}}
						/>
					))

					.group('/:id', (app) =>
						app
							.derive({ as: 'local' }, ({ params }) => ({
								id: Number(params.id),
							}))
							.get('/', ({ id }) => GetEmail(id))
							.delete('/', ({ id }) => DeleteEmail(id))
							.post('/cancel', ({ id, cookie }) => (
								<Modal
									uid={cookie.userId.value}
									message='Cancel Email?'
									onConfirm={() => {
										CancelEmail(id);
										return 'refresh:emails';
									}}
								/>
							))
							.patch('/', ({ id, body, cookie }) => (
								<Modal
									uid={cookie.userId.value}
									message='Update Email'
									warning='this action cannot be undone'
									onConfirm={() => {
										PatchEmail(id, body as EmailPatchRequest);
										return 'refresh:emails;replace:emailEditor:new';
									}}
								/>
							))
							.post('/revive', ({ id, body, cookie }) => (
								<Modal
									uid={cookie.userId.value}
									message='Move Email to Outgoing?'
									onConfirm={() => {
										ReviveEmail(id, body as EmailPatchRequest);
										return 'refresh:emails';
									}}
								/>
							))

							.get('/edit', async ({ id }) => (
								<EmailForm
									action='patch'
									endpoint={`/admin/email/${id}`}
									email={await GetEmail(id)}
								/>
							))
					)
			)

			.group('/entry', (app) =>
				app
					.post('/', ({ body }) => {
						if (!(body as any).firstName) return;
						if (!(body as any).email) return;

						PostEntries(body as EntryPostRequest[]);
					})
					.delete('/', ({ body }) =>
						DeleteEntries(JSON.parse((body as any).ids) as number[])
					)
					.patch('/', async ({ body, cookie }) => {
						const id = Number((body as any).id);

						const entry = await GetEntry(id);

						return (
							<Modal
								uid={cookie.userId.value}
								message='Update Entry'
								warning='You cannot remove paid items that are set to true'
								alert='this action cannot be undone (yet)'
								onConfirm={({ body }: any) => {
									PatchEntry(id, body as EntryPatchRequest);

									return 'refresh:entries';
								}}
							>
								<RegisterFormControls entry={entry} />
							</Modal>
						);
					})
					.post('/cancel', ({ body }) => {
						CancelEntries(JSON.parse((body as any).ids) as number[]);
					})
					.post('/revive', ({ body }) =>
						ReviveEntries(JSON.parse((body as any).ids) as number[])
					)
					.group('/:id', (app) =>
						app
							.derive({ as: 'local' }, ({ params }) => ({
								id: Number(params.id),
							}))
							.get('/', ({ id }) => GetEntry(id))
							.patch('/', ({ id, body }) =>
								PatchEntry(id, body as EntryPatchRequest)
							)
							.delete('/', ({ id }) => DeleteEntries([id]))
							.post('/cancel', ({ id }) => CancelEntries([id]))
							.post('/revive', ({ id }) => ReviveEntries([id]))
					)
			)
	)
	.listen(3005);

listenForEmails();
