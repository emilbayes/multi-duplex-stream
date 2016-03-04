'use strict'

var WriteStream = require('multi-write-stream')
var ReadStream = require('multi-read-stream')
var Duplexify = require('duplexify')

function MultiDuplex (streams, opts) {
  if (!(this instanceof MultiDuplex)) return new MultiDuplex(streams, opts)
  if (!streams) streams = []

  if (streams && !Array.isArray(streams)) {
    opts = streams
    streams = []
  }

  if (!opts) opts = {}

  this._write = new WriteStream(streams, opts)
  this._read = new ReadStream(streams, opts)

  this.streams = streams
  this.destroyed = false

  return new Duplexify(this._write, this._read, opts)
}

MultiDuplex.prototype.add = function (stream) {
  this._write.add(stream)
  this._read.add(stream)
}
MultiDuplex.prototype.remove = function (stream) {
  this._write.remove(stream)
  this._read.remove(stream)
}

MultiDuplex.prototype.destroy = function (err) {
  if (this.destroyed) return

  this.destroyed = true
  this._write.destroy(err)
  this._read.destroy(err)
}

MultiDuplex.prototype.end = function (data, enc, cb) {
  return this._write.end(data, enc, cb)
}

MultiDuplex.prototype.finalize = function () {
  this._read.finalize()
}

MultiDuplex.obj = function (streams, opts) {
  if (streams && !Array.isArray(streams)) return MultiDuplex.obj([], streams)
  if (!opts) opts = {}
  opts.objectMode = true

  return new MultiDuplex(streams, opts)
}

module.exports = MultiDuplex
