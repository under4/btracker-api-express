const mongoose = require("mongoose");

const BugSchema = mongoose.Schema({
    author: { authorId: mongoose.SchemaTypes.ObjectId, authorName: String },
    bugId: { type: String, required: true },
    bugTitle: { type: String, required: true },
    priority: { type: String, required: true },
    description: String,
    status: String,
    labels: [{ labelText: String, colorValue: String }],
    comments: [],
    assigned: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    //followedBy: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    due: { type: Date },
    postDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model("Bug", BugSchema);
