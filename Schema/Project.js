const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema({
    name: { type: String, required: true },
    projectIdentifier: String,
    bugs: Array,
});

module.exports = mongoose.model("Project", ProjectSchema);
