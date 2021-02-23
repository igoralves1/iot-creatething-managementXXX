const { generateRandomValue } = require('./helpers')

/**
 * Returns an object with payload data ready for publishing
 * 
 * @param {string} user_email
 * @returns {Object} 
 */
exports.getUserDetails = async (user_email) => {
    let details = {}

    if(!user_email || user_email == null) {
        return units
    }

    try {
        const { execute } = require('../tools/mysql.conn')

        const sql = `SELECT * FROM users WHERE username = ?`

        const sqlResult = await execute(sql, [user_email]) //await conn.query(sql, [user_email])
        const res = sqlResult[0]

        if(res) {
            details.user_id = res.idusers || ''
            details.firstname = res.firstname || ''
            details.lastname = res.lastname || ''
            details.email = res.username || ''
            details.telephone = res.telephone || ''
            details.company = res.company || ''
            details.address1 = res.office_address_one || ''
            details.address2 = res.office_address_two || ''
            details.city = res.city || ''
            details.country = res.country || ''
            details.region = res.state_province_region || ''
            details.zip_code = res.zip_postal_code || ''
        }
        /*if(res[0]) {
            details.user_id = res[0].idusers || ''
            details.firstname = res[0].firstname || ''
            details.lastname = res[0].lastname || ''
            details.email = res[0].username || ''
            details.telephone = res[0].telephone || ''
            details.company = res[0].company || ''
            details.address1 = res[0].office_address_one || ''
            details.address2 = res[0].office_address_two || ''
            details.city = res[0].city || ''
            details.country = res[0].country || ''
            details.region = res[0].state_province_region || ''
            details.zip_code = res[0].zip_postal_code || ''
        }*/
  
        return details

    } catch (error) {
        console.log("🚀 getUserDetails - error: ", error)
        console.log("🚀 getUserDetails - error stack: ", error.stack)
        return null
    }
}

exports.isUserExist = async (user_email) => {
    const { execute } = require('../tools/mysql.conn')
    try {

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = ?`

        const sqlResult = await execute(sql, [user_email]) //conn.query(sql, [user_email])
        const res = sqlResult[0]

        console.log("sqlRes ==== ", sqlResult)
        var userexist
        if (res && res.numbers == 0) {
            userexist = false
        } else {
            userexist = true
        }

        return userexist

    } catch (error) {
        console.log("🚀 0.isUserExist - error:", error)
        console.log("🚀 0.1.isUserExist - error:", error.stack)
        return null
    }
}

/**
 * Checks if unit has online access
 * 
 * @param {string} email
 * @param {string} serial_number
 * @returns {boolean}
 */
exports.updateActivationKey = async (email, activatin_key) => {
    const { execute } = require('../tools/mysql.conn')
    let isUpdated = false

    try {
        const sql = `UPDATE users SET activationkey = ? WHERE username = ?`

        const sqlResult = await execute(sql, [activatin_key, email]) //conn.query(sql, [activatin_key, email])
        const res = sqlResult[0]

        isUpdated = sqlResult ? sqlResult.changedRows : false
        
        return isUpdated

    } catch (error) {
        console.log("🚀 0.updateActivationKey - error: ", error)
        console.log("🚀 0.1updateActivationKey - error stack: ", error.stack)
        return null
    }
}

exports.updateLastLogin = async (params) => {
    let isUpdated = false
    const {user_id, hash_time, email} = params

    if(!user_id || user_id == null || !hash_time || hash_time == null || !email || email == null) {
        return false
    }

    try {
        const { execute } = require('../tools/mysql.conn')

        const sql = `INSERT INTO lastlogin (idusers,uip,attempts,time,successfullogin,date,loggedinto,temail)
        VALUES (?,'','0',?,'yes',NOW(),'Registered', ?)`

        const sqlResult = await execute(sql, [user_id, hash_time, email])
        const res = sqlResult[0]

        isUpdated = sqlResult ? Boolean(sqlResult.affectedRows) : false
        
        return isUpdated

    } catch (error) {
        console.log("🚀 0.updateActivationKey - error: ", error)
        console.log("🚀 0.1updateActivationKey - error stack: ", error.stack)
        return null
    }
}

exports.InsertUser = async (data) => {
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
        const { execute } = require('../tools/mysql.conn')

        const sql = `INSERT INTO users(password, username, company, firstname, telephone, office_address_one, city, state_province_region, country, zip_postal_code, lang,groups, email, activationkey, activationstatus, activationdate) VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'customer', ?, ?,'activated',CURRENT_TIMESTAMP())`
        const insertVals = [password,account_email,account_company_name,account_contact_name,account_phone_number,account_address,account_city,account_subregion,account_country,account_zip_code,language,account_email,activation_key]
        const sqlResult6 = await execute(sql, insertVals)
    
        const result = sqlResult6 ? sqlResult6[0] : {}

        return sqlResult6 ? sqlResult6.insertId : '' // result.affectedRows
    } catch (error) {
        console.log("🚀 0.InsertUser - error:", error)
        console.log("🚀 0.1.InsertUser - error:", error.stack)
        return null
    }
}