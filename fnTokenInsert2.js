'use strict';
const mysql = require('mysql2/promise')
const Joi = require('@hapi/joi')
const AWS = require('aws-sdk')
const iot = new AWS.Iot()
const S3 = new AWS.S3()
const DocumentClient = new AWS.DynamoDB.DocumentClient()
let createThingObj = {}

// ####################

const createCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.createKeysAndCertificate(params, (err, res) => resolve(res)))

const attachCertificates = (params) =>
  new Promise((resolve, reject) =>
    iot.attachThingPrincipal(params, (err, res) => resolve(res)))

async function uploadToS3 (keyName, mybody) {
    const objectParams = { Bucket: process.env.BUCKET_NAME, Key: keyName, Body: mybody }
    await S3.putObject(objectParams).promise().then(function (data) {
        console.log(JSON.stringify(data))
    }).catch(function (err) {
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

// ####################
async function randStr(length){
    try {
        // const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("")
        let a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("")
        let b = [] 
        for (let i=0; i<length; i++) {
            let j = (Math.random() * (a.length-1)).toFixed(0)
            b[i] = a[j]
        }
        return b.join("")
    } catch (error) {
        return (error)
    }
}

async function tokenGen (length) {
    try {
        let token 
        let newToken = 1
        while (newToken) {
            token = await randStr (length) + '-' + await randStr (length)
            newToken = await tokenExists (token)
        }
        return token
    } catch (error) {
        return error
    }
}

async function InsertToken(serial_number, scuuid) {
    try {
        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const token = await tokenGen(3)

        const sql = `INSERT INTO online_access_tokens (serial_number, uuid, token, is_active) VALUES ('${serial_number}', '${scuuid}', '${token}', '1');`
        const sqlResult = await pool.query(sql)
        return sqlResult

    } catch (error) {
        return {
            success: false,
            message: "Insert to Mysql Failure",
            error: error
        }
    }
}

async function tokenExists (token) {
    try {
        const pool = mysql.createPool({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        const sql = `SELECT token FROM online_access_tokens WHERE token = '${token}'`
        const sqlResult = await pool.query(sql)
        const tokenRes = sqlResult[0]

        let result = 0
        if (tokenRes.length > 0) {
            result = 1
        }
        return result
    } catch (error) {
        return error
    }
}

module.exports.fnTokenInsert2 = async event => {
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
    const awsRequestId = event.requestContext.requestId

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

    const scuuid = serialNumber  + '-' + awsRequestId
    const name = stage + '-' + COMPANY_NAME + '-' + scuuid

    const sqlResult = await InsertToken(serialNumber, scuuid)
    return {
        statusCode: 200,
        body: JSON.stringify({'sqlResult':sqlResult})
    }
}