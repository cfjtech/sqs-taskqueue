/**
 * Babel Starter Kit (https://www.kriasoft.com/babel-starter-kit)
 *
 * Copyright © 2015-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

const SQSWorker = require('../dist/index')
const SQSQueue = require('../dist/queue')
const assert = require('assert')
const AWS = require('aws-sdk')

var sqs = new AWS.SQS({
  region: 'ap-northeast-1',
  accessKeyId: '',
  secretAccessKey: ''
})

describe('SQSWorker', function() {

    it('should create task', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      worker
        .create()
        .removeOnComplete()
        .ttl(30)
        .attempts(10)
        .delay(3)
        .save()
    });

    it('should process task', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      worker.process('hi', function() {})
    });

    it('should shutdown', function (cb) {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      worker.shutdown(5, cb)
    });

    it('should watchStuckJobs', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      worker.watchStuckJobs()
    });

});

describe('SQSQueue', function() {

    it('should start polling', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      var queue = new SQSQueue(worker, 'dummy', function() {})

      queue.start()
    });

    it('should stop polling', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      var queue = new SQSQueue(worker, 'dummy', function() {})

      queue.stop()
    });

    it('should receive message', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      var queue = new SQSQueue(worker, 'dummy', function(data, cb) { return cb(); })

      queue.attributes = {
        VisibilityTimeout: 1
      }

      queue.receiveMessage(null, {
          Messages: [{
            Body: '{}',
            MessageId: '',
            ReceiptHandle: '',
          }]
        })

      queue.receiveMessage(null, {
          Messages: []
        })
    });

    it('should process message', function () {
      var worker = new SQSWorker(sqs, 'some-queue-url')
      var queue = new SQSQueue(worker, 'dummy', function() {})
      queue.attributes = {
        VisibilityTimeout: 60
      }

      queue._processPromise({
        Body: '{}',
        MessageId: '',
        ReceiptHandle: '',
      })
    });

});