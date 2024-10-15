import Html from '@kitajs/html';
import { RegisterForm } from './views/Register';
import { Processing } from './views/Processing';
import { Entry } from './api/database/schema';
import { Return } from './views/Return';

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
					<title>Friars Registration</title>
					<link href={'/styles.css'} rel='stylesheet' />
					<link href={'/reset.css'} rel='stylesheet' />

					<script src='https://js.stripe.com/v3/'></script>
					<script src={'/clientJS.js'} defer></script>
					<script
						src='https://unpkg.com/htmx.org@2.0.1'
						integrity='sha384-QWGpdj554B4ETpJJC9z+ZHJcA/i59TyjxEPXiiUgN2WmTyV5OEZWCD6gQhgkdpB/'
						crossorigin='anonymous'
					></script>
				</head>
				<body>
					<div id='app'>
						<Header />
						<main class='home'>{props.children as 'safe'}</main>
						<Footer />
					</div>
					<div id='modal-container'>
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

export function RegisterView() {
	return (
		<Index>
			<>
				<RegisterForm />
			</>
		</Index>
	);
}

export function ReturnView({ entry }: { entry: Entry }) {
	return (
		<Index>
			<>
				<Return entry={entry} />;
			</>
		</Index>
	);
}

export function ProcessingView({ email }: { email: string }) {
	return (
		<Index>
			<>
				<Processing email={email} />
			</>
		</Index>
	);
}
