const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema({
    name: { type: String, required: true },
    team: { type: mongoose.SchemaTypes.ObjectId },
    projectIdentifier: String,
    bugs: Array,
});

module.exports = mongoose.model("Project", ProjectSchema);
