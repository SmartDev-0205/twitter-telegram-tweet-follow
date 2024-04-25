
const fetch  = require('node-fetch');

async function enableBell(userId, cookiesFilePath) {



  try {
    const cookies = require(cookiesFilePath);
    const result = await fetch("https://twitter.com/i/api/1.1/friendships/update.json", {
      "headers": {
        "cookie": cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
        "authorization": "Bearer " + process.env.BEARER_AUTH_TOKEN,
        "content-type": "application/x-www-form-urlencoded",
        "x-csrf-token": cookies.find(cookie => cookie.name === 'ct0').value,
        "Referer": "https://twitter.com/",
      },
      "body": "include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&include_ext_profile_image_shape=1&skip_status=1&cursor=-1&id=" + userId + "&device=true",

      "method": "POST",
    })

    if (result.status === 200) {
      console.log("Bell enabled for user ", userId)
      return true;
    }

    console.log("Error in enableBell, status:  ", result.status)
    return false;
  } catch (e) {
    console.log("Error in enableBell", e)
    return false;
  }

}



module.exports = enableBell;