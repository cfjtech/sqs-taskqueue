# kue-sqs
Are you using Kue with Redis backend? https://github.com/Automattic/kue
This a quick way to replace Kue with Amazon SQS backend.

[![Build Status](https://travis-ci.org/dungbx/sqs-taskqueue.svg)](https://travis-ci.org/dungbx/sqs-taskqueue) [![Code Climate](https://codeclimate.com/github/dungbx/sqs-taskqueue/badges/gpa.svg)](https://codeclimate.com/github/dungbx/sqs-taskqueue) [![Test Coverage](https://codeclimate.com/github/dungbx/sqs-taskqueue/badges/coverage.svg)](https://codeclimate.com/github/dungbx/sqs-taskqueue)


Instead of:
```js
var kue = require('kue'),
	queue = kue.createQueue();
```

Do like this:

```js
var SQSWorker = require('sqs-taskqueue'),
	queue = new SQSWorker({
		region: 'ap-northeast-1'
		},
		'https://sqs.ap-northeast-1.amazonaws.com/XXXXXXXXXX/',
		'yourapp'
	);
```

The rest they are the same!!!
For example:
```js
var job = queue.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}).save( function(err){
   if( !err ) console.log( job.id );
});
```