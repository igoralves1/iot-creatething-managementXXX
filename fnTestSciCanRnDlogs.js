'use strict'
const AWS = require('aws-sdk');
// Added lower timeout to reduce the running in pending.
AWS.config.update({
    httpOptions: {
        timeout: 5000,
        connectTimeout: 3000
    }
});

const S3 = new AWS.S3()
const { v4: uuidv4 } = require('uuid');
const MongoClient = require('mongodb').MongoClient;

async function uploadToS3 (keyName, mybody) {
    const objectParams = { Bucket: process.env.BUCKET_SCICAN_RND_LOGS, Key: keyName, Body: mybody }
    return S3.putObject(objectParams).promise().then(function (data) {
         console.log('Successfully uploaded data to: ' + process.env.BUCKET_SCICAN_RND_LOGS);
    }).catch(function (err) {
        console.log('Error on promise uploadToS3')
        console.error(err, err.stack)
    })
}

async function insertMongo (params) {
    const url = `mongodb://lambdaSciCanRnDlogs:SO3Tbada$1ads3434FhYhx8ypJ@172.31.34.205:27017/mqtt`
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }).then(client => {
        const db = client.db('mqtt');
        const collection = db.collection('topic_daya');
        return collection.insertOne(params)
    }).then(response => { console.log('Successfully uploaded data to mongodb ' + response); })
      .catch(err => {
            console.log('Error on promise insertMongo')
            console.error(err, err.stack);
      });
}

module.exports.fnTestSciCanRnDlogs = async (event) => {
    try {
        console.log("Test fnTestSciCanRnDlogs  - event:", event)
        const awsRequestId = uuidv4();
        console.log("Test fnTestSciCanRnDlogs - awsRequestId:", awsRequestId);
        return Promise.all(
                uploadToS3(`${awsRequestId}.json`, JSON.stringify(event)),
                insertMongo(event)
            );
    } catch (error) {
        console.log("Test fnTestSciCanRnDlogs error:", error)
        console.log("Test fnTestSciCanRnDlogs - error:", error.stack)
    }
}
