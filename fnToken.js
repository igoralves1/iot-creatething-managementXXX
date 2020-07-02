'use strict';
const mysql = require('mysql2/promise')

async function GetToken(serial_number, scuuid) {
    try {

    const pool = mysql.createPool({
        host     : process.env.rdsMySqlHost,
        user     : process.env.rdsMySqlUsername,
        password : process.env.rdsMySqlPassword,
        database : process.env.rdsMySqlDb
    })

    const sql = `SELECT token FROM online_access_tokens WHERE serial_number='${serial_number}' AND uuid='${scuuid}' AND is_active=1`
    const sqlResult = await pool.query(sql)
    return sqlResult

    } catch (error) {
        return {
            success: false,
            message: "SELECT from Mysql Failure",
            error: error
        }
    }
}


module.exports.fnToken = async event => {

    let sn = event.queryStringParameters.serial_number
    let scuuid = event.queryStringParameters.scuuid
    
    let onlineAccessCode = ""
    let status = 1 //! 0-Success, 1-SomeError

    const sqlResult = await GetToken(sn, scuuid)
    const token = sqlResult[0]
    if (token.length > 0) {
        onlineAccessCode = token[0].token
        status = 0
    }
    const resp = {
        'onlineAccessCode': onlineAccessCode,
        'status': status
    }
    return {
        statusCode: 200,
        body: JSON.stringify(resp)
    }
}