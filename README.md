[![Build Status](https://travis-ci.org/blazing-edge-labs/update.svg?branch=master)](https://travis-ci.org/blazing-edge-labs/update)

# update

Yet another utility for immutable object updates.

See [article](https://blog.blazingedge.io/immutable-update/) for examples.

## API

### `update(data, [path], change)`

#### Arguments

* **data *(any)***: The data to update.
* **[path] *(Array | string)***: The path of the property to update.
* **change *(any)***: The change to apply.

#### Returns

Updated data. When no effective changes are made, returns the same `data`.

### `REMOVE`

Special value to use in a **change** to remove all or part of **data**.

