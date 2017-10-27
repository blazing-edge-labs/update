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
  if (!z || (typeof z === 'undefined' ? 'undefined' : _typeof(z)) !== 'object') {
    return false;
  }
  var proto = protoOf(z);
  return !!proto && !protoOf(proto);
};

//---------------------------------------------------------

var REMOVE = exports.REMOVE = function REMOVE() {
  return REMOVE;
};

function change(key, val, data, original, dataIsArray, removeLater) {
  if (val === data[key] || val === REMOVE && !dataIsArray && !(key in data)) {
    return data;
  }

  if (data === original) {
    data = dataIsArray ? data.slice() : Object.assign({}, data);
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
    ret = change(i, f(array[i]), ret, array, true, true);
  }

  if (ret !== array) {
    purgeArray(ret);
  }

  return ret;
}

function mapProps(data, keys, f) {
  var dataIsArray = isArray(data);

  var ret = keys.reduce(function (acc, key) {
    return change(key, f(data[key]), acc, data, dataIsArray, dataIsArray);
  }, data);

  if (dataIsArray && ret !== data) {
    purgeArray(ret);
  }

  return ret;
}

var map = exports.map = function map(data, f) {
  return isArray(data) ? mapArray(data, f) : mapProps(data, Object.keys(data), f);
};

//---------------------------------------------------------

function patch(data, props) {
  if (isFunc(props)) return props(data);
  if (!isProps(props)) return props;

  var ret = data || {};

  var dataIsArray = isArray(ret);

  for (var key in props) {
    var val = patch(ret[key], props[key]);
    ret = change(key, val, ret, data, dataIsArray, dataIsArray);
  }

  if (dataIsArray && ret !== data) {
    purgeArray(ret);
  }

  return ret;
}

//---------------------------------------------------------

var ALL = exports.ALL = function ALL() {
  return true;
};

var replaceStarWithALL = function replaceStarWithALL(z) {
  return z === '*' ? ALL : z;
};

var PropMatcher = function PropMatcher(key, value) {
  return function (data) {
    return !!data && data[key] === value;
  };
};

var PropsMatcher = function PropsMatcher(keys, props) {
  return function (data) {
    return !!data && keys.every(function (key) {
      return props[key] === data[key];
    });
  };
};

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

function toPathParts(path) {
  if (typeof path === 'string') {
    return path.replace(/\]/g, '').split(/[.[]/).map(replaceStarWithALL);
  }

  if (!isArray(path)) {
    throw new TypeError('path is not string nor array');
  }

  return path.map(toPathPart);
}

function updatePath(data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update);
  }

  var part = pathParts[pathIndex];

  if (isFunc(part) || isArray(part)) {
    if (!data) return data;

    var f = pathIndex + 1 === pathParts.length && isFunc(update) ? update : function (it) {
      return updatePath(it, pathParts, pathIndex + 1, update);
    };

    if (part === ALL) {
      return map(data, f);
    } else if (isFunc(part)) {
      return map(data, function (v) {
        return part(v) ? f(v) : v;
      });
    } else {
      return mapProps(data, part, f);
    }
  }

  var ret = data || {};
  var val = updatePath(ret[part], pathParts, pathIndex + 1, update);
  return change(part, val, ret, data, isArray(ret), false);
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