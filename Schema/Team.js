const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema({
    name: { type: String, required: true },
    users: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User", rank: String }],
    projects: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Project" }],
    labels: [{ name: String, color: String }],
});

module.exports = mongoose.model("Team", TeamSchema);
