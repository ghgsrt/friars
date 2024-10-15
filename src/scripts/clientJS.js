let _stripe;

async function initializeStripe() {
	const res = await fetch('/stripe/pk');
	if (!res.ok) {
		console.error('Error retrieving stripe public key...\n', res);
		return;
	}

	const stripePK = await res.text();

	_stripe = Stripe(stripePK);
}
initializeStripe();

let checkout;
async function initializeCheckout(caller, clientSecret) {
	if (!_stripe) {
		console.error('Stripe not initialized...');
		return;
	}

	if (checkout) await checkout.destroy();

	checkout = await _stripe.initEmbeddedCheckout({
		clientSecret,
	});

	endLoading(caller);
	caller.parentElement.parentElement.lastChild.classList.add('show');

	checkout.mount('#checkout');
}

function endLoading(caller) {
	caller.innerText = 'Checkout';
	caller.classList.remove('loading');
}

function setFormError(res) {
	const [type, msg] = res.split(':');
	if (type === 'fn')
		document.getElementById('first-name-error').innerText = msg;
	else if (type === 'em')
		document.getElementById('email-error').innerText = msg;
	else if (msg) document.getElementById('generic-error').innerText = msg;
}

function clearFormError() {
	document.getElementById('first-name-error').innerText = '';
	document.getElementById('email-error').innerText = '';
	document.getElementById('generic-error').innerText = '';
}
