import options from './options';
import { enqueueRender } from './component';
import { getHookState, currentComponent } from './diff';

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];

export function useState(initialState) {
	return useReducer(invokeOrReturn, initialState);
}

export function useReducer(reducer, initialState, init) {

	/** @type {import('./internal').ReducerHookState} */
	const hookState = getHookState();
	if (hookState._component == null) {
		hookState._component = currentComponent;

		hookState._value = [
			init == null ? invokeOrReturn(null, initialState) : init(initialState),

			action => {
				const nextValue = reducer(hookState._value[0], action);
				if (hookState._value[0]!==nextValue) {
					hookState._value[0] = nextValue;
					if (hookState._component._vnode) {
						enqueueRender(hookState._component)
					}
				}
			}
		];
	}

	return hookState._value;
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState();
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingEffects.push(state);
		afterPaint(currentComponent);
	}
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useLayoutEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState();
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;
		currentComponent.__hooks._pendingLayoutEffects.push(state);
	}
}

export function useRef(initialValue) {
	const state = getHookState();
	if (state._value == null) {
		state._value = { current: initialValue };
	}

	return state._value;
}

/**
 * @param {() => any} callback
 * @param {any[]} args
 */
export function useMemo(callback, args) {

	/** @type {import('./internal').MemoHookState} */
	const state = getHookState();
	if (argsChanged(state._args, args)) {
		state._args = args;
		state._callback = callback;
		return state._value = callback();
	}

	return state._value;
}

/**
 * @param {() => void} callback
 * @param {any[]} args
 */
export function useCallback(callback, args) {
	return useMemo(() => callback, args);
}

/**
 * @param {import('./internal').PreactContext} context
 */
export function useContext(context) {
	const provider = currentComponent.context[context._id];
	if (provider == null) return context._defaultValue;
	const state = getHookState();
	if (state._value == null) {
		state._value = true;
		provider.sub(currentComponent);
	}
	return provider._vnode.props.value;
}

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Invoke a component's pending effects after the next frame renders
 * @type {(component: import('./internal').Component) => void}
 */
let afterPaint = () => {};

/**
 * After paint effects consumer.
 */
function flushAfterPaintEffects() {
	afterPaintEffects.forEach(component => {
		component._afterPaintQueued = false;
		if (!component._parentDom) return;
		component.__hooks._pendingEffects = handleEffects(component.__hooks._pendingEffects);
	});
	afterPaintEffects = [];
}

function scheduleFlushAfterPaint() {
	setTimeout(flushAfterPaintEffects, 0);
}

if (typeof window !== 'undefined') {
	afterPaint = (component) => {
		if (!component._afterPaintQueued && (component._afterPaintQueued = true) && afterPaintEffects.push(component) === 1) {
			/* istanbul ignore next */
			if (options.requestAnimationFrame) {
				options.requestAnimationFrame(flushAfterPaintEffects);
			}
			else {
				requestAnimationFrame(scheduleFlushAfterPaint);
			}
		}
	};
}

export function handleEffects(effects) {
	effects.forEach(invokeCleanup);
	effects.forEach(invokeEffect);
	return [];
}

function invokeCleanup(hook) {
	if (hook._cleanup) hook._cleanup();
}

/**
 * Invoke a Hook's effect
 * @param {import('./internal').EffectHookState} hook
 */
function invokeEffect(hook) {
	const result = hook._value();
	if (typeof result === 'function') hook._cleanup = result;
}

function argsChanged(oldArgs, newArgs) {
	return oldArgs == null || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
