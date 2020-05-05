'use strict'
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
let certInfo = {}

const describeCertPromise = (params) =>
  new Promise((resolve, reject) =>
  iot.describeCertificate(params, (err, res) => resolve(res)))


module.exports.fncertificateInfo = async (event, context, callback) => { 

    // const scuuid = event.queryStringParameters.scuuid
    // const certificateId = //TODO use the scuuid to QUERY the database/REDIS/Dynamo/Bucket and retrieve the certificateId 

    // const certificateId = '8c0891f8aa793488a143cef0d1607a48ec6ca956f32f021d30abf0deeeffc6b6'

    var params = {
        certificateId: event.queryStringParameters.scuuid
    };

    const { certificateDescription } = await describeCertPromise(params)  

    certInfo = {
        "status":certificateDescription.status,
        "expiration_date":certificateDescription.validity.notAfter
    }

    return {
        statusCode: 200,
        body: JSON.stringify(certInfo)
    }

}