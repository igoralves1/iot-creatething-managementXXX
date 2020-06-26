'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const BUCKET = process.env.BUCKET_FIRMWARE

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

let getObject = async (bucket, key) => {
    try {
        const params = {
            Bucket: bucket,
            Key: key
        }

        const data = await S3.getObject(params).promise()
        const res = data.Body.toString('utf-8')

        return res
    } catch (e) {
        throw new Error(`Could not retrieve file from S3: ${e.message}`)
    }
}

module.exports.fnBootFwStart = async event => {

    //! Forin AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_start/PROCESS_v1-7/0
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]
    const str_process_version = res[6]
    const arr_process_version = str_process_version.split("_")
    const process = arr_process_version[0]
    const version = arr_process_version[1]
    const chunkNb = res[7]
    let key = version + '/' + process + `/${chunkNb}.json`
    
    let chunk = await getObject(BUCKET, key)
    let publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}_${version}/${chunkNb}`

    var params = {
        topic: publishTopic,
        payload: chunk, 
        qos: '0'
    };

    await publishMqtt(params)
}