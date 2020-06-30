'use strict'
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const sleep = require('util').promisify(setTimeout)
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnBootFwStopPROCESS = async event => {

    //! Test in MQTT - P/MSSTER/AAABBB/CAN/RSP/boot_fw_stop/PROCESS/3515_v1-7_1234567890
    
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]

    const str_chunkNb_version_pid = res[7]
    const arr_chunkNb_version_pid = str_chunkNb_version_pid.split("_")
    const version = arr_chunkNb_version_pid[1]
    const pid = arr_chunkNb_version_pid[2]
    
    await sleep(600000)

    let response = {
        "path":`CAN/CMD/boot_fw_start/CLOUD/0_${version}_${pid}`,
        "data":{
            "node":"CLOUD"
        }
    }

    let params = {
    topic: `P/MSSTER/${serialNumber}/CAN/CMD/boot_fw_start/CLOUD/0_${version}_${pid}`,
    payload: JSON.stringify(response),
    qos: '0'
    };
    await publishMqtt(params)

}