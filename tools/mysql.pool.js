
const pool = require('mysql2/promise')

const dbPool = pool.createPool({
    host     : process.env.rdsMySqlHost,
    user     : process.env.rdsMySqlUsername,
    password : process.env.rdsMySqlPassword,
    database : process.env.rdsMySqlDb,
    connectionLimit: 2
})

module.exports.execute = async function (sql, args){
    const promisePool = dbPool.promise();
    // query database using promises
    const [rows, fields] = await promisePool.execute(sql, args);
    return rows;
}

module.exports.end = async () => {
    if (dbPool) {
        dbPool.end();
    }
}