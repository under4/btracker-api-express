const mongoose = require("mongoose");

const BugSchema = mongoose.Schema({
    author: { type: mongoose.SchemaTypes.ObjectId, required: true },
    bugTitle: { type: String, required: true },
    priority: { type: String, required: true },
    description: String,
    status: String,
    labels: [{ labelText: String, colorValue: String }],
    comments: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Comment" }],
    assigned: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    followedBy: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Bug", BugSchema);
