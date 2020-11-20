'use strict'
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
const S3 = new AWS.S3()
const DocumentClient = new AWS.DynamoDB.DocumentClient()
const Joi = require('@hapi/joi')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
let createThingObj = {}
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

const createCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.createKeysAndCertificate(params, (err, res) => resolve(res)))

const attachCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.attachThingPrincipal(params, (err, res) => resolve(res)))

async function uploadToS3 (keyName, mybody) {
  const objectParams = { Bucket: process.env.BUCKET_NAME, Key: keyName, Body: mybody }
  await S3.putObject(objectParams).promise().then(function (data) {
    // console.log('Successfully uploaded data to ' + process.env.BUCKET_NAME)
    // console.log(JSON.stringify(data))
  }).catch(function (err) {
    console.log('Error on uploadPromise')
    console.error(err, err.stack)
  })
}

//! If the policy is not manually created the lambda will run in a loop
// TODO - How to create a POLICY automatically if it doesn't exist in serverless.yml ?
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
      console.log("err-saveInDynamo", err);
    }
    else {
      console.log("success-saveInDynamo", data);
    }
  });
}

async function month (jsMonth) {
  const month = new Array();
  month[0] = "01" //"January";
  month[1] = "02" //"February";
  month[2] = "03" //"March";
  month[3] = "04" //"April";
  month[4] = "05" //"May";
  month[5] = "06" //"June";
  month[6] = "07" //"July";
  month[7] = "08" //"August";
  month[8] = "09" //"September";
  month[9] = "10" //"October";
  month[10] = "11" //"November";
  month[11] = "12" //"December";
  return month[jsMonth]
}

async function to2Digits (jsDt) {
  if(jsDt >= 10) return jsDt
  else return "0" + jsDt
}

// async function publishSCICANSYSMachineConfig (serialNumber, pid) {
//   try {
//     let response = {
//       "path":`CAN/CMD/get_config_machine/SCICANSYS`,
//       "data":{}
//     }
    
//     let params = {
//       topic: `${MQTT_TOPIC_ENV}/MSSTER/${serialNumber}/CAN/CMD/get_config_machine/SCICANSYS`,
//       payload: JSON.stringify(response),
//       qos: '0'
//     };
//     console.log('params', params)
//     await publishMqtt(params)
//   } catch (e) {
//     throw new Error(`publishSCICANSYSMachineConfig -> Could not publish in MQTT: ${e.message}`)
//   }
// }

async function publishSCICANSYSfnCreateThing (MQTT_TOPIC_ENV, serialNumber, scuuid, info) {
  try {
    // Publish MQTT
    const mqttTopic = `${MQTT_TOPIC_ENV}/scican/sys/cmd/fnCreateThing/${serialNumber}/${scuuid}`
    const payLoadJSON = {
      'topic' : mqttTopic,
      'payload' : info
    }
    const mqttParams = {
      topic: mqttTopic,
      payload: JSON.stringify(payLoadJSON),
      qos: '0'
    };
    await publishMqtt(mqttParams)
  } catch (e) {
    throw new Error(`publishSCICANSYSfnCreateThing -> Could not publish in MQTT: ${e.message}`)
  }
}

async function publishSCICANSYSSetShadow (thingName ) {
  try {
    // Publish MQTT
    const mqttTopic = `$aws/things/${thingName}/shadow/update`
    const payLoadJSON = { // ! Maximum size of a SHADOW JSON state document - 8KB -> https://docs.aws.amazon.com/general/latest/gr/iot-core.html#device-shadow-limits
      'state': {
        'reported': {
          'cycles-nb-success': 0, 
          'cycles-nb-fault': 0,
          'cycles-missing': [],
          'PROCESS':'v1-8-32',
          'CLOUD':'v1-8-32',
          'ref':'7A620000',
        }
      }
    }
    const mqttParams = {
      topic: mqttTopic,
      payload: JSON.stringify(payLoadJSON),
      qos: '0'
    };
    await publishMqtt(mqttParams)
  } catch (e) {
    throw new Error(`publishSCICANSYSSetShadow -> Could not publish in MQTT: ${e.message}`)
  }
}

/*
How to test this lambda process:
1 - Go to POSTMAN and run the API endpoint iot-devig1.scicanapi.com/thing/cefla/ OR iot-devig1.scicanapi.com/thing/scican/ OR 
    1.1 - Use x-api-key = S5FADNS4yb1epFEThjO19fzywX6X3jy2NlFN6PCg (devig1-Cefla)
    1.2 - Use the follow JSON in the POST body
    {  
      "serialNumber":"ALXB08",
      "privateKey":"cf@6zZDNjY27C^zn91zci#7xRlslxw7Pt!hnOTHS*HzUBVaAETzD7"(devig1-Cefla),
      "macAddress":"zzz"
    }
2 - On success we should receive back the certificatePem, privateKey, scuuid.
3 - On success we should have in DynamoDB (devig1-iot-scUUID) / (iot-scUUID) PROD the serialNumber-certificateId of the created thing
4 - On success we should have in RDS (SELECT * FROM scican.online_access_tokens order by idonline_access_tokens desc;) the unique created TOKEN for the created thing 
*/



module.exports.fnScicanRndCreatething = async (event, context, callback) => {
  const dt = new Date()
  const YYYY = dt.getFullYear()
  const MM = await month(dt.getMonth())
  const DD = await to2Digits(dt.getDate())
  const HH = await to2Digits(dt.getHours())
  const mm = await to2Digits(dt.getMinutes())
  const ss = await to2Digits(dt.getSeconds())
  const mmm = dt.getMilliseconds()
  const dtTime = YYYY + "-" + MM + "-" + DD + "-" + HH + "-" + mm + "-" + ss + "-" + mmm
  const stage = event.requestContext.stage
  const awsRequestId = context.awsRequestId

  const jsonBody = JSON.parse(event.body)

  const schema = Joi.object({
    serialNumber: Joi.string().alphanum().max(20).required(),
    privateKey: Joi.string().min(53).max(53).required(),
    macAddress: Joi.string().max(23).required()
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

  // Create THING and attach Policy/Crtificate
  // const scuuid = serialNumber  + '-' + awsRequestId
  // const name = stage + '-' + COMPANY_NAME + '-' + scuuid
  const name = stage + '-' + COMPANY_NAME + '-' + serialNumber + '-' + awsRequestId
  await createThing({ thingName: name })
  const { certificateArn, certificateId, certificatePem, keyPair } = await createCertificates({ setAsActive: true })
  const { PublicKey, PrivateKey } = keyPair
  await attachPolicy({ policyName: POLICY_NAME, target: certificateArn })
  await attachCertificates({ principal: certificateArn, thingName: name })

  const scuuid = serialNumber + '-' + certificateId
  
  const httpsResponse = {
    'certificatePem':certificatePem,
    'privateKey':PrivateKey,
    'scuuid': scuuid
  }

  const info = {
    'serialNumber':serialNumber,
    'creationDate':dtTime,
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

  // Save in S3
  await uploadToS3(`${name}/certificate.pem.crt`, certificatePem)
  await uploadToS3(`${name}/private.pem.key`, PrivateKey)
  await uploadToS3(`${name}/public.pem.key`, PublicKey)
  await uploadToS3(`${name}/info.json`, JSON.stringify(info))

  // Save in DynamoDB
  const params = {
    TableName: process.env.SCUUID_TABLE_NAME,
    Item: {
      scUUID: scuuid 
    }
  }
  await saveInDynamo(params)

  await publishSCICANSYSfnCreateThing(MQTT_TOPIC_ENV,serialNumber,scuuid, info)

  await publishSCICANSYSSetShadow(createThingObj.thingName)

  // await publishSCICANSYSMachineConfig(serialNumber, awsRequestId)

  // End function
  return {
    statusCode: 200,
    body: JSON.stringify(httpsResponse)
  }
}