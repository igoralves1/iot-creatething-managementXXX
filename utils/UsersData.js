/**
 * Returns an object with payload data ready for publishing
 * 
 * @param {string} user_email
 * @returns {Object} 
 */
exports.getUserDetails = async (user_email, pool) => {
    let details = {}

    if(!user_email || user_email == null) {
        return units
    }

    try {
        const sql = `SELECT * FROM users WHERE username = ?`

        if ( pool != null ) {
            const sqlResult = await pool.query(sql, [user_email])
            const res = sqlResult[0]

            if(res[0]) {
                details.firstname = res[0].firstname || ''
                details.lastname = res[0].lastname || ''
                details.telephone = res[0].telephone || ''
                details.company = res[0].company || ''
                details.address1 = res[0].office_address_one || ''
                details.address2 = res[0].office_address_two || ''
                details.city = res[0].city || ''
                details.country = res[0].country || ''
                details.region = res[0].state_province_region || ''
                details.zip_code = res[0].zip_postal_code || ''
            }
        }
  
        return details

    } catch (error) {
        console.log("🚀 getUserDetails - error: ", error)
        console.log("🚀 getUserDetails - error stack: ", error.stack)
    }
}

exports.isUserExist = async (user_email, pool) => {
    try {

        const sql = `SELECT count(1) AS numbers FROM users WHERE username = ?`

        const sqlResult = await pool.query(sql, [user_email])
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

/**
 * Checks if unit has online access
 * 
 * @param {string} email
 * @param {string} serial_number
 * @returns {boolean}
 */
exports.updateActivationKey = async (email, activatin_key, pool) => {
    let isUpdated = false

    try {
        const sql = `UPDATE users SET activationkey = ? WHERE username = ?`

        if ( pool ) {
            const sqlResult = await pool.query(sql, [activatin_key, email])
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