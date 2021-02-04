//Project 13 Need to test

'use strict'
const AWS = require('aws-sdk')
const S3 = new AWS.S3()
const Joi = require('@hapi/joi')
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


const publishMqtt = (params) =>
    new Promise((resolve, reject) =>
        iotdata.publish(params, (err, res) => resolve(res)))



async function UserIdentification(account_email, account_password) {
    var url = "http://3.86.253.251/user-authentication"
    var data

    data = {
        account_email: account_email,
        account_password: account_password
    }


    var axiosconnect = await axios.create()
    let res = await axiosconnect.post(url, data)
    console.log("User Identification Email ==== ", res)
    return res.data.success
}



async function AssociateEmailSN(useremail, serial_num){
    try {

        const sql = `SELECT * FROM customers_units WHERE association_active = 1 AND serial_num = '${serial_num}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        const data = res[0]
        const outoput = [data.user_email, data.ca_active_ref_id, data.idusers]


        //account email is SQL email
        const account_email = outoput[0]
        const ca_active_ref_id = outoput[1]  //SQL email id
        const idusers = outoput[2]           //SQL email idusers

        console.log("account email ===== ", account_email)
        console.log("output === ", outoput)
        if (useremail != account_email) {
            //Disassociate account email (SQL email)
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
            WHERE user_email= '${account_email}' AND serial_num='${serial_num}'`


            console.log("Update sql1 ==== ", sql1)
            const sqlResult1 = await pool.query(sql1)


            const sql2 = `UPDATE scican.customers_units_assoc_dates SET
          linked_to_user_end_date=NOW(),
            data_updated=NOW()
          WHERE ca_active_ref_id='${ca_active_ref_id}' AND user_email='${account_email}' AND serial_num='${serial_num}'`

            console.log("Update sql2 ==== ", sql2)
            const sqlResult2 = await pool.query(sql2)


            const checkSN = `SELECT user_email FROM scican.customers_units WHERE serial_num='${serial_num}'`
            const checkSNRes = await pool.query(sql2)
            const checkres = checkSNRes[0]
            const checkData = checkres[0]

            console.log("checkData ====== ", checkData)

            //get useremail userID
            const sql5 = `SELECT idusers FROM users WHERE username = '${useremail}'`
            const sqlResult5 = await pool.query(sql5)
            const sql5Res = sqlResult[0]
            const sql5Data = sql5Res[0]
            const sql5ID = sql5Data.idusers
            console.log("SQL5 ID ===== ", sql5ID)


            if (useremail in checkData) {
                console.log("user email is in SQL5 ID.")

                const sql3 = `UPDATE scican.customers_units SET web_conf_confirmed=1,
                web_conf_confirmed_date=NOW(),email_conf_sent_by_unit=1,email_conf_sent_by_unit_date=NOW(),
                prev_associations_active=prev_associations_active+1,association_active=1,
                ca_active_ref_id='${ca_active_ref_id}',latest_oas_update_date=NOW()
                WHERE serial_num='${serial_num}' AND user_email='${useremail}'`
                console.log("Insert sql3 ==== ", sql3)
                const sqlResult3 = await pool.query(sql3)
            } else {

                const sql6 = `INSERT INTO customers_units(idusers,user_email,association_active,serial_num,latest_oas_update_date,idunits_warranties) VALUES 
              ('${sql5ID}','${useremail}',1,'${serial_num}',NOW(),0)`
                console.log("Insert sql6 ==== ", sql6)
                const sqlResult6 = await pool.query(sql6)

                // INSERT INTO scican.customers_units
                // (idusers,
                //     user_email,
                //     prev_associations_active,
                //     association_active,
                //     association_from,
                //     ca_active_ref_id,
                //     web_conf_confirmed,
                //     web_conf_confirmed_date,
                //     email_conf_sent_by_unit,
                //     email_conf_sent_by_unit_date,
                //     serial_num,
                //     ref_key,
                //     latest_oas_update_date,
                //     idunits_warranties)
                // VALUES
                // ('{$userId}',
                //     '{$email}',
                //     1,
                //     1,
                //     'WebPortal',
                //     '{$rId}',
                //     1,
                //     NOW(),
                //     1,
                //     NOW(),
                //     '{$sn}',
                //     '{$rId}',
                //     NOW(),
                //     0);"

            }

            //const sql3 = `INSERT INTO customers_units(idusers,) VALUES ()`


            //set cycle_count_at_conf_assoc = CYCLE NUM = 0
            const sql4 = `INSERT INTO scican.customers_units_assoc_dates
                            (idusers,
                            user_email,
                            serial_num,
                            linked_to_user_start_date,
                            cycle_count_at_conf_assoc,
                            data_updated)
                            VALUES
                            ('${sql5ID}',
                            '${useremail}',
                            '${serial_num}',
                             NOW(),
                             0,
                             NOW())`
            console.log("Insert sql4 ==== ", sql4)
            const sqlResult4 = await pool.query(sql4)



        }

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}



module.exports.fnAccountAccountSignUpForm = async (event) => {
    try {
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        console.log("event ===== ", event)



        const account_email = event.account_email
        const language = event.language_iso639
        const account_password = event.account_password
        console.log("account email ===== ", account_email)

        console.log("account password ===== ", account_email)


        const userIdres = await UserIdentification(account_email, account_password)
        console.log("userIdres ===== ", userIdres)


        var info
        if (userIdres == true){

            AssociateEmailSN(account_email, serialNumber)

            info = {
                "result": "associated"
            }
        } else {
            info = {
                "result": "invalid_credentials"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-associate-direct`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)


        const input =
            {
                "account_email": "scican.forward.01@gmail.com",
                "account_password": "sc1canltd",
                "language_iso639": "en",
                "language_iso3166": "US"
            }



        //Q/scican/1234AB5678/srv/request/account-associate-direct
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-associate-direct



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


