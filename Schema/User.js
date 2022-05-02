const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    teams: [
        [
            { type: String },
            { type: mongoose.SchemaTypes.ObjectId, ref: "Team" },
        ],
    ],
    activeTeam: { type: mongoose.SchemaTypes.ObjectId, ref: "Team" },
    activeProject: { type: mongoose.SchemaTypes.ObjectId, ref: "Project" },
    settings: { darkTheme: { type: Boolean, default: false } },
    notifications: [{ text: String, link: String }],
    avatarURL: String,
});

module.exports = mongoose.model("User", UserSchema);
