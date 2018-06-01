const EventEmitter = require('events')

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

  _processPromise(message) {
    var job = {
      data: JSON.parse(message.Body)
    }

    var func = this.func
    var visibilityTimeout = this.attributes.VisibilityTimeout || 7200
    var id

    let timeout = new Promise((resolve) => {
      id = setTimeout(() => {
        worker.emit('error', new Error('Timed out in '+ visibilityTimeout + 's. Queue: ' + queueName))
        resolve()
      }, visibilityTimeout * 1000)
    })

    let promise = new Promise((resolve) => {
      func(job, function(err) {
        clearTimeout(id)
        if (err) {
          worker.emit('error', err, { extra: { queueName: queueName, job: job.data, } })
          return resolve()
        } else {
          resolve({ Id: message.MessageId, ReceiptHandle: message.ReceiptHandle})
        }
      })
    })

    return Promise.race([
      promise,
      timeout
    ])
  }

  async receiveMessage(err, data) {
    if (err) throw err

    if (!data.Messages) return this.emit('poll')

    var queueName = this.queueName
    var entries = []
    var worker = this.worker

    const jobs = data.Messages.map(message => { this._processPromise(message) })

    try {
      entries = await Promise.all(jobs)
    } catch (err) {
      worker.emit('error', err)
    }

    try {
      if (entries.length) {
        var deleteParams = {
          QueueUrl: this.queueUrl,
          Entries: entries.filter(entry => entry)
        }
        await this.sqs.deleteMessageBatch(deleteParams).promise()
      }
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

module.exports = SQSQueue