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

module.exports = SQSJob