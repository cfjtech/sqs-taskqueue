const EventEmitter = require('events')
const AWS = require('aws-sdk')

class SQSJob {
  constructor(worker, queueBase, queuePrefix, command, data) {
    this.sqs = worker.sqs
    this.queueUrl = queueBase + queuePrefix + '_' + command

    this.params = {
      MessageBody: JSON.stringify(data || {}),
      QueueUrl: this.queueUrl
    }
  }

  removeOnComplete() {
    return this
  }

  ttl() {
    return this
  }

  attempts() {
    return this
  }

  delay(miliseconds) {
    this.params.DelaySeconds = miliseconds / 1000
    return this
  }

  save(cb) {
    if (typeof cb === 'function') {
      this.sqs.sendMessage(this.params, function(err) {
        if (err) return cb(err)
        cb()
      })
    } else {
      return this.sqs.sendMessage(this.params).promise()
    }
  }
}

class SQSQueue {
  constructor(worker, command, func) {
    this.sqs = worker.sqs
    this.worker = worker
    this.queueName = worker.queuePrefix + '_' + command
    this.queueUrl = worker.queueBase + this.queueName
    this.command = command
    this.func = func
  }
  async start() {
    try {
      await this.sqs.getQueueUrl({QueueName: this.queueName}).promise()
    } catch (e) {
      var params = {
        QueueName: this.queueName,
        Attributes: {
          VisibilityTimeout: '7200', // 2 hours
          ReceiveMessageWaitTimeSeconds: '10'
        }
      }
      try {
        await this.sqs.createQueue(params).promise()
      } catch (e) {
        throw e
      }
    }

    this.processMessage = true
    this.poll()
  }
  stop() {
    this.processMessage = false
  }
  async receiveMessage(err, data) {
    if (err) throw err

    if (!data.Messages) return this.poll()

    var func = this.func

    const jobs = data.Messages.map((message) => {
      var job = {
        data: JSON.parse(message.Body)
      }

      return new Promise((resolve, reject) => {
        func(job, function(err) {
          if (err) return reject(err)
          resolve()
        })
      })
    })

    try {
      await Promise.all(jobs)
    } catch (err) {
      this.worker.emit('error', err)
    }

    var deleteParams = {
      QueueUrl: this.queueUrl,
      Entries: data.Messages.map(m => { return { Id: m.MessageId, ReceiptHandle: m.ReceiptHandle}})
    }

    await this.sqs.deleteMessageBatch(deleteParams).promise()
    this.poll()
  }
  poll() {
    if (!this.processMessage) return

    var params = {
      AttributeNames: [
        'SentTimestamp'
      ],
      MaxNumberOfMessages: 10,
      MessageAttributeNames: [
        'All'
      ],
      QueueUrl: this.queueUrl
    };

    this.sqs.receiveMessage(params, this.receiveMessage.bind(this));
  }
}

class SQSWorker extends EventEmitter {
  constructor(sqsConfig, queueBase, queuePrefix) {
    super()
    this.sqs = new AWS.SQS(sqsConfig)
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

module.exports = SQSWorker;