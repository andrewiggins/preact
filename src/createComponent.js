import { assign } from './util';

// TODO: Import
/** @type {typeof import('../hooks').useLayoutEffect} */
const useLayoutEffect = () => {};

/**
 * @param {import('./internal').VNode} newVNode
 * @param {import('./internal').VNode} oldVNode
 * @param {any} cctx
 */
export function createComponent(newVNode, oldVNode, cctx) {
	// TODO: newVNode, oldVNode are diff every time...

	/** @type {import('./internal').Component} */
	let c;
	let newType = newVNode.type
	let newProps = newVNode.props, isNew, oldProps, oldState, snapshot;

	if (oldVNode._component) {
		c = newVNode._component = oldVNode._component;
		// clearProcessingException = c._processingException = c._pendingError;
	}
	else {
		c = newVNode._component = new newType(newProps, cctx);
	}

	// if (provider) provider.sub(c);

	c.props = newProps;
	if (!c.state) c.state = {};
	c.context = cctx;
	c._context = context;
	isNew = c._dirty = true;
	c._renderCallbacks = [];

	return () => {
		if (c._nextState==null) {
			c._nextState = c.state;
		}

		if (newType.getDerivedStateFromProps!=null) {
			assign(c._nextState==c.state ? (c._nextState = assign({}, c._nextState)) : c._nextState, newType.getDerivedStateFromProps(newProps, c._nextState));
		}

		if (isNew) {
			if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
			// if (c.componentDidMount!=null) mounts.push(c); // modeled using useLayoutEffect
		}
		else {
			if (newType.getDerivedStateFromProps==null && c._force==null && c.componentWillReceiveProps!=null) {
				c.componentWillReceiveProps(newProps, cctx);
			}

			// TODO: shouldComponentUpdate

			if (c.componentWillUpdate!=null) {
				c.componentWillUpdate(newProps, c._nextState, cctx);
			}
		}


		if (c.componentDidMount!=null) {
			useLayoutEffect(() => {
				c.componentDidMount();
			}, []);
		}


		oldProps = c.props;
		oldState = c.state;

		c.context = cctx;
		c.props = newProps;
		c.state = c._nextState;

		// if (tmp = options._render) tmp(newVNode);

		// c._dirty = false;
		// c._vnode = newVNode;
		// c._parentDom = parentDom;

		// tmp = c.render(c.props, c.state, c.context);
		// let isTopLevelFragment = tmp != null && tmp.type == Fragment && tmp.key == null;
		// newVNode._children = toChildArray(isTopLevelFragment ? tmp.props.children : tmp);

		const renderResult = c.render(c.props, c.state, c.context);

		if (c.getChildContext!=null) {
			context = assign(assign({}, context), c.getChildContext());
		}

		if (!isNew && c.getSnapshotBeforeUpdate!=null) {
			snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
		}

		// diffChildren(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, oldDom, isHydrating);

		// TODO: Fix
		// c.base = newVNode._dom;

		// TODO: Convert to layoutEffects
		// while (tmp=c._renderCallbacks.pop()) {
		// 	if (c._nextState) { c.state = c._nextState; }
		// 	tmp.call(c);
		// }

		if (c.componentDidUpdate != null) {
			useLayoutEffect(() => {
				if (!isNew && oldProps!=null) {
					c.componentDidUpdate(oldProps, oldState, snapshot);
				}
			});
		}

		return renderResult;
	};
}
