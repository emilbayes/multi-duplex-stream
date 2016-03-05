'use strict'

var test = require('tape')
var duplexify = require('duplexify')
var concat = require('concat-stream')
var from = require('from2')
var multiDuplex = require('.')

function fromString (str) {
  return from(function (size, next) {
    if (str.length <= 0) return next(null, null)

    var chunk = str.slice(0, 2)
    str = str.slice(2)

    next(null, chunk)
  })
}

test.only('constructor', function (assert) {
  assert.plan(2 + 4 + 1)

  // Two tests of recieveing hello world on the writable side
  var s1 = duplexify(writeTest('hello world'), fromString('123'))
  var s2 = duplexify(writeTest('hello world'), fromString('456'))

  var ds = multiDuplex([s1, s2])

  // Four tests asserting the API exposed by the constructor
  assert.equal(ds.destroyed, false, 'is not destoryed from beginning')
  assert.ok(Array.isArray(ds.streams), 'has streams array')
  assert.ok(ds.streams.length, 2, 'has registered both streams')
  assert.deepEquals(ds.streams, [s1, s2], 'streams are the exact same objects')

  // One test asserting the readable side (is order preserved?)
  fromString('hello world').pipe(ds).pipe(writeTest('123456'))

  function writeTest (str) {
    return concat(function (body) {
      var bodyStr = body.toString()
      assert.equal(str, bodyStr, 'write tests ' + str + ' equals ' + bodyStr)
    })
  }
})

test('object constructor')

test('reads both')

test('reads different sizes')

test('one slow')

test('backpressure')

test('finish')

test('destroy')

test('auto destroy')

test('no auto destroy')

test('stdout')

test('add later')

test('remove later')
