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

    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_start/PROCESS/0_v1-7_1593442883
    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_start/CLOUD/0_v1-7_1234567890
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]
    const process = res[6]
    const str_chunkNb_version_pid = res[7]
    const arr_chunkNb_version_pid = str_chunkNb_version_pid.split("_")
    const chunkNb = arr_chunkNb_version_pid[0]
    const version = arr_chunkNb_version_pid[1]
    const pid = arr_chunkNb_version_pid[2]
    
    let key = version + '/' + process + `/${chunkNb}.json`
    
    let chunk = await getObject(BUCKET, key)
    let bodyJson = JSON.parse(chunk)

    bodyJson.path = `CAN/CMD/boot_fw_write/${process}/${chunkNb}_${version}_${pid}`

    let publishTopic = `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}/${chunkNb}_${version}_${pid}`

    var params = {
        topic: publishTopic,
        payload: JSON.stringify(bodyJson), 
        qos: '0'
    };

    await publishMqtt(params)
}