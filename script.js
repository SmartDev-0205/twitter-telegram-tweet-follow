const getUserByScreenName = require('./utils/getUserByScreenName');
const fetchUserTweets = require('./utils/fetchUserTweets');
const fetchNewTweets = require('./utils/fetchNewTweets');
const unfollowUser = require('./utils/unfollowUser');
const followUser = require('./utils/followUser');
const enableBell = require('./utils/enableBell');

const FollowedAccounts = require('./models/FollowedAccounts');
const MessageTemplates = require('./models/MessageTemplates');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Bot } = require('grammy');
const { Menu } = require("@grammyjs/menu");
const Handlebars = require('handlebars');







dotenv.config();

mongoose.connect(process.env.MONGODB_URI);


const bot = new Bot(process.env.BOT_TOKEN);
const userCommands = {}
const recentTweets = {}
const groupUsernames = {}
const history = []
let botInfo = {};
bot.api.getMe().then(info => botInfo = info);
let lastTweetForwaredCreateTime = new Date().toUTCString();


const editTemplatesMenu = new Menu("telegram-bot-edit-message-template-menu")
    .text(
        "Menu Message Template",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;
            userCommands[userId] = 'GET_GROUP_USERNAME_FOR_EDIT_MENU_MESSAGE_TEMPLATE'
            ctx.reply('Please send me the group username for which you want to edit the menu message template. (i.e @EdTPeuJ7)');
        }
    ).row()
    .text(
        "New Tweet Message Template",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;

            userCommands[userId] = 'GET_GROUP_USERNAME_FOR_EDIT_NEW_TWEET_MESSAGE_TEMPLATE';
            ctx.reply('Please send me the group username for which you want to edit the new tweet message template. (i.e @EdTPeuJ7)');
        }
    ).row()
    .text(
        "Recent Tweets Message Template",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;

            userCommands[userId] = 'GET_GROUP_USERNAME_FOR_EDIT_RECENT_TWEETS_MESSAGE_TEMPLATE'
            ctx.reply('Please send me the group username for which you want to edit the recent tweets message template. (i.e @EdTPeuJ7)');
        }
    ).row()
    .text(
        "Shill Message Template",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;


            userCommands[userId] = 'GET_GROUP_USERNAME_FOR_EDIT_SHILL_MESSAGE_TEMPLATE';
            ctx.reply('Please send me the group username for which you want to edit the shill message template. (i.e @EdTPeuJ7)');
        }
    )
bot.use(editTemplatesMenu)


function isGroupChat(chatType) {
    return chatType === 'group' || chatType === 'supergroup';
}


async function getChat(chatId) {
    try {
        return await bot.api.getChat(chatId);
    } catch (error) {
        console.log(error)
        return null;
    }
}





function groupCommandsList() {
    return "/show_recent_tweets - Show recent tweets of a user\n" +
        "/shill - Shill the latest tweet to the group\n" +
        "/help - Show available commands\n" +
        "/menu - Show interactive menu\n" +
        "/start - Show interactive menu\n"
}

function privateCommandsList() {
    return "/add_user - Add a user to the list\n" +
        "/remove_user - Remove a user from the list\n" +
        "/see_users_list - See users list\n" +
        "/edit_message_templates - Edit message templates\n" +
        "/edit_new_tweet_message_template - Edit new tweet message template\n" +
        "/edit_menu_message_template - Edit menu message template\n" +
        "/edit_recent_tweets_message_template - Edit recent tweets message template\n" +
        "/edit_shill_message_template - Edit shill message template\n" +
        "/help - Show available commands\n" +
        "/menu - Show interactive menu\n" +
        "/start - Show interactive menu\n"
}

const privateChatMenu = new Menu("telegram-bot-private-chat-menu")
    .text(
        "Add User",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;
            handleAddUser(userId, ctx)
        }
    )
    .text(
        "Remove User",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;
            handleRemoveUser(userId, ctx)
        }
    )
    .row()
    .text(
        "Edit Message Templates",
        async function (ctx) {
            ctx.reply("Select tetmplate: ", {
                reply_markup: editTemplatesMenu
            })
        }
    ).row()
    .text(
        "See Users List",
        async function (ctx) {
            const userId = ctx.update.callback_query.from.id;
            userCommands[userId] = 'SEE_USERS_LIST';
            ctx.reply('Please send me the group username for which you want to see the users list. (i.e @EdTPeuJ7)');
        }
    )
    .text(
        "Help",
        async function (ctx) {
            const template = await getMenuMessageTemplate(ctx.update.callback_query.message.chat.id);
            ctx.reply(template.template + "\n\n" + privateCommandsList());
        }
    )



const groupChatMenu = new Menu("telegram-bot-group-chat-menu")
    .text(
        "Show Recent Tweets",
        function (ctx) {
            const userId = ctx.update.callback_query.from.id;
            handleShowRecentTweets(userId, ctx)
        }
    ).row()
    .text(
        "Shill",
        function (ctx) {
            const chatId = ctx.update.callback_query.message.chat.id;
            handleShill(chatId, ctx)
        })
    .text(
        "Help",
        async function (ctx) {
            const template = await getMenuMessageTemplate(ctx.update.callback_query.message.chat.id);
            ctx.reply(template.template + "\n\n" + groupCommandsList());
        }
    )


bot.use(privateChatMenu);
bot.use(groupChatMenu);


async function getMenuMessageTemplate(chatId) {
    let template = await MessageTemplates.findOne({
        type: 'MENU_MESSAGE',
        chatId
    });

    if (!template) {
        await MessageTemplates.create({
            type: 'MENU_MESSAGE',
            template: 'Add bot to group as admin and select an option from below:',
            chatId
        });

        template = await MessageTemplates.findOne({
            type: 'MENU_MESSAGE',
            chatId
        });
    }

    return template;
}

async function getNewTweetMessageTemplate(chatId) {
    let template = await MessageTemplates.findOne({
        type: 'NEW_TWEET_MESSAGE',
        chatId
    });

    if (!template) {
        await MessageTemplates.create({
            type: 'NEW_TWEET_MESSAGE',
            template: '{{username}} just tweeted. Lets go raid' + '\n\n' +
                `{{tweetUrl}}`,
            chatId
        });

        template = await MessageTemplates.findOne({
            type: 'NEW_TWEET_MESSAGE',
            chatId
        });
    }

    return template;

}

async function getRecentTweetsMessageTemplate(chatId) {
    let template = await MessageTemplates.findOne({
        type: 'RECENT_TWEETS_MESSAGE',
        chatId
    });

    if (!template) {
        await MessageTemplates.create({
            type: 'RECENT_TWEETS_MESSAGE',
            template: 'Recent tweets of user {{username}}' + '\n\n' +
                `{{tweetUrls}}`,
            chatId
        });

        template = await MessageTemplates.findOne({
            type: 'RECENT_TWEETS_MESSAGE',
            chatId
        });
    }

    return template;

}

async function getShillMessageTemplate(chatId) {
    let template = await MessageTemplates.findOne({
        type: 'SHILL_MESSAGE',
        chatId
    });

    if (!template) {
        await MessageTemplates.create({
            type: 'SHILL_MESSAGE',
            template: 'Lets go raid' + '\n\n' +
                `{{tweetUrl}}`,
            chatId
        });

        template = await MessageTemplates.findOne({
            type: 'SHILL_MESSAGE',
            chatId
        });

    }

    return template;
}

bot.command("menu", async (ctx) => {

    const template = await getMenuMessageTemplate(ctx.message.chat.id);
    const chatType = ctx.message.chat.type;

    await ctx.reply(template.template, {
        reply_markup: isGroupChat(chatType) ? groupChatMenu : privateChatMenu
    });
});

bot.command("start", async (ctx) => {
    const template = await getMenuMessageTemplate(ctx.message.chat.id);
    const chatType = ctx.message.chat.type;

    await ctx.reply(template.template, {
        reply_markup: isGroupChat(chatType) ? groupChatMenu : privateChatMenu
    });
})


bot.command("add_user", async (ctx) => {
    const userId = ctx.message.from.id;
    const chatType = ctx.message.chat.type;

    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }

    handleAddUser(userId, ctx)
})


bot.command("remove_user", async (ctx) => {
    const userId = ctx.message.from.id;
    const chatType = ctx.message.chat.type;

    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }

    handleRemoveUser(userId, ctx);
})

bot.command("see_users_list", async (ctx) => {
    const userId = ctx.message.from.id;
    const chatType = ctx.message.chat.type;

    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }

    userCommands[userId] = 'SEE_USERS_LIST';
    ctx.reply('Please send me the group username for which you want to see the users list. (i.e @EdTPeuJ7)');
})

bot.command("show_recent_tweets", async (ctx) => {
    const userId = ctx.message.from.id;
    handleShowRecentTweets(userId, ctx);
})


bot.command("shill", async (ctx) => {
    const chatId = ctx.message.chat.id;

    handleShill(chatId, ctx);
})


bot.command("edit_message_templates", async (ctx) => {
    const chatType = ctx.message.chat.type;
    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }

    ctx.reply("Select tetmplate: ", {
        reply_markup: editTemplatesMenu
    })
})

bot.command("edit_new_tweet_message_template", async (ctx) => {
    const chatType = ctx.message.chat.type;
    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }
    userCommands[ctx.message.from.id] = 'GET_GROUP_USERNAME_FOR_EDIT_NEW_TWEET_MESSAGE_TEMPLATE';
    ctx.reply('Please send me the group username for which you want to edit the new tweet message template. (i.e @EdTPeuJ7)');
})

bot.command("edit_menu_message_template", async (ctx) => {
    const chatType = ctx.message.chat.type;
    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }
    userCommands[ctx.message.from.id] = 'GET_GROUP_USERNAME_FOR_EDIT_MENU_MESSAGE_TEMPLATE'
    ctx.reply('Please send me the group username for which you want to edit the menu message template. (i.e @EdTPeuJ7)');
})

bot.command("edit_recent_tweets_message_template", async (ctx) => {
    const chatType = ctx.message.chat.type;
    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }
    userCommands[ctx.message.from.id] = 'GET_GROUP_USERNAME_FOR_EDIT_RECENT_TWEETS_MESSAGE_TEMPLATE'
    ctx.reply('Please send me the group username for which you want to edit the recent tweets message template. (i.e @EdTPeuJ7)');
})

bot.command("edit_shill_message_template", async (ctx) => {
    const chatType = ctx.message.chat.type;
    if (isGroupChat(chatType)) {
        return ctx.reply("This command is only available in private chat")
    }
    userCommands[ctx.message.from.id] = 'GET_GROUP_USERNAME_FOR_EDIT_SHILL_MESSAGE_TEMPLATE'
    ctx.reply('Please send me the group username for which you want to edit the shill message template. (i.e @EdTPeuJ7)');
})






bot.command("help", async (ctx) => {
    const template = await getMenuMessageTemplate(ctx.message.chat.id);
    const chatType = ctx.message.chat.type;

    await ctx.reply(template.template + "\n\n" + (isGroupChat(chatType) ? groupCommandsList() : privateCommandsList()));
})





// Command to start the bot
function handleAddUser(userId, ctx) {

    userCommands[userId] = 'GET_GROUP_USERNAME_FOR_ADD_USER';
    ctx.reply('Please send me the group username for which you want to add the user. (i.e @EdTPeuJ7)');
};

// Command to remove a user
function handleRemoveUser(userId, ctx) {
    userCommands[userId] = 'GET_GROUP_USERNAME_FOR_REMOVE_USER';
    ctx.reply('Please send me the group username for which you want to remove the user. (i.e @EdTPeuJ7)');
};


async function handleShowRecentTweets(userId, ctx) {
    userCommands[userId] = 'SHOW_RECENT_TWEETS'
    ctx.reply('Please send me the username of the user you want to see recent tweets. (i.e elonmusk)');
}







async function handleShill(chatId, ctx) {
    const tweet = history.pop();
    if (!tweet) {
        return ctx.reply("No tweets found")
    }

    const followedAccount = await FollowedAccounts.findOne({
        id: tweet.user_id_str
    })

    const tweetUrl = `https://x.com/${followedAccount.screenName}/status/${tweet.id_str}`

    const template = await getShillMessageTemplate(chatId);

    const message = Handlebars.compile(template.template)({
        username: followedAccount.screenName,
        tweetUrl
    });

    ctx.reply(message)
}





const botStartTime = Date.now();

// Handling message events
bot.on('message:text', async ctx => {
    const text = ctx.message.text?.trim() || '';
    const userId = ctx.message.from.id;
    const chatId = ctx.message.chat.id;
    const chatType = ctx.message.chat.type;

    if (ctx.message.date * 1000 < botStartTime) {
        return;
    }


    async function isAdmin(userId, chatId) {
        try {
            const member = await bot.api.getChatMember(chatId, userId);
            console.log(member)

            return member.status === 'administrator' || member.status === 'creator';
        } catch (error) {
            console.log(error)
            return false;
        }
    }


    if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_ADD_USER') {


        groupUsernames[userId] = text;
        userCommands[userId] = 'ADD_USER';
        ctx.reply('Please send me the username of the user you want to add. (i.e elonmusk)');
    } else if (userCommands[userId] === 'ADD_USER') {
        const user = await FollowedAccounts.findOne({ screenName: text });
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to add a user")
        }

        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin of that group to add a user");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);
        if (!isBotAdmin) {
            userCommands[userId] = null; s
            return ctx.reply("Bot must be added as admin to the group to add a user")
        }
        for (const screenName of text.split('\n').join(',').split(',')) {
            console.log("screenName: ", screenName)
            const user = await FollowedAccounts.findOne({
                screenName: screenName.trim()
            });
            if (!user) {

                const result = await getUserByScreenName(
                    screenName,
                    path.join(__dirname, 'cookies.json')
                )


                if (!result) {
                    ctx.reply(`User "${screenName}" not found on twitter`)
                    continue;
                }

                await FollowedAccounts.create({
                    screenName: screenName,
                    id: result.id,
                    chats: [chat.id]
                });

                await followUser(result.id, path.join(__dirname, 'cookies.json'));
                await enableBell(result.id, path.join(__dirname, 'cookies.json'));


                ctx.reply(`User "${screenName}" added successfully`);

                const userTweets = await fetchUserTweets(result.id, path.join(__dirname, 'cookies.json'));
                if (!userTweets) {
                    return;
                }
                userTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));



                recentTweets[text] = userTweets.slice(0, 5).reverse();

            } else if (user.chats.indexOf(chat.id) === -1) {
                await FollowedAccounts.updateOne({ screenName: screenName }, {
                    $push: { chats: chat.id }
                });
                ctx.reply(`User "${screenName}" added successfully`);
            } else {
                ctx.reply(`User "${screenName}" already added`);
            }
        }

        userCommands[userId] = null;
    } else if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_REMOVE_USER') {
        groupUsernames[userId] = text;
        userCommands[userId] = 'REMOVE_USER';
        ctx.reply('Please send me the username of the user you want to remove. (i.e elonmusk)');
    } else if (userCommands[userId] === 'REMOVE_USER') {
        const user = await FollowedAccounts.findOne({ screenName: text });
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to remove a user")
        }

        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin of that group to remove a user");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to remove a user")
        }

        for (const screenName of text.split('\n').join(',').split(',')) {

            const user = await FollowedAccounts.findOne({
                screenName: screenName.trim()
            });
            if (user && user.chats.length === 1 && user.chats[0] == chat.id) {
                await FollowedAccounts.deleteOne({ screenName: screenName });
                await unfollowUser(user.id, path.join(__dirname, 'cookies.json'));
                ctx.reply(`User "${screenName}" removed successfully`);
            } else if (user && user.chats.indexOf(chat.id) !== -1) {
                await FollowedAccounts.updateOne({ screenName: screenName }, {
                    $pull: { chats: chat.id }
                });
                ctx.reply(`User "${screenName}" removed successfully`);
            } else {
                ctx.reply(`User "${screenName}" not found`);
            }
        }
        userCommands[userId] = null;
    } else if (userCommands[userId] === 'SHOW_RECENT_TWEETS') {

        if (!recentTweets[text]) {
            ctx.reply(`No recent tweets found for user "${text}"`);
        } else {
            let tweetUrls = '';
            for (const tweet of recentTweets[text]) {
                tweetUrls += `https://x.com/${text}/status/${tweet.id_str}\n\n`;
            }

            const template = await getRecentTweetsMessageTemplate(chatId);

            const message = Handlebars.compile(template.template)({
                username: text,
                tweetUrls
            });

            ctx.reply(message);
        }

        userCommands[userId] = null;
    } else if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_EDIT_NEW_TWEET_MESSAGE_TEMPLATE') {
        groupUsernames[userId] = text;
        userCommands[userId] = 'EDIT_NEW_TWEET_MESSAGE_TEMPLATE';

        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        const currentTemplate = await getNewTweetMessageTemplate(chat.id);

        ctx.reply('Please send me the new template. Current template is: \n\n' + currentTemplate.template);

    } else if (userCommands[userId] === 'EDIT_NEW_TWEET_MESSAGE_TEMPLATE') {

        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }
        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin to edit a template");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        await MessageTemplates.updateOne({
            type: 'NEW_TWEET_MESSAGE',
            chatId: chat.id
        }, {
            template: text
        });

        ctx.reply('Template updated successfully');
        userCommands[userId] = null;
    } else if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_EDIT_MENU_MESSAGE_TEMPLATE') {
        groupUsernames[userId] = text;
        userCommands[userId] = 'EDIT_MENU_MESSAGE_TEMPLATE';

        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }
        const currentTemplate = await getMenuMessageTemplate(chat.id);
        ctx.reply('Please send me the new template. Current template is: \n\n' + currentTemplate.template);

    } else if (userCommands[userId] === 'EDIT_MENU_MESSAGE_TEMPLATE') {
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin to edit a template");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        await MessageTemplates.updateOne({
            type: 'MENU_MESSAGE',
            chatId: chat.id
        }, {
            template: text
        });

        ctx.reply('Template updated successfully');
        userCommands[userId] = null;
    } else if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_EDIT_RECENT_TWEETS_MESSAGE_TEMPLATE') {
        groupUsernames[userId] = text;
        userCommands[userId] = 'EDIT_RECENT_TWEETS_MESSAGE_TEMPLATE';
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }
        const currentTemplate = await getRecentTweetsMessageTemplate(chat.id);

        ctx.reply('Please send me the new template. Current template is: \n\n' + currentTemplate.template);

    } else if (userCommands[userId] === 'EDIT_RECENT_TWEETS_MESSAGE_TEMPLATE') {
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }
        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin to edit a template");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        await MessageTemplates.updateOne({
            type: 'RECENT_TWEETS_MESSAGE',
            chatId: chat.id
        }, {
            template: text
        });

        ctx.reply('Template updated successfully');
        userCommands[userId] = null;
    } else if (userCommands[userId] === 'GET_GROUP_USERNAME_FOR_EDIT_SHILL_MESSAGE_TEMPLATE') {
        groupUsernames[userId] = text;
        userCommands[userId] = 'EDIT_SHILL_MESSAGE_TEMPLATE';
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group edit a template")
        }
        const currentTemplate = await getShillMessageTemplate(chat.id);

        ctx.reply('Please send me the new template. Current template is: \n\n' + currentTemplate.template);

    } else if (userCommands[userId] === 'EDIT_SHILL_MESSAGE_TEMPLATE') {
        const chat = await getChat(groupUsernames[userId]);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }
        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin to edit a template");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to edit template")
        }

        await MessageTemplates.updateOne({
            type: 'SHILL_MESSAGE',
            chatId: chat.id
        }, {
            template: text
        });

        ctx.reply('Template updated successfully');
        userCommands[userId] = null;
    } else if (userCommands[userId] === 'SEE_USERS_LIST') {
        const chat = await getChat(text);
        if (!chat) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to see users list")
        }
        const isChatAdmin = await isAdmin(userId, chat.id);

        if (!isChatAdmin) {
            userCommands[userId] = null;
            return ctx.reply("You must be an admin to see the users list");
        }

        const isBotAdmin = await isAdmin(botInfo.id, chat.id);;
        if (!isBotAdmin) {
            userCommands[userId] = null;
            return ctx.reply("Bot must be added as admin to the group to see the users list")
        }

        const users = await FollowedAccounts.find({ chats: chat.id });
        let message = '';
        for (const user of users) {
            message += `@${user.screenName}\n`
        }


        if (!message) {
            message = 'No users found'
        }

        ctx.reply(message);
        userCommands[userId] = null;
    }
});


bot.start();


bot.catch((err) => {
    console.error(`Error:`, err)
})

async function script() {


    const tweets = await fetchNewTweets(path.join(__dirname, 'cookies.json'));

    for (const tweet of tweets || []) {


        const followedAccount = await FollowedAccounts.findOne({
            id: tweet.user_id_str
        })

        if (!followedAccount) {
            // tweet is not related to an account which is in the list
            continue;
        }

        if (new Date(tweet.created_at) <= new Date(lastTweetForwaredCreateTime)) {
            // tweet is older than the last forwarded tweet
            continue;
        }

        lastTweetForwaredCreateTime = tweet.created_at;

        console.log(`New tweet found from ${followedAccount.screenName}!`)



        for (const chatId of followedAccount.chats || []) {

            const template = await getNewTweetMessageTemplate(chatId);

            const tweetUrl = `https://x.com/${followedAccount.screenName}/status/${tweet.id_str}`

            const message = Handlebars.compile(template.template)({
                username: followedAccount.screenName,
                tweetUrl
            });

            bot.api.sendMessage(chatId, message)

        }

        if (!recentTweets[followedAccount.screenName]) {
            recentTweets[followedAccount.screenName] = [];
        }


        recentTweets[followedAccount.screenName].push(tweet);

        if (recentTweets[followedAccount.screenName].length > 5) {
            recentTweets[followedAccount.screenName].shift();
        }


        history.push(tweet)
        if (history.length > 100) {
            history.shift();
        }
    }
}



async function runScript() {


    while (true) {
        await script();
        const delay = parseFloat(process.env.REQUEST_DELAY) * 1000;
        console.log(`Waiting ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay))
    }
}

runScript()


