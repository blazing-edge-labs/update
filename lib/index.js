'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = update;
var isArray = Array.isArray;

var protoOf = Object.getPrototypeOf;

var isFunc = function isFunc(z) {
  return typeof z === 'function';
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
  var ret = obj || {};

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

  var ret = data || {};

  for (var key in props) {
    var val = patch(ret[key], props[key]);
    ret = change(key, val, ret, data);
  }

  return ret;
};

//---------------------------------------------------------

var toPathPart = function toPathPart(spec) {
  if (!spec || (typeof spec === 'undefined' ? 'undefined' : _typeof(spec)) !== 'object') {
    return spec;
  }
  var keys = Object.keys(spec);
  return keys.length === 1 ? PropMatcher(keys[0], spec[keys[0]]) : PropsMatcher(spec);
};

var toPathParts = function toPathParts(path) {
  if (typeof path === 'string') {
    return path.split('.');
  }

  return isArray(path) ? path.map(toPathPart) : [toPathPart(path)];
};

var updatePath = function updatePath(data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update);
  }

  var part = pathParts[pathIndex++];

  if (part === '*' || isFunc(part)) {
    var f = void 0;

    if (pathIndex !== pathParts.length) {
      f = function f(it) {
        return updatePath(it, pathParts, pathIndex, update);
      };
    } else if (!isFunc(update)) {
      f = function f(it) {
        return patch(it, update);
      };
    } else {
      f = update;
    }

    return part === '*' ? map(data, f) : map(data, function (v, k, obj) {
      return part(v) ? f(v, k, obj) : v;
    });
  }

  var val = updatePath(data[part], pathParts, pathIndex, update);
  return change(part, val, data, data);
};

function update() {
  switch (arguments.length) {
    case 2:
      return patch(arguments[0], arguments[1]);
    case 3:
      return updatePath(arguments[0], toPathParts(arguments[1]), 0, arguments[2]);
    default:
      throw new TypeError('invalid number of arguments');
  }
}

update.where = function (path, update) {
  var pathParts = toPathParts(path);
  return function (data) {
    return updatePath(data, pathParts, 0, update);
  };
};

var remove = exports.remove = function remove(data, path) {
  return updatePath(data, toPathParts(path), 0, REMOVE);
};