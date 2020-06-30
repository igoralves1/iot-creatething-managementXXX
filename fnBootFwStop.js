'use strict'
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})

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

    //! Test in MQTT - P/MSSTER/AAABBB/CAN/RSP/boot_fw_stop/PROCESS/1750_v1-7_1234567890
    
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]
    const process = res[6]

    const str_chunkNb_version_pid = res[7]
    const arr_chunkNb_version_pid = str_chunkNb_version_pid.split("_")
    const chunkNb = arr_chunkNb_version_pid[0]
    const version = arr_chunkNb_version_pid[1]
    const pid = arr_chunkNb_version_pid[2]
    
    const sqlResult = await InsertIntoDB(serialNumber,1,pid);
    console.log("sqlResult", sqlResult)

}