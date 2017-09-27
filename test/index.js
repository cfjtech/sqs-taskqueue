/**
 * Babel Starter Kit (https://www.kriasoft.com/babel-starter-kit)
 *
 * Copyright © 2015-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

var SQSWorker = require('../dist/index');
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

    it('should process task', function (cb) {
      var worker = new SQSWorker({region: 'some-region'}, 'some-queue-url')
      worker.process('hi', function() {
        cb()
      })
      worker.receiveMessage(null, {
        Messages: [{
          MessageAttributes: {"Command": {"StringValue": "hi"}},
          ReceiptHandle: 'receipt-handle',
          MessageId: '123',
          Body: '{}'
        }]
      })
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