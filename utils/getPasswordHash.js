const crypto = require('crypto')

/**
 * 
 * @param {string} username 
 * @param {string} password 
 * @param {string} random_string
 * 
 * @returns mixed string|boolean 
 */
exports.getPasswordHash = function (username, password, random_string) {
  if( !username || typeof username !== 'string' || !password  || typeof password !== 'string' || !random_string  || typeof username !== 'string') {
    return false
  }

  const update_string = String(random_string).toLowerCase() + username.toLowerCase()

  let salt = crypto.createHash('sha256').update(update_string).digest("hex")
  let hash = salt + password

  for( let i = 0; i < 95223; i++ ) {
    hash = crypto.createHash('sha256').update(hash).digest("hex")
  }

  hash = salt + hash

  return hash
}