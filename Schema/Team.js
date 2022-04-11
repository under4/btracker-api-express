const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema({
    name: { type: String, required: true },
    users: [],
    projects: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Project" }],
    labels: [{ name: String, color: String }],
});

module.exports = mongoose.model("Team", TeamSchema);
