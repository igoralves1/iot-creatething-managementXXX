


/**
 * Insert into online_access_email_request_table when a user requests for an association email.
 * This is used to check that the right user is trying to associate from the email link that was clicked
 * 
 * @param {string} serial_number 
 * @param {string} email 
 * @returns boolean
 */
exports.saveAssociationEmailRequest = async (serial_number, email, pool) => {
  try {
    const sql = `INSERT INTO online_access_email_request (serial_num, account_email, request_date)
              Values (?, ?, NOW() )`

    const queryResult = await pool.query(sql, [serial_number, email])
    const res = queryResult[0]

    return (Object.keys(res).length > 0 && res.affectedRows  != null) ? Boolean(res.affectedRows) : false
  } catch (error) {
    console.log("🚀 0 - saveAssociationEmailRequest- error:", error)
    console.log("🚀 0.1 - saveAssociationEmailRequest - error:", error.stack)
    return false
  }
}

const updateAssociationEndDate = async (user_email, serial_num, ca_active_ref_id, pool) => {
  try {
    const sql1 = `UPDATE scican.customers_units_assoc_dates SET
      linked_to_user_end_date=NOW(),
          data_updated=NOW()
      WHERE ca_active_ref_id=? AND user_email=? AND serial_num=?`

    const sqlResult2 = await pool.query(sql1, [ca_active_ref_id, user_email, serial_num])
  } catch (error) {
    console.log("🚀 0.updateAssociationEndDate - error:", error)
    console.log("🚀 0.1.updateAssociationEndDate - error:", error.stack)
  }
  
}

const insertAssociationDate = async (user_id, useremail, serial_num, ref_id, pool) => {
  //Insert into customers_units_assoc_dates
  try {
    const sql4 = `INSERT INTO scican.customers_units_assoc_dates
            (idusers, user_email, serial_num, ca_active_ref_id, linked_to_user_start_date, cycle_count_at_conf_assoc, data_updated)
            VALUES (?, ?, ?, ?, NOW(), 0, NOW())`

    const sqlResult4 = await pool.query(sql4, [user_id, useremail, serial_num, ref_id])
  } catch (error) {
    console.log("🚀 0.insertAssociationDate - error:", error)
    console.log("🚀 0.1.insertAssociationDate - error:", error.stack)
  }
  
}


exports.disassociate = async (user_email, serial_num, ca_active_ref_id, pool) => {
  try {
      const sql = `UPDATE scican.customers_units SET
          association_active=0,
          association_from=NULL,
          ca_active_ref_id=NULL,
          web_conf_confirmed=0,
          web_conf_confirmed_date='0000-00-00 00:00:00',
          email_conf_sent_by_unit=0,
          email_conf_sent_by_unit_date='0000-00-00 00:00:00',
          current_location_date='0000-00-00 00:00:00',
          latest_oas_update_date=NOW()
      WHERE user_email=? AND serial_num=?`


      // console.log("Update sql ==== ", sql)
      const sqlResult = await pool.query(sql, [user_email, serial_num])

      await updateAssociationEndDate(user_email, serial_num, ca_active_ref_id, pool)


      /*const sql1 = `UPDATE scican.customers_units_assoc_dates SET
      linked_to_user_end_date=NOW(),
          data_updated=NOW()
      WHERE ca_active_ref_id=? AND user_email=? AND serial_num=?`

      const sqlResult2 = await pool.query(sql1, [ca_active_ref_id, user_email, serial_num])
*/

      return sqlResult[0] ? Boolean(sqlResult[0].affectedRows) : false

  } catch (error) {
      console.log("🚀 0.disassociate - error:", error)
      console.log("🚀 0.1.disassociate - error:", error.stack)
  }
}

exports.updateAssociation = async (user_email, serial_num, ca_active_ref_id, pool) => {
  try {
      const sql = `UPDATE scican.customers_units 
            SET web_conf_confirmed = 1,
            web_conf_confirmed_date = NOW(),
            email_conf_sent_by_unit = 1,
            email_conf_sent_by_unit_date = NOW(),
            prev_associations_active = prev_associations_active+1,
            association_active = 1,
            ca_active_ref_id = ?,
            latest_oas_update_date=NOW()
            WHERE user_email = ? AND serial_num = ?`


      // console.log("Update sql ==== ", sql)
      const sqlResult = await pool.query(sql, [ca_active_ref_id, user_email, serial_num])

      // update unit associate dates table
      await insertAssociationDate(user_id, user_email, serial_num, ca_active_ref_id, pool)
      
      /*
      const sql1 = `UPDATE scican.customers_units_assoc_dates SET
      linked_to_user_end_date=NOW(),
          data_updated=NOW()
      WHERE ca_active_ref_id=? AND user_email=? AND serial_num=?`

      const sqlResult2 = await pool.query(sql1, [ca_active_ref_id, user_email, serial_num])
      */

      return sqlResult[0] ? Boolean(sqlResult[0].affectedRows) : false

  } catch (error) {
      console.log("🚀 0.updateAssociation - error:", error)
      console.log("🚀 0.1.updateAssociation - error:", error.stack)
  }
}

exports.insertAssociation = async (user_id, useremail, serial_num, ref_id, pool) => {
  try {
      const sql = `INSERT INTO customers_units
                (idusers,user_email,prev_associations_active,association_active,serial_num,ca_active_ref_id,latest_oas_update_date,idunits_warranties,web_conf_confirmed, web_conf_confirmed_date,email_conf_sent_by_unit,email_conf_sent_by_unit_date) 
                VALUES (?,?,1,1,?,?,NOW(),0,1,NOW(),1,NOW())`

      // console.log("Update sql ==== ", sql)
      const sqlResult = await pool.query(sql, [user_id, useremail, serial_num, ref_id])

  /*
      const sql1 = `UPDATE scican.customers_units_assoc_dates SET
      linked_to_user_end_date=NOW(),
          data_updated=NOW()
      WHERE ca_active_ref_id=? AND user_email=? AND serial_num=?`

      const sqlResult2 = await pool.query(sql1, [ca_active_ref_id, user_email, serial_num])
      */

      return sqlResult[0] ? Boolean(sqlResult[0].affectedRows) : false

  } catch (error) {
      console.log("🚀 0.insertAssociation - error:", error)
      console.log("🚀 0.1.insertAssociation - error:", error.stack)
  }
}
