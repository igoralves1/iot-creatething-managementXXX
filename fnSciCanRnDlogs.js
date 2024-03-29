'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MongoClient = require('mongodb').MongoClient
const https = require('https')
const { v4: uuidv4 } = require('uuid');
const { table } = require('console');

// Added lower timeout to reduce the running in pending.
AWS.config.update({
    httpOptions: {
        timeout: 5000,
        connectTimeout: 3000
    }
});

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

async function insertMongo (params) {
    try {
        // const url = `mongodb://igoralves3:aBc14012007@34.222.226.195:27017`
        // const mc     = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        // const db     = await mc.db('sicanphplogs');
        // const coll   = await db.collection('accesslogsrnd')
        const url = `mongodb://lambdaSciCanRnDlogs:SO3Tbada$1ads3434FhYhx8ypJ@172.31.34.205:27017/mqtt`
        // const url = `mongodb://root:pay23*3TM0r34Nothin%24@172.31.34.205:27017/mqtt`
        const mc     = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        const db     = await mc.db('mqtt');
        const coll   = await db.collection('topics_data')
        const q      = await coll.insertOne(params);
        mc.close();
        return q
    } catch (error) {
        return error
    }
}

async function insertMongoAtlas (params) {
    try {
        //Compass -> mongodb://igoralves1:aBc14012007@cluster0-shard-00-00.aqcof.mongodb.net:27017,cluster0-shard-00-01.aqcof.mongodb.net:27017,cluster0-shard-00-02.aqcof.mongodb.net:27017/test?replicaSet=Cluster0-shard-0&ssl=true&authSource=admin
        //           mongodb://localhost:27017/?readPreference=primary&ssl=false
        const url = `mongodb+srv://igoralves1:aBc14012007@cluster0.aqcof.mongodb.net/rEdSiCanDB?retryWrites=true&w=majority`
        const mc     = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        const db     = await mc.db('rEdSiCanDB');
        const coll   = await db.collection('accesslogsrnd')
        const q      = await coll.insertOne(params);
        mc.close();
        return q
    } catch (error) {
        return error
    }
}

async function uploadToS3 (keyName, mybody) {
    const objectParams = { Bucket: process.env.BUCKET_SCICAN_RND_LOGS, Key: keyName, Body: mybody }
    await S3.putObject(objectParams).promise().then(function (data) {
        // console.log('Successfully uploaded data to ' + process.env.BUCKET_SCICAN_RND_LOGS)
        // console.log(JSON.stringify(data))
    }).catch(function (err) {
        console.log('Error on uploadPromise')
        console.error(err, err.stack)
    })
}

module.exports.fnSciCanRnDlogs = async (event) => {
    try {

        console.log("🚀 1 - event:", event)
        const topic = event.topic
        console.log("🚀 2 - topic:", topic)
        const awsRequestId = uuidv4()
        console.log("🚀 3 - awsRequestId:", awsRequestId)
        
        let repInsertMongo = await insertMongo(topic)
        console.log("🚀 5 - repInsertMongo:", repInsertMongo);
        // let respUploadToS3 = await uploadToS3(`${awsRequestId}.json`, JSON.stringify(topic))
        // console.log("🚀 4 - respUploadToS3:", respUploadToS3);
        // await insertMongoAtlas(topic)
        
        // let info = {
        //     'ipz':'test',
        //     'dtz':'test',
        //     'methodz':'test',
        //     'endpointz':'test'
        // }
        
        // var params = {
        //     topic: 'fnSciCanRnDlogs',
        //     payload: JSON.stringify(info),
        //     qos: '0'
        // };
        // await publishMqtt(params)

    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


