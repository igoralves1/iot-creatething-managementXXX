'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const BUCKET = process.env.BUCKET_FIRMWARE
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

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

module.exports.fnBootFwStart = async event => {

    /*

    Then a window will popup in the machine -> press yes ->
    Then the machine will publish te follow topic:

    P/MSSTER/AJCPA009/CAN/RSP/boot_fw_start/PROCESS_0_v1-8-60_1234567890
    {
        "path" : "CAN/RSP/boot_fw_start/PROCESS_0_v1-8-60_1234567890",
        "retval" : 0
    }

    AND 

    P/MSSTER/AJCPA009/CAN/RSP/boot_fw_start/CLOUD_0_v1-8-60_1234567890
    {
        "path" : "CAN/RSP/boot_fw_start/CLOUD_0_v1-8-60_1234567890",
        "retval" : 0
    }

    This function also is trigged by  the following topic:
    
    This function should publish the following topic:

    P/MSSTER/AJAPA001/CAN/CMD/boot_fw_write/PROCESS_0_v1-8-60_1234567890
    {
        "path":"CAN/CMD/boot_fw_write/PROCESS_0_vx-x-xx_1234567890",
        "data":{
            "raw":"02550...",
            "addr":0
        }
    }

    AND

    P/MSSTER/AJAPA001/CAN/CMD/boot_fw_write/CLOUD_0_v1-8-60_1234567890
    {
        "path":"CAN/CMD/boot_fw_write/PCLOUD_0_vx-x-xx_1234567890",
        "data":{
            "raw":"02550...",
            "addr":0
        }
    }
    */

    try {
        console.log("🚀 1 - event:", event)
        const retval = event.retval
        console.log("🚀 2 - retval:", retval)
        const topic = event.topic
        console.log("🚀 3 - topic:", topic)
        const res = topic.split("/")
        console.log("🚀 4 - res:", res)
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

        if (retval === "0") {
            console.log("🚀 12 - IF retval == 0:", retval)

            let key = version + '/' + process + `/${chunkNb}.json`
            console.log("🚀 13 - key:", key)
            let chunk = await getObject(BUCKET, key)
            console.log("🚀 14 - chunk:", chunk)
            let bodyJson = JSON.parse(chunk)
            console.log("🚀 15 - bodyJson:", bodyJson)
    
            bodyJson.path = `CAN/CMD/boot_fw_write/${process}_${chunkNb}_${version}_${pid}`
            console.log("🚀 16 - bodyJson:", bodyJson)
            let publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}_${chunkNb}_${version}_${pid}`
            console.log("🚀 17 - publishTopic:", publishTopic)
    
            var params = {
                topic: publishTopic,
                payload: JSON.stringify(bodyJson), 
                qos: '0'
            };
            console.log("🚀 18 - params:", params)
            const respPublishMqtt = await publishMqtt(params)
            console.log("🚀 19 - respPublishMqtt:", respPublishMqtt)
        }else {
            //TODO if retval === "16 " => user denied. Save in RDS
            //TODO if retval === "14 " => user did not see the message.
            //TODO if any other vals === RETRY.
            let updateFirmwareFail = await updateFirmwareFail(serialNumber, process, chunkNb, version, pid, retval)    
            console.log("🚀 20 - updateFirmwareFail:", updateFirmwareFail)
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
    }
}