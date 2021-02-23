'use strict'

/**
 * Sign up a user if email does not exist. Activate online access. Disassociate any account associated to this SN
 * If association is successful, publish to (P/Q/D)/scican/evn/get-account-information
 * 
 * TOPICS: 
 * - Request: (P|Q|D)/scican/1234AB5678/srv/request/account-signup-form
 * - Response: (P|Q|D)/scican/srv/+/response/account-signup-form
 * 
 * Expected Payload:
 * {
 *  "account_email": "bobdemo@gmail.com",
 *  "account_password": "sc1canltd",
 *
 *  "account_company_name": "Bob Company",
 *  "account_contact_name": "Bob Demo",
 *  "account_phone_number": "+14167778888",
 *  "account_address": "1440 Don Mills",
 *  "account_city": "Toronto",
 *  "account_subregion": "Ontario",
 *  "account_country": "Canada",
 *  "account_zip_code": "m1m 4m4",
 *
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
const { getProductName } = require('./utils/ProductsData')
const { isUserExist, InsertUser, updateLastLogin } = require('./utils/UsersData')
const { generateRandomValue } = require('./utils/helpers')
const { AssociateUnit } = require('./utils/ManageAssociations')


const mysql = require('mysql2/promise')

const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))

/**
 * Get password hash data
 * 
 * @param {string} user_email 
 * @param {string} password 
 * 
 * @returns Object
 */
/*
async function getPasswordHashData(user_email, password, axios){
    if(!user_email || user_email == null || !password || password == null) {
        console.log(' password hash missing data - user email', user_email)
        console.log(' password hash missing data - password', password)
        return false
    }

    try {
        var url = "https://3.94.80.183/user-password-create" //"http://3.86.253.251/user-password-create"
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
    }
}
*/
/*
async function InsertUser(data, connection){
    const activation_key = generateRandomValue()
    const { 
        account_email,
        password,
        account_company_name,
        account_contact_name,
        account_phone_number,
        account_address,
        account_city,
        account_subregion,
        account_country,
        account_zip_code,
        language,
        language_iso3166 } = data

    try {
        const sql = `INSERT INTO users(password, username, company, firstname, telephone, office_address_one, city, state_province_region, country, zip_postal_code, lang,groups, email, activationkey, activationstatus, activationdate) VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'customer', ?, ?,'activated',CURRENT_TIMESTAMP())`
        const insertVals = [password,account_email,account_company_name,account_contact_name,account_phone_number,account_address,account_city,account_subregion,account_country,account_zip_code,language,account_email,activation_key]
        const sqlResult6 = await connection.query(sql, insertVals)
    
        const result = sqlResult6 ? sqlResult6[0] : {}

        return result ? result.insertId : '' // result.affectedRows
    } catch (error) {
        console.log("🚀 0.InsertUser - error:", error)
        console.log("🚀 0.1.InsertUser - error:", error.stack)
    }
}
*/
/*
async function updateLastLogin(params, connection) {
    let isUpdated = false
    const {user_id, hash_time, email} = params

    if(!user_id || user_id == null || !hash_time || hash_time == null || !email || email == null) {
        return false
    }

    try {
        const sql = `INSERT INTO lastlogin (idusers,uip,attempts,time,successfullogin,date,loggedinto,temail)
        VALUES (?,'','0',?,'yes',NOW(),'Registered', ?)`

        if ( pool ) {
            const sqlResult = await connection.query(sql, [user_id, hash_time, email])
            const res = sqlResult[0]

            isUpdated = sqlResult[0] ? Boolean(sqlResult[0].affectedRows) : false
        }
        
        return isUpdated

    } catch (error) {
        console.log("🚀 0.updateActivationKey - error: ", error)
        console.log("🚀 0.1updateActivationKey - error stack: ", error.stack)
        return null
    }
}
*/

/**
 * Activate online access for unit.
 * @param params - {user_id:'', useremail: '', serial_num: '' }
 * @returns string
 */
/*
async function AssociateUnit(params, connection) {
    const { user_id, useremail, serial_num} = params

    if(!user_id || user_id == null || !serial_num || serial_num == null || !useremail || useremail == null) {
        return false
    }
    
    let userPrevAssociated = false
    let diff_assoc_email = ''
    let isDisassociated = true
    let ass_active = 0
    let associationComplete = false
    let ca_active_ref_id = ''
    let diff_user_ref_id = ''
    let ref_id = generateRandomValue()

    try {
        const sql = `SELECT * FROM customers_units WHERE serial_num = ?`
        

        const sqlResult = await connection.query(sql, [serial_num])
        const res = sqlResult[0]

        const data = res ? res : []

        if ( data ) {
            for( const k in data ) {
                ass_active = data[k].association_active
                if(useremail == data[k].user_email) {
                    userPrevAssociated = true
                    ca_active_ref_id = data[k].ca_active_ref_id

                    if(ass_active) {
                        isDisassociated = false
                    }
                }

                if(ass_active && data[k].user_email !== useremail) {
                    diff_assoc_email = data[k].user_email
                    diff_user_ref_id = data[k].ca_active_ref_id
                    isDisassociated = false
                }
            }
        }

        // disassociate previously associated unit 
        if(diff_assoc_email) {
            //update customers_units table, set association_active=0
            const sql1 = `UPDATE scican.customers_units SET
            association_active=0,
            association_from=NULL,
            ca_active_ref_id=NULL,
            web_conf_confirmed=0,
            web_conf_confirmed_date='0000-00-00 00:00:00',
            email_conf_sent_by_unit=0,
            email_conf_sent_by_unit_date='0000-00-00 00:00:00',
            current_location_date='0000-00-00 00:00:00',
            latest_oas_update_date=NOW()
            WHERE user_email= ? AND serial_num= ? `

            const sqlResult1 = await connection.query(sql1, [diff_assoc_email, serial_num])

            //set prev_assoc_email to empty
            isDisassociated = sqlResult1[0] ? sqlResult1[0].changedRows : false

            //update ustomers_units_assoc_dates table, set linked_to_user_end_date to now()
            const sql2 = `UPDATE scican.customers_units_assoc_dates 
                        SET linked_to_user_end_date=NOW(), data_updated=NOW() 
                        WHERE ca_active_ref_id = ? AND user_email = ? AND serial_num = ?`

                const sqlResult2 = await connection.query(sql2, [diff_user_ref_id, diff_assoc_email, serial_num])

        }

        //if current user has previous associated but is not associated
        if (userPrevAssociated && isDisassociated) {
            //Update customers_units table set association_active=1
            const sql3 = `UPDATE scican.customers_units SET web_conf_confirmed=1,
                web_conf_confirmed_date=NOW(),email_conf_sent_by_unit=1,email_conf_sent_by_unit_date=NOW(),
                prev_associations_active=prev_associations_active+1,association_active=1,
                ca_active_ref_id= ?,latest_oas_update_date=NOW()
                WHERE serial_num= ? AND user_email= ?`

            const sqlResult3 = await connection.query(sql3, [ca_active_ref_id, serial_num, useremail])
            
            ref_id = ca_active_ref_id

            associationComplete = sqlResult3[0] ? sqlResult3[0].changedRows : false
        } else if(!userPrevAssociated && isDisassociated) {
            //Insert new data into customers_units table
            const sql6 = `INSERT INTO customers_units
            (idusers,user_email,prev_associations_active,association_active,serial_num,ca_active_ref_id,latest_oas_update_date,idunits_warranties,web_conf_confirmed, web_conf_confirmed_date,email_conf_sent_by_unit,email_conf_sent_by_unit_date) 
            VALUES (?,?,1,1,?,?,NOW(),0,1,NOW(),1,NOW())`

            const sqlResult6 = await connection.query(sql6, [user_id, useremail, serial_num, ref_id])

            associationComplete = sqlResult6[0] ? sqlResult6[0].affectedRows : false

            
        }

        //if insert/update of customer_units table was successfull, insert into customer_units_assoc_dates.
        if(associationComplete) {
            //Insert into customers_units_assoc_dates
            const sql4 = `INSERT INTO scican.customers_units_assoc_dates
                            (idusers,
                            user_email,
                            serial_num,
                            ca_active_ref_id,
                            linked_to_user_start_date,
                            cycle_count_at_conf_assoc,
                            data_updated)
                            VALUES
                            (?,
                            ?,
                            ?,
                            ?,
                            NOW(),
                            0,
                            NOW())`
    
            const sqlResult4 = await connection.query(sql4, [user_id, useremail, serial_num, ref_id])
        }

        return associationComplete
        
    } catch (error) {
        console.log("🚀 0.AssociateUnit - error:", error)
        console.log("🚀 0.1.AssociateUnit - error:", error.stack)
    }
}
*/

const getEmailPayload = (params) => {
    const { email, firstname, lastname, product_name, serial_num, language } = params
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Account Sign Up and Online Activation"
    let body = `Dear ${firstname},  <br /><br /> `
            + `Welcome to  <a href='https://updates.scican.com'>updates.scican.com</a>. You have successfully created an account on our website using “email address”. Feel free to sign-in to your account and edit your profile. <br /><br />`
            + `Thank you for choosing ${product_name}. <br /><br />`
            + `${serial_num} has been successfully registered and activated on your account on <a href='https://updates.scican.com'>updates.scican.com</a>. You can now access your cycle data, unit information and manuals by logging into your account. `
            + `Please feel free to contact SciCan or your local dealer for more information about ${product_name} and its G4<sup>+</sup> features. <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/srv/${serial_num}/response/account-signup-form`,
        "mqtt_response_payload": {
            "result": "associated"
        },
        //"template": templateName,
        //"variables": ""
    }

    return payload
}

module.exports.fnAccountSignUpForm = async (event) => {
    let connection

    try {
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}
        let associated = false
        const account_password = event.account_password || ''
        let data = {
            account_email: event.account_email || '',
            account_company_name:  event.account_company_name || '',
            account_contact_name:  event.account_contact_name || '',
            account_phone_number:  event.account_phone_number || '',
            account_address:  event.account_address || '',
            account_city:  event.account_city || '',
            account_subregion:  event.account_subregion || '',
            account_country:  event.account_country || '',
            account_zip_code:  event.account_zip_code || '',
            language:  event.language_iso639 || '',
            language_iso3166:  event.language_iso3166 || ''
        }
        
        console.log("++++ Received Event = ", event)

        connection = await mysql.createConnection({
            host     : process.env.rdsMySqlHost,
            user     : process.env.rdsMySqlUsername,
            password : process.env.rdsMySqlPassword,
            database : process.env.rdsMySqlDb
        })

        //get user's details
        // const userExist = await isUserExist(data.account_email)
        const userExist = await isUserExist(data.account_email)
    console.log('==user Exists ', userExist)

        if (data.account_email && !userExist && userExist != null){
            let user_id = ''
            let isLastLoginUpdated = false
            const hash_time = Date.now()

            // const hash_data = await getPasswordHashData(data.account_email, account_password, axios)
            const password_hash = getPasswordHash(data.account_email, account_password, hash_time)
            
            // if (hash_data && hash_data != null) {
            // if (password_hash) {
            data.password = password_hash || ''
            // const hash_time = hash_data.hash_time || ''

            user_id = await InsertUser(data)

            const login_params = {
                user_id: user_id,
                hash_time: hash_time,
                email: data.account_email
            }
            isLastLoginUpdated = await updateLastLogin(login_params)
            // }

            if(user_id && user_id != null) {
                //activate online access
                associated = await AssociateUnit({user_id: user_id, useremail: data.account_email, serial_num: serialNumber}, connection)

                if(associated && associated != null) {
                //get product name
                // const productName = await getProductName(serialNumber)
                const productName = await getProductName(serialNumber)
        
                    //get payload
                    const emailPayload = getEmailPayload({
                        email: data.account_email, 
                        firstname: data.account_contact_name,
                        lastname: data.lastname || '', 
                        product_name: productName,
                        serial_num: serialNumber, 
                        language: data.language 
                    })
    
                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                        payload: JSON.stringify(emailPayload),
                        qos: '0' 
                    }

                    console.info('+++ Sending Email ... ', publishParams)
                } else if(!associated && associated != null) {
                    publishParams = {
                        topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
                        payload: JSON.stringify({"result": "was_associated"}),
                        qos: '0' 
                    }
                    console.log("🚀 Already associated. Nothing Published:")
                } else {
                    publishParams = unknown_error
                    console.log("🚀 Something went wrong. Nothing Published:")
                }
            }
        } else if(userExist && userExist !== null) {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
                payload: JSON.stringify({"result": "account_already_exists"}),
                qos: '0' 
            }

            console.info('+++ Account already exists ... ', publishParams)
        } else {
            if(userExist == null) {
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
                    payload: JSON.stringify({"result": "unknown_error"}),
                    qos: '0' 
                }
            }
            console.log("🚀 Something went wrong. Nothing Published: userExist = ", userExist)
        }

        if(Object.keys(publishParams).length > 0) {
            console.log('+++ Publishing ...')

            await publishMqtt(publishParams)
                .then( () => console.log('Publish Done: Params - ', publishParams))
                .catch(e => console.log(e))

            if(associated && associated != null) {
                //publish to Account Event topic
                const eventParams = {
                    "email": data.account_email,
                    "serial_number": serialNumber,
                    "response_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/event/account`,
                    "error_topic": `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`
                }
                const evPubParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/evn/get-account-information`,
                    payload: JSON.stringify(eventParams),
                    qos: '0' 
                }

                await publishMqtt(evPubParams)
                .then( () => console.log('Publish to Account Event Done: Params - ', evPubParams))
                .catch(e => console.log(e))
            }
        }
    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    } finally {
        if(connection){
            connection.end();
        }
    }
}