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
    let topic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/return_code_fw_fail/${process}/${chunkNb}_${version}_${pid}`

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


module.exports.fnBootFwStopPROCESS = async event => {

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

        if (process === 'PROCESS') {

            let response = {
                "path":`CAN/CMD/boot_fw_start/CLOUD_FWUP_START_${version}_${pid}`,
                "data":{
                    "node":"CLOUD"
                }
            }

            let params = {
                topic: `${MQTT_TOPIC_ENV}/SCICANSYS/${serialNumber}/CAN/CMD/boot_fw_start/CLOUD_FWUP_0_${version}_${pid}`,
                payload: JSON.stringify(response),
                qos: '0'
            };

            await publishMqtt(params)

            await sleep(300000)//5 min

            //? MQTT_TOPIC_ENV = D
            //! Test in MQTT - D/P/MSSTER/AJAPA004/CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890
            //! {"path":"CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890","data":{"node":"CLOUD"}}
            
            //? MQTT_TOPIC_ENV = P
            //! Test in MQTT - P/MSSTER/AJAPA004/CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890
            //! {"path":"CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890","data":{"node":"CLOUD"}}
            
            /*
            Then the machine will publish te follow topic:
            P/MSSTER/AJAPA001/CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/123456789
            {
                "path": "CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/123456789",
                "sn": "AJAPA001",
                "retval": "0"
            }

            This topic will trigger the fnBootFwStart Lambda process for CLOUD FW UPDATE
            */


            /*
            Forcing a independent process

            P/MSSTER/AJC00067/CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890
            {"path":"CAN/CMD/boot_fw_start/CLOUD_0_v1-8-22_1234567890","data":{"node":"CLOUD"}}
            

            P/MSSTER/AJCPA009/CAN/CMD/CONFIG_MACHINE
{
    "path" : "CAN/CMD/CONFIG_MACHINE",
    "data" : {}
}
            
            
            
            */

            response = {
                "path":`CAN/CMD/boot_fw_start/CLOUD_0_${version}_${pid}`,
                "data":{
                    "node":"CLOUD"
                }
            }

            params = {
            topic: `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_start/CLOUD_0_${version}_${pid}`,
            payload: JSON.stringify(response),
            qos: '0'
            };
            await publishMqtt(params)
        }
        if (process === 'CLOUD') {

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