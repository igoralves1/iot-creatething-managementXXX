'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const { deleteS3, getObject } = require('./tools/s3')

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


module.exports.fnSyncMissingCyclesMQTT = async (event) => {
    try {
        console.log('🚀 START fnSyncMissingCyclesMQTT')
        const timeStart = new Date().toISOString()
        console.log('🚀 getMissingCycles-timeStart:', timeStart)
        console.log('🚀 event: ', event)

        const bucket = event.Records[0].s3.bucket.name
        console.log('🚀 bucket: ', bucket)

        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        console.log('🚀 key: ', key)

        const jsonBody = await getObject({bucket: bucket, Key: key})
        console.log('jsonBody:', jsonBody);
        
        //! NOTE: Use iot-pubSub-tests-NodeJs: node post.js to publish.
        //! If we use POSTMAN the JSON string is not well configured - we will have the follow error in the MQTT broker (We cannot display the message as JSON, and are instead displaying it as UTF-8 String.)

        //! Loop through the array of missing cycles and publish

        for (let i = 0; i < jsonBody.missingCycles.length; i++) {

            const JSON_content = {
                "path": "CLOUD/CMD/UPLOAD_CYCLES",
                "data": {
                "start": jsonBody.missingCycles[i]
            }}
            
            const params = {
                topic: `P/MSSTER/${jsonBody.sn}/CLOUD/CMD/UPLOAD_CYCLES/${new Date().toISOString()}`,
                payload: JSON.stringify(JSON_content),
                qos: '0'
            }
            let mqttPublishResult = await publishMqtt(params)
            console.log('🚀 mqttPublishResult:', mqttPublishResult)
        }

        //! Delete the file event.name
        // https://www.tabnine.com/code/javascript/functions/aws-sdk/S3/deleteObject
        const deleteObjectResponse = await deleteS3({bucket: bucket, Key: key})
        console.log('🚀 deleteObjectResponse: ', deleteObjectResponse)

        const timeEnd = new Date().toISOString()
        console.log('🚀 getMissingCycles-timeEnd:', timeEnd)

      } catch (error) {
        console.log('🚀 fnSyncMissingCyclesMQTT - error.stack:', error.stack)
        return error.stack
      }
}
