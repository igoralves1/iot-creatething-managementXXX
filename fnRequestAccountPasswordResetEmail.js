'use strict'

/**
 * Send and email with a link to reset password ONLY if the user has activated onine access for the unit
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-password_reset_email
 * - Response: (P|Q|D)/scican/srv/+/response/account-password_reset_email

 * 
 * Expected Payload:
 * {
 *  "account_email": "digitalgroupbravog4demo@gmail.com",
 *  "language_iso639": "en",
 *  "language_iso3166": "US"
 * }
 *
 */

const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv
const { getPasswordHash } = require('./utils/getPasswordHash')

const mysql = require('mysql2/promise')
// const axios = require('axios')
const { isatty } = require('tty')


const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb
})

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
    iotdata.publish(params, (err, res) => resolve(res)))


const getRandomValue = () => {
    const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
    let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")

    return hash
}

/**
 * Returns an array of units
 * 
 * @param {string} email 
 * @returns {Array}
 */
async function checkOnlineAccessStatus(email, serial_number) {
    let isActive = false
    
    try {
        const sql = `SELECT association_active FROM customers_units WHERE association_active = 1 AND user_email = '${email}' AND serial_num = '${serial_number}'`
console.log('--- sql ', sql)
        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]
            const data = res && res != null ? res : []

            if(data.length > 0) {
                isActive = true
            }
        }
        
        return isActive
    } catch (error) {
        console.log("🚀 checkOnlineAccessStatus - error: ", error)
        console.log("🚀 checkOnlineAccessStatus - error stack: ", error.stack)
        return false
    }
}

/**
 * Get password hash data
 * 
 * @param {string} user_email 
 * @param {string} password 
 * 
 * @returns Object
 */
async function getPasswordHashData(user_email, password, axios){

    try {
        var url = "http://ws.scican.com/user-password-create" //"http://3.86.253.251/user-password-create"
        var data
        let hash_data = {}
    console.log(' identification url - ', url)
    
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
        return {}
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
        return false
    }
}

/**
 * Returns an object with payload data ready for publishing
 * 
 * @param {string} user_email
 * @returns {Object} 
 */
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

/**
 * Returns product name
 * 
 * @param {string} serial_number
 * @returns {string} 
 */
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
 * if user does not exist in db , publish account does not exist
 * else if query failed, do notthing
 * 
 * Only allow password change if there is online access active
*/
module.exports.fnRequestAccountPasswordResetEmail = async (event) => {
    try {
        const axios = require('axios');
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let isActive = false

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : ''

        console.log('++++ Received Payload ', event)

        let userDetails = await getUserDetails(account_email)
console.log('+++ user details - ', userDetails)
        
        if(typeof userDetails == 'object' && Object.keys(userDetails).length > 0) {
            //check if online access is active for this unit
            isActive = checkOnlineAccessStatus(account_email, serialNumber)
        }

        if(isActive && isActive != null) {
            //get activation key
            const activation_key = getRandomValue()

            //get new password
            const new_password = getRandomValue()

            //get password hash
            // const hash_data = await getPasswordHashData(account_email, new_password, axios)
            // const password_hash = hash_data.password_hash || ''
            const password_hash = getPasswordHash(account_email, new_password, Date.now())
            console.log(' Password Hash = ', password_hash)

            if(password_hash) {
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
        } else if(typeof userDetails == 'object' && Object.keys(userDetails).length == 0 && userDetails != null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-password_reset_email`,
                payload: JSON.stringify({"result": "existing_account_not_found"}),
                qos: '0' 
            }

            console.info('+++ Account does not exist ... ', publishParams)
        } else {
            console.log("🚀 1-Something went wrong. Nothing Published: userDetails = ", userDetails)
            console.log("🚀 2- OR Online Access is not active. isActive = ", isActive)
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

