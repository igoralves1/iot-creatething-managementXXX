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

    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_write/PROCESS/0_v1-7_1593442883
    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_write/CLOUD/0_v1-7_1234567890

    // ! Test last chunk CLOUD - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/CLOUD_v1-7/1764   => Should publish "path": "CAN/CMD/boot_fw_stop/CLOUD_v1-7/1764"
    // ! Test last chunk PROCESS - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/PROCESS_v1-7/3515 => Should publish "path": "CAN/CMD/boot_fw_stop/PROCESS_v1-7/3515"

    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]
    const process = res[6]

    const str_chunkNb_version_pid = res[7]
    const arr_chunkNb_version_pid = str_chunkNb_version_pid.split("_")
    const chunkNb = arr_chunkNb_version_pid[0]
    const version = arr_chunkNb_version_pid[1]
    const pid = arr_chunkNb_version_pid[2]

    let nextChunk = parseInt(chunkNb) + 1
    
    const key = version + '/' + process + `/${nextChunk}.json`
    let chunk = await getObject(BUCKET, key)
    let publishTopic = ''
    

    if (typeof chunk == 'undefined') {
        publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_stop/${process}/${chunkNb}_${version}_${pid}`
        chunk = JSON.stringify({"path" : `CAN/CMD/boot_fw_stop/${process}/${chunkNb}_${version}_${pid}`})
    } else {
        publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}/${nextChunk}_${version}_${pid}`
        let bodyJson = JSON.parse(chunk)
        console.log("bodyJson", bodyJson)
        bodyJson.path = `CAN/CMD/boot_fw_write/${process}/${nextChunk}_${version}_${pid}`
        chunk = JSON.stringify(bodyJson)
        console.log("chunk", chunk)
    }

    var params = {
        topic: publishTopic,
        payload: chunk, 
        qos: '0'
    };

    await publishMqtt(params)
}