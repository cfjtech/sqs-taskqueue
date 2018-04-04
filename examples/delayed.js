var SQSWorker = require('../src');

// create our job queue

var jobs = new SQSWorker({
  region: 'ap-northeast-1'
  },
  'https://sqs.ap-northeast-1.amazonaws.com/XXXXXXXXXX/',
  'yourapp'
);

// one minute

var minute = 60000;

jobs.create( 'email', {
  title: 'Account expired', to: 'dummy@google.com', template: 'expired-email'
} ).delay( minute * 10 )
  .priority( 'high' )
  .save();

jobs.process( 'email', 10, function ( job, done ) {
  setTimeout( function () {
    done();
  }, Math.random() * 5000 );
} );
