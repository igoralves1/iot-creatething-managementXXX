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

module.exports.fnBootFwUpdateStartProcess = async event => {

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
        let key = version + `/PROCESS/${chunkNb}.json`
        let chunk = await getObject(BUCKET, key)
        let bodyJson = JSON.parse(chunk)

        bodyJson.path = `CAN/CMD/boot_fw_write/PROCESS_${chunkNb}_${version}_${pid}`

        let publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/PROCESS_${chunkNb}_${version}_${pid}`

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