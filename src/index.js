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
    const val = f(array[i], i, array)
    ret = change(i, val, ret, array, true, true)
  }

  if (ret !== array) {
    purgeArray(ret)
  }

  return ret
}

function mapProps (data, keys, f) {
  const dataIsArray = isArray(data)

  const ret = keys.reduce((acc, key) => {
    const val = f(data[key], key, data)
    return change(key, val, acc, data, dataIsArray, dataIsArray)
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

export const ALL = () => ALL

const replaceStarWithALL = (z) => z === '*' ? ALL : z

function toPathPart (part) {
  if (!isProps(part)) {
    return part
  }
  const keys = Object.keys(part)
  return keys.length === 1
  ? PropMatcher(keys[0], part[keys[0]])
  : PropsMatcher(part)
}

function toPathParts (path) {
  if (typeof path === 'string') {
    return path.replace(/\]/g, '').split(/[.[]/).map(replaceStarWithALL)
  }

  return isArray(path) ? path.map(toPathPart) : [ toPathPart(path) ]
}

function updatePath (data, pathParts, pathIndex, update) {
  if (pathIndex === pathParts.length) {
    return patch(data, update)
  }

  const part = pathParts[pathIndex++]

  if (isFunc(part) || isArray(part)) {
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

    if (part === ALL) {
      return map(data, f)

    } else if (isFunc(part)) {
      return map(data, (v, k, obj) => part(v) ? f(v, k, obj) : v)

    } else {
      return mapProps(data, part, f)
    }
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
