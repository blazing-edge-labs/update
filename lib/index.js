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

var isIndex = function isIndex(z) {
  return !/\D/.test(z);
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

var INTERNAL = {};

function change(key, val, data, original, dataIsArray, removeLater) {
  if (val === data[key] || val === REMOVE && !(key in data)) {
    return data;
  }

  if (data === original) {
    data = dataIsArray ? data.slice() : Object.assign({}, data);
  }

  if (val !== REMOVE) {
    data[key] = val;
  } else if (!dataIsArray || !isIndex(key)) {
    return delete data[key] ? data : original;
  } else if (removeLater) {
    data[key] = INTERNAL;
    data._toPurge = INTERNAL;
  } else {
    data.splice(key, 1);
  }

  return data;
}

function purgeArray(array) {
  if (array._toPurge !== INTERNAL) {
    return array;
  }

  return array.filter(function (it) {
    return it !== INTERNAL;
  });
}

//---------------------------------------------------------

function mapArray(array, f) {
  var n = array.length;
  var ret = array;

  for (var i = 0; i < n; ++i) {
    var val = f(array[i], i, array);
    ret = change(i, val, ret, array, true, true);
  }

  return purgeArray(ret);
}

function mapProps(data, f) {
  var ret = data || {};

  for (var key in ret) {
    var val = f(ret[key], key, data);
    ret = change(key, val, ret, data, false, false);
  }

  return ret;
}

var map = exports.map = function map(data, f) {
  return isArray(data) ? mapArray(data, f) : mapProps(data, f);
};

//---------------------------------------------------------

function patch(data, props) {
  if (isFunc(props)) return props(data);
  if (!isProps(props)) return props;

  var ret = data || {};

  var dataIsArray = isArray(ret);

  for (var key in props) {
    var val = patch(ret[key], props[key]);
    ret = change(key, val, ret, data, dataIsArray, true);
  }

  return dataIsArray ? purgeArray(ret) : ret;
}

//---------------------------------------------------------

function toPathPart(part) {
  if (!part || (typeof part === 'undefined' ? 'undefined' : _typeof(part)) !== 'object') {
    return part;
  }
  var keys = Object.keys(part);
  return keys.length === 1 ? PropMatcher(keys[0], part[keys[0]]) : PropsMatcher(part);
}

function toPathParts(path) {
  if (typeof path === 'string') {
    return path.split('.');
  }

  return isArray(path) ? path.map(toPathPart) : [toPathPart(path)];
}

function updatePath(data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update);
  }

  var part = pathParts[pathIndex++];

  if (part === '*' || isFunc(part)) {
    if (!data) {
      return data;
    }

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

  var ret = data || {};
  var val = updatePath(ret[part], pathParts, pathIndex, update);
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

update.where = function (path, update) {
  var pathParts = toPathParts(path);
  return function (data) {
    return updatePath(data, pathParts, 0, update);
  };
};

var remove = exports.remove = function remove(data, path) {
  return updatePath(data, toPathParts(path), 0, REMOVE);
};