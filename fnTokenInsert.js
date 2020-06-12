'use strict';
const mysql = require('mysql2/promise')
const Joi = require('@hapi/joi')

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

module.exports.fnTokenInsert = async event => {
    const jsonBody = JSON.parse(event.body)
    const schema = Joi.object({
        serialNumber: Joi.string().alphanum().max(20).required(),
        scuuid: Joi.string().max(53).required()
    })

    const { error, value } = schema.validate(jsonBody)
    
    if (!(typeof error === 'undefined')) {
        return {
        statusCode: 401,
        body: JSON.stringify({ 'message':'The provided JSON is not valid' })
        }
    }

    const { serialNumber, scuuid } = jsonBody
    const sqlResult = await InsertToken(serialNumber, scuuid)

    return {
        statusCode: 200,
        body: JSON.stringify(sqlResult)
    }
}