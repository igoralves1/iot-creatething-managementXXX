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

    try {
        const jsonBody = JSON.parse(event.body)
        const strBody = JSON.stringify(jsonBody)

        let arrstrip = strBody.match(/(\d{1,3}(?:\.\d{1,3}){3})[\s-]+\[([^\]\[]+)]\s+'([A-Z]+)\s+([^\s']+)/gm);
        
        let myarr = arrstrip[0].split(" ");

        let ip = myarr[0]
        let dtraw = myarr[3]
        let dt = dtraw.replace(/\[/,'')
        let metRaw = myarr[5]
        let method = metRaw.replace(/\'/gi,'')
        let endpoint = myarr[6]

        let info = {
            'ip':ip,
            'dt':dt,
            'method':method,
            'endpoint':endpoint
        }

        await postMongo(info)

        var params = {
            topic: 'fnPublishMqttNginxLog',
            payload: JSON.stringify(info),
            qos: '0'
        };

        await publishMqtt(params)

        return {
            statusCode: 200,
            body: JSON.stringify({"MQTT_status":"Published"})
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify(error)
        }
    }
}