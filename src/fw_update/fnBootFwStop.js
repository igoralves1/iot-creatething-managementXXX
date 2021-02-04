'use strict'
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


async function InsertIntoDB(serialNumber, status, pid) {
    try {
        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const sql = `INSERT INTO firmware_update_history (serial_number, update_in_progress, pid) VALUES ('${serialNumber}', ${status}, '${pid}');`
        console.log('sql')
        console.log(sql)
        const sqlResult = await pool.query(sql)
        return sqlResult

    } catch (error) {
        return {
            success: false,
            message: "Insert to Mysql Failure",
            error: error
        }
    }
}

module.exports.fnBootFwStop = async event => {

    //! Test in MQTT - P/MSSTER/AAABBB/CAN/RSP/boot_fw_stop/PROCESS_1750_v1-7_1234567890
    console.log("🚀 1 - event:", event)
    const topic = event.topic
    console.log("🚀 2 - topic:", topic)
    const res = topic.split("/")
    console.log("🚀 3 - res:", res)
    const serialNumber = res[2]
    console.log("🚀 5 - serialNumber:", serialNumber)
    const str_process_chunkNb_version_pid = res[6]
    console.log("🚀 6 - str_process_chunkNb_version_pid:", str_process_chunkNb_version_pid)
    const arr_process_chunkNb_version_pid = str_process_chunkNb_version_pid.split("_")
    console.log("🚀 7 - arr_process_chunkNb_version_pid:", arr_process_chunkNb_version_pid)
    const process = arr_process_chunkNb_version_pid[0]
    console.log("🚀 8 - process:", process)
    const chunkNb = arr_process_chunkNb_version_pid[1]
    console.log("🚀 9 - chunkNb:", chunkNb)
    const version = arr_process_chunkNb_version_pid[2]
    console.log("🚀 10 - version:", version)
    const pid = arr_process_chunkNb_version_pid[3]
    console.log("🚀 11 - pid:", pid)
    const sqlResult = await InsertIntoDB(serialNumber,1,pid);
    console.log("sqlResult", sqlResult)
}