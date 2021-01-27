'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const BUCKET = process.env.BUCKET_FIRMWARE
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

async function getFwVersion (versionStr){

    console.log("🚀 versionStr:", versionStr)
    const arrVersionStr = versionStr.split(' ') 
    console.log("🚀 arrVersionStr:", arrVersionStr)
    const version = arrVersionStr[0]
    console.log("🚀 version:", version)
    const arrVersion = version.split('.') 
    console.log("🚀 arrVersion:", arrVersion)

    let p0 = arrVersion[0]
    console.log("🚀 p0:", p0)
    let p1 = arrVersion[1]
    console.log("🚀 p1:", p1)
    let p2 = arrVersion[2]
    console.log("🚀 p2:", p2)

    let rp1 = p1.replace(/^0+/,'')
    console.log("🚀 rp1:", rp1)
    let rp2 = p2.replace(/^0+/,'')
    console.log("🚀 rp2:", rp2)

    return `v${p0}-${rp1}-${rp2}`
}

module.exports.fnBootFwUpdateDone = async event => {
/* 
    This function is trigged when the FW UPDATE PROCESS is DONE. 
    The PROCESS FW UPDATE publishes the in the follow topic:
    NOTE: Final chunk: CLOUD_1855_v1-8-60, PROCESS_3543_v1-8-60
    
    P/MSSTER/AJCPA009/CAN/ENV/FW_UPDATE_DONE/123
    {
        "path": "CAN/EVN/FW_UPDATE_DONE",
        "sn": "AJCPA009",
        "data": {
            "node": "PROCESS",
            "version": "1.08.0060 Nov 19 2020 - 1.8.18"
        }
    }
*/
    try {
        console.log("🚀 1 - fnBootFwUpdateDone-event:", event)

        const topic = event.topic
        console.log("🚀 2 - topic:", topic)

        const serialNumber = event.sn
        console.log("🚀 3 - serialNumber:", serialNumber)

        const node = event.data.node
        console.log("🚀 4 - node:", node)

        const fwVersion = await getFwVersion(event.data.version)
        console.log("🚀 5 - fwVersion:", fwVersion)
        
        const chunkNb = 0
        const pid = 123

        let CMD = ''
        let params = ''

        if (node === 'PROCESS') { // PROCESS FW UPDATED DONE -> Starts CLOUD UPDATE
            CMD = 'boot_fw_start'
            console.log("🚀 6 - CMD:", CMD)
            let path = `CAN/CMD/${CMD}/CLOUD_${chunkNb}_${fwVersion}_${pid}`
            console.log("🚀 7 - path:", path)
            let bodyJson = {
                "path" : path,
                "data" : {
                    "node" : "CLOUD",
                    "quiet" : "1"    
                }
            }
            params = {
                topic: `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/${path}`,
                payload: JSON.stringify(bodyJson), 
                qos: '0'
            };
            console.log("🚀 8 - params:", params)
        } else { // PROCESS and CLOUD FW UPDATED DONE -> Do something -> Send information to WEB
            CMD = 'fw_update_cloud_done'
            console.log("🚀 9 - CMD:", CMD)
            let path = `CAN/EVN/${CMD}/CLOUD_${chunkNb}_${fwVersion}_${pid}`
            console.log("🚀 10 - path:", path)
            let bodyJson = {
                "path" : path
            }
            params = {
                topic: `${MQTT_TOPIC_ENV}/SCICAN/${serialNumber}/${path}`,
                payload: JSON.stringify(bodyJson), 
                qos: '0'
            };
            console.log("🚀 11 - params:", params)
        }
        let respPublishMqtt = await publishMqtt(params)
        console.log("🚀 12 - respPublishMqtt:", respPublishMqtt)
    } catch (error) {
        console.log("🚀 0 - error:", error)
        // await updateFirmwareFail(serialNumber, process, chunkNb, fwVersion, pid, retval)
    }
}