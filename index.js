'use strict'

var WriteStream = require('multi-write-stream')
var ReadStream = require('multi-read-stream')
var Duplexify = require('duplexify')
var inherits = require('inherits')

inherits(MultiDuplex, Duplexify)
function MultiDuplex (streams, opts) {
  if (!(this instanceof MultiDuplex)) return new MultiDuplex(streams, opts)
  if (!streams) streams = []

  if (streams && !Array.isArray(streams)) {
    opts = streams
    streams = []
  }

  if (!opts) opts = {}

  this.streams = streams
  this._multiWrite = new WriteStream(this.streams.slice(), opts)
  this._multiRead = new ReadStream(this.streams.slice(), opts)

  Duplexify.call(this, this._multiWrite, this._multiRead, opts)
}

MultiDuplex.prototype.add = function (stream) {
  this._multiWrite.add(stream)
  this._multiRead.add(stream)
}
MultiDuplex.prototype.remove = function (stream) {
  var i = this.streams.indexOf(stream)
  if (i === -1) return
  this.streams.splice(i, 1)

  this._multiWrite.remove(stream)
  this._multiRead.remove(stream)
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
