import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown, getMixedArray, mixedArrayHTML, serializeHtml } from '../_util/helpers';

/** @jsx h */

describe('component', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('Component construction', () => {

		/** @type {object} */
		let PROPS;

		beforeEach(() => {
			PROPS = { foo: 'bar', onBaz: () => {} };
		});

		it('should render functional components', () => {
			const C3 = sinon.spy( props => <div {...props} /> );

			render(<C3 {...PROPS} />, scratch);

			expect(C3)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: 'div',
					props: PROPS
				}));

			expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
		});
	});

	it('should render string', () => {
		function StringComponent() {
			return 'Hi there';
		}

		render(<StringComponent />, scratch);
		expect(scratch.innerHTML).to.equal('Hi there');
	});

	it('should render number as string', () => {
		function NumberComponent() {
			return 42;
		}

		render(<NumberComponent />, scratch);
		expect(scratch.innerHTML).to.equal('42');
	});

	it('should render null as empty string', () => {
		function NullComponent() {
			return null;
		}

		render(<NullComponent />, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	// Test for Issue #73
	it('should remove orphaned elements replaced by Components', () => {
		function Comp() {
			return <span>span in a component</span>;
		}

		let root;
		function test(content) {
			root = render(content, scratch, root);
		}

		test(<Comp />);
		test(<div>just a div</div>);
		test(<Comp />);

		expect(scratch.innerHTML).to.equal('<span>span in a component</span>');
	});

	describe('array children', () => {
		it('should render DOM element\'s array children', () => {
			render(<div>{getMixedArray()}</div>, scratch);
			expect(scratch.firstChild.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render Component\'s array children', () => {
			const Foo = () => getMixedArray();

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render Fragment\'s array children', () => {
			const Foo = () => (
				<Fragment>
					{getMixedArray()}
				</Fragment>
			);

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render sibling array children', () => {
			const Todo = () => (
				<ul>
					<li>A header</li>
					{['a','b'].map(value => <li>{value}</li>)}
					<li>A divider</li>
					{['c', 'd'].map(value => <li>{value}</li>)}
					<li>A footer</li>
				</ul>
			);

			render(<Todo />, scratch);

			let ul = scratch.firstChild;
			expect(ul.childNodes.length).to.equal(7);
			expect(ul.childNodes[0].textContent).to.equal('A header');
			expect(ul.childNodes[1].textContent).to.equal('a');
			expect(ul.childNodes[2].textContent).to.equal('b');
			expect(ul.childNodes[3].textContent).to.equal('A divider');
			expect(ul.childNodes[4].textContent).to.equal('c');
			expect(ul.childNodes[5].textContent).to.equal('d');
			expect(ul.childNodes[6].textContent).to.equal('A footer');
		});
	});

	describe('High-Order Components', () => {
		it('should render nested functional components', () => {
			const PROPS = { foo: 'bar', onBaz: () => {} };

			const Outer = sinon.spy(
				props => <Inner {...props} />
			);

			const Inner = sinon.spy(
				props => <div {...props}>inner</div>
			);

			render(<Outer {...PROPS} />, scratch);


			expect(Outer)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: Inner,
					props: PROPS
				}));

			expect(Inner)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: 'div',
					props: { ...PROPS, children: 'inner' }
				}));

			expect(scratch.innerHTML).to.equal('<div foo="bar">inner</div>');
		});
	});
});
