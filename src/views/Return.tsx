import { Entry } from '../api/database/schema';

export function Return({ entry }: { entry: Entry }) {
	return (
		<>
			<button
				class='back'
				hx-get='/register'
				hx-trigger='click'
				hx-target='main'
				hx-swap='innerHTML'
			>
				back
			</button>
			<h1>TICKET GOES HERE</h1>
			<p>Registration was successful, hombre</p>
			<p>
				<strong>Registration ID: </strong>
				{entry.id}
			</p>
			<p>You should receive an email with a copy of your ticket.</p>
		</>
	);
}
