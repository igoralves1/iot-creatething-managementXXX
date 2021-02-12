'use strict'
const crypto = require('crypto')

const getRandomValue = () => {
  const randVal = Math.random() + Math.random() + Math.random() + Math.random() + Math.random()
  let hash = crypto.createHash('md5').update(String(randVal)).digest("hex")
  const password = 'Sc1canLtd'
  const time_now = Date.now()
  const update_string = time_now.toLowerString() + password.toLowerString

  let salt = crypto.createHash('sha256').update(update_string).digest("base64")

  console.log('time now', time_ now)
  console.log('update string - ', update_string)
  console.log('salt - ', salt)

  

  return hash
  /*
  $salt = hash('sha256', strtolower($randomStr) . strtolower($username));
  $hash = $salt . $password;
  // Hash the salted password 95223 times
  for ( $i = 0; $i < 95223; $i ++ )
  {
    $hash = hash('sha256', $hash);
  }
  // to find the hash later if needed.
  $hash = $salt . $hash;

  return $hash;
  */
}

module.exports.fnGetPasswordHash = async (event) => {
  getRandomValue()
}

const getEmailTemplate = (body) => {
  const template = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
                  + '<html xmlns="http://www.w3.org/1999/xhtml">'
                  + '<head>'
                  + '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
                  + '<title></title>'
                  + '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
                  + '</head>'
                  + '<body style="margin:0;padding:0;">'
                  + '<table align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;border:1px solid #ebebeb;">'
                  + '<tr><td>'
                  + '<table align="left" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">'
                  + '<tr>'
                  + '<td width="10%"></td>'
                  + '<td style="width:80%;padding:54px 0 30px 0;font-size:12px;line-height:18px;font-family:sans-serif;color:#58595b;" >'
                  + body
                  + '</td>'
                  + '<td width="10%"></td>'
                  + '</tr>'
                  + '</table>'
                  + '</td></tr>'
                  + '<tr>'
                  + '<td valign="top" style="mso-line-height-rule:exactly;background-color:#fff;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;padding-top:0px;">'
                  + '<table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonBlock" style="min-width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">'
                  + '<tbody class="mcnImageBlockOuter">'
                  + '<tr>'
                  + '<td valign="top" style="padding:0px;" class="mcnImageBlockInner">'
                  + '<table align="left" width="100%" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="min-width:100%;">'
                  + '<tbody>'
                  + '<tr>'
                  + '<td align="center" class="mcnImageContent" valign="top" style="padding-right:0px;padding-left:0px;padding-top:0;padding-bottom:0;text-align:center !important;background-color:#fff;">'
                  + '<img alt="SciCan Logo" src="https://updates.scican.com/images/images/iEmails/logo.png" width="600" style="max-width:100%;max-height: 77px; padding-bottom: 0; display: inline !important; vertical-align: bottom;" class="mcnImage">'
                  + '</td>'
                  + '</tr>'
                  + '</tbody>'
                  + '</table>'
                  + '</td>'
                  + '</tr>'
                  + '</tbody>'
                  + '</table>'
                  + '</td>'
                  + '</tr>'
                  + '<tr>'
                  + '<td>'
                  + '<table class="content" align="center" border="0" cellpadding="0" cellspacing="0" style="width:100%;height:80px;max-width:600px;background:#727373;">'
                  + '<tr>'
                  + '<td align="center" background="" bgcolor="#727373" valign="top" style="background:#727373;padding-top:9px;">'
                  + '<div>'
                  + '<table class="content" align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;height:80px;width:auto !important;">'
                  + '<tr>'
                  + '<td align="center" valign="middle">'
                  + '<table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnFollowStacked" style="display:inline;">'
                  + '<tbody>'
                  + '<tr>'
                  + '<td align="center" valign="top" class="mcnFollowIconContent" style="padding-right:10px;padding-bottom:9px;">'
                  + '<a href="https://twitter.com/scican" target="_blank"><img src="https://updates.scican.com/images/iEmails/outline-gray-twitter-96.png" alt="Twitter" class="mcnFollowBlockIcon" width="48" style="width:48px; max-width:48px; display:block;"></a>'
                  + '</td>'
                  + '</tr>'
                  + '</tbody>'
                  + '</table>'
                  + '<table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnFollowStacked" style="display:inline;">'
                  + '<tbody>'
                  + '<tr>'
                  + '<td align="center" valign="top" class="mcnFollowIconContent" style="padding-right:10px;padding-bottom:9px;">'
                  + '<a href="https://www.facebook.com/SciCan" target="_blank"><img src="https://updates.scican.com/images/iEmails/outline-gray-facebook-96.png" alt="Facebook" class="mcnFollowBlockIcon" width="48" style="width:48px; max-width:48px; display:block;"></a>'
                  + '</td>'
                  + '</tr>'
                  + '</tbody>'
                  + '</table>'
                  + '<table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnFollowStacked" style="display:inline;">'
                  + '<tbody>'
                  + '<tr>'
                  + '<td align="center" valign="top" class="mcnFollowIconContent" style="padding-right:10px;padding-bottom:9px;">'
                  + '<a href="https://www.youtube.com/user/SciCanTV" target="_blank"><img src="https://updates.scican.com/images/iEmails/outline-gray-youtube-96.png" alt="YouTube" class="mcnFollowBlockIcon" width="48" style="width:48px; max-width:48px; display:block;"></a>'
                  + '</td>'
                  + '</tr>'
                  + '</tbody>'
                  + '</table>'
                  + '</td>'
                  + '</tr>'
                  + '</table>'
                  + '</div>'
                  + '</td>'
                  + '</tr>'
                  + '</table>'
                  + '</td>'
                  + '</tr>'
                  + '<tr>'
                  + '<td style="text-align:center;color:#fff;background:#727373;">'
                  + '<table class="content" align="center" border="0" cellpadding="0" cellspacing="0" style="width:50%;max-width:320px;background:#727373;">'
                  + '<tr>'
                  + '<td style="width:66%;padding:10px 0 10px 0;font-size:10px;line-height:14px;font-family:sans-serif;color:#fff;" mc:edit="footer">SciCan Ltd., 1440 Don Mills Road, Toronto, ON M3B 3P9, Canada<br>'
                  + '&copy; 2018 SciCan Ltd. A Coltene Group Company.&nbsp;All rights reserved.<br>'
                  + '<em>Your Infection Control Specialist</em> is a trademark of SciCan Ltd.<br>'
                  + 'If you would like to stop receiving this email, click to <a href="*|UNSUB|*" style="color:#fff;">unsubscribe</a>.<br>'
                  + '<br>'
                  + 'Your privacy is important to us. Please review SciCan&#39;s <a href="http://www.scican.com/privacy/" style="color:#fff;" target="_blank">Privacy Policy</a>'
                  + '<br>'
                  + '&nbsp;</td>'
                  + '</tr>'
                  + '</table>'
                  + '</td>'
                  + '</tr>'
                  + '</table>'
                  + '</body>'
                  + '</html>'

  return template
}