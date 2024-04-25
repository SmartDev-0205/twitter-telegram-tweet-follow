const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageTemplateSchema = new Schema({
    type: {
        type: String,
        enum: ['MENU_MESSAGE', 'NEW_TWEET_MESSAGE', 'RECENT_TWEETS_MESSAGE', 'SHILL_MESSAGE'],
        required: true
    },
    template: {
        type: String, 
        required: true
    },
    chatId: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model('MessageTemplate', MessageTemplateSchema);