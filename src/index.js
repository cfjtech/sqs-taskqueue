require("babel-polyfill")

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

class SQSQueue extends EventEmitter {
  constructor(worker, command, func) {
    super()

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

    let res = await this.sqs.getQueueAttributes({
      QueueUrl: this.queueUrl,
      AttributeNames: ['All']
    }).promise()

    this.attributes = res.Attributes

    this.on('poll', this.poll)

    this.processMessage = true
    this.emit('poll')
  }
  stop() {
    this.processMessage = false
  }
  async receiveMessage(err, data) {
    if (err) throw err

    if (!data.Messages) return this.emit('poll')

    var func = this.func
    var queueName = this.queueName
    var visibilityTimeout = this.attributes.VisibilityTimeout || 7200
    var entries = []

    const jobs = data.Messages.map((message) => {
      var job = {
        data: JSON.parse(message.Body)
      }

      let timeout = new Promise((resolve) => {
        let id = setTimeout(() => {
          clearTimeout(id)
          let err = new Error('Timed out in '+ visibilityTimeout + 's. Queue: ' + queueName)
          this.worker.emit('error', err)
          resolve()
        }, visibilityTimeout * 1000)
      })

      let promise = new Promise((resolve) => {
        func(job, function(err) {
          if (err) {
            this.worker.emit('error', err)
            return resolve()
          }
          entries.push({ Id: message.MessageId, ReceiptHandle: message.ReceiptHandle})
          resolve()
        })
      })

      return Promise.race([
        promise,
        timeout
      ])
    })

    try {
      await Promise.all(jobs)
    } catch (err) {
      this.worker.emit('error', err)
    }

    var deleteParams = {
      QueueUrl: this.queueUrl,
      Entries: entries
    }

    try {
      await this.sqs.deleteMessageBatch(deleteParams).promise()
    } catch (err) {
      this.worker.emit('error', err)
    }

    this.emit('poll')
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
    }

    this.sqs.receiveMessage(params, this.receiveMessage.bind(this))
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

module.exports = SQSWorker