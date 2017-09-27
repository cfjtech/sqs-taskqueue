const EventEmitter = require('events')
const AWS = require('aws-sdk')

class SQSJob {
	constructor(sqs, url, command, data) {
		this.sqs = sqs

		this.params = {
			MessageAttributes: {
				"Command": {
					DataType: "String",
					StringValue: command
				}
			},
			MessageBody: JSON.stringify(data),
			QueueUrl: url
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
		return this.sqs.sendMessage(this.params, function(err) {
			if (cb) return cb(err)
			if (err) throw err
		})
	}
}

class SQSWorker extends EventEmitter {
	constructor(sqsConfig, queueURL) {
		super()

		this.sqs = new AWS.SQS(sqsConfig)
		this.queueURL = queueURL

		this.processMessage = false

		this.commands = []
	}

	receiveMessage(err, data) {
		if (err) throw err

		if (!data.Messages) return this.poll()

		var message = data.Messages[0]

		var func = this.commands[message.MessageAttributes.Command.StringValue]

		var job = {
			data: JSON.parse(message.Body)
		}

		const execFunc = () => {
			return new Promise((resolve, reject) => {
				func(job, function(err) {
					if (err) return reject(err)
					resolve()
				})
			})
		}

		const deleteMessage = () => {
			return new Promise((resolve, reject) => {
				this.sqs.deleteMessage(deleteParams, function(err, data) {
					if (err) return reject(err)
					resolve(data)
				})
			})
		}

		var deleteParams = {
			QueueUrl: this.queueURL,
			ReceiptHandle: data.Messages[0].ReceiptHandle
		}

		return (async () => {
			try {
				await execFunc()
				await deleteMessage()
			}
			catch (err) {
				this.emit('error', err)
			}
			finally {
				this.poll()
			}
		})()
	}

	create(command, data) {
		return new SQSJob(this.sqs, this.queueURL, command, data)
	}

	poll() {
		if (!this.processMessage) return

		var params = {
			AttributeNames: [
				"SentTimestamp"
			],
			MaxNumberOfMessages: 1,
			MessageAttributeNames: [
				"All"
			],
			QueueUrl: this.queueURL
		};

		this.sqs.receiveMessage(params, this.receiveMessage.bind(this));
	}

	process(command, func) {
		this.commands[command] = func

		if (!this.processMessage) {
			this.processMessage = true
			this.poll()
		}
	}

	shutdown(delay, callback) {
		this.processMessage = false
		setTimeout(callback, delay)
		return this
	}

	watchStuckJobs() {
		return this
	}
}

module.exports = SQSWorker;