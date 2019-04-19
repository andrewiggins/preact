import { diff, commitRoot } from './diff/index';
import options from './options';

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let q = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb) => void}
 */
const defer = typeof Promise=='function' ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistenly reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (!c._dirty && (c._dirty = true) && q.push(c) === 1) {
		(options.debounceRendering || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
function process() {
	let p;
	q.sort((a, b) => b._depth - a._depth);
	while ((p=q.pop())) {
		// forceUpdate's callback argument is reused here to indicate a non-forced update.
		if (p._dirty) {
			let vnode = p._vnode, dom = p._vnode._dom, parentDom = p._parentDom;
			if (parentDom) {
				let mounts = [];
				dom = diff(dom, parentDom, vnode, vnode, p._context, parentDom.ownerSVGElement!==undefined, null, mounts, p._ancestorComponent, false, dom);
				if (dom!=null && dom.parentNode!==parentDom) {
					parentDom.appendChild(dom);
				}
				commitRoot(mounts, vnode);
			}
		}
	}
}
