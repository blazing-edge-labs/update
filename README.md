[![Build Status](https://travis-ci.org/blazing-edge-labs/update.svg?branch=master)](https://travis-ci.org/blazing-edge-labs/update)

# update

Yet another utility for immutable object updates.

## Installation

`npm install @blazingedge/update --save`

## Usage

```js
import update from '@blazingedge/update'

const newState = update(state, 'path.to.users[7]', {
  email: 'some.email@example.com',
  balance: {
    amount: n => n + 100
  }
})

```
More examples in the [article](https://blog.blazingedge.io/immutable-update/).

## API

### `update(data, [path], change)`

#### Arguments

* **data *(any)***: The data to update.
* **[path] *(Array | string)***: The path of the property to update.
* **change *(any)***: The change to apply.
  * if a ***function*** then it's used to compute the new value from previous one,
  * if a ***plain object*** then each its *value* is the ***change*** for respective key/index,
  * otherwise it's the new value.

#### Returns

Updated data. When no effective changes are made, returns the same `data`.

### `REMOVE`

Special value to use in a **change** to remove part(s) of **data**.

```js
import update, { REMOVE } from '@blazingedge/update'

// Remove entire player
update(state, 'path.to.playersById[7]', REMOVE)

// Removing and setting
update(state, 'path.to.playersById', {
  [killedPlayerId]: REMOVE,
  [killedBy]: {
    kills: n => n + 1,
  }
})
```

### Path with "**`*`**"

To apply a change to all values of an array/object, we can use "**`*`**".

```js
update(state, 'path.to.users[*].balance', n => n + 100)

update(state, 'path.to.users[*]', (user) => {
  if (Math.random() < 0.8) {
    return REMOVE
  }
  // Mark others as lucky and double the balance amount
  return update(user, {
    lucky: true,
    balance: {
      amount: n => n * 2
    }
  })
})
```

### Path as Array

When path is passed as an array, it can also contain "filters" to selectively change values of an array/object.

```js
update(state, ['path', 'to', 'users', { lucky: true }, 'balance'], {
  limit: REMOVE,
  amount: n => n + 1000
})
```

A filter can be a:
  * function: `user => user.lucky`,
  * plain object with required values: `{ lucky: true }` (use `{}` for "all"),
  * array of indexes/keys: `[2, 4, 6, 8]`
