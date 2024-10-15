import { Entry } from '../api/database/schema';

export function RegisterFormControls({ entry }: { entry?: Entry }) {
	return (
		<>
			<label for='firstName'>
				<span>First Name</span>
				<span id='first-name-error'></span>
			</label>
			<input
				id='firstName'
				name='firstName'
				value={entry?.firstName}
				placeholder=''
				required
			/>
			<label for='lastName'>Last Name</label>
			<input id='lastName' name='lastName' value={entry?.lastName ?? ''} />
			<label for='email'>
				<span>Email</span>
				<span id='email-error'></span>
			</label>
			<input
				id='email'
				name='email'
				type='email'
				value={entry?.email}
				placeholder=''
				required
			/>
			<br />
			<button
				disabled={!!entry?.event1}
				onclick='this.lastChild.checked = !this.lastChild.checked; event.preventDefault(); event.stopPropagation();'
			>
				Event 1 ($10)
				<input
					name='event1'
					role='value-slave'
					type='checkbox'
					checked={!!entry?.event1}
				/>
			</button>
			<button
				disabled={!!entry?.event2}
				onclick='this.lastChild.checked = !this.lastChild.checked; event.preventDefault(); event.stopPropagation();'
			>
				Event 2 ($20)
				<input
					name='event2'
					role='value-slave'
					type='checkbox'
					checked={!!entry?.event2}
				/>
			</button>
			<button
				disabled={!!entry?.event3}
				onclick='this.lastChild.checked = !this.lastChild.checked; event.preventDefault(); event.stopPropagation();'
			>
				Event 3 ($30)
				<input
					name='event3'
					role='value-slave'
					type='checkbox'
					checked={!!entry?.event3}
				/>
			</button>
		</>
	);
}

export function RegisterForm() {
	return (
		<div id='register'>
			<form
				id='register-form'
				hx-post='/register'
				hx-target='main'
				hx-swap='innerHTML'
				hx-on:htmx-before-request='clearFormError();'
				hx-on:htmx-after-request='setFormError(event.detail.xhr.responseText);'
			>
				<h2>Register</h2>
				<RegisterFormControls />
				<br />
				<p id='generic-error'></p>
				<button
					id='checkout-btn'
					onclick="this.innerText = 'Loading...'; this.classList.add('loading'); event.preventDefault(); event.stopPropagation();"
					hx-post='/stripe/create-checkout-session'
					hx-trigger='click'
					hx-swap='none'
					hx-on:htmx-after-request='this.parentElement.parentElement.lastChild.lastChild.innerHTML = ""; const res = event.detail.xhr.responseText; if (res.includes(":")) endLoading(this); else initializeCheckout(this, res);'
				>
					Checkout
				</button>
				<button id='register-btn' type='submit'>
					Register
				</button>
			</form>
			<div>
				<button
					class='back'
					onclick="this.parentElement.classList.remove('show')"
				>
					back
				</button>
				<div id='checkout'></div>
			</div>
		</div>
	);
}
