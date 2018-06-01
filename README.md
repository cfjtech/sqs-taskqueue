# SQS Task Queue
[![Build Status](https://travis-ci.org/dungbx/sqs-taskqueue.svg)](https://travis-ci.org/dungbx/sqs-taskqueue) [![Code Climate](https://codeclimate.com/github/dungbx/sqs-taskqueue/badges/gpa.svg)](https://codeclimate.com/github/dungbx/sqs-taskqueue) [![Test Coverage](https://codeclimate.com/github/dungbx/sqs-taskqueue/badges/coverage.svg)](https://codeclimate.com/github/dungbx/sqs-taskqueue)

Are you using [Kue](https://github.com/Automattic/kue) with Redis backend?

This a quick way to replace Kue with Amazon SQS backend.

Instead of:
```js
var kue = require('kue'),
	queue = kue.createQueue();
```

Do like this:

```js
var AWS = require('aws-sdk')
var sqs = new AWS.SQS({
  region: '',
  accessKeyId: '',
  secretAccessKey: ''
})

var SQSWorker = require('sqs-taskqueue'),
  queue = new SQSWorker(
    sqs,
    'https://sqs.ap-northeast-1.amazonaws.com/XXXXXXXXXX/',
    'yourapp'
  );
```

The rest they are the same!!!

For example:
```js
var job = queue.create('email', {
    title: 'welcome email for tj'
  , to: 'dummy@google.com'
  , template: 'welcome-email'
}).save( function(err){
   if( !err ) console.log( job.id );
});
```