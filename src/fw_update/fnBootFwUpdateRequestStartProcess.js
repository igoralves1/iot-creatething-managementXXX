'use strict'
const { IoT1ClickDevicesService } = require('aws-sdk')
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

async function createRef (version,FIRMWARE_BUCKET_NAME) {
    let refConcatenated=''
    const refFile = version + '/ref.ref'
    const ref = await getObject(FIRMWARE_BUCKET_NAME, refFile)
    const refString = ref.toString('utf8')
    // refConcatenated = refString
    let str2arr = refString.split('\n')
    refConcatenated = str2arr.join('\\n')
    // TODO handle the new lines - is not working when publishing in the MQTT broker
    // let arrRef = refString.split('\n')
    // arrRef.shift()
    // for (let i = 0; i < arrRef.length; i++) {
    //     if (arrRef[i] !== '' ) {
    //         let line = arrRef[i]
    //         refConcatenated = refConcatenated + line + '\n'
    //     }
    // }
    return refConcatenated
}




module.exports.fnBootFwUpdateRequestStartProcess = async event => {

    //! This fnction is trigged by the following topics:
    //! P/SCICANSYS/AJCPA009/CAN/CMD/boot_fw_request_start_process/PROCESS_0_vx-x-xx_1234567890
    //! D/SCICANSYS/AJCPA009/CAN/CMD/boot_fw_request_start_process/PROCESS_0_vx-x-xx_1234567890
    //! Q/SCICANSYS/AJCPA009/CAN/CMD/boot_fw_request_start_process/PROCESS_0_vx-x-xx_1234567890
    //! Where vx-x-xx is the version of the FirmWare to witch we want to update. Must to be in the same format of the S3 bucket: 
    //! DEV  - iot-firmware-scican-devig1 - https://s3.console.aws.amazon.com/s3/buckets/iot-firmware-scican-devig1?region=us-east-1&tab=objects 
    //! v1-8-59/
    //! PROD - iot-firmware-scican-prod - https://s3.console.aws.amazon.com/s3/buckets/iot-firmware-scican-prod?region=us-east-1&tab=objects 
    //! v1-8-60/

    /*

    This function is trigged by the following topics:

    P/SCICAN/AJCPA009/CAN/CMD/boot_fw_update_request_start_process/PROCESS_0_v1-8-59_1234567890
    {
        "path" : "CAN/CMD/boot_fw_update_request_start_process/PROCESS_0_v1-8-59_1234567890",
        "data" : {
            "sn" : "AJCPA009",
            "node" : "PROCESS",
        }
    }

    This function should publish the follow topic:

    P/MSSTER/AJCPA009/CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890
    {
        "path" : "CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890",
        "data" : {
            "node" : "PROCESS",
            "config":"ref_table=7A620000;Bravo G4 17;AJA;2;5;1;17;230;1000;2300;50;2000;1700;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;1171201483
    7A620020;Bravo G4 17;AJA;2;5;1;17;230;1000;2300;60;2000;1700;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;1393637756
    7A621000;Bravo G4 22;AJB;2;5;1;22;230;1000;2300;50;2000;2000;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;3115282210
    7A621020;Bravo G4 22;AJB;2;5;1;22;230;1000;2300;60;2000;2000;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;2943437717
    7A622000;Bravo G4 28;AJC;2;5;1;28;230;1000;2300;50;2000;2300;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;115575373
    7A622020;Bravo G4 28;AJC;2;5;1;28;230;1000;2300;60;2000;2300;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;272477946",
            "quiet" : "1"    
        }
    }

    {
        "path": "test",
        "data": {
            "machine_type": "a\
            b\
            c",
            "model": "1"
        }
    }

    */

    try {
        console.log("🚀 1 - event:", event)
        const topic = event.topic
        console.log("🚀 2 - topic:", topic)
        const res = topic.split("/")
        console.log("🚀 3 - res:", res)
        const serialNumber = res[2]
        console.log("🚀 4 - serialNumber:", serialNumber)
        const str_process_chunkNb_version_pid = res[6]
        console.log("🚀 5 - str_process_chunkNb_version_pid:", str_process_chunkNb_version_pid)
        const arr_process_chunkNb_version_pid = str_process_chunkNb_version_pid.split("_")
        console.log("🚀 6 - arr_process_chunkNb_version_pid:", arr_process_chunkNb_version_pid)
        const process = arr_process_chunkNb_version_pid[0]
        console.log("🚀 7 - process:", process)
        const chunkNb = arr_process_chunkNb_version_pid[1]
        console.log("🚀 8 - chunkNb:", chunkNb)
        const version = arr_process_chunkNb_version_pid[2]
        console.log("🚀 9 - version:", version)
        const pid = arr_process_chunkNb_version_pid[3]
        console.log("🚀 10 - pid:", pid)

        let refString = await createRef(version,BUCKET)
        console.log("🚀 11 - refString:", refString)
        let CMD = 'boot_fw_start'
        console.log("🚀 12 - CMD:", CMD)
        let path = `CAN/CMD/${CMD}/PROCESS_${chunkNb}_${version}_${pid}`
        console.log("🚀 13 - path:", path)
        let bodyJson = {
            "path" : path,
            "data" : {
                "node" : "PROCESS",
                "config":`ref_table=${refString}`,
                "quiet" : "1"    
            }
        }
        console.log("🚀 14 - bodyJson:", bodyJson)
        let params = {
            topic: `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/${path}`,
            payload: JSON.stringify(JSON.parse(bodyJson)), 
            qos: '0'
        };
        console.log("🚀 15 - params:", params)
        let respPublishMqtt = await publishMqtt(params)
        console.log("🚀 16 - respPublishMqtt:", respPublishMqtt)
    } catch (error) {
        console.log("🚀 0 - error:", error)
    }
}