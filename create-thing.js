'use strict'
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
const S3 = new AWS.S3()
const DocumentClient = new AWS.DynamoDB.DocumentClient()
const Joi = require('@hapi/joi')
const { v4: uuidv4 } = require('uuid');
let createThingObj = {}

const createCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.createKeysAndCertificate(params, (err, res) => resolve(res)))

const attachCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.attachThingPrincipal(params, (err, res) => resolve(res)))

async function uploadToS3 (keyName, mybody) {
  const objectParams = { Bucket: process.env.BUCKET_NAME, Key: keyName, Body: mybody }
  await S3.putObject(objectParams).promise().then(function (data) {
    console.log('Successfully uploaded data to ' + process.env.BUCKET_NAME)
    console.log(JSON.stringify(data))
  }).catch(function (err) {
    console.log('Error on uploadPromise')
    console.error(err, err.stack)
  })
}

async function attachPolicy (params) {
  return iot.attachPolicy(params, function (err, data) {
    if (err) console.log(err, err.stack)
    else console.log(data)
  })
}

async function createThing (params) {
  iot.createThing(params, function (err, data) {
    if (err) {
      return console.log(err, err.stack)
    } else {
      createThingObj = data
    }
  })
}

async function saveInDynamo (params) {  
  DocumentClient.put(params, function(err, data) {
    if (err) {
      console.log(err);
    }
    else {
      console.log(data);
    }
  });
}

module.exports.createThing = async (event, context, callback) => {
  const dtTime = new Date().getTime()
  const jsonBody = JSON.parse(event.body)

  const schema = Joi.object({
    serialNumber: Joi.string().alphanum().required(),
    privateKey: Joi.string().min(53).max(53).required(),
    macAddress: Joi.string().required()
  })

  const { error, value } = schema.validate(jsonBody)

  if (!(typeof error === 'undefined')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ 'message':'The provided JSON is not valid' })
    }
  }

  const { serialNumber, privateKey, macAddress } = jsonBody
  const POLICY_NAME = process.env.POLICY_NAME
  const COMPANY_NAME = process.env.COMPANY_NAME

  if (!(privateKey === process.env.PRIVATE_KEY)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ 'message':'authentication is required and has failed or has not yet been provided' })
    }
  }

  const scuuid = serialNumber + '_' + dtTime + '_' + uuidv4()
  const name = COMPANY_NAME + '_' + scuuid
  await createThing({ thingName: name })
  const { certificateArn, certificateId, certificatePem, keyPair } = await createCertificates({ setAsActive: true })
  const { PublicKey, PrivateKey } = keyPair

  await attachPolicy({ policyName: POLICY_NAME, target: certificateArn })
  await attachCertificates({ principal: certificateArn, thingName: name })

  const response = {
    'certificatePem':certificatePem,
    'privateKey':PrivateKey,
    'scuuid': scuuid,
  }

  var info = {
    'deviceId':serialNumber,
    'thingName':createThingObj.thingName,
    'thingArn':createThingObj.thingArn,
    'thingId':createThingObj.thingId,
    'scuuid': scuuid,
    'macAddress': macAddress,
    'certificateArn':certificateArn,
    'certificateId':certificateId,
    'certificatePem':certificatePem,
    'publicKey':PublicKey,
    'privateKey':PrivateKey,
  }

  await uploadToS3(`${name}/certificate.pem.crt`, certificatePem)
  await uploadToS3(`${name}/private.pem.key`, PrivateKey)
  await uploadToS3(`${name}/public.pem.key`, PublicKey)
  await uploadToS3(`${name}/info.json`, JSON.stringify(info))

  const params = {
    TableName: process.env.SCUUID_TABLE_NAME,
    Item: {
      scUUID: scuuid 
    }
  }

  await saveInDynamo(params)

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}
