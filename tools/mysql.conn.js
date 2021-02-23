const db = require('mysql2/promise')

module.exports.execute = async function (sql, args){
    const connection = await db.createConnection({
        host     : process.env.rdsMySqlHost,
        user     : process.env.rdsMySqlUsername,
        password : process.env.rdsMySqlPassword,
        database : process.env.rdsMySqlDb,
    })
    // query database using promises
    const [rows, fields] = await connection.execute(sql, args);

    connection.end()
    
    return rows;
}