/**
 * Returns product name
 * 
 * @param {string} serial_number
 * @returns {string} 
 */
exports.getProductName = async (serial_number, pool) => {
    let product_name = ''

    if(!serial_number || serial_number == null) {
        return product_name
    }

    try {
        const sql = `SELECT model_general_name FROM units_models WHERE productSerialNumberPrefix = ?`

        if ( pool ) {
            const sqlResult = await pool.query(sql, [serial_number.slice(0, 4)])
            const res = sqlResult[0]

            if(res[0]) {
                product_name = res[0].model_general_name
            }
        }
        
        return product_name

    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
        return ''
    }
}

/**
 * Returns an array of units
 * 
 * @param {string} email 
 * @returns {Array}
 */
exports.getCustomerUnits = async (email, pool) => {
    let units = []

    if(!email || email == null) {
        return units
    }
    
    try {
        const sql = `SELECT serial_num, association_active FROM customers_units WHERE user_email = ?`

        if ( pool ) {
            const sqlResult = await pool.query(sql, [email])
            const res = sqlResult[0]
            const data = res && res != null ? res : []

            if(data.length > 0) {
                for( const k in data ) {
                    units.push(
                        {
                            serial_number: data[k].serial_num,
                            association_status: data[k].association_active
                        }
                    )
                }
            }
        }
        
        return units
    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
        return []
    }
}

/**
 * Returns an array of units
 * 
 * @param {string} email 
 * @returns {Array}
 */
exports.getCustomerAssociatedUnits = async (email, pool) => {
    let units = []

    if(!email || email == null) {
        return units
    }
    
    try {
        const sql = `SELECT serial_num, association_active FROM customers_units WHERE association_active = 1 AND user_email = ?`

        if ( pool ) {
            const sqlResult = await pool.query(sql, [email])
            const res = sqlResult[0]
            const data = res && res != null ? res : []

            if(data.length > 0) {
                for( const k in data ) {
                    units.push(
                        {
                            serial_number: data[k].serial_num,
                            association_status: data[k].association_active
                        }
                    )
                }
            }
        }
        
        return units
    } catch (error) {
        console.log("🚀 getProductName - error: ", error)
        console.log("🚀 getProductName - error stack: ", error.stack)
        return []
    }
}

/**
 * Checks if unit has online access
 * 
 * @param {string} email
 * @param {string} serial_number
 * @returns {boolean}
 */
exports.checkOnlineAccessStatus = async (email, serial_number, pool) => {
    let isActive = false
    
    try {
        const sql = `SELECT association_active FROM customers_units WHERE association_active = 1 AND user_email = ? AND serial_num = ?`

        if ( pool ) {
            const sqlResult = await pool.query(sql, [email, serial_number])
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

exports.associationDetails = async (email, serial_num, pool) => {
    if(!serial_num || serial_num == null || !email || email == null) {
        console.log( '+++ Missing data - ', {'serial_number': serial_num, 'email': email} )
        return []
    }

    try {

        const sql = `SELECT * FROM customers_units WHERE association_active = 1 AND serial_num = '${serial_num}' and user_email='${email}'`

        const sqlResult = await pool.query(sql)
        const res = sqlResult[0]

        const data = res && res.length > 0 ? res[0] : []

        if (!data || typeof data == 'undefined' || data.length == 0) {
            return []
        } else {
            const outoput = [data.user_email, data.ca_active_ref_id]
            
            return [data.user_email, data.ca_active_ref_id]
        }

    } catch (error) {
        console.log("🚀 0.associationDetails - error:", error)
        console.log("🚀 0.1.associationDetails - error:", error.stack)
    }
}


/**
 * 
 * @param {string} serial_num 
 * @returns array
 */
exports.unitAssociations = async (serial_num, pool) => {
    try {
        const sql = `SELECT * FROM customers_units WHERE serial_num = ?`

        const sqlResult = await pool.query(sql, [serial_num])
        const res = sqlResult[0]

        return res ? res : []
    } catch (error) {
        console.log("🚀 0.unitAssociations - error:", error)
        console.log("🚀 0.1.unitAssociations - error:", error.stack)
        return []
    }
}

/**
 * 
 * @param {string} serial_num 
 * @returns array
 */
exports.unitActiveAssociation = async (serial_num, pool) => {
    try {
        const sql = `SELECT user_email, association_active FROM customers_units WHERE association_active = 1 AND serial_num = ? LIMIT 1`

        const sqlResult = await pool.query(sql, [serial_num])
        const res = sqlResult[0]

        return res && res.length > 0? res[0] : []
    } catch (error) {
        console.log("🚀 0.unitAssociations - error:", error)
        console.log("🚀 0.1.unitAssociations - error:", error.stack)
        return null
    }
}
