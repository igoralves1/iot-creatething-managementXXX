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
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            console.log("When hit the last chunk - call stop topic")
            return false
        }
    }
}

module.exports.fnBootFwWrite = async event => {

    //! AWS IoT-Core Broker Tests - P/MSSTER/+/CAN/RSP/boot_fw_write/CLOUD_v1-7/0
    //! AWS IoT-Core Broker Tests - P/MSSTER/+/CAN/RSP/boot_fw_write/PROCESS_v1-7/0
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]
    const str_process_version = res[6]
    const arr_process_version = str_process_version.split("_")
    const process = arr_process_version[0]
    const version = arr_process_version[1]
    let chunkNb = res[7]

    let nextChunk = parseInt(chunkNb) + 1
    
    const key = version + '/' + process + `/${nextChunk}.json`
    let chunk = await getObject(BUCKET, key)

    let publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}_${version}/${nextChunk}`

    // ! Test last chunck CLOUD - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/CLOUD_v1-7/1764   => Should publish "path": "CAN/CMD/boot_fw_stop/CLOUD_v1-7/1764"
    // ! Test last chunck CLOUD - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/PROCESS_v1-7/3515 => Should publish "path": "CAN/CMD/boot_fw_stop/PROCESS_v1-7/3515"

    if (typeof chunk == 'undefined') {
        publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_stop/${process}_${version}/${chunkNb}`
        chunk = JSON.stringify({"path" : `CAN/CMD/boot_fw_stop/${process}_${version}/${chunkNb}`})
    }

    var params = {
        topic: publishTopic,
        payload: chunk, 
        qos: '0'
    };

    await publishMqtt(params)
}