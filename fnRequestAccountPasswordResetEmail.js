'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv

const mysql = require('mysql2/promise')
const axios = require('axios')


const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb
})

async function isUserExist(user_email) {
    try {

        console.log("pool ==== ", pool)

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = '${user_email}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        var userexist
        if (res[0].numbers == 0) {
            userexist = false
        } else {
            userexist = true
        }

        return userexist

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))


  const getRandomValue = () => {
    const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
    let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")

    return hash
}

async function getPasswordHashData(user_email, password){

    try {
        var url = "http://3.86.253.251/user-password-create"
        var data
        let hash_data = {}

        data = {
            account_email: user_email,
            account_password: password
        }

        var axiosconnect = await axios.create()
        let res = await axiosconnect.post(url, data)
    
        if(res.data) {
            hash_data.password_hash = res.data.password_hash || ''
            hash_data.hash_time = res.data.hash_time || ''
        }

        return hash_data

    } catch (error) {
        console.log("🚀 0.getPasswordHashData - error:", error)
        console.log("🚀 0.1.getPasswordHashData - error:", error.stack)
    }
}

async function updateActivationKey(email, activatin_key) {
    let isUpdated = false

    try {
        const sql = `UPDATE users SET activationkey='${activatin_key}' WHERE username='${email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            isUpdated = sqlResult[0] ? sqlResult[0].changedRows : false
        }
        
        return isUpdated

    } catch (error) {
        console.log("🚀 0.updateActivationKey - error: ", error)
        console.log("🚀 0.1updateActivationKey - error stack: ", error.stack)
    }
}

async function getUserDetails(user_email) {
    let details = {}
    try {
        const sql = `SELECT firstname, lastname FROM users WHERE username = '${user_email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                details.firstname = res[0].firstname
                details.lastname = res[0].lastname
            }
        }
        
        return details

    } catch (error) {
        console.log("🚀 getUserDetails - error: ", error)
        console.log("🚀 getUserDetails - error stack: ", error.stack)
    }
}

async function getProductName(serial_number) {
    let product_name = ''
    
    try {
        const sql = `SELECT model_general_name FROM units_models WHERE productSerialNumberPrefix = '${serial_number.slice(0, 4)}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                product_name = res[0].model_general_name
            }
        }
        
        return product_name

    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
    }
}

const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language, password_hash, activation_key } = params
    const lname = lastname ? `, ${lastname}` : ''
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Reset Password"
    let body = `Dear ${firstname}${lname},  <br /><br /> `
            + `You recently requested to reset your password for your Updates.SciCan page account. Click the button bellow to reset it.  <br /><br />`
            + `<a href='https://updates.scican.com/passwordChange.php?user=${email}&keyid=${password_hash}&key=${activation_key}&lang=ENG'>Reset your password</a> <br /><br />`
            + `If you did not request a password reset, please ignore this email. This password reset is only valid for the next 60 minutes.  <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-password_reset_email`,
        "mqtt_response_payload": {
            "result": "email_sent"
        },
        // "template": templateName,
        // "variables": ""
    }

    return payload
}

/**
 * if account exists and userDetail is not undefined(meaning query failed), send reset email 
 * if user does not exist in db , publish accound does not exist
 * else if query failed, do notthing
*/
module.exports.fnRequestAccountPasswordResetEmail = async (event) => {
    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''

        console.log('++++ Received Payload ', event);

        let userDetails = await getUserDetails(account_email)

        if(typeof userDetails !== 'object' || userDetails == null) {
            userDetails = {}
        }

         if(userDetails != null && Object.keys(userDetails).length > 0) {
            //get activation key
            const activation_key = getRandomValue()

            //get new password
            const new_password = getRandomValue()

            //get password hash
            const hash_data = await getPasswordHashData(account_email, new_password)
            const password_hash = hash_data.password_hash || ''

            if( password_hash != null && Object.keys(password_hash).length > 0) {

                const activationKeyUpdated = await updateActivationKey(account_email, activation_key)
            
                if(activationKeyUpdated) {
                    //get product name
                    const productName = await getProductName(serialNumber)
                
                    //get email payload
                    const emailPayload = getEmailPayload({
                        email: account_email, 
                        firstname: userDetails.firstname,
                        lastname: userDetails.lastname, 
                        product_name: productName,
                        serial_num: serialNumber, 
                        language: language,
                        password_hash: password_hash,
                        activation_key: activation_key 
                    })

                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                        payload: JSON.stringify(emailPayload),
                        qos: '0' 
                    }

                    console.info('+++ Sending Email ... ', publishParams)
                } else {
                    console.log('+++ Activation key not saved! - ', activationKeyUpdated)
                }
            }
        } else if(Object.keys(userDetails).length == 0 && userDetails != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
                payload: JSON.stringify({"result": "existing_account_not_found"}),
                qos: '0' 
            }

            console.info('+++ Account does not exist ... ', publishParams)
        } else {
            console.log("🚀 Something went wrong. Nothing Published: userDetails = ", userDetails)
        }

        if(Object.keys(publishParams).length > 0) {
            console.info('+++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}

