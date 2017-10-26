[![Build Status](https://travis-ci.org/blazing-edge-labs/update.svg?branch=master)](https://travis-ci.org/blazing-edge-labs/update)

# update

Yet another utility for immutable object updates.

## Installation

`npm install rkatic-update --save`

## Usage

```js
import update from 'rkatic-update'

const newState = update(state, 'path.to.users[7].data', {
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

#### Returns

Updated data. When no effective changes are made, returns the same `data`.

### `REMOVE`

Special value to use in a **change** to remove part(s) of **data**.

```js
import update, { REMOVE } from 'rkatic-update'

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
