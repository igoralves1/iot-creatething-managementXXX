'use strict'
const AWS = require('aws-sdk')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnVpcTest = async event => {

  let response = {
      "path":`SCICANSYS/fnVpcTest-RSP`,
      "data":{}
  }

  let params = {
      topic: `${MQTT_TOPIC_ENV}/SCICANSYS/fnVpcTest-RSP`,
      payload: JSON.stringify(response),
      qos: '0'
  };

  await publishMqtt(params)
    
}