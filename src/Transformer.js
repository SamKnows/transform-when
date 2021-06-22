import { each, useTransformAttr, setData, getData, UNCHANGED } from './util';
import callFn from './call-fn';

// This is where active transformers are stored
export const transformers = [];

/**
 * This is the Transformer constructor, called by the user when creating a new
 * transformer object. It is given an array of objects containing transforms.
 *
 * See the README.md file for more.
 *
 * @param {Array} transforms Array of transforms.
 * @constructor
 */
export default function Transformer(transforms) {
	this.i = 0;
	this.transforms = Array.isArray(transforms) ? transforms : [transforms];
	this.visible = undefined;

	this._last = {};
	this._actions = {};
	this._customVariables = {};

	this.start();
}

// Selector to get scroll position from. On the prototype so we can set globally
Transformer.prototype.scrollElement = 'window';
Transformer.prototype.iIncrease = {
	belowOptimal: 'count',
	aboveOptimal: 'time',
	optimalFps: 60,
};

/**
 * Stop the transformer from running
 */
Transformer.prototype.stop = function stopTransforms() {
	this.active = false;
	if (transformers.includes(this)) {
		transformers.splice(transformers.indexOf(this), 1);
	}
};

/**
 * Start the transformer again if it was stopped.
 */
Transformer.prototype.start = function startTransforms() {
	this.active = true;
	if (!transformers.includes(this)) {
		transformers.push(this);
	}
};

/**
 * Stop the transformer and reset some values like visibility and transforms to
 * their original values.
 */
Transformer.prototype.reset = function resetTransforms() {
	this.stop();

	for (let transform of this.transforms) {
		if (transform.transforms) {
			each(transform.el, (el) => {
				if (useTransformAttr(el)) {
					el.setAttribute('transform', getData(el, 'originalTransform'));
				} else {
					el.style.transform = getData(el, 'originalTransform');
				}
			});
		}

		if (transform.visible || this.visible) {
			each(transform.el, (el) => {
				el.style.display = getData(el, 'originalDisplay');
			});
		}

		// @todo: should styles be unset?
		// if (transform.styles) {
		// 	for (let [ style, fn, unit = '' ] of transform.styles) {
		// 		each(transform.el, (el) => {
		// 			el.style[style] = '';
		// 		});
		// 	}
		// }

		// @todo: should attrs be unset?
		// if (transform.attrs) {
		// 	for (let [ attr, fn, unit = '' ] of transform.attrs) {
		// 		each(transform.el, (el) => el.removeAttribute(attr));
		// 	}
		// }
	}
};

/**
 * Set the y scroll positions the transforms are active between. Similar to the
 * visible property of a transform, but on the entire transformer.
 *
 * @param {[number, number]} visible Min and max y scroll value active at.
 */
Transformer.prototype.setVisible = function setGlobalVisible(visible) {
	this.visible = visible;
};

Transformer.prototype.trigger = function triggerAction(name, duration) {
	let resolveFn;
	let promise;
	if (typeof window.Promise === 'function') {
		promise = new Promise((resolve) => {
			resolveFn = resolve;
		});
	}

	this._actions[name] = {
		triggered: Date.now(),
		resolveFn,
		duration
	};

	return promise;
};

/**
 * Adds a custom variable that can be used in transformer functions.
 *
 * @param {string} name The name to use for the variables
 * @param {function} getter The function to call to get the variable value.
 */
Transformer.prototype.addVariable = function addCustomVar(name, getter) {
	this._customVariables[name] = getter;
};

/**
 * The first function called on requestAnimationFrame. This one calculates the
 * properties to change and what to change them to, but doesn't apply the
 * changes to the DOM. Do not do anything to invalidate the DOM in this
 * function!
 *
 * Separating this process into two parts means that we can call functions that
 * forces styles to be recalculated / a layout in our transform calculation
 * functions without layout thrashing.
 *
 * @private
 */
Transformer.prototype._setup = function setupFrame(vars) {
	if (!this.active) {
		return;
	}

	const actions = {};

	for (const name of Object.keys(this._actions)) {
		const action = this._actions[name];
		const percent = 1 / action.duration * (Date.now() - action.triggered);
		actions[name] = Math.min(percent, 1);
	}

	for (let transform of this.transforms) {
		if (this.i === 0) {
			// This is where data to be put into the DOM is stored until ._frame()
			transform._stagedData = { styles: {}, attrs: {}, props: {} };

			// This is where data from the last run is kept so it can be compared for changes
			transform._lastData = { styles: {}, attrs: {}, props: {} };

			// Has to run before visible check
			if (transform.transforms) {
				each(transform.el, (el) => {
					if (useTransformAttr(el)) {
						setData(el, 'originalTransform', (el.getAttribute('transform') || '') + ' ');
					} else {
						const original = el.style.transform;
						setData(el, 'originalTransform', !original || original === 'none' ? '' : `${original} `);
					}
				});
			}
		}

		if (transform.visible || this.visible) {
			let isHidden = true;
			if (this.visible) {
				isHidden = vars.y < this.visible[0] || vars.y > this.visible[1];
			}

			if (isHidden && transform.visible) {
				isHidden = vars.y < transform.visible[0] || vars.y > transform.visible[1];
			}

			transform._stagedData.isHidden = isHidden;

			if (isHidden) {
				continue;
			}
		} else {
			transform._stagedData.isHidden = undefined;
		}

		const args = Object.assign({
			actions, actionEnded: this._actionEnded, i: this.i, last: this._last
		}, vars);

		if (transform.transforms) {
			let transforms = transform.transforms
				.map(([ prop, fn, unit = '' ]) => [prop, callFn('transforms', prop, fn, transform, unit, args)]);

			let changed = transforms.some((transform) => transform[1] !== UNCHANGED);

			if (changed && transform._lastData.transforms) {
				changed = transforms.some((innerTransform, i) => {
					return innerTransform[1] !== transform._lastData.transforms[i][1];
				});
			}

			if (changed) {
				transforms.forEach((innerTransform, i) => {
					if (innerTransform[1] === UNCHANGED) {
						innerTransform[1] = transform._lastData.transforms[i][1];
					}
				});
			} else {
				transforms = UNCHANGED;
			}

			transform._stagedData.transforms = transforms;

			if (transforms !== UNCHANGED) {
				transform._lastData.transforms = transforms;
			}
		}

		if (transform.styles) {
			for (let [ style, fn, unit = '' ] of transform.styles) {
				let value = callFn('styles', style, fn, transform, unit, args);

				if (value === transform._lastData.styles[style]) {
					value = UNCHANGED;
				}

				transform._stagedData.styles[style] = value;

				if (value !== UNCHANGED) {
					transform._lastData.styles[style] = value;
				}
			}
		}

		if (transform.attrs) {
			for (let [ attr, fn, unit = '' ] of transform.attrs) {
				let value = callFn('attrs', attr, fn, transform, unit, args);

				if (value === transform._lastData.attrs[attr]) {
					value = UNCHANGED;
				}

				transform._stagedData.attrs[attr] = value;

				if (value !== UNCHANGED) {
					transform._lastData.attrs[attr] = value;
				}
			}
		}

		if (transform.properties) {
			for (let [ prop, fn, unit = '' ] of transform.properties) {
				let value = callFn('props', prop, fn, transform, unit, args);

				if (value === transform._lastData.props[prop]) {
					value = UNCHANGED;
				}

				transform._stagedData.props[prop] = value;

				if (value !== UNCHANGED) {
					transform._lastData.props[prop] = value;
				}
			}
		}
	}

	if (this._actionEnded) {
		this._actionEnded = false;
	}

	// Delete afterwards to ensure that callFn is called once when action === 1
	for (const name of Object.keys(this._actions)) {
		if (actions[name] === 1) {
			if (this._actions[name].resolveFn) {
				this._actions[name].resolveFn();
			}

			this._actionEnded = true;

			delete this._actions[name];
		}
	}
};

/**
 * The second function called on requestAnimationFrame. By now, all the
 * properties to be changed should have been called, so this function just
 * iterates through and sets them. Don't call the `callFn` function here or do
 * anything that could cause the style to be recalculated.
 *
 * Here's a list of things not to do: https://gist.github.com/paulirish/5d52fb081b3570c81e3a
 *
 * @private
 */
Transformer.prototype._frame = function transformFrame(vars) {
	if (!this.active) {
		return;
	}

	for (let transform of this.transforms) {
		if (transform._stagedData.isHidden) {
			each(transform.el, (el) => {
				if (typeof getData(el, 'originalDisplay') === 'undefined') {
					setData(el, 'originalDisplay', el.style.display || '');
				}

				el.style.display = 'none';
			});

			continue;
		} else {
			each(transform.el, (el) => {
				el.style.display = getData(el, 'originalDisplay');
			});
		}

		if (transform.transforms) {
			let transforms = transform._stagedData.transforms;

			if (transforms !== UNCHANGED) {
				transforms = transforms.map(([ key, value ]) => `${key}(${value})`).join(' ');

				each(transform.el, (el) => {
					if (useTransformAttr(el)) {
						el.setAttribute('transform', getData(el, 'originalTransform') + transforms);
					} else {
						el.style.transform = getData(el, 'originalTransform') + transforms;
					}
				});
			}
		}

		if (transform.styles) {
			for (let [ style ] of transform.styles) {
				const computed = transform._stagedData.styles[style];

				if (computed === UNCHANGED) {
					continue;
				}

				each(transform.el, (el) => {
					if (Array.isArray(style)) {
						style.forEach((style) => {
							el.style[style] = computed;
						});
					} else {
						el.style[style] = computed;
					}
				});
			}
		}

		if (transform.attrs) {
			for (let [ attr ] of transform.attrs) {
				const computed = transform._stagedData.attrs[attr];

				if (computed === UNCHANGED) {
					continue;
				}

				each(transform.el, (el) => {
					if (Array.isArray(attr)) {
						attr.forEach((attr) => {
							el.setAttribute(attr, computed);
						});
					} else {
						el.setAttribute(attr, computed);
					}
				});
			}
		}

		if (transform.properties) {
			for (let [ prop ] of transform.properties) {
				const computed = transform._stagedData.props[prop];

				if (computed === UNCHANGED) {
					continue;
				}

				each(transform.el, (el) => {
					if (Array.isArray(prop)) {
						prop.forEach((attr) => {
							el.style.setProperty(attr, computed);
						});
					} else {
						el.style.setProperty(prop, computed);
					}
				});
			}
		}
	}

	const currentTime = window.performance ? performance.now() : Date.now();
	const deltaTime = currentTime - this._lastTime;

	const increaseBy = {
		count: 1,
		time: deltaTime / (1000 / this.iIncrease.optimalFps),
	};

	if (!this._lastTime) {
		this.i++;
	} else if (deltaTime > 1000 / this.iIncrease.optimalFps) {
		this.i += increaseBy[this.iIncrease.belowOptimal];
	} else {
		this.i += increaseBy[this.iIncrease.aboveOptimal];
	}

	this._last = vars;
	this._lastTime = currentTime;
};