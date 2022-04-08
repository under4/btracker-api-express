const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema({
    name: String,
    users: Array,
    projects: Array,
});

module.exports = mongoose.model("Team", TeamSchema);
