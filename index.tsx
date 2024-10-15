import { randomUUID } from 'crypto';
import { html } from '@elysiajs/html';
import Elysia, { Cookie, redirect, t } from 'elysia';
import Modal, { modal } from './src/components/Modal';
import { Home, HomeView, Index, Login, LoginView } from './src/AdminIndex';
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
import { EmailForm, NewEmail, EmailLists } from './src/views/Email';
import { EntriesView } from './src/views/Entries';
import { ProcessingView, RegisterView, ReturnView } from './src/RegIndex';
import { createCheckoutSession, webhooks } from './src/api/stripe/stripe';
import { Processing } from './src/views/Processing';
import { Ticket } from './src/views/Ticket';
import { Return } from './src/views/Return';
import { RegisterForm, RegisterFormControls } from './src/views/Register';
import { jwt } from '@elysiajs/jwt';

const ADMIN_USERNAME = import.meta.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD;
const JWT_SECRET = import.meta.env.JWT_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
	throw new Error('Missing required environment variables');
}

export const login: (body: any) => Promise<boolean> = async ({
	body,
	cookie,
	jwt,
}) => {
	const { username, password } = body as {
		username: string;
		password: string;
	};

	console.log(password, username, ADMIN_PASSWORD, ADMIN_USERNAME);

	if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
		return false;
	}

	const token = await jwt.sign({ username });

	cookie.auth.value = token;
	cookie.auth.httpOnly = true;
	cookie.auth.secure = import.meta.env.NODE_ENV === 'production';
	cookie.auth.maxAge = 7 * 24 * 60 * 60; // 1 week;

	return true;
};

const app = new Elysia()
	.use(html())
	.use(modal)
	.use(
		jwt({
			name: 'jwt',
			secret: JWT_SECRET,
		})
	)

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
			.get('/pk', () => import.meta.env.STRIPE_PK)
			.post('/create-checkout-session', ({ body }) => {
				const email = (body as any).email as string;
				const [name, host] = email.split('@');
				if (!name || !host) return 'em:Invalid email';
				const [dom, ext] = host.split('.');
				if (!dom || !ext) return 'em:Invalid email';

				return createCheckoutSession(body as EntryPostRequest);
			})
			.post('/webhooks', webhooks)
	)

	.get('/admin/styles.css', () => Bun.file('./src/styles/adminStyles.css'))
	.get('/admin/clientJS.js', () => Bun.file('./src/scripts/adminJS.js'))

	.get('/admin', async ({ cookie, jwt }) => {
		if (!cookie.userId.value) {
			cookie.userId.value = randomUUID();
			cookie.userId.httpOnly = true;
			cookie.userId.secure = true;
			cookie.userId.sameSite = 'lax';
			cookie.userId.expires = new Date(Date.now() + 86400000 * 31);
		}

		if (!cookie.auth.value) return <LoginView />;
		if (!(await jwt.verify(cookie.auth.value))) return <LoginView />;

		return <HomeView />;
	})

	.get('/admin/login', async ({ cookie, jwt }) => {
		if (!cookie.userId.value) return redirect('/admin');
		if (await jwt.verify(cookie.auth.value)) return <HomeView />;
		return <Login uid={cookie.userId.value} />;
	})
	.post('/admin/login', login)
	.get('/admin/logout', ({ cookie }) => {
		cookie.auth.value = '';
		cookie.auth.expires = new Date(Date.now() - 100000);
		console.log('hm');
		return redirect('/admin');
	})

	.group('/admin', (app) =>
		app
			.guard({
				cookie: t.Object({ userId: t.String(), auth: t.String() }),
			})
			.onBeforeHandle(({ cookie, jwt, set }) => {
				if (!jwt.verify(cookie.auth.value))
					return (set.status = 'Unauthorized');
			})

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
