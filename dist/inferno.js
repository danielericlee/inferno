/*!
 * inferno v0.4.5
 * (c) 2016 Dominic Gannaway
 * Released under the MPL-2.0 License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  global.Inferno = factory();
}(this, function () { 'use strict';

  var babelHelpers = {};

  function babelHelpers_typeof (obj) {
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  function babelHelpers_classCallCheck (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var babelHelpers_createClass = (function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();

  var canUseDOM = !!(typeof window !== 'undefined' &&
  // Nwjs doesn't add document as a global in their node context, but does have it on window.document,
  // As a workaround, check if document is undefined
  typeof document !== 'undefined' && window.document.createElement);

  var ExecutionEnvironment = {
  	canUseDOM: canUseDOM,
  	canUseWorkers: typeof Worker !== 'undefined',
  	canUseEventListeners: canUseDOM && !!window.addEventListener,
  	canUseViewport: canUseDOM && !!window.screen,
  	canUseSymbol: typeof Symbol === 'function' && typeof Symbol['for'] === 'function'
  };

  function Storage(iterable) {
  	var _items = [];
  	var _keys = [];
  	var _values = [];

  	return Object.create(Storage.prototype, {

  		get: {
  			value: function value(key) {
  				var index = [].indexOf.call(_keys, key);
  				return _values[index] || undefined;
  			}
  		},
  		set: {
  			value: function value(key, _value) {
  				// check if key exists and overwrite

  				var index = [].indexOf.call(_keys, key);
  				if (index > -1) {
  					_items[index][1] = _value;
  					_values[index] = _value;
  				} else {
  					_items.push([key, _value]);
  					_keys.push(key);
  					_values.push(_value);
  				}
  			}
  		}
  	});
  }

  var isArray = (function (x) {
    return x.constructor === Array;
  })

  var isVoid = (function (x) {
    return x === null || x === undefined;
  })

  var ObjectTypes = {
  	VARIABLE: 1
  };

  function createVariable(index) {
  	return {
  		index: index,
  		type: ObjectTypes.VARIABLE
  	};
  }

  function scanTreeForDynamicNodes(node, nodeMap) {
  	var nodeIsDynamic = false;
  	var dynamicFlags = {
  		NODE: false,
  		TEXT: false,
  		ATTRS: false, // attrs can also be an object
  		CHILDREN: false,
  		KEY: false,
  		COMPONENTS: false
  	};

  	if (isVoid(node)) {
  		return false;
  	}

  	if (node.type === ObjectTypes.VARIABLE) {
  		nodeIsDynamic = true;
  		dynamicFlags.NODE = true;
  	} else {
  		if (!isVoid(node)) {
  			if (!isVoid(node.tag)) {
  				if (node.tag.type === ObjectTypes.VARIABLE) {
  					nodeIsDynamic = true;
  					dynamicFlags.COMPONENTS = true;
  				}
  			}
  			if (!isVoid(node.text)) {
  				if (node.text.type === ObjectTypes.VARIABLE) {
  					nodeIsDynamic = true;
  					dynamicFlags.TEXT = true;
  				}
  			}
  			if (!isVoid(node.attrs)) {
  				if (node.attrs.type === ObjectTypes.VARIABLE) {
  					nodeIsDynamic = true;
  					dynamicFlags.ATTRS = true;
  				} else {
  					for (var attr in node.attrs) {

  						var attrVal = node.attrs[attr];

  						if (!isVoid(attrVal) && attrVal.type === ObjectTypes.VARIABLE) {
  							if (attr === 'xmlns') {
  								throw Error('Inferno Error: The \'xmlns\' attribute cannot be dynamic. Please use static value for \'xmlns\' attribute instead.');
  							}
  							if (dynamicFlags.ATTRS === false) {
  								dynamicFlags.ATTRS = {};
  							}
  							dynamicFlags.ATTRS[attr] = attrVal.index;
  							nodeIsDynamic = true;
  						}
  					}
  				}
  			}
  			if (!isVoid(node.children)) {
  				if (node.children.type === ObjectTypes.VARIABLE) {
  					nodeIsDynamic = true;
  				} else {
  					if (isArray(node.children)) {
  						for (var i = 0; i < node.children.length; i++) {
  							var childItem = node.children[i];
  							var result = scanTreeForDynamicNodes(childItem, nodeMap);

  							if (result === true) {
  								nodeIsDynamic = true;
  								dynamicFlags.CHILDREN = true;
  							}
  						}
  					} else if ((typeof node === 'undefined' ? 'undefined' : babelHelpers_typeof(node)) === 'object') {
  						var result = scanTreeForDynamicNodes(node.children, nodeMap);

  						if (result === true) {
  							nodeIsDynamic = true;
  							dynamicFlags.CHILDREN = true;
  						}
  					}
  				}
  			}
  			if (!isVoid(node.key)) {
  				if (node.key.type === ObjectTypes.VARIABLE) {
  					nodeIsDynamic = true;
  					dynamicFlags.KEY = true;
  				}
  			}
  		}
  	}
  	if (nodeIsDynamic === true) {
  		nodeMap.set(node, dynamicFlags);
  	}
  	return nodeIsDynamic;
  }

  var uniqueId = Date.now();
  var treeConstructors = {};

  function createId() {
  	if (ExecutionEnvironment.canUseSymbol) {
  		return Symbol();
  	} else {
  		return uniqueId++;
  	}
  }

  function addTreeConstructor(name, treeConstructor) {
  	treeConstructors[name] = treeConstructor;
  }

  function applyTreeConstructors(schema, dynamicNodeMap) {
  	var tree = {};

  	for (var treeConstructor in treeConstructors) {
  		tree[treeConstructor] = treeConstructors[treeConstructor](schema, true, dynamicNodeMap);
  	}
  	return tree;
  }

  function createTemplate(callback) {

  	if (typeof callback === 'function') {
  		var construct = callback.construct || null;

  		if (isVoid(construct)) {
  			(function () {
  				var callbackLength = callback.length;
  				var callbackArguments = new Array(callbackLength);

  				for (var i = 0; i < callbackLength; i++) {
  					callbackArguments[i] = createVariable(i);
  				}
  				var schema = callback.apply(undefined, callbackArguments);
  				var dynamicNodeMap = new Storage();

  				scanTreeForDynamicNodes(schema, dynamicNodeMap);
  				var tree = applyTreeConstructors(schema, dynamicNodeMap);
  				var key = schema.key;
  				var keyIndex = key ? key.index : -1;

  				switch (callbackLength) {
  					case 0:
  						construct = function () {
  							return {
  								parent: null,
  								tree: tree,
  								id: createId(),
  								key: null,
  								nextItem: null,
  								rootNode: null
  							};
  						};
  						break;
  					case 1:
  						construct = function (v0) {
  							var key = undefined;

  							if (keyIndex === 0) {
  								key = v0;
  							}
  							return {
  								parent: null,
  								tree: tree,
  								id: createId(),
  								key: key,
  								nextItem: null,
  								rootNode: null,
  								v0: v0
  							};
  						};
  						break;
  					case 2:
  						construct = function (v0, v1) {
  							var key = undefined;

  							if (keyIndex === 0) {
  								key = v0;
  							} else if (keyIndex === 1) {
  								key = v1;
  							}
  							return {
  								parent: null,
  								tree: tree,
  								id: createId(),
  								key: key,
  								nextItem: null,
  								rootNode: null,
  								v0: v0,
  								v1: v1
  							};
  						};
  						break;
  					default:
  						construct = function (v0, v1) {
  							for (var _len = arguments.length, values = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
  								values[_key - 2] = arguments[_key];
  							}

  							var key = undefined;

  							if (keyIndex === 0) {
  								key = v0;
  							} else if (keyIndex === 1) {
  								key = v1;
  							} else if (keyIndex > 1) {
  								key = values[keyIndex];
  							}
  							return {
  								parent: null,
  								tree: tree,
  								id: createId(),
  								key: key,
  								nextItem: null,
  								rootNode: null,
  								v0: v0,
  								v1: v1,
  								values: values
  							};
  						};
  						break;
  				}
  				if (!isVoid(construct)) {
  					callback.construct = construct;
  				}
  			})();
  		}

  		return construct;
  	}
  }

  function createElement(tag, attrs) {
  	if (tag) {
  		var vNode = {
  			tag: tag
  		};

  		if (attrs) {
  			if (attrs.key !== undefined) {
  				vNode.key = attrs.key;
  				delete attrs.key;
  			}
  			vNode.attrs = attrs;
  		}

  		for (var _len = arguments.length, children = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
  			children[_key - 2] = arguments[_key];
  		}

  		if (children.length) {
  			vNode.children = children;
  		}

  		return vNode;
  	} else {
  		return {
  			text: tag
  		};
  	}
  }

  var TemplateFactory = {
  	createElement: createElement
  };

  var noop = (function () {})

  // Server side workaround
  var requestAnimationFrame = noop;
  var cancelAnimationFrame = noop;

  if (ExecutionEnvironment.canUseDOM) {
  	(function () {

  		var lastTime = 0;

  		var nativeRequestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;

  		var nativeCancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.mozCancelAnimationFrame;

  		requestAnimationFrame = nativeRequestAnimationFrame || function (callback) {
  			var currTime = Date.now();
  			var timeDelay = Math.max(0, 16 - (currTime - lastTime)); // 1000 / 60 = 16.666

  			lastTime = currTime + timeDelay;
  			return window.setTimeout(function () {
  				callback(Date.now());
  			}, timeDelay);
  		};

  		cancelAnimationFrame = nativeCancelAnimationFrame || function (frameId) {
  			window.clearTimeout(frameId);
  		};
  	})();
  }

  function updateComponent(component, prevState, nextState, prevProps, nextProps, renderCallback) {
  	if (!nextProps.children) {
  		nextProps.children = prevProps.children;
  	}

  	if (prevProps !== nextProps || prevState !== nextState) {
  		if (prevProps !== nextProps) {
  			component._blockRender = true;
  			component.componentWillReceiveProps(nextProps);
  			component._blockRender = false;
  		}
  		var shouldUpdate = component.shouldComponentUpdate(nextProps, nextState);

  		if (shouldUpdate) {
  			component._blockSetState = true;
  			component.componentWillUpdate(nextProps, nextState);
  			component._blockSetState = false;
  			component.props = nextProps;
  			component.state = nextState;
  			var newDomNode = renderCallback();

  			component.componentDidUpdate(prevProps, prevState);
  			return newDomNode;
  		}
  	}
  }

  function applyState(component) {
  	var blockRender = component._blockRender;

  	requestAnimationFrame(function () {
  		if (component._deferSetState === false) {
  			component._pendingSetState = false;
  			var pendingState = component._pendingState;
  			var oldState = component.state;
  			var nextState = babelHelpers_extends({}, oldState, pendingState);

  			component._pendingState = {};
  			component._pendingSetState = false;
  			updateComponent(component, oldState, nextState, component.props, component.props, component.forceUpdate, blockRender);
  		} else {
  			applyState(component);
  		}
  	});
  }

  function queueStateChanges(component, newState) {
  	for (var stateKey in newState) {
  		component._pendingState[stateKey] = newState[stateKey];
  	}
  	if (component._pendingSetState === false) {
  		component._pendingSetState = true;
  		applyState(component);
  	}
  }

  var Component = (function () {
  	function Component(props /* , context */) {
  		babelHelpers_classCallCheck(this, Component);

  		this.props = props || {};
  		this._blockRender = false;
  		this._blockSetState = false;
  		this._deferSetState = false;
  		this._pendingSetState = false;
  		this._pendingState = {};
  		this._lastRender = null;
  		this.state = {};
  		this.context = {};
  	}

  	babelHelpers_createClass(Component, [{
  		key: 'render',
  		value: function render() {}
  	}, {
  		key: 'forceUpdate',
  		value: function forceUpdate() {}
  	}, {
  		key: 'setState',
  		value: function setState(newState /* , callback */) {
  			// TODO the callback
  			if (this._blockSetState === false) {
  				queueStateChanges(this, newState);
  			} else {
  				throw Error('Inferno Error: Cannot update state via setState() in componentWillUpdate()');
  			}
  		}
  	}, {
  		key: 'componentDidMount',
  		value: function componentDidMount() {}
  	}, {
  		key: 'componentWillMount',
  		value: function componentWillMount() {}
  	}, {
  		key: 'componentWillUnmount',
  		value: function componentWillUnmount() {}
  	}, {
  		key: 'componentDidUpdate',
  		value: function componentDidUpdate() {}
  	}, {
  		key: 'shouldComponentUpdate',
  		value: function shouldComponentUpdate() {
  			return true;
  		}
  	}, {
  		key: 'componentWillReceiveProps',
  		value: function componentWillReceiveProps() {}
  	}, {
  		key: 'componentWillUpdate',
  		value: function componentWillUpdate() {}
  	}, {
  		key: 'getChildContext',
  		value: function getChildContext() {}
  	}]);
  	return Component;
  })();

  var index = {
  	Component: Component,
  	createTemplate: createTemplate,
  	TemplateFactory: TemplateFactory,
  	addTreeConstructor: addTreeConstructor
  };

  return index;

}));
//# sourceMappingURL=inferno.js.map