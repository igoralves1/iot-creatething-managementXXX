
async function ep(username, password, pool){

    var randomStr = Math.round(Date.now() / 1000)

    const sql1 = `SELECT idusers FROM users WHERE username='${username}' AND activationstatus='activated'`

	const sqlResult1 = await pool.query(sql1)
	const res1 = sqlResult1[0]
	
	const data1 = res1 && res1.length > 0 ? res1[0] : []
// console.log('+++ data1 = ', data1)
    if ( data1 && Object.keys(data1).length > 0 ) {
        const idusersQ1 = data1.idusers
// console.log('idusersQ1', idusersQ1)
        const sql2 = `SELECT MAX(ullid) AS ullid, idusers, time, successfullogin FROM lastlogin WHERE idusers='${idusersQ1}' AND successfullogin='Yes'`
// console.log('sql2 - ', sql2)
	    const sqlResult2 = await pool.query(sql2)
	    const res2 = sqlResult2[0]
	
	    const data2 = res2 && res2.length > 0 ? res2[0] : []
// console.log('++ res 2 - ', res2)
        if ( data2 && Object.keys(data2).length > 0 ) {

            const idusersQ2 = data2.idusers
            const ullidQ2 = data2.ullid

            const sql3 = `SELECT * FROM lastlogin WHERE idusers='${idusersQ2}' AND ullid='${ullidQ2}'`

	        const sqlResult3 = await pool.query(sql3)
	        const res3 = sqlResult3[0]
// console.log(' === res 3 ', res3)
	        const data3 = res3 && res3.length > 0 ? res3[0] : []
            if ( data3 && Object.keys(data3).length > 0 ) {
                const unixTimestampQ3 = data3.time
                randomStr = unixTimestampQ3
            // console.log('===random = ', randomStr)
            // console.log(' === data 3 ', data3)
            }
        }
    } else {
        randomStr = username
    }
// console.log('++ rand str - ', randomStr)
    return _ep(username, randomStr, password)
}

async function updateUserPassword(epHash, usernamed, pool){
    const sql = `UPDATE users SET password='${epHash}' WHERE username='${username}'`

    const sqlResult = await pool.query(sql)
}

async function updateLastloginSuccessfullToYes(timeNow, idusers, ullid, loggedinto, pool){
    const sql = `UPDATE lastlogin SET time='${timeNow}',successfullogin='Yes',date=NOW(),loggedinto='${loggedinto}' WHERE idusers='${idusers}' AND ullid='${ullid}'`

	const sqlResult = await pool.query(sql)
}

function _ep(username, randomStr, password) {

	const strSalt = String(randomStr).toLowerCase() + username.toLowerCase()
	const crypto = require('crypto')
	const salt = crypto.createHash('sha256').update(strSalt).digest("hex")

	var hash = salt + password

	var i;
	for (i = 0; i < 95223; i++) { 
  		hash = crypto.createHash('sha256').update(hash).digest("hex")
	}
	
	hash = salt + hash

	return hash
}

async function insertIntoLastloginNewRow (idusers, uip, attempts, time, successfullogin, loggedinto, temail, pool) {
    const sql = `INSERT INTO lastlogin (  idusers   ,   uip  ,   attempts  ,    time   ,   successfullogin  ,date ,   loggedinto  ,  temail)
    VALUES ('${idusers}','${uip}','${attempts}','${time}','${successfullogin}',NOW(),'${loggedinto}', '${temail}')`

	const sqlResult = await pool.query(sql)

}

async function updatePasswordmd5HashToNewOne(username, unHashPassword, time, pool){
    const epHash = _ep(username, time, unHashPassword)

    const sql1 = `SELECT password, idusers, email, username FROM users WHERE username='${username}' AND activationstatus='activated'`

	const sqlResult1 = await pool.query(sql1)
	const res1 = sqlResult1[0]
	
	const data1 = res1 && res1.length > 0 ? res1[0] : []
// console.log('=== data 1 - ' , data1)
    if ( data1 && Object.keys(data1).length > 0) {

        const passwordQ1 = data1.password
        const idusersQ1 = data1.idusers
        const emailQ1 = data1.email
        const usernameQ1 = data1.username

        const crypto = require('crypto')
        const md5HashPassword = crypto.createHash('md5').update(unHashPassword).digest("hex")

        const passwordMD5Match = ((passwordQ1==md5HashPassword) ? ture : false) 
        
        if (passwordQ1 == md5HashPassword) {
            
            insertIntoLastloginNewRow(idusersQ1, '0.0.0.0', 0, time, 'yes', 'FLPUD', emailQ1)

            updateUserPassword(epHash, username)

        }

        const sql3 = `SELECT idusers, ullid FROM lastlogin WHERE idusers='${idusersQ1}' AND successfullogin='No'`
// console.log('===sql3', sql3)
        const sqlResult3 = await pool.query(sql3)
        const res3 = sqlResult3[0]
	
        const data3 = res3 && res3.length > 0 ? res3[0] : []
// console.log('--- data3 ', data3)        
        if ( data3 && Object.keys(res3).length > 0 && passwordMD5Match) {
// console.log(' Updating data 3 ', data3)
            const idusersQ3 = data3.idusers
            const ullidQ3 = data3.ullid
            
            updateLastloginSuccessfullToYes(time, idusersQ3, ullidQ3, 'RecoverPW-No')
        
            updateUserPassword(epHash, username)

        } else if (usernameQ1 == unHashPassword &&  passwordMD5Match) {
    // console.log(' Inserting data 3 ', data3)
            insertIntoLastloginNewRow(idusersQ1, '0.0.0.0', 0, time, 'yes', 'RecoverPW', emailQ1)

            updateUserPassword(epHash, username)

        } else if (passwordQ1 == unHashPassword &&  passwordMD5Match) {
    // console.log('last else data 3 ', data3)           
            insertIntoLastloginNewRow(idusersQ1, '0.0.0.0', 0, time, 'yes', 'RecoverPW', emailQ1)

            updateUserPassword(epHash, username)
        }
    }     
}



exports.isValidUserLogin = async (username, unHashPassword, pool) => {

    const unixTimestamp = Math.round(Date.now() / 1000)

    // updatePasswordmd5HashToNewOne(username, unHashPassword, unixTimestamp, pool)

    const password = await ep(username, unHashPassword, pool)

    const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}' AND activationstatus='activated'`
// console.log('sql - ', sql)
    const sqlResult = await pool.query(sql)
    const res = sqlResult[0]
console.log('res 0 = ', res)
    const data3 = res && res.length > 0 ? res : []
    
    if ( data3 && data3.length > 0 ) {
        return true
    } else {
        return false
    }
}