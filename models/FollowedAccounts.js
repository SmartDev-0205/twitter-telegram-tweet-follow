const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowedAccountsSchema = new Schema({
    screenName: String,
    id: String,
    chats: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const FollowedAccountsModel = mongoose.model('FollowedAccounts', FollowedAccountsSchema);
module.exports = FollowedAccountsModel;