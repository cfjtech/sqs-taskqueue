/**
 * Babel Starter Kit (https://www.kriasoft.com/babel-starter-kit)
 *
 * Copyright © 2015-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

var SQSWorker = require('../dist/index');
var SQSQueue = require('../dist/queue');
var assert = require('assert');

describe('SQSWorker', function() {

    it('should create task', function () {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
      worker
        .create()
        .removeOnComplete()
        .ttl(30)
        .attempts(10)
        .delay(3)
        .save()
    });

    it('should process task', function () {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
      worker.process('hi', function() {})
    });

    it('should shutdown', function (cb) {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
      worker.shutdown(5, cb)
    });

    it('should watchStuckJobs', function () {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
      worker.watchStuckJobs()
    });

});

describe('SQSQueue', function() {

    it('should convert message', function () {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
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