
const pool = require('mysql2/promise')

const dbPool = pool.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb,
    connectionLimit: 2
})

module.exports.execute = async function (sql, args){
    // query database using promises
    const [rows, fields] = await dbPool.execute(sql, args);
    return rows;
}