'use strict'

var test = require('tape')
var duplexify = require('duplexify')
var concat = require('concat-stream')
var from = require('from2')
var through = require('through2')
var multiDuplex = require('.')
var util = require('util')

function fromString (str) {
  return from(function (size, next) {
    if (str.length <= 0) return next(null, null)

    var chunk = str.slice(0, 2)
    str = str.slice(2)

    next(null, chunk)
  })
}

function toTest (assert, str, opts) {
  if (!opts) opts = {encoding: 'object'}
  return concat(opts, function (body) {
    assert.deepEqual(body, str, util.format('write tests %j equals %j', body, str))
  })
}

test('constructor', function (assert) {
  assert.plan(2 + 4 + 1)

  // Two tests of recieveing hello world on the writable side
  var ds1 = duplexify(toTest(assert, 'hello world', {encoding: 'string'}),
                      fromString('123'))
  var ds2 = duplexify(toTest(assert, 'hello world', {encoding: 'string'}),
                      fromString('456'))

  var mds = multiDuplex([ds1, ds2])

  // Four tests asserting the API exposed by the constructor
  assert.equal(mds.destroyed, false, 'is not destoryed from beginning')
  assert.ok(Array.isArray(mds.streams), 'has streams array')
  assert.ok(mds.streams.length, 2, 'has registered both streams')
  assert.deepEquals(mds.streams, [ds1, ds2], 'streams are the exact same objects')

  // One test asserting the readable side (is order preserved?)
  fromString('hello world')
    .pipe(mds)
    .pipe(toTest(assert, '123456', {encoding: 'string'}))
})

test('object constructor', function (assert) {
  assert.plan(2 + 1)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4, 6]))

  var mds = multiDuplex.obj([ds1, ds2])

  from.obj([{foo: 'bar'}])
    .pipe(mds)
    .pipe(toTest(assert, [1, 2, 3, 4, 5, 6], {encoding: 'list'}))
})

test('reads different sizes', function (assert) {
  assert.plan(2 + 1)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4]))

  var mds = multiDuplex.obj([ds1, ds2])

  from.obj([{foo: 'bar'}])
    .pipe(mds)
    .pipe(toTest(assert, [1, 2, 3, 4, 5], {encoding: 'list'}))
})

test('one slow', function (assert) {
  assert.plan(2 + 1)

  var slowArr = [null, 'slower', 'slow']
  function slow (size, cb) {
    setTimeout(function () {
      cb(null, slowArr.pop())
    }, 100)
  }

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj(slow))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj(['faster', 'fast']))

  var mds = multiDuplex.obj([ds1, ds2])

  from.obj([{foo: 'bar'}])
    .pipe(mds)
    .pipe(toTest(assert, ['faster', 'fast', 'slow', 'slower'], {encoding: 'list'}))
})

test('backpressure', function (assert) {
  assert.plan(2 + 1)

  var delayed = through.obj({highWaterMark: 1}, function (chunk, enc, cb) {
    setTimeout(function () {
      cb(null, chunk)
    }, 50)
  })

  delayed.pipe(toTest(assert, [7, 8, 9, 10, 11]))

  var ds1 = duplexify.obj(delayed, from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [7, 8, 9, 10, 11]), from.obj([2, 4, 6]))

  var ds = multiDuplex.obj([ds1, ds2])

  from.obj([7, 8, 9, 10, 11])
    .pipe(ds)
    .pipe(toTest(assert, [1, 2, 3, 4, 5, 6], {encoding: 'list'}))
})

test('finish/end', function (assert) {
  assert.plan(2 + 2 + 2 + 1)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4, 6]))

  var mds = multiDuplex.obj([ds1, ds2])

  var ds1Finished = false
  var ds2Finished = false

  ds1.on('finish', function () {
    ds1Finished = true
  })
  ds2.on('finish', function () {
    ds2Finished = true
  })
  mds.on('finish', function () {
    assert.ok(ds1Finished, 'ds1 finished before mds')
    assert.ok(ds2Finished, 'ds2 finished before mds')
  })

  var ds1Ended = false
  var ds2Ended = false

  ds1.on('end', function () {
    ds1Ended = true
  })
  ds2.on('end', function () {
    ds2Ended = true
  })
  mds.on('end', function () {
    assert.ok(ds1Ended, 'ds1 ended before mds')
    assert.ok(ds2Ended, 'ds2 ended before mds')
  })

  from.obj([{foo: 'bar'}])
    .pipe(mds)
    .pipe(toTest(assert, [1, 2, 3, 4, 5, 6], {encoding: 'list'}))
})

test('destroy', function (assert) {
  assert.plan(5)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4, 6]))

  ds1.on('close', function () {
    assert.ok(ds1.destroyed, 'did destroy ds1')
  })
  ds2.on('close', function () {
    assert.ok(ds2.destroyed, 'did destroy ds2')
  })

  var mds = multiDuplex.obj([ds1, ds2])

  mds.on('close', function () {
    assert.ok(ds1.destroyed, 'updated ds1.destroyed state')
    assert.ok(ds2.destroyed, 'updated ds2.destroyed state')
    assert.ok(mds.destroyed, 'updated mds.destroyed state')
  })

  mds.destroy()
})

test('auto destroy', function (assert) {
  assert.plan(3)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4, 6]))

  ds1.on('close', function () {
    assert.ok(ds1.destroyed, 'did destroy itself')
  })
  ds2.on('close', function () {
    assert.ok(ds2.destroyed, 'did destroy sibling')
  })

  var mds = multiDuplex.obj([ds1, ds2])

  mds.on('close', function () {
    assert.ok(mds.destroyed, 'did destroy parent')
  })

  ds1.destroy()
})

test('no auto destroy', function (assert) {
  assert.plan(1)

  var ds1 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [{foo: 'bar'}]),
                          from.obj([2, 4, 6]))

  ds1.on('close', function () {
    assert.ok(ds1.destroyed, 'only destroyed itself')
  })
  ds2.on('close', function () {
    assert.fail('did destroy sibling')
  })

  var mds = multiDuplex.obj([ds1, ds2], {autoDestroy: false})

  mds.on('close', function () {
    assert.fail('did destroy parent')
  })

  ds1.destroy()
})

test.skip('stdout should not end', function (assert) {
  assert.plan(2 + 1)

  // Two tests of recieveing hello world on the writable side
  var ds1 = duplexify(through(),
                      fromString('123'))
  var ds2 = duplexify(process.stdout,
                      fromString('456'))

  var mds = multiDuplex([ds1, ds2])

  mds.end()
  mds.pipe(toTest(assert, '123456', {encoding: 'string'}))
})

test('add later', function (assert) {
  assert.plan(2 + 1)

  var ds1 = duplexify.obj(toTest(assert, [7, 8, 9]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [8, 9]),
                          from.obj([2, 4, 6]))

  var mds = multiDuplex.obj()

  mds.pipe(toTest(assert, [1, 3, 5, 2, 4, 6], {encoding: 'list'}))

  mds.once('data', function () {
    mds.add(ds2)
    mds.write(8)
    mds.write(9)
    mds.end()
  })

  mds.add(ds1)
  mds.write(7)
})

test('remove later', function (assert) {
  assert.plan(1 + 1)

  var ds1 = duplexify.obj(toTest(assert, [7, 8, 9]),
                          from.obj([1, 3, 5]))
  var ds2 = duplexify.obj(toTest(assert, [7]),
                          from.obj([2, 4, 6]))

  var mds = multiDuplex.obj([ds1, ds2])

  mds.pipe(toTest(assert, [1, 2, 3, 4, 5, 6], {encoding: 'list'}))

  mds.once('data', function () {
    mds.remove(ds2)
    mds.write(8)
    mds.write(9)
    mds.end()
  })

  mds.write(7)
})
