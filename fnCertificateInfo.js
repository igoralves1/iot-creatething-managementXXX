'use strict'
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
let certInfo = {}

const describeCertPromise = (params) =>
  new Promise((resolve, reject) =>
  iot.describeCertificate(params, (err, res) => resolve(res)))


module.exports.fnCertificateInfo = async (event, context, callback) => { 

    const str = event.queryStringParameters.scuuid
    const res = str.split("-")
    const certificateId = res[1]

    var params = {
        certificateId: certificateId
    };

    const { certificateDescription } = await describeCertPromise(params)  
    // TODO - handle scenarios where certificate doesn't exists. For now if a provided certificate number doesn't exists we will get an error 'Internal error' as a response. Must handle this scenario.
    certInfo = {
        "status":certificateDescription.status,
        "expiration_date":certificateDescription.validity.notAfter
    }

    return {
        statusCode: 200,
        body: JSON.stringify(certInfo)
    }

}