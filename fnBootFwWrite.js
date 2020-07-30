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
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            console.log("When hit the last chunk - call stop topic")
            return false
        }
    }
}

async function updateFirmwareFail (serialNumber, process, chunkNb, version, pid, retval) {
    let topic = `${MQTT_TOPIC_ENV}/SCICANSYS/${serialNumber}/CAN/CMD/return_code_fw_fail/${process}_${chunkNb}_${version}_${pid}`

    let response = {
        "path" : `CAN/CMD/return_code_fw_fail/${process}_${chunkNb}_${version}_${pid}`,
        "retval": retval
    }

    let params = {
        topic: topic,
        payload: JSON.stringify(response),
        qos: '0'
    };
    
    await publishMqtt(params)
}


module.exports.fnBootFwWrite = async event => {

    // This function is trigged by the topic boot_fw_write/${process}_${chunkNb}_${version}_${pid}/1234567890 
    // and replies into the topic boot_fw_write/${process}_${chunkNb+1}_${version}_${pid} 
    // (NEXT CHUNK) if exists. If not (the chunkNb is the last one) it will reply into the topic
    // boot_fw_stop/${process}_${chunkNb}_${version}_${pid}
    
    //* Current version v1-8-22
    //? MQTT_TOPIC_ENV = D
    //! AWS IoT-Core Broker Tests - D/MSSTER/APBCDF/CAN/RSP/boot_fw_write/PROCESS_0_v1-8-22_1593442883
    //! {"path": "CAN/RSP/boot_fw_write/PROCESS_0_v1-8-22_1234567890","retval": "0"}
    //! AWS IoT-Core Broker Tests - D/MSSTER/APBCDF/CAN/RSP/boot_fw_write/CLOUD_0_v1-8-22_1234567890
    //! {"path": "CAN/RSP/boot_fw_write/CLOUD_0_v1-8-22_1234567890","retval": "0"}

    //* Must check the last chunk for each version
    //* v1-7 last chunk (CLOUD-1764) and (PROCESS-3515)
    //* v1-8-22 last chunk (CLOUD-1850) and (PROCESS-3539)
    // ! Test last chunk CLOUD - D/MSSTER/ASDER/CAN/RSP/boot_fw_write/CLOUD_1850_v1-8-22_1593442883   => Should publish "path": "CAN/CMD/boot_fw_stop/CLOUD_1850_v1-8-22_1593442883"
    //! {"path": "CAN/RSP/boot_fw_stop/CLOUD_1850_v1-8-22_1234567890","retval": "0"}
    // ! Test last chunk PROCESS - D/MSSTER/ASDER/CAN/RSP/boot_fw_write/PROCESS_3539_v1-8-22_1234567890 => Should publish "path": "CAN/CMD/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890"
    //! {"path": "CAN/RSP/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890","retval": "0"}
    
    //? MQTT_TOPIC_ENV = P
    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_write/PROCESS_0_v1-8-22_1593442883
    //! {"path": "CAN/RSP/boot_fw_write/PROCESS_0_v1-8-22_1234567890","retval": "0"}
    //! AWS IoT-Core Broker Tests - P/MSSTER/APBCDF/CAN/RSP/boot_fw_write/CLOUD_0_v1-8-22_1234567890
    //! {"path": "CAN/RSP/boot_fw_write/CLOUD_0_v1-8-22_1234567890","retval": "0"}

    // ! Test last chunk CLOUD - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/CLOUD_1850_v1-8-22_1593442883   => Should publish "path": "CAN/CMD/boot_fw_stop/CLOUD_1850_v1-8-22_1593442883"
    //! {"path": "CAN/RSP/boot_fw_stop/CLOUD_1850_v1-8-22_1234567890","retval": "0"}
    // ! Test last chunk PROCESS - P/MSSTER/ASDER/CAN/RSP/boot_fw_write/PROCESS_3539_v1-8-22_1234567890 => Should publish "path": "CAN/CMD/boot_fw_stop/PROCESS_3539_v1-8-22_1234567890"
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
        let nextChunk = parseInt(chunkNb) + 1
        const key = version + '/' + process + `/${nextChunk}.json`
        let chunk = await getObject(BUCKET, key)
        let publishTopic = ''
        

        if (typeof chunk == 'undefined') {
            publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_stop/${process}_${chunkNb}_${version}_${pid}`
            chunk = JSON.stringify({"path" : `CAN/CMD/boot_fw_stop/${process}_${chunkNb}_${version}_${pid}`})
        } else {
            publishTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/boot_fw_write/${process}_${nextChunk}_${version}_${pid}`
            let bodyJson = JSON.parse(chunk)
            console.log("bodyJson", bodyJson)
            bodyJson.path = `CAN/CMD/boot_fw_write/${process}_${nextChunk}_${version}_${pid}`
            chunk = JSON.stringify(bodyJson)
            console.log("chunk", chunk)
        }

        var params = {
            topic: publishTopic,
            payload: chunk, 
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