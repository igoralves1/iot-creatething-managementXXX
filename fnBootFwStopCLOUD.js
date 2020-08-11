'use strict'
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const sleep = require('util').promisify(setTimeout)
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


async function updateFirmwareFail (serialNumber, process, chunkNb, version, pid, retval) {
    let topic = `${MQTT_TOPIC_ENV}/SCICANSYS/${serialNumber}/CAN/CMD/return_code_fw_fail/${process}/${chunkNb}_${version}_${pid}`

    let response = {
        "path" : `CAN/CMD/return_code_fw_fail/${process}/${chunkNb}_${version}_${pid}`,
        "retval": retval
    }

    let params = {
        topic: topic,
        payload: JSON.stringify(response),
        qos: '0'
    };

    await publishMqtt(params)
}


module.exports.fnBootFwStopCLOUD = async event => {

    //* Must check the last chunk for each version
    //* v1-8-22 last chunk (CLOUD-1850) and (PROCESS-3539)

    //? MQTT_TOPIC_ENV = D
    //! Test in MQTT - D/MSSTER/AAABBB/CAN/RSP/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890
    //! {"path": "CAN/RSP/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890","retval": "0"}
    
    //? MQTT_TOPIC_ENV = P
    //! Test in MQTT - P/MSSTER/AAABBB/CAN/RSP/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890
    //! {"path": "CAN/RSP/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890","retval": "0"}
    
    
    const retval = event.retval
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[2]

    const str_process_chunkNb_version_pid = res[6]
    const arr_process_chunkNb_version_pid = str_process_chunkNb_version_pid.split("_")
    const process = arr_process_chunkNb_version_pid[0]
    const chunkNb = arr_process_chunkNb_version_pid[1]
    const version = arr_process_chunkNb_version_pid[2]
    const pid = arr_process_chunkNb_version_pid[3]

    if (retval === "0") {
        if (process === 'CLOUD') {

            //TODO publish a TOPIC to update the database -> CLOUD UPDATE is COMPLETE
            //TODO must create this function to update the database - VPC issues.

            let response = {
                "info":`${MQTT_TOPIC_ENV}/SCICANSYS/${serialNumber}/CAN/CMD/boot_fw_update/CLOUD_FWUP_FINISHED_${version}_${pid}`
            }

            let params = {
                topic: `${MQTT_TOPIC_ENV}/SCICANSYS/${serialNumber}/CAN/CMD/boot_fw_update/CLOUD_FWUP_FINISHED_${version}_${pid}`,
                payload: JSON.stringify(response),
                qos: '0'
            };

            await publishMqtt(params)
        }    
    }else {
        //TODO if retval === "16 " => user denied. Save in RDS
        //TODO if retval === "14 " => user did not see the message.
        //TODO if any other vals === RETRY.
        await updateFirmwareFail(serialNumber, process, chunkNb, version, pid, retval)    
    }
}