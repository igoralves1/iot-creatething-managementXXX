'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))

async function test_fnRequestAccountAssocEmail(params) {
    
}

module.exports.fnAutomatedTests = async (event) => {
    try {

        console.log("🚀 1 - event:", event)
        const retval = event.retval
        console.log("🚀 2 - retval:", retval)
        const topic = event.topic
        console.log("🚀 3 - topic:", topic)
        const res = topic.split("/")
        console.log("🚀 4 - res:", res)
        
        const topicPayload = JSON.parse(event.body)

        // TODO redesign all tests opitions 
        // const schema = Joi.object({
        //     serialNumber: Joi.string().alphanum().max(20).required(),
        //     privateKey: Joi.string().min(53).max(53).required(),
        //     macAddress: Joi.string().max(23).required()
        // })
        // const { error, value } = schema.validate(topicPayload)
        // 
        // if (!(typeof error === 'undefined')) {
 
        // } else {

        // }


        
        let params = {
            topic: let publishTopic = `${MQTT_TOPIC_ENV}/scican/rsp/automated_tests`,
            payload: '{"result":"JSON validation error. "}',
            // payload: payload,
            qos: '0'
        };
        await publishMqtt(params)

    


    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


