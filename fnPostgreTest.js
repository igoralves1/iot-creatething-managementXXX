'use strict';
const AWS = require('aws-sdk')
const mysql = require('mysql2/promise')
const iotdata = new AWS.IotData({endpoint: process.env.MQTT_ENDPOINT})
const pg = require('pg')
const pool = new pg.Pool()

async function query (q) {
    const client = await pool.connect()
    let res
    try {
        await client.query('BEGIN')
        try {
        res = await client.query(q)
        await client.query('COMMIT')
        } catch (err) {
        await client.query('ROLLBACK')
        throw err
        }
    } finally {
        client.release()
    }
    return res
}

const publishMqtt = (params) =>
  new Promise((resolve, reject) =>
  iotdata.publish(params, (err, res) => resolve(res)))

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
        console.log('sql')
        console.log(sql)
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

module.exports.fnPostgreTest = async event => {
    try {
        const { rows } = await query("select * from pg_tables")
        console.log(JSON.stringify(rows[0]))
        return {
            statusCode: 200,
            body: JSON.stringify(rows)
        }
    } catch (err) {
        console.log('Database ' + err)
        callback(null, 'Database ' + err);
    }

    



}




/*






exports.handler = async (event, context, callback) => {
    
};


*/