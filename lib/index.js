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
  return proto && !protoOf(proto);
};

var clone = function clone(data) {
  return isArray(data) ? data.slice() : Object.assign({}, data);
};
var toPathParts = function toPathParts(path) {
  return isArray(path) ? path : (path || '').split('.');
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
  if (isFunc(spec)) return spec;
  var keys = Object.keys(spec);
  return keys.length === 1 ? PropMatcher(keys[0], spec[keys[0]]) : PropsMatcher(spec);
};

//---------------------------------------------------------

// const findLastIndex = (array, check) => {
//   let i = array.length
//   while (i--) {
//     if (check(array[i])) {
//       return i
//     }
//   }
//   return null
// }

// const findKey = (obj, check) => {
//   for (const key in obj) {
//     if (check(obj[key])) {
//       return key
//     }
//   }
//   return null
// }

// export default function find (data, check) {
//   return Array.isArray(data) ? findLastIndex(data, check) : findKey(data, check)
// }

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

var mapArray = function mapArray(array, f) {
  var n = array.length;
  var cloned = void 0;
  var toRemove = false;

  for (var i = 0; i < n; ++i) {
    var newVal = f(array[i], i, array);
    if (newVal !== array[i]) {
      if (!cloned) cloned = array.slice();
      cloned[i] = newVal;
      toRemove = toRemove || newVal === REMOVE;
    }
  }

  if (toRemove) {
    return cloned.filter(function (it) {
      return it !== REMOVE;
    });
  }

  return cloned || array;
};

var mapProps = function mapProps(obj, f) {
  var ret = obj;

  for (var key in obj) {
    var newVal = f(obj[key], key, obj);
    ret = change(key, newVal, ret, obj);
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
  if (pathParts.length === 0) return patch(update, data);
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

function update(data) {
  var path = void 0,
      update = void 0;

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  if (args.length === 1) {
    update = args[0];
  } else {
    path = args[0];
    update = args[1];
  }

  if (!path) {
    return patch(data, update);
  }

  return updatePath(data, toPathParts(path), update);
}

var remove = exports.remove = function remove(data, path) {
  return updatePath(data, toPathParts(path), REMOVE);
};

//---------------------------------------------------------

var fp = function fp(f) {
  return function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return function (data) {
      return f.apply(undefined, [data].concat(args));
    };
  };
};

update._ = fp(update);
remove._ = fp(remove);