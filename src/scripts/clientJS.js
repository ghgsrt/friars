const _stripe = Stripe(
	'pk_test_51Q9WEGJiEyN7wcKPcqjnvIyDWIbPwJfC5PqFw6Jei1YYGOV08ErwDTXlWXgJO4CS1LeB00AhhJ0kRkEOM7blrhSF00SzPeEeFG'
);

let checkout;
async function initializeCheckout(caller, clientSecret) {
	if (checkout) await checkout.destroy();

	checkout = await _stripe.initEmbeddedCheckout({
		clientSecret,
	});

	caller.innerText = 'Checkout';
	caller.classList.remove('loading');
	caller.parentElement.parentElement.lastChild.classList.add('show');

	checkout.mount('#checkout');
}

function setFormError(res) {
	const [type, msg] = res.split(':');
	if (type === 'fn') this.getElementById('firstNameError').innerText = msg;
}
