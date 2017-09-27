'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventEmitter = require('events');
var AWS = require('aws-sdk');

var SQSJob = function () {
	function SQSJob(sqs, url, command, data) {
		_classCallCheck(this, SQSJob);

		this.sqs = sqs;

		this.params = {
			MessageAttributes: {
				"Command": {
					DataType: "String",
					StringValue: command
				}
			},
			MessageBody: JSON.stringify(data),
			QueueUrl: url
		};
	}

	_createClass(SQSJob, [{
		key: 'removeOnComplete',
		value: function removeOnComplete() {
			return this;
		}
	}, {
		key: 'ttl',
		value: function ttl() {
			return this;
		}
	}, {
		key: 'attempts',
		value: function attempts() {
			return this;
		}
	}, {
		key: 'delay',
		value: function delay(miliseconds) {
			this.params.DelaySeconds = miliseconds / 1000;
			return this;
		}
	}, {
		key: 'save',
		value: function save(cb) {
			return this.sqs.sendMessage(this.params, function (err) {
				if (cb) return cb(err);
				if (err) throw err;
			});
		}
	}]);

	return SQSJob;
}();

var SQSWorker = function (_EventEmitter) {
	_inherits(SQSWorker, _EventEmitter);

	function SQSWorker(sqsConfig, queueURL) {
		_classCallCheck(this, SQSWorker);

		var _this = _possibleConstructorReturn(this, (SQSWorker.__proto__ || Object.getPrototypeOf(SQSWorker)).call(this));

		_this.sqs = new AWS.SQS(sqsConfig);
		_this.queueURL = queueURL;

		_this.processMessage = false;

		_this.commands = [];
		return _this;
	}

	_createClass(SQSWorker, [{
		key: 'receiveMessage',
		value: function receiveMessage(err, data) {
			var _this2 = this;

			if (err) throw err;

			if (!data.Messages) return this.poll();

			var message = data.Messages[0];

			var func = this.commands[message.MessageAttributes.Command.StringValue];

			var job = {
				data: JSON.parse(message.Body)
			};

			var execFunc = function execFunc() {
				return new Promise(function (resolve, reject) {
					func(job, function (err) {
						if (err) return reject(err);
						resolve();
					});
				});
			};

			var deleteMessage = function deleteMessage() {
				return new Promise(function (resolve, reject) {
					_this2.sqs.deleteMessage(deleteParams, function (err, data) {
						if (err) return reject(err);
						resolve(data);
					});
				});
			};

			var deleteParams = {
				QueueUrl: this.queueURL,
				ReceiptHandle: data.Messages[0].ReceiptHandle
			};

			return async function () {
				try {
					await execFunc();
					await deleteMessage();
				} catch (err) {
					_this2.emit('error', err);
				} finally {
					_this2.poll();
				}
			}();
		}
	}, {
		key: 'create',
		value: function create(command, data) {
			return new SQSJob(this.sqs, this.queueURL, command, data);
		}
	}, {
		key: 'poll',
		value: function poll() {
			if (!this.processMessage) return;

			var params = {
				AttributeNames: ["SentTimestamp"],
				MaxNumberOfMessages: 1,
				MessageAttributeNames: ["All"],
				QueueUrl: this.queueURL
			};

			this.sqs.receiveMessage(params, this.receiveMessage.bind(this));
		}
	}, {
		key: 'process',
		value: function process(command, func) {
			this.commands[command] = func;

			if (!this.processMessage) {
				this.processMessage = true;
				this.poll();
			}
		}
	}, {
		key: 'shutdown',
		value: function shutdown(delay, callback) {
			this.processMessage = false;
			setTimeout(callback, delay);
			return this;
		}
	}, {
		key: 'watchStuckJobs',
		value: function watchStuckJobs() {
			return this;
		}
	}]);

	return SQSWorker;
}(EventEmitter);

module.exports = SQSWorker;