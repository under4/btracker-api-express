const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    teams: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Team" }],
    activeTeam: { type: mongoose.SchemaTypes.ObjectId, required: false },
    activeTheme: { type: String, default: "light" },
});

module.exports = mongoose.model("User", UserSchema);
