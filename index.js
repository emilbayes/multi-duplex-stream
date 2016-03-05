'use strict'

var WriteStream = require('multi-write-stream')
var ReadStream = require('multi-read-stream')
var Duplexify = require('duplexify')
var inherits = require('inherits')

var miss = require('mississippi')

inherits(MultiDuplex, Duplexify)
function MultiDuplex (streams, opts) {
  if (!(this instanceof MultiDuplex)) return new MultiDuplex(streams, opts)
  if (!streams) streams = []

  if (streams && !Array.isArray(streams)) {
    opts = streams
    streams = []
  }

  if (!opts) opts = {}

  this._multiWrite = new WriteStream(streams, opts)
  this._multiRead = new ReadStream(streams, opts)

  Duplexify.call(this, this._multiWrite, this._multiRead, opts)

  this.streams = streams
}

MultiDuplex.prototype.add = function (stream) {
  this._multiWrite.add(stream)
  this._multiRead.add(stream)
}
MultiDuplex.prototype.remove = function (stream) {
  this._multiWrite.add(stream)
  this._multiRead.add(stream)
}

MultiDuplex.prototype.finalize = function () {
  this._multiRead.finalize()
}

MultiDuplex.obj = function (streams, opts) {
  if (streams && !Array.isArray(streams)) return MultiDuplex.obj([], streams)
  if (!opts) opts = {}
  opts.objectMode = true

  return new MultiDuplex(streams, opts)
}

module.exports = MultiDuplex
