const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    name: {type: String,
        required: true},
    username: {type: String,
        required: true},
    password: {type: String,
        required: true},
    teams: [mongoose.SchemaTypes.ObjectId],
    activeTeam: {type: mongoose.SchemaTypes.ObjectId,
        required: false}
})

module.exports = mongoose.model("User", UserSchema);