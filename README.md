`multi-duplex-stream`
=====================

Duplex stream that reads/writes from/to multiple duplex streams at once

Installation
------------

```bash
npm install multi-duplex-stream
```

Example
-------

Below is a minimal example of running [ssh commands in parallel](https://github.com/emilbayes/pssh-exec):

```js
'use strict'

var ssh = require('ssh-exec')
var eos = require('end-of-stream')
var multiDuplex = require('multi-duplex-stream')

module.exports = function pssh (hosts, cmd, cb) {
  var sshStreams = hosts.map(function (host) {
    var stream = ssh(cmd, host)

    return stream
  })

  var psshStream = multiDuplex.obj(sshStreams)

  eos(psshStream, cb)

  return psshStream
}
```

Documentation
-------------

#### `multiDuplex([[streams], options])` / `new MultiDuplex([[streams], options])`

#### `multiDuplex.obj([[streams], options])`

#### `.add(stream)`

#### `.remove(stream)`

#### `.streams`

#### `.destroy([err])`

#### `.destroyed`

#### `.finalize()`

License
-------

[MIT](LICENSE)
