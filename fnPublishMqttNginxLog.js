'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MongoClient = require('mongodb').MongoClient


const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


async function postMongo (params) {
    try {
        const url = `mongodb://igoralves3:aBc14012007@34.222.226.195:27017`
        const mc     = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        const db     = await mc.db('sicanphplogs');
        const coll   = await db.collection('accesslogs')
        const q      = await coll.insertOne(params);
        mc.close();
        return q
    } catch (error) {
        return error
    }
}


module.exports.fnPublishMqttNginxLog = async (event) => {

    const jsonBody = JSON.parse(event.body)
    const strBody = JSON.stringify(jsonBody)

    let arrstrip = strBody.match(/(\d{1,3}(?:\.\d{1,3}){3})[\s-]+\[([^\]\[]+)]\s+'([A-Z]+)\s+([^\s']+)/gm);
    
    let myarr = arrstrip[0].split(" ");
    let ip = myarr[0]
    console.log("ip", ip)
    let dtraw = myarr[3]
    let dt = dtraw.replace(/\[/,'')
    console.log("dt",dt )
    let metRaw = myarr[5]
    let method = metRaw.replace(/\'/gi,'')
    console.log("method",method)
    let endpoint = myarr[6]
    console.log("endpoint",endpoint )


    // const { payload } = jsonBody

    // TODO This is the JSON String to be published 
    /*
    {"topic": "testpub/1", "payload": "{'tes':'igor'}"}
    But this JSON doesn't work.

    This is the JSON that works and should be published:
    '{"ddd":"zzz"}',
    */

    //! NOTE: Use iot-pubSub-tests-NodeJs: node post.js to publish.
    //! If we use POSTMAN the JSON string is not well configured - we will have the follow error in the MQTT broker (We cannot display the message as JSON, and are instead displaying it as UTF-8 String.)



    const info = {
        'ip':ip,
        'dt':dt,
        'method':method,
        'endpoint':endpoint
      }

    await postMongo(info)

    var params = {
        // topic: topic,
        topic: 'fnPublishMqttNginxLog',
        payload: JSON.stringify(info),
        qos: '0'
    };

    console.log('param', params)

    await publishMqtt(params)

    const response = {
        "MQTT_status":"Published"
    }

    return {
        statusCode: 200,
        body: JSON.stringify(response)
    }
}