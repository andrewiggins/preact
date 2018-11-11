import { h, render } from '../../src/preact';
import { setupScratch, teardown, logCall, clearLog, getLog } from '../_util/helpers';
import { ul, li } from '../_util/dom';

/** @jsx h */

function hydrate(vnode, parentDom) {
	return render(vnode, parentDom, parentDom.firstChild);
}

describe.only('render()', () => {
	let scratch;

	const List = ({ children }) => <ul>{children}</ul>;
	const ListItem = ({ children }) => <li>{children}</li>;

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'remove');
		logCall(Element.prototype, 'setAttribute');
	});

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	it('should reuse existing DOM', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<ul>
				<li>1</li>
				<li>2</li>
				<li>3</li>
			</ul>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal({});
	});

	it('should reuse existing DOM when given components', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal({});
	});

	it('should add missing nodes to existing DOM when hydrating', () => {
		const html = ul([
			li('1')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(ul([
			li('1'),
			li('2'),
			li('3')
		].join('')));
		expect(getLog()).to.deep.equal({
			'<li>.appendChild(#text)': 2,
			'<ul>1.appendChild(<li>2)': 1,
			'<ul>12.appendChild(<li>3)': 1
		});
	});

	it('should ignore extra nodes from existing DOM when hydrating', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3'),
			li('4')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(ul([
			li('1'),
			li('2'),
			li('3')
		].join('')));
		expect(getLog()).to.deep.equal({});
	});

	it('should update attributes on existing DOM', () => {
		scratch.innerHTML = '<div><span doesnt-exist="test" class="foo" different-value="a">Test</span></div>';
		let vnode = <div><span class="foo" different-value="b">Test</span></div>;

		clearLog();
		hydrate(vnode, scratch);

		expect(scratch.innerHTML).to.equal('<div><span class="foo" different-value="b">Test</span></div>');
		expect(getLog()).to.deep.equal({
			'<span>Test.setAttribute(String, String)': 1
		});
	});
});
