'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnTestFwUpdate = async (event, context, callback) => {
  
    // TODO Decide later about the validation
    // const jsonBody = JSON.parse(event.body)

    // const schema = Joi.object({
    //     topic: Joi.string().required(),
    //     payload: Joi.string().required()
    // })

    // const { error, value } = schema.validate(jsonBody)

    // if (!(typeof error === 'undefined')) {
    //     return {
    //         statusCode: 401,
    //         body: JSON.stringify({ 'message':'The provided JSON is not valid' })
    //     }
    // }

    // const { topic, payload } = jsonBody

    // TODO This is the JSON String to be published 
    /*
    {"topic": "testpub/1", "payload": "{'tes':'igor'}"}
    But this JSON doesn't work.

    This is the JSON that works and should be published:
    '{"ddd":"zzz"}',
    */

    //! NOTE: Use iot-pubSub-tests-NodeJs: node post.js to publish.
    //! If we use POSTMAN the JSON string is not well configured - we will have the follow error in the MQTT broker (We cannot display the message as JSON, and are instead displaying it as UTF-8 String.)

    // P/MSSTER/AJCPA009/CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890
    let publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890`


    var params = {
        topic: publishTopic,
        // payload: '{"ddd":"zzz"}',
        payload: payload,
        qos: '0'
    };

    await publishMqtt(params)

    const response = {
        "MQTT_status":"Published"
    }

    return {
        statusCode: 200,
        body: JSON.stringify(response)
    }
}