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




async function CreatePasswordHash(user_email, password){

    try {
        var url = "http://3.86.253.251/user-password-create"
        var data

        data = {
            account_email: user_email,
            account_password: password
        }

        var axiosconnect = await axios.create()
        let res = await axiosconnect.post(url, data)
        console.log("Create Password Hash ==== ", res)
        return res.data.password_hash

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}


async function InsertUser(event, password){
    const account_email = event.account_email
    const account_company_name = event.account_company_name
    const account_contact_name = event.account_contact_name
    const account_phone_number = event.account_phone_number
    const account_address = event.account_address
    const account_city = event.account_city
    const account_subregion = event.account_subregion
    const account_country = event.account_country
    const account_zip_code = event.account_zip_code
    const language = event.language_iso639
    const language_iso3166 = event.language_iso3166


    const sql = `INSERT INTO users(password,username,company,firstname,telephone,office_address_one,city,state_province_region,country,zip_postal_code,lang) VALUES 
              ('${password}','${account_email}','${account_company_name}','${account_contact_name}','${account_phone_number}','${account_address}','${account_city}','${account_subregion}','${account_country}','${account_zip_code}','${language}')`

    console.log("Insert User sql ==== ", sql)
    const sqlResult6 = await pool.query(sql)

}



async function AssoiciateUnit(useremail, serial_num){
    try {
        const sql = `SELECT * FROM customers_units WHERE association_active = 1 AND serial_num = '${serial_num}'`
        console.log("sql ==== ", sql)

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        const data = res[0]

        if (typeof data == 'undefined' || typeof data == []) {
            //Should I associate SN ?


            //get useremail userID
            const sql5 = `SELECT idusers FROM users WHERE username = '${useremail}'`
            const sqlResult5 = await pool.query(sql5)
            const sql5Res = sqlResult[0]
            const sql5Data = sql5Res[0]
            const sql5ID = sql5Data.idusers


            const sql6 = `INSERT INTO customers_units(idusers,user_email,association_active,serial_num,latest_oas_update_date,idunits_warranties) VALUES 
              ('${sql5ID}','${useremail}',1,'${serial_num}',NOW(),0)`
            console.log("Insert sql6 ==== ", sql6)
            const sqlResult6 = await pool.query(sql6)


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


        } else {
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

                }

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

        }


    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
    }
}



module.exports.fnAccountSignUpForm = async (event) => {
    try {
        const topic = event.topic
        const res = topic.split("/")
        const serialNumber = res[2]
        console.log("event ===== ", event)


        const input =
            {
                "account_email": "928064091@qq.com",
                "account_password": "sc1canltd",

                "account_company_name": "Alpha",
                "account_contact_name": "Bravo",
                "account_phone_number": "+14167778888",
                "account_address": "Charlie",
                "account_city": "Delta",
                "account_subregion": "Echo",
                "account_country": "Foxtrot",
                "account_zip_code": "Golf",

                "language_iso639": "en",
                "language_iso3166": "US"
            }


        const account_email = event.account_email
        const account_password = event.account_password
        console.log("account email ===== ", account_email)

        console.log("account password ===== ", account_email)

        const account_company_name = event.account_company_name
        const account_contact_name = event.account_contact_name
        const account_phone_number = event.account_phone_number
        const account_address = event.account_address
        const account_city = event.account_city
        const account_subregion = event.account_subregion
        const account_country = event.account_country
        const account_zip_code = event.account_zip_code
        const language = event.language_iso639
        const language_iso3166 = event.language_iso3166



        const userExist = await isUserExist(account_email)
        console.log("userExist ===== ", userExist)


        var info
        if (userExist == true){
            info = {
                "result": "account_already_exists"
            }
        } else {
            console.log("ready to call CreatePassword")
            const passwordhash = await CreatePasswordHash(account_email, account_password)
            console.log("passwordhash ===== ", passwordhash)
            InsertUser(event,passwordhash)




            info = {
                "result": "associated"
            }
        }


        var params = {
            topic: `${MQTT_TOPIC_ENV}/scican/srv/${serialNumber}/response/account-signup-form`,
            payload: JSON.stringify(info),
            qos: '0'
        };
        await publishMqtt(params)


        //Q/scican/1234AB5678/srv/request/account-signup-form
        //Q/scican/#
        //Q/scican/srv/1234AB5678/response/account-signup-form



    } catch (error) {
        console.log("🚀 0 - error:", error)
        console.log("🚀 0.1 - error:", error.stack)
    }
}


