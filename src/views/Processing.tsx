export function Processing({ email }: { email: string }) {
	return (
		<div
			id='processing'
			hx-get={`/ticket/${email}?after-payment=true`}
			hx-trigger='load delay:0.2s'
			hx-swap='outerHTML'
			hx-target='this'
		>
			<h2>Processing Registration...</h2>
			<p>This may take a minute</p>
		</div>
	);
}
