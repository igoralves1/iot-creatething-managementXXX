'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: 'a3oug6yeqsiol5-ats.iot.us-east-1.amazonaws.com'});

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
    iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnPublishMqtt = async (event, context, callback) => {
  
    const jsonBody = JSON.parse(event.body)

    const schema = Joi.object({
        topic: Joi.string().required(), // "testpub/1"
        payload: Joi.string().required() // "{'test':'igor'}"
    })

    const { error, value } = schema.validate(jsonBody)

    if (!(typeof error === 'undefined')) {
    return {
        statusCode: 401,
        body: JSON.stringify({ 'message':'The provided JSON is not valid' })
    }
    }

    const { topic, payload } = jsonBody

    var params = {
        topic: topic,
        payload: payload,
        qos: '0'
    };


    await publishMqtt(params)

    const response = await publishMqtt(params)

    return {
        statusCode: 200,
        body: JSON.stringify(response)
    }
}
