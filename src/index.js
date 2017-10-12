const { isArray } = Array
const protoOf = Object.getPrototypeOf

const isFunc = z => typeof z === 'function'

const isProps = (x) => {
  if (!x || typeof x !== 'object') {
    return false
  }
  const proto = protoOf(x)
  return !!proto && !protoOf(proto)
}

const clone = data => isArray(data) ? data.slice() : Object.assign({}, data)

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

const change = (key, val, data, original) => {
  if (val === data[key] || (val === REMOVE && !(key in data))) {
    return data
  }

  const target = data !== original ? data : clone(original)

  if (val !== REMOVE) {
    target[key] = val

  } else if (isArray(data)) {
    target.splice(key, 1)

  } else {
    delete target[key]
  }

  return target
}

//---------------------------------------------------------

const mapArray = (array, f) => {
  const n = array.length
  let ret = array
  let changed = false
  let c = 0

  for (let i = 0; i < n; ++i) {
    const val = f(array[i], i, array)
    if (!changed) {
      if (val === array[i]) continue
      ret = array.slice()
      changed = true
      c = i
    }
    if (val !== REMOVE) {
      ret[c++] = val
    }
  }

  if (changed && c < n) {
    ret.length = c
  }

  return ret
}

const mapProps = (obj, f) => {
  let ret = obj || {}

  for (const key in obj) {
    const val = f(obj[key], key, obj)
    ret = change(key, val, ret, obj)
  }

  return ret
}

export const map = (data, f) => isArray(data) ? mapArray(data, f) : mapProps(data, f)

//---------------------------------------------------------

const patch = (data, props) => {
  if (isFunc(props)) return props(data)
  if (!isProps(props)) return props

  let ret = data || {}

  for (const key in props) {
    const val = patch(ret[key], props[key])
    ret = change(key, val, ret, data)
  }

  return ret
}

//---------------------------------------------------------

const toPathPart = spec => {
  if (!spec || typeof spec !== 'object') {
    return spec
  }
  const keys = Object.keys(spec)
  return keys.length === 1
  ? PropMatcher(keys[0], spec[keys[0]])
  : PropsMatcher(spec)
}

const toPathParts = path => {
  if (typeof path === 'string') {
    return path.split('.')
  }

  if (!isArray(path)) {
    path = [path]
  }

  return path.map(toPathPart)
}

const updatePath = (data, pathParts, pathIndex, update) => {
  if (pathIndex === pathParts.length) {
    return patch(data, update)
  }

  const part = pathParts[pathIndex++]

  if (part === '*' || isFunc(part)) {
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

  const val = updatePath(data[part], pathParts, pathIndex, update)
  return change(part, val, data, data)
}

export default function update () {
  switch (arguments.length) {
    case 2: return patch(arguments[0], arguments[1])
    case 3: return updatePath(arguments[0], toPathParts(arguments[1]), 0, arguments[2])
    default: throw new TypeError('wrong number of arguments')
  }
}

update.where = (path, update) => {
  const pathParts = toPathParts(path)
  return data => updatePath(data, pathParts, 0, update)
}

export const remove = (data, path) => updatePath(data, toPathParts(path), 0, REMOVE)
