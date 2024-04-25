const fetch = require("node-fetch");



async function getUserByScreenName(screenName, cookiesFilePath) {

    const cookies = require(cookiesFilePath);


    const variables = {
        "screen_name": screenName,
        "withSafetyModeUserFields": true
    }


    const features = {
        "hidden_profile_likes_enabled": true,
        "hidden_profile_subscriptions_enabled": true,
        "responsive_web_graphql_exclude_directive_enabled": true,
        "verified_phone_label_enabled": false,
        "subscriptions_verification_info_is_identity_verified_enabled": true,
        "subscriptions_verification_info_verified_since_enabled": true,
        "highlights_tweets_tab_ui_enabled": true,
        "responsive_web_twitter_article_notes_tab_enabled": false,
        "creator_subscriptions_tweet_preview_api_enabled": true,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
        "responsive_web_graphql_timeline_navigation_enabled": true
    }
    const fieldToggles = {
        "withAuxiliaryUserLabels": false
    }


    const baseUrl = "https://twitter.com/i/api/graphql/NimuplG1OB7Fd2btCLdBOw/UserByScreenName"
    const url = `${baseUrl}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`


    const headers = {
        "authorization": "Bearer " + process.env.BEARER_AUTH_TOKEN,
        "content-type": "application/json",
        "x-csrf-token": cookies.find(cookie => cookie.name === 'ct0').value,
        "cookie": cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
        "Referer": "https://twitter.com/",
    }

    const response = await fetch(url, {
        "headers": headers,
        "body": null,
        "method": "GET"
    });

    const json = await response.json();

    const result = json?.data?.user?.result;


    if (!result) {
        return null;
    }

    return {
        screenName,
        id: result.rest_id,
    }

}

module.exports = getUserByScreenName;