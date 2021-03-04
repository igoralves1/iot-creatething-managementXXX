/**
 * Returns ISO639_2 language code
 * 
 * @param {string} lang_code - ISO639_1 language code
 * @returns {string} 
 */
exports.iso3LanguageCode = async (lang_code) => {
  const { execute } = require('../tools/mysql.conn')
  let code = ''

  if(!lang_code || lang_code == null) {
      return code
  }

  try {
      const sql = `SELECT language_ISO639_2 FROM scican.web_ISO639_languages WHERE language_ISO639_1 = ?`

      
      const sqlResult = await execute(sql, [lang_code]) 
      const res = sqlResult[0]

      if(res) {
          code = res.language_ISO639_2
      }
      
      return code

  } catch (error) {
      console.log("🚀 getIso3LanguageCode - error: ", error.message)
      console.log("🚀 getIso3LanguageCode - error stack: ", error.stack)
      return ''
  }
}