'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = update;

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var isArray = Array.isArray;

var protoOf = Object.getPrototypeOf;
var isFunc = function isFunc(z) {
  return typeof z === 'function';
};
var isObject = function isObject(z) {
  return !!z && typeof z === 'function' || (typeof z === 'undefined' ? 'undefined' : _typeof(z)) === 'object';
};

var isProps = function isProps(x) {
  if (!x || (typeof x === 'undefined' ? 'undefined' : _typeof(x)) !== 'object') {
    return false;
  }
  var proto = protoOf(x);
  return !!proto && !protoOf(proto);
};

var clone = function clone(data) {
  return isArray(data) ? data.slice() : Object.assign({}, data);
};

var toPathParts = function toPathParts(path) {
  if (isArray(path)) {
    return path;
  }

  if (typeof path === 'string') {
    return path.split('.');
  }

  return [path];
};

//---------------------------------------------------------

var PropMatcher = function PropMatcher(key, value) {
  return function (data) {
    return !!data && data[key] === value;
  };
};

var PropsMatcher = function PropsMatcher(props) {
  return function (data) {
    if (!data) {
      return false;
    }
    for (var key in props) {
      if (props[key] !== data[key]) {
        return false;
      }
    }
    return true;
  };
};

var Matcher = function Matcher(spec) {
  if (isFunc(spec)) {
    return spec;
  }
  var keys = Object.keys(spec);
  return keys.length === 1 ? PropMatcher(keys[0], spec[keys[0]]) : PropsMatcher(spec);
};

//---------------------------------------------------------

var REMOVE = exports.REMOVE = function REMOVE() {
  return REMOVE;
};

var change = function change(key, val, data, original) {
  if (val === data[key] || val === REMOVE && !(key in data)) {
    return data;
  }

  var target = data !== original ? data : clone(original);

  if (val !== REMOVE) {
    target[key] = val;
  } else if (isArray(data)) {
    target.splice(key, 1);
  } else {
    delete target[key];
  }

  return target;
};

//---------------------------------------------------------

var mapArray = function mapArray(array, f) {
  var n = array.length;
  var ret = array;
  var changed = false;
  var c = 0;

  for (var i = 0; i < n; ++i) {
    var val = f(array[i], i, array);
    if (!changed) {
      if (val === array[i]) continue;
      ret = array.slice();
      changed = true;
      c = i;
    }
    if (val !== REMOVE) {
      ret[c++] = val;
    }
  }

  if (changed && c < n) {
    ret.length = c;
  }

  return ret;
};

var mapProps = function mapProps(obj, f) {
  var ret = obj;

  for (var key in obj) {
    var val = f(obj[key], key, obj);
    ret = change(key, val, ret, obj);
  }

  return ret;
};

var map = exports.map = function map(data, f) {
  return isArray(data) ? mapArray(data, f) : mapProps(data, f);
};

//---------------------------------------------------------

var patch = function patch(data, props) {
  if (isFunc(props)) return props(data);
  if (!isProps(props)) return props;

  var ret = data;

  for (var key in props) {
    var val = patch(ret[key], props[key]);
    ret = change(key, val, ret, data);
  }

  return ret;
};

var updatePath = function updatePath(data, pathParts, update) {
  if (pathParts.length === 0) return patch(data, update);
  if (!data) return data;

  var _pathParts = _toArray(pathParts),
      part = _pathParts[0],
      otherParts = _pathParts.slice(1);

  if (part === '*' || isObject(part)) {
    var f = otherParts.length === 0 && isFunc(update) ? update : function (it) {
      return updatePath(it, otherParts, update);
    };

    if (part === '*') {
      return map(data, f);
    }

    var check = Matcher(part);
    return map(data, function (v, k, obj) {
      return check(v) ? f(v, k, obj) : v;
    });
  }

  var val = updatePath(data[part], otherParts, update);
  return change(part, val, data, data);
};

function update() {
  switch (arguments.length) {
    case 2:
      return patch(arguments[0], arguments[1]);
    case 3:
      return updatePath(arguments[0], toPathParts(arguments[1]), arguments[2]);
    default:
      throw new TypeError('wrong number of arguments');
  }
}

var remove = exports.remove = function remove(data, path) {
  return updatePath(data, toPathParts(path), REMOVE);
};

//---------------------------------------------------------

var fp = function fp(f) {
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return function (data) {
      return f.apply(undefined, [data].concat(args));
    };
  };
};

update._ = fp(update);
remove._ = fp(remove);