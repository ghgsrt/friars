import Elysia, { t } from 'elysia';

type ModalActions = {
	onConfirm: (() => void) | ((body: Parameters<Elysia['post']>[1]) => void);
	onCancel: (() => void) | ((body: Parameters<Elysia['delete']>[1]) => void);
};
const modalActions: Record<string, ModalActions | undefined> = {};

export const modal = (app: Elysia) =>
	app.guard({ cookie: t.Object({ userId: t.String() }) }, (app) =>
		app
			.post('/modal', (context) =>
				modalActions[context.cookie.userId.value]!.onConfirm(context)
			)
			.delete('/modal', (context) =>
				modalActions[context.cookie.userId.value]!.onCancel(context)
			)
	);

export default function Modal({
	uid,
	message,
	warning,
	alert,
	error,
	customPost,
	onConfirm,
	onCancel,
	noCancel,
	confirmBtnText,
	target,
	children,
}: {
	uid: string;
	message: string;
	warning?: string;
	alert?: string;
	error?: string;
	customPost?: string;
	onConfirm: ModalActions['onConfirm'];
	onCancel?: ModalActions['onCancel'];
	noCancel?: boolean;
	confirmBtnText?: string;
	target?: string;
	children?: JSX.Element;
}) {
	modalActions[uid] = {
		onConfirm: onConfirm,
		onCancel: onCancel ?? (() => {}),
	};

	return (
		<>
			<div role='oob-slave'></div>
			<div
				id='modal'
				class={`${warning ? 'warning' : ''} ${alert ? 'alert' : ''} ${
					error ? 'modal-error' : ''
				}`}
				hx-swap-oob='true'
			>
				<script>{`setTimeout(() => { const input = document.getElementById('modal').querySelector('input'); input?.focus(); })`}</script>
				<div class='messages'>
					<h2 safe>{message}</h2>
					{!!warning && (
						<small class='warning' safe>
							{warning}
						</small>
					)}
					{!!alert && (
						<small class='alert' safe>
							alert: {alert}
						</small>
					)}
				</div>
				<form
					hx-post={customPost ?? `/modal`}
					hx-trigger='submit'
					hx-target={target}
					hx-on:htmx-after-request="if (event.detail.successful) document.getElementById('modal').replaceChildren();"
				>
					{children as 'safe'}
					{error && <small class='modal-error'>error: {error}</small>}
					<div
						class='buttons'
						// style={{ marginTop: error ? '0.25rem' : '1.5rem' }}
					>
						<button type='submit'>
							{(confirmBtnText ?? 'Confirm') as 'safe'}
						</button>
						{!noCancel && <button hx-delete='/modal'>Cancel</button>}
					</div>
				</form>
			</div>
		</>
	);
}
