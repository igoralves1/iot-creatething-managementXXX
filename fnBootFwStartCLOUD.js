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

    Machine 1: (WiFi)
    Ref-7A620000
    S#-AJAPA001
    
    Machine 2: (Ethernet)
    Ref-7A621000
    S#-AJBPA004
    
    Machine 3: (WiFi)
    Ref-7A622000
    S#: AJCPA009

    Version: v1-8-59
    CLOUD   - 1850
    PROCESS - 3539

    This is the first topic sent by the front-end for the CLOUD update
    P/MSSTER/AJAPA001/CAN/CMD/boot_fw_start/CLOUD_0_v1-8-59_1234567890
{
    "path" : "CAN/CMD/boot_fw_start/CLOUD_0_v1-8-59_1234567890",
    "data" : {
        "node" : "CLOUD"
    }
}

    Then the machine will publish te follow topic:
    P/MSSTER/AJAPA001/CAN/RSP/boot_fw_start/PROCESS_0_v1-8-22_1234567890/123456789
{
    "path": "CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/123456789",
    "sn": "AJAPA001",
    "retval": "0"
}

    */

    //! Check with Leonardo - The front-end and the machine will never trigger MQTT_TOPIC_ENV = D

    //? MQTT_TOPIC_ENV = D
    //! AWS IoT-Core Broker Tests - D/MSSTER/APBCDF/CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/1234567890
    //! {"path": "CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/1234567890","retval": "0"}
    
    //? MQTT_TOPIC_ENV = P
    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/1234567890
    //! {"path": "CAN/RSP/boot_fw_start/CLOUD_0_v1-8-22_1234567890/1234567890","retval": "0"}

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
        let key = version + '/' + process + `/${chunkNb}.json`
        let chunk = await getObject(BUCKET, key)
        let bodyJson = JSON.parse(chunk)

        bodyJson.path = `CAN/CMD/boot_fw_write/${process}_${chunkNb}_${version}_${pid}`

        let publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}_${chunkNb}_${version}_${pid}`

        var params = {
            topic: publishTopic,
            payload: JSON.stringify(bodyJson), 
            qos: '0'
        };
        await publishMqtt(params)
    }else {
        //TODO if retval === "16 " => user denied. Save in RDS
        //TODO if retval === "14 " => user did not see the message.
        //TODO if any other vals === RETRY.
        await updateFirmwareFail(serialNumber, process, chunkNb, version, pid, retval)    
    }
}