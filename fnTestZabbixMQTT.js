'use strict'
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const watchdog = require('./tools/watchdog');
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
    iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnTestZabbixMQTT = async (event, context, callback) => {
    
    const JSON_content = {'testnewLine':'a\\\nb\\\nc'}
    const topic = `d/testnewLine`

    const mqttParams = {
        topic: topic,
        payload: JSON.stringify(JSON_content),
        qos: '0'
        };

    console.log(await publishMqtt(mqttParams))
}