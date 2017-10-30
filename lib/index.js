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

var isProps = function isProps(z) {
  return (typeof z === 'undefined' ? 'undefined' : _typeof(z)) === 'object' && z !== null && !protoOf(protoOf(z) || {});
};

function extend(dst, src) {
  for (var key in src) {
    dst[key] = src[key];
  }return dst;
}

//---------------------------------------------------------

var REMOVE = exports.REMOVE = function REMOVE() {
  return REMOVE;
};

function applyChange(key, val, data, original, dataIsArray, removeLater) {
  if (val === data[key] || val === REMOVE && !dataIsArray && !(key in data)) {
    return data;
  }

  if (data === original) {
    data = dataIsArray ? data.slice() : extend({}, data);
  }

  if (val !== REMOVE || removeLater) {
    data[key] = val;
  } else if (dataIsArray) {
    data.splice(key, 1);
  } else {
    delete data[key];
  }

  return data;
}

function purgeArray(array) {
  var i = array.indexOf(REMOVE);
  if (i === -1) return array;

  var n = array.length;

  for (var j = i + 1; j < n; ++j) {
    if (array[j] !== REMOVE) {
      array[i++] = array[j];
    }
  }

  array.length = i;
}

//---------------------------------------------------------

function mapArray(array, f) {
  var n = array.length;
  var ret = array;

  for (var i = 0; i < n; ++i) {
    ret = applyChange(i, f(array[i]), ret, array, true, true);
  }

  if (ret !== array) {
    purgeArray(ret);
  }

  return ret;
}

function mapProps(data, keys, f) {
  var dataIsArray = isArray(data);

  var ret = keys.reduce(function (acc, key) {
    return applyChange(key, f(data[key]), acc, data, dataIsArray, dataIsArray);
  }, data);

  if (dataIsArray && ret !== data) {
    purgeArray(ret);
  }

  return ret;
}

var map = function map(data, f) {
  return isArray(data) ? mapArray(data, f) : mapProps(data, Object.keys(data), f);
};

//---------------------------------------------------------

function patch(data, props) {
  if (isFunc(props)) return props(data);
  if (!isProps(props)) return props;

  var dataIsArray = isArray(data);
  var ret = data;

  for (var key in props) {
    var val = patch(data[key], props[key]);
    ret = applyChange(key, val, ret, data, dataIsArray, dataIsArray);
  }

  if (dataIsArray && ret !== data) {
    purgeArray(ret);
  }

  return ret;
}

//---------------------------------------------------------

var ALL = function ALL() {
  return true;
};

var PropMatcher = function PropMatcher(key, value) {
  return function (data) {
    return !!data && data[key] === value;
  };
};

function PropsMatcher(keys, props) {
  var check = function check(key) {
    return props[key] === this[key];
  };
  return function (data) {
    return !!data && keys.every(check, data);
  };
}

function toPathPart(part) {
  if (!isProps(part)) {
    return part;
  }
  var keys = Object.keys(part);
  switch (keys.length) {
    case 0:
      return ALL;
    case 1:
      return PropMatcher(keys[0], part[keys[0]]);
    default:
      return PropsMatcher(keys, part);
  }
}

function parsePart(part) {
  if (part[0] === '[') {
    if (part.indexOf(']') !== part.length - 1) {
      throw new Error('invalid or missing "]"');
    }
    part = part.slice(1, -1);
  }
  if (part === '*') return ALL;
  return part;
}

function toPathParts(path) {
  if (typeof path === 'string') {
    return path.replace(/\[/g, '.[').split('.').map(parsePart);
  }

  if (!isArray(path)) {
    throw new TypeError('path is not string nor array');
  }

  return path.map(toPathPart);
}

function updatePath(data, parts, index, change) {
  if (index === parts.length) return patch(data, change);

  var part = parts[index++];
  var partIsArray = isArray(part);

  if (partIsArray && part.length === 1) {
    part = part[0];
  } else if (partIsArray || isFunc(part)) {
    var f = index === parts.length && isFunc(change) ? change : function (it) {
      return updatePath(it, parts, index, change);
    };

    if (partIsArray) return mapProps(data, part, f);

    if (!data) return data;

    return part === ALL ? map(data, f) : map(data, function (v) {
      return part(v) ? f(v) : v;
    });
  }

  var val = updatePath(data[part], parts, index, change);
  return applyChange(part, val, data, data, isArray(data), false);
}

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