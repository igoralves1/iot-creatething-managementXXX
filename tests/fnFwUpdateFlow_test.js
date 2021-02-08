'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
console.log("🚀 MQTT_TOPIC_ENV:", MQTT_TOPIC_ENV)

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

module.exports.fnFwUpdateFlow_test = async (event) => {
    try {
        
        // TODO Decide later about the validation
        // const jsonBody = JSON.parse(event.body)

        // const schema = Joi.object({
        //     topic: Joi.string().required(),
        //     payload: Joi.string().required()
        // })

        // const { error, value } = schema.validate(jsonBody)

        // if (!(typeof error === 'undefined')) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({ 'message':'The provided JSON is not valid' })
        //     }
        // }

        // const { topic, payload } = jsonBody

        // TODO This is the JSON String to be published 
        /*
        {"topic": "testpub/1", "payload": "{'tes':'igor'}"}
        But this JSON doesn't work.

        This is the JSON that works and should be published:
        '{"ddd":"zzz"}',
        */

        //! NOTE: Use iot-pubSub-tests-NodeJs: node post.js to publish.
        //! If we use POSTMAN the JSON string is not well configured - we will have the follow error in the MQTT broker (We cannot display the message as JSON, and are instead displaying it as UTF-8 String.)
    
        console.log("🚀 1 - event:", event)
        let topic = event.topic
        console.log("🚀 2 - topic:", topic)
        let payload = event.message
        console.log("🚀 3 - payload:", payload)
        
        topic = `${MQTT_TOPIC_ENV}/scican/rsp/fnFwUpdateFlow_test`
        console.log("🚀 4 - publishTopic_test:", topic)
         
        let params = {
            topic: '{"ddd":"zzz"}',
            payload: payload,
            // payload: payload,
            qos: '0'
        };
        console.log("🚀 5 - params:", params)
        let respPublishMqtt = await publishMqtt(params)
        console.log("🚀 6 - respPublishMqtt:", respPublishMqtt)

        // P/MSSTER/AJCPA009/CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890
        
        // payload = {
        //     "path": "CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890",
        //     "data": {
        //         "node": "PROCESS",
        //         "config": "ref_table=7A620000;Bravo G4 17;AJA;2;5;1;17;230;1000;2300;50;2000;1700;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;1171201483\r\n7A620020;Bravo G4 17;AJA;2;5;1;17;230;1000;2300;60;2000;1700;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;1393637756\r\n7A621000;Bravo G4 22;AJB;2;5;1;22;230;1000;2300;50;2000;2000;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;31152822107A621020;Bravo G4 22;AJB;2;5;1;22;230;1000;2300;60;2000;2000;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;2943437717\r\n7A622000;Bravo G4 28;AJC;2;5;1;28;230;1000;2300;50;2000;2300;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;115575373\r\n7A622020;Bravo G4 28;AJC;2;5;1;28;230;1000;2300;60;2000;2300;1;3;0;0;2;0;0;1;0;0;1;1;0;0;1;1;1;0;1;1;0;0;0;272477946",
        //         "quiet": "1"
        //     }
        // }
        payload = {
            "path": "test",
            "data": {
                "machine_type": "aa
                bb
                cc
                dd",
                "model": "1"
            }
        }
        console.log("🚀 typeof payload:", typeof payload)
        console.log("🚀 typeof payload:", typeof JSON.stringify(payload))
        



        params = {
            topic: `${MQTT_TOPIC_ENV}/MSSTER/AJCPA009/CAN/CMD/boot_fw_start/PROCESS_0_v1-8-60_1234567890`,
            // payload: JSON.stringify(payload),
            payload: ${payload}`, 
            qos: '0'
        };
        console.log("🚀 7 - params:", params)
        respPublishMqtt = await publishMqtt(params)
        console.log("🚀 8 - respPublishMqtt:", respPublishMqtt)

    } catch (error) {
            
    }

}