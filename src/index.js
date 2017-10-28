const { isArray } = Array
const protoOf = Object.getPrototypeOf

const isFunc = (z) => typeof z === 'function'

const isProps = (z) => typeof z === 'object'
  && z !== null && !protoOf(protoOf(z) || {})

//---------------------------------------------------------

export const REMOVE = () => REMOVE

function applyChange (key, val, data, original, dataIsArray, removeLater) {
  if (val === data[key] || val === REMOVE && !dataIsArray && !(key in data)) {
    return data
  }

  if (data === original) {
    data = dataIsArray ? data.slice() : Object.assign({}, data)
  }

  if (val !== REMOVE || removeLater) {
    data[key] = val

  } else if (dataIsArray) {
    data.splice(key, 1)

  } else {
    delete data[key]
  }

  return data
}

function purgeArray (array) {
  let i = array.indexOf(REMOVE)
  if (i === -1) return array

  const n = array.length

  for (let j = i + 1; j < n; ++j) {
    if (array[j] !== REMOVE) {
      array[i++] = array[j]
    }
  }

  array.length = i
}

//---------------------------------------------------------

function mapArray (array, f) {
  const n = array.length
  let ret = array

  for (let i = 0; i < n; ++i) {
    ret = applyChange(i, f(array[i]), ret, array, true, true)
  }

  if (ret !== array) {
    purgeArray(ret)
  }

  return ret
}

function mapProps (data, keys, f) {
  const dataIsArray = isArray(data)

  const ret = keys.reduce((acc, key) => {
    return applyChange(key, f(data[key]), acc, data, dataIsArray, dataIsArray)
  }, data)

  if (dataIsArray && ret !== data) {
    purgeArray(ret)
  }

  return ret
}

const map = (data, f) =>
  isArray(data)
    ? mapArray(data, f)
    : mapProps(data, Object.keys(data), f)

//---------------------------------------------------------

function patch (data, props) {
  if (isFunc(props)) return props(data)
  if (!isProps(props)) return props

  const dataIsArray = isArray(data)
  let ret = data

  for (const key in props) {
    const val = patch(data[key], props[key])
    ret = applyChange(key, val, ret, data, dataIsArray, dataIsArray)
  }

  if (dataIsArray && ret !== data) {
    purgeArray(ret)
  }

  return ret
}

//---------------------------------------------------------

const ALL = () => true

const PropMatcher = (key, value) => data => !!data && data[key] === value

function PropsMatcher (keys, props) {
  const check = function (key) { return props[key] === this[key] }
  return data => !!data && keys.every(check, data)
}

function toPathPart (part) {
  if (!isProps(part)) {
    return part
  }
  const keys = Object.keys(part)
  switch (keys.length) {
    case 0: return ALL
    case 1: return PropMatcher(keys[0], part[keys[0]])
    default: return PropsMatcher(keys, part)
  }
}

function parsePart (part) {
  if (part[0] === '[') {
    if (part.indexOf(']') !== part.length - 1) {
      throw new Error('invalid or missing "]"')
    }
    part = part.slice(1, -1)
  }
  if (part === '*') return ALL
  return part
}

function toPathParts (path) {
  if (typeof path === 'string') {
    return path.replace(/\[/g, '.[').split('.').map(parsePart)
  }

  if (!isArray(path)) {
    throw new TypeError('path is not string nor array')
  }

  return path.map(toPathPart)
}

function updatePath (data, parts, index, change) {
  if (index === parts.length) return patch(data, change)

  let part = parts[index++]
  const partIsArray = isArray(part)

  if (partIsArray && part.length === 1) {
    part = part[0]

  } else if (partIsArray || isFunc(part)) {
    const f = (index === parts.length && isFunc(change))
      ? change
      : it => updatePath(it, parts, index, change)

    if (partIsArray) return mapProps(data, part, f)

    if (!data) return data

    return part === ALL
      ? map(data, f)
      : map(data, (v) => part(v) ? f(v) : v)
  }

  const val = updatePath(data[part], parts, index, change)
  return applyChange(part, val, data, data, isArray(data), false)
}

export default function update () {
  switch (arguments.length) {
    case 2: return patch(arguments[0], arguments[1])
    case 3: return updatePath(arguments[0], toPathParts(arguments[1]), 0, arguments[2])
    default: throw new TypeError('invalid number of arguments')
  }
}
