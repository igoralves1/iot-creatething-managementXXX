'use strict';
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


module.exports.fnRequestMachineInfo = async event => {


    //? MQTT_TOPIC_ENV = P
    //! This function is listening P/scican/sys/cmd/fnCreateThing/${serialNumber}/${scuuid} from fnCreateThing
    
    //? MQTT_TOPIC_ENV = D
    //! This function is listening D/scican/sys/cmd/fnCreateThing/${serialNumber}/${scuuid} from fnCreateThing
    
    const topic = event.topic
    const res = topic.split("/")
    const serialNumber = res[5]
    const scuuid = res[6]


    const mqttParams = {
        topic: `aab`,
        payload: '{"hh":"pp"}',
        qos: '0'
    };
    await publishMqtt(mqttParams)

    // Publish MQTT    
    const mqttTopic = `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/ENV/CONFIG_MACHINE`
    const payLoadJSON = {
        'topic' : mqttTopic,
        'payload' : sqlResult
    }
    
    const mqttParams = {
        topic: mqttTopic,
        payload: JSON.stringify(payLoadJSON),
        qos: '0'
    };

    await publishMqtt(mqttParams)

}