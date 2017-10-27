const { isArray } = Array
const protoOf = Object.getPrototypeOf

const isFunc = (z) => typeof z === 'function'

const isProps = (z) => {
  if (!z || typeof z !== 'object') {
    return false
  }
  const proto = protoOf(z)
  return !!proto && !protoOf(proto)
}

//---------------------------------------------------------

export const REMOVE = () => REMOVE

function change (key, val, data, original, dataIsArray, removeLater) {
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
    ret = change(i, f(array[i]), ret, array, true, true)
  }

  if (ret !== array) {
    purgeArray(ret)
  }

  return ret
}

function mapProps (data, keys, f) {
  const dataIsArray = isArray(data)

  const ret = keys.reduce((acc, key) => {
    return change(key, f(data[key]), acc, data, dataIsArray, dataIsArray)
  }, data)

  if (dataIsArray && ret !== data) {
    purgeArray(ret)
  }

  return ret
}

export const map = (data, f) => isArray(data) ? mapArray(data, f) : mapProps(data, Object.keys(data), f)

//---------------------------------------------------------

function patch (data, props) {
  if (isFunc(props)) return props(data)
  if (!isProps(props)) return props

  let ret = data || {}

  const dataIsArray = isArray(ret)

  for (const key in props) {
    const val = patch(ret[key], props[key])
    ret = change(key, val, ret, data, dataIsArray, dataIsArray)
  }

  if (dataIsArray && ret !== data) {
    purgeArray(ret)
  }

  return ret
}

//---------------------------------------------------------

export const ALL = () => true

const replaceStarWithALL = (z) => z === '*' ? ALL : z

const PropMatcher = (key, value) => data => !!data && data[key] === value

const PropsMatcher = (keys, props) => (data) => {
  return !!data && keys.every(key => props[key] === data[key])
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

function toPathParts (path) {
  if (typeof path === 'string') {
    return path.replace(/\]/g, '').split(/[.[]/).map(replaceStarWithALL)
  }

  if (!isArray(path)) {
    throw new TypeError('path is not string nor array')
  }

  return path.map(toPathPart)
}

function updatePath (data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update)
  }

  const part = pathParts[pathIndex]

  if (isFunc(part) || isArray(part)) {
    if (!data) return data

    const f = (pathIndex + 1 === pathParts.length && isFunc(update))
      ? update
      : it => updatePath(it, pathParts, pathIndex + 1, update)

    if (part === ALL) {
      return map(data, f)

    } else if (isFunc(part)) {
      return map(data, (v) => part(v) ? f(v) : v)

    } else {
      return mapProps(data, part, f)
    }
  }

  const ret = data || {}
  const val = updatePath(ret[part], pathParts, pathIndex + 1, update)
  return change(part, val, ret, data, isArray(ret), false)
}

export default function update () {
  switch (arguments.length) {
    case 2: return patch(arguments[0], arguments[1])
    case 3: return updatePath(arguments[0], toPathParts(arguments[1]), 0, arguments[2])
    default: throw new TypeError('invalid number of arguments')
  }
}
