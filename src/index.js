const { isArray } = Array
const protoOf = Object.getPrototypeOf

const isFunc = z => typeof z === 'function'

const isProps = (z) => {
  if (!z || typeof z !== 'object') {
    return false
  }
  const proto = protoOf(z)
  return !!proto && !protoOf(proto)
}

const isIndex = (z) => !/\D/.test(z)

//---------------------------------------------------------

const PropMatcher = (key, value) => data => !!data && data[key] === value

const PropsMatcher = props => (data) => {
  if (!data) {
    return false
  }
  for (const key in props) {
    if (props[key] !== data[key]) {
      return false
    }
  }
  return true
}

//---------------------------------------------------------

export const REMOVE = () => REMOVE

function change (key, val, data, original, dataIsArray, removeLater) {
  if (val === data[key] || (val === REMOVE && !(key in data))) {
    return data
  }

  if (data === original) {
    data = dataIsArray ? data.slice() : Object.assign({}, data)
  }

  if (val !== REMOVE || removeLater && dataIsArray) {
    data[key] = val

  } else if (dataIsArray && isIndex(key)) {
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
  const n =array.length
  let ret = array

  for (let i = 0; i < n; ++i) {
    const val = f(array[i], i, array)
    ret = change(i, val, ret, array, true, true)
  }

  if (ret !== array) {
    purgeArray(ret)
  }

  return ret
}

function mapProps (data, f) {
  let ret = data || {}

  for (const key in ret) {
    const val = f(ret[key], key, data)
    ret = change(key, val, ret, data, false, false)
  }

  return ret
}

export const map = (data, f) => isArray(data) ? mapArray(data, f) : mapProps(data, f)

//---------------------------------------------------------

function patch (data, props) {
  if (isFunc(props)) return props(data)
  if (!isProps(props)) return props

  let ret = data || {}

  const dataIsArray = isArray(ret)

  for (const key in props) {
    const val = patch(ret[key], props[key])
    ret = change(key, val, ret, data, dataIsArray, true)
  }

  if (dataIsArray && ret !== data) {
    purgeArray(ret)
  }

  return ret
}

//---------------------------------------------------------

function toPathPart (part) {
  if (!part || typeof part !== 'object') {
    return part
  }
  const keys = Object.keys(part)
  return keys.length === 1
  ? PropMatcher(keys[0], part[keys[0]])
  : PropsMatcher(part)
}

function toPathParts (path) {
  if (typeof path === 'string') {
    return path.split('.')
  }

  return isArray(path) ? path.map(toPathPart) : [ toPathPart(path) ]
}

function updatePath (data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update)
  }

  const part = pathParts[pathIndex++]

  if (part === '*' || isFunc(part)) {
    if (!data) {
      return data
    }

    let f

    if (pathIndex !== pathParts.length) {
      f = it => updatePath(it, pathParts, pathIndex, update)

    } else if (!isFunc(update)) {
      f = it => patch(it, update)

    } else {
      f = update
    }

    return (part === '*')
    ? map(data, f)
    : map(data, (v, k, obj) => part(v) ? f(v, k, obj) : v)
  }

  const ret = data || {}
  const val = updatePath(ret[part], pathParts, pathIndex, update)
  return change(part, val, ret, data, isArray(ret), false)
}

export default function update () {
  switch (arguments.length) {
    case 2: return patch(arguments[0], arguments[1])
    case 3: return updatePath(arguments[0], toPathParts(arguments[1]), 0, arguments[2])
    default: throw new TypeError('invalid number of arguments')
  }
}

update.where = (path, update) => {
  const pathParts = toPathParts(path)
  return data => updatePath(data, pathParts, 0, update)
}

export const remove = (data, path) => updatePath(data, toPathParts(path), 0, REMOVE)
