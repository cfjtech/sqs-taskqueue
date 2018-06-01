const AWS = require('aws-sdk')
const SQSWorker = require('../src');

// create our job queue
let sqs = new AWS.SQS({
  region: '',
  accessKeyId: '',
  secretAccessKey: ''
})

var jobs = new SQSWorker(sqs,
  'https://sqs.ap-northeast-1.amazonaws.com/XXXXXXXXXX/',
  'demo'
);

// one minute

jobs.process( 'email', function ( job, done ) {
  console.log('sending email:' + job)
  setTimeout( function () {
    console.log('done sending email')
    done();
  }, Math.random() * 5000 );
});


jobs.create( 'email', {
  title: 'Account expired', to: 'dummy@google.com', template: 'expired-email'
})
.priority( 'high' )
.save();

jobs.create( 'email', {
  title: 'Account expired', to: 'dummy@google.com', template: 'expired-email'
})
.priority( 'high' )
.save();

jobs.create( 'email', {
  title: 'Account expired', to: 'dummy@google.com', template: 'expired-email'
})
.priority( 'high' )
.save();

