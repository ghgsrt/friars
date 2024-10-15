import stripe, { Stripe } from 'stripe';
import {
	EntryPostRequest,
	GetEntryByEmail,
	PostEntries,
} from '../entries/entry';
import Elysia from 'elysia';
import { GetHook, sendEmail } from '../emails/email';
import { Hook } from '../db/schema';

const line_items = [
	{
		price: 'price_1Q9WHzJiEyN7wcKPfRrnyVVP',
		quantity: 1,
	},
	{
		price: 'price_1Q9YD7JiEyN7wcKPn6o6wrgf',
		quantity: 1,
	},
	{
		price: 'price_1Q9YDKJiEyN7wcKPvcZI2D4B',
		quantity: 1,
	},
];

export async function createCheckoutSession(entryReq: EntryPostRequest) {
	const STRIPE = new stripe(process.env.STRIPE_SK!);

	const items: typeof line_items = [];

	//! prevent paying twice
	const existing = await GetEntryByEmail(entryReq.email);
	if (existing) {
		if (existing.event1) entryReq.event1 = false;
		if (existing.event2) entryReq.event2 = false;
		if (existing.event3) entryReq.event3 = false;
	}

	if (entryReq.event1) items.push(line_items[0]);
	if (entryReq.event2) items.push(line_items[1]);
	if (entryReq.event3) items.push(line_items[2]);

	const session = await STRIPE.checkout.sessions.create({
		ui_mode: 'embedded',
		line_items: items,
		mode: 'payment',
		return_url: `${process.env.URL}/return/${entryReq.email}`,
		customer_email: entryReq.email,
		payment_intent_data: {
			metadata: {
				entry: JSON.stringify(entryReq),
			},
		},
	});

	return session.client_secret;
}

export async function sessionStatus(sessionId: string) {
	const STRIPE = new stripe(process.env.STRIPE_SK!);

	const session = await STRIPE.checkout.sessions.retrieve(sessionId);

	return {
		status: session.status,
		customer_email: session.customer_details?.email,
	};
}

export const webhooks: Parameters<Elysia['post']>[1] = async ({
	request,
	set,
}) => {
	const sig = request.headers.get('stripe-signature');

	if (!sig) {
		set.status = 400;
		return { error: 'No Stripe signature found' };
	}

	try {
		const body = await request.text();
		const event = await stripe.webhooks.constructEventAsync(
			body,
			sig,
			process.env.STRIPE_WEBHOOK!
		);

		switch (event.type) {
			case 'payment_intent.succeeded':
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				const entry = await onPaymentSuccess(paymentIntent);
				if (!entry) {
					console.error('oh gosh');
					break;
				}

				const afterRegistrationEmail = await GetHook(Hook.AfterRegistration);

				await sendEmail(afterRegistrationEmail, entry);

				break;
			// ... handle other event types
			default:
				console.log(`Unhandled event type ${event.type}`);
		}

		return { received: true };
	} catch (err) {
		console.error(err);
		set.status = 400;
		return { error: `Webhook Error: ${(err as any).message}` };
	}
};

async function onPaymentSuccess(intent: Stripe.PaymentIntent) {
	const entry = intent.metadata.entry;
	console.log(entry);

	if (!entry) console.error('damn');

	return (await PostEntries([JSON.parse(entry)] as EntryPostRequest[]))[0];
}
