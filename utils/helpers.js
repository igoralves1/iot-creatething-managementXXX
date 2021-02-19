const crypto = require('crypto')

/**
 * generates an md5 hash
 * 
 * @returns string
 */
exports.generateRandomValue = () => {
  const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
  let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")

  return hash
}