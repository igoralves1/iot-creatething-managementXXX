'use strict'
const AWS = require('aws-sdk')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

// https://www.serverless.com/framework/docs/providers/aws/events/schedule/
// https://www.serverless.com/blog/cron-jobs-on-aws/
// https://github.com/chief-wizard/serverless-cron-job-example
// https://stackoverflow.com/questions/57624100/how-to-run-cron-in-serverless-for-every-minute
// https://www.serverless.com/framework/docs/providers/aws/events/schedule/
// https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
// cron(0/1 * * * ? *) Each 1 min

module.exports.fnCron = async (event, context, callback) => {

    let params = {
        topic: `fnLambdaCron/today`,
        payload: JSON.stringify({"attr":"cron"}),
        qos: '0'
    };
    await publishMqtt(params)
}
