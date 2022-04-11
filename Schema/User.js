const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    teams: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Team" }],
    activeTeam: { type: mongoose.SchemaTypes.ObjectId, ref:"Team"},
    activeTheme: { type: String, default: "light" },
    notifications: [{ text: String, link: String }]
});

module.exports = mongoose.model("User", UserSchema);
