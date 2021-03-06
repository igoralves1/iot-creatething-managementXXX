'use strict'
const AWS = require('aws-sdk')
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MongoClient = require('mongodb').MongoClient
const https = require('https')


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

async function postMongoAtlas (params) {
    try {
        //Compass -> mongodb://igoralves1:aBc14012007@cluster0-shard-00-00.aqcof.mongodb.net:27017,cluster0-shard-00-01.aqcof.mongodb.net:27017,cluster0-shard-00-02.aqcof.mongodb.net:27017/test?replicaSet=Cluster0-shard-0&ssl=true&authSource=admin
        //           mongodb://localhost:27017/?readPreference=primary&ssl=false
        const url = `mongodb+srv://igoralves1:aBc14012007@cluster0.aqcof.mongodb.net/rEdSiCanDB?retryWrites=true&w=majority`
        const mc     = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        const db     = await mc.db('rEdSiCanDB');
        const coll   = await db.collection('accesslogs')
        const q      = await coll.insertOne(params);
        mc.close();
        return q
    } catch (error) {
        return error
    }
}

async function httpsGet(params) {
    try {
        return true
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
        await postMongoAtlas(info)

        var params = {
            topic: 'fnPublishMqttNginxLog',
            payload: JSON.stringify(info),
            qos: '0'
        };

        // await publishMqtt(params)

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