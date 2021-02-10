//Project 12 Need to test

'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
const crypto = require('crypto')
var iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT});
const MQTT_TOPIC_ENV = process.env.mqttTopicEnv



const mysql = require('mysql2/promise')



const pool = mysql.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb,
    connectionLimit: 10
})


const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))


const getRandomValue = () => {
    const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
    let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")

    return hash
}

async function UserIdentification(account_email, account_password, axios) {

    var url = "http://3.86.253.251/user-authentication"
    var data

    data = {
        account_email: account_email,
        account_password: account_password
    }


    var axiosconnect = await axios.create()
    let res = await axiosconnect.post(url, data)
// console.log("User Identification Email ==== ", res.data)
    return res.data.success || false
}

/**
 * Activate online access for unit.
 * @param params - {user_id:'', useremail: '', serial_num: '' }
 * @returns string
 */
async function AssociateUnit(params) {
    const { user_id, useremail, serial_num} = params
    let userPrevAssociated = false
    let diff_assoc_email = ''
    let isDisassociated = true
    let ass_active = 0
    let associationComplete = false
    let ca_active_ref_id = ''
    let diff_user_ref_id = ''
    let ref_id = getRandomValue()

    try {
        const sql = `SELECT * FROM customers_units WHERE serial_num = '${serial_num}'`

        const sqlResult = await pool.query(sql)
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

        // disassociate previously associated use 
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
            WHERE user_email= '${diff_assoc_email}' AND serial_num='${serial_num}'`

            const sqlResult1 = await pool.query(sql1)

            //set prev_assoc_email to empty
            isDisassociated = sqlResult1[0] ? sqlResult1[0].changedRows : false

            //update ustomers_units_assoc_dates table, set linked_to_user_end_date to now()
            const sql2 = `UPDATE scican.customers_units_assoc_dates SET
          linked_to_user_end_date=NOW(),
            data_updated=NOW()
          WHERE ca_active_ref_id='${diff_user_ref_id}' AND user_email='${diff_assoc_email}' AND serial_num='${serial_num}'`

            const sqlResult2 = await pool.query(sql2)
        }

        //if current user has previous associated but is not associated
        if (userPrevAssociated && isDisassociated) {
            //Update customers_units table set association_active=1
            const sql3 = `UPDATE scican.customers_units SET web_conf_confirmed=1,
                web_conf_confirmed_date=NOW(),email_conf_sent_by_unit=1,email_conf_sent_by_unit_date=NOW(),
                prev_associations_active=prev_associations_active+1,association_active=1,
                ca_active_ref_id='${ca_active_ref_id}',latest_oas_update_date=NOW()
                WHERE serial_num='${serial_num}' AND user_email='${useremail}'`

            const sqlResult3 = await pool.query(sql3)
            
            ref_id = ca_active_ref_id

            associationComplete = sqlResult3[0] ? sqlResult3[0].changedRows : false
        } else if(!userPrevAssociated && isDisassociated) {
            //Insert new data into customers_units table
            const sql6 = `INSERT INTO customers_units(idusers,user_email,prev_associations_active,association_active,serial_num,ca_active_ref_id,latest_oas_update_date,idunits_warranties) VALUES 
              ('${user_id}','${useremail}',1,1,'${serial_num}','${ref_id}',NOW(),0)`

            const sqlResult6 = await pool.query(sql6)

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
                            ('${user_id}',
                            '${useremail}',
                            '${serial_num}',
                            '${ref_id}',
                             NOW(),
                             0,
                             NOW())`
    
            const sqlResult4 = await pool.query(sql4)
    
        }

        return associationComplete
        
    } catch (error) {
        console.log("🚀 0.AssociateUnit - error:", error)
        console.log("🚀 0.1.AssociateUnit - error:", error.stack)
    }
}

async function getUserDetails(user_email) {
    let details = {}
    try {
        const sql = `SELECT idusers, firstname, lastname FROM users WHERE username = '${user_email}'`

        if ( pool ) {
            const sqlResult = await pool.query(sql)
            const res = sqlResult[0]

            if(res[0]) {
                details.firstname = res[0].firstname
                details.lastname = res[0].lastname
                details.idusers = res[0].idusers
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
    const { email, firstname, lastname, product_name, serial_num, language } = params
    const lname = lastname ? `, ${lastname}` : ''
    const linkUrl = "updates.scican.com"
    const source = "no-reply.notification@scican.com"
    const templateName = "template_name"
    let subject = "Online Access Activation"
    let body = `Dear ${firstname}${lname},  <br /><br /> `
            + `${serial_num} has been successfully registered and activated on your account on  <a href='https://updates.scican.com'>updates.scican.com</a>. You can now access your cycle data, unit information by logging into your account. <br /><br />`
            + `Please feel free to contact SciCan or your local dealer for more information about ${product_name} and its G4<sup>+</sup> features. <br /><br />`
            + `Regards, <br /><br />`
            + `SciCan Team`

    const payload = {
        "mail": email,
        "subject": subject,
        "body": body,
        "mqtt_response_topic": `/scican/${serial_num}/srv/request/account-associate-direct`,
        "mqtt_response_payload": {
            "result": "associated"
        },
        // "template": templateName,
        // "variables": ""
    }

    return payload
}

module.exports.fnAccountAssociateDirect = async (event) => {
    try {
        const axios = require('axios');
        const retval = event.retval
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        let publishParams = {}

        const account_email = event.account_email
        const language = event.language_iso639 ? event.language_iso639 : 'en'
        const account_password = event.account_password

        console.log('++++ Received Payload ', event);

        const userIdres = await UserIdentification(account_email, account_password, axios);

        if (userIdres && userIdres != null){
            //get user's details
            const userDetails = await getUserDetails(account_email)

            //activate online access
            const associated = await AssociateUnit({user_id: userDetails.idusers, useremail: account_email, serial_num: serialNumber})

            if(associated) {
                //get product name
                const productName = await getProductName(serialNumber)
    
                //get payload
                const emailPayload = getEmailPayload({
                    email: account_email, 
                    firstname: userDetails.firstname,
                    lastname: userDetails.lastname, 
                    product_name: productName,
                    serial_num: serialNumber, 
                    language: language 
                })
    
                publishParams = {
                    topic: `${MQTT_TOPIC_ENV}/scican/cmd/send_email`,
                    payload: JSON.stringify(emailPayload),
                    qos: '0' 
                }

                console.info('+++ Sending Email ... ', publishParams)
            }
            
        } else if(!userIdres && typeof userIdres != 'undefined') {
            publishParams = {
                topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
                payload: JSON.stringify({"result": "invalid_credentials"}),
                qos: '0' 
            }
            
            console.info('+++ Invalid Credentials ... ', publishParams)
        } else {
            console.log("🚀 Something went wrong. Nothing Published: userIdres = ", Idres)
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

