const test = require('tape')

import update, { REMOVE } from '../src'

test('patch', t => {

  class MyClass {}

  const data = {
    a: {},
    b: {
      ba: 1,
      bb: 2,
      bc: {
        unchanged: 3,
      },
      arrayReplaced: [1, 2, 3],
      arrayChanged: [1, 2, 3, 4],
      removed: [],
    },
    instance: new MyClass,
  }

  const instance = new MyClass

  const result = update(data, {
    b: {
      ba: 11,
      bb: x => -x,
      bc: {
        unchanged: 3,
      },
      arrayReplaced: [4, 5, 6],
      arrayChanged: {
        0: REMOVE,
        1: 49,
        2: REMOVE,
        3: x => -x,
        4: 94,
      },
      removed: REMOVE,
      added: { new: true },
    },
    instance,
  })

  t.same(result, {
    a: {},
    b: {
      ba: 11,
      bb: -2,
      bc: {
        unchanged: 3,
      },
      arrayReplaced: [4, 5, 6],
      arrayChanged: [49, -4, 94],
      added: { new: true },
    },
    instance,
  })

  t.is(result.a, data.a, 'same since not in patch')
  t.isNot(result.b, data.b, 'changed object is cloned')
  t.isNot(result.b.arrayReplaced, data.b.arrayReplaced, 'changed array is cloned')
  t.is(result.b.bc, data.b.bc, 'same since content is not changed')
  t.is(result.instance, instance, 'handle instances as values')
  t.end()
})

test('by path', t => {
  const data = { a: { b: { c: { d: 1 } } } }

  t.same(
    update(data, 'a.b.c.d', 2),
    { a: { b: { c: { d: 2 } } } },
    'set value'
  )

  t.same(
    update({ a: { b: {} } }, 'a.b.c.d', 2),
    { a: { b: { c: { d: 2 } } } },
    'set value creating missing objects'
  )

  t.same(
    update(data, 'a.b', { c: { d: 2 } }),
    { a: { b: { c: { d: 2 } } } },
    'apply path'
  )

  t.same(
    update(data, 'a.b.c.d', x => x + 1),
    { a: { b: { c: { d: 2 } } } },
    'apply function'
  )

  t.same(
    update(data, 'a.b.c.d', REMOVE),
    { a: { b: { c: {} } } },
    'REMOVE'
  )

  t.same(
    update({ a: { b: [1, 2] } }, 'a.b.0', REMOVE),
    { a: { b: [2] } },
    'REMOVE item in array'
  )

  t.same(
    update(data, 'a.b.c.d', () => REMOVE),
    { a: { b: { c: {} } } },
    'returned REMOVE'
  )

  t.is(
    update(data, 'a.b.c.d', x => x),
    data,
    'identity function will not change anything'
  )

  t.same(
    update(data, 'a.b', { c: { d: REMOVE } }),
    { a: { b: { c: {} } } },
    'apply path'
  )

  t.end()
})

test('asterix', t => {
  const data = {
    a: {
      b: [
        { id: 0 },
        { id: 1 },
      ],
      c: [
        { id: 0 },
        { id: 1 },
      ],
    },
  }

  let result = update(data, 'a.b.*', (val, i, obj) => {
    t.is(i, val.id, 'index is passed')
    t.is(obj, data.a.b)
    return i
  })

  t.same(result.a.b, [0, 1])
  t.is(result.a.c, data.a.c)


  result = update(data, 'a.*.*', (val, i, obj) => {
    t.is(i, val.id, 'index is passed')
    if (obj === data.a.b) return val
    if (i === 0) return REMOVE
    return i
  })

  t.is(result.a.b, data.a.b, 'array unchanged if no changes to items ')
  t.same(result.a.c, [1])


  result = update(data, 'a.b.*.id', id => id + 1)

  t.same(result.a.b, [
    { id: 1 },
    { id: 2 },
  ])
  t.is(result.a.c, data.a.c)


  result = update(data, 'a.b.*', {
    id: id => id + 1,
    valid: true,
  })

  t.same(result.a.b, [
    { id: 1, valid: true },
    { id: 2, valid: true },
  ])
  t.is(result.a.c, data.a.c)

  t.end()
})

test('filtering', t => {
  const data = {
    list: [
      { id: 1, count: 1, active: false, user: { name: 'Alex' } },
      { id: 2, count: 0, active: true, user: { name: 'Alex' } },
      { id: 3, count: 2, active: true, user: { name: 'Alex' } },
      { id: 4, count: 0, active: false, user: { name: 'Alex' } },
    ],
  }

  let result = update(data, ['list', { active: true, count: 0 }, 'user'], {
    name: 'Bob',
    email: 'bob@there.com',
  })

  t.same(result, {
    list: [
      { id: 1, count: 1, active: false, user: { name: 'Alex' } },
      { id: 2, count: 0, active: true, user: { name: 'Bob', email: 'bob@there.com' } },
      { id: 3, count: 2, active: true, user: { name: 'Alex' } },
      { id: 4, count: 0, active: false, user: { name: 'Alex' } },
    ],
  })


  result = update(data, ['list', it => it.count > 0], REMOVE)

  t.same(result, {
    list: [
      { id: 2, count: 0, active: true, user: { name: 'Alex' } },
      { id: 4, count: 0, active: false, user: { name: 'Alex' } },
    ],
  })


  result = update(data, ['list', [1, 2]], REMOVE)

  t.same(result, {
    list: [
      { id: 1, count: 1, active: false, user: { name: 'Alex' } },
      { id: 4, count: 0, active: false, user: { name: 'Alex' } },
    ],
  })

  t.end()
})

