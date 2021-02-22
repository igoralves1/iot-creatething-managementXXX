const AWS = require('aws-sdk');

// Added lower timeout to reduce the running in pending.
// Add short timeouts
AWS.config.update({
    httpOptions: {
        timeout: 3000,
        connectTimeout: 1000
    }
});

const S3 = new AWS.S3()
const { v4: uuidv4 } = require('uuid');

module.exports.uploadToS3 = async function  (payload) {
    const keyName = uuidv4() + '.json';
    const objectParams = { Bucket: process.env.BUCKET_SCICAN_RND_LOGS, Key: keyName, Body: payload }
    return S3.putObject(objectParams).promise();
}