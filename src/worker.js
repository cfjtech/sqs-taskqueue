const EventEmitter = require('events')

const SQSQueue = require('./queue')
const SQSJob = require('./job')

class SQSWorker extends EventEmitter {
  constructor(sqs, queueBase, queuePrefix) {
    super()
    this.sqs = sqs
    this.queueBase = queueBase
    this.queuePrefix = queuePrefix

    this.queues = []
  }

  create(command, data) {
    return new SQSJob(this, this.queueBase, this.queuePrefix, command, data)
  }

  process(command, func) {
    var queue = new SQSQueue(this, command, func)
    queue.start()
    this.queues.push(queue)
    return queue
  }

  shutdown(delay, callback) {
    this.queues.forEach((queue) => {
      queue.stop()
    })
    setTimeout(callback, delay)
    return this
  }

  watchStuckJobs() {
    return this
  }
}

module.exports = SQSWorker