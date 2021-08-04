const db = require('mysql2/promise')

module.exports.execute = async function (sql, args){
    const connection = await db.createConnection({
        host     : process.env.rdsMySqlHost,
        user     : process.env.rdsMySqlUsername,
        password : process.env.rdsMySqlPassword,
        database : process.env.rdsMySqlDb,
    })
    // query database using promises
    try {
        const [rows, fields] = await connection.execute(sql, args);
        return rows;
    } catch (err) {
        console.error('Database error:' + err);
    } finally {
        connection.end();
    }
}