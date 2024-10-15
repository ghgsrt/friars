import Html from '@kitajs/html';
import { redirect } from 'elysia';
import { EntriesView } from './views/Entries';
import { EmailView } from './views/Email';

export function Index(props: { children: JSX.Element }) {
	return (
		<>
			{'<!DOCTYPE html>'}
			<html lang='en'>
				<head>
					<meta charset='UTF-8' />
					<link rel='icon' href='' />
					<meta
						name='viewport'
						content='width=device-width, initial-scale=1.0'
					/>
					<title>Friars Admin</title>
					<link href={'/admin/styles.css'} rel='stylesheet' />
					<link href={'/reset.css'} rel='stylesheet' />

					<script src={'/admin/clientJS.js'}></script>

					<script
						src='https://unpkg.com/htmx.org@2.0.1'
						integrity='sha384-QWGpdj554B4ETpJJC9z+ZHJcA/i59TyjxEPXiiUgN2WmTyV5OEZWCD6gQhgkdpB/'
						crossorigin='anonymous'
					></script>
				</head>
				<body>
					<div id='app'>{props.children as 'safe'}</div>
					<div
						id='modal-container'
						hx-on:htmx-after-request='handleModalResponse(event.detail.xhr.responseText);'
					>
						<div id='modal'></div>
					</div>
					<div id='portal'></div>
				</body>
			</html>
		</>
	);
}

export function Header() {
	return <></>;
}

export function Footer() {
	return <></>;
}

export function HomeView() {
	return (
		<Index>
			<div>
				<Header />
				<main class='home'>
					<div
						class='box'
						hx-on:htmx-after-swap='refreshTabs(); refreshEntries();'
					>
						<EntriesView />
					</div>
					<br />
					<div
						class='box'
						hx-on:htmx-after-swap='refreshTabs(); refreshEmails();'
					>
						<EmailView />
					</div>
				</main>
				<Footer />
			</div>
		</Index>
	);
}
