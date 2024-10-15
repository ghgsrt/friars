export function Tab({
	title,
	children,
}: {
	title: string;
	children: JSX.Element;
}) {
	return [title, children] as unknown as JSX.Element;
}

type TabGroupAsRow =
	| {
			row: boolean;
	  }
	| { row?: never };

export async function TabGroup({
	id,
	title,
	children,
	row,
	selected,
}: {
	id: string;
	title?: string;
	children: JSX.Element[];
	selected?: number;
} & TabGroupAsRow) {
	const _children: [string, JSX.Element][] = (
		Array.isArray(children[0]) ? children : [children]
	) as [string, JSX.Element][];

	selected ??= 0;

	return (
		<section
			class={`tab-group ${row && 'row'}`}
			data-title={title ?? ''}
			hx-swap='innerHTML'
		>
			<summary id={`tab-${id}-header`} class='tab-header' role='tablist'>
				{_children.map(([title], i) => (
					<button
						data-title={title}
						class={`tab ${i === selected ? 'selected' : ''}`}
						onclick={`selectTab(${id}, ${i});`}
						role='tab'
						safe
					>
						{title}
					</button>
				))}
			</summary>
			{/* <br /> */}
			{_children.map(([title, child], i) => (
				<article
					data-title={title}
					class={`tab-content ${i === selected ? 'selected' : ''}`}
					role='tabpanel'
					hx-swap='innerHTML'
				>
					{child as 'safe'}
				</article>
			))}
		</section>
	);
}
