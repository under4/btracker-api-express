const mongoose = require("mongoose");

const BugSchema = mongoose.Schema({
    author: { authorId: mongoose.SchemaTypes.ObjectId, authorName: String },
    bugId: { type: String, required: true },
    bugTitle: { type: String, required: true },
    priority: { type: String, required: true },
    description: String,
    status: String,
    labels: [],
    numOfComments: { type: Number, default: 0 },
    comments: [],
    assigned: [
        {
            user: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
            assignedBy: String,
        },
    ],
    followedBy: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    due: { type: Date },
    postDate: { type: Date, default: Date.now() },
    submitDate: { type: Date, default: Date.now() },
    closeDate: { type: Date, default: Date.now() },
    closedBy: {
        name: { type: String, default: "Not Set" },
        id: mongoose.SchemaTypes.ObjectId,
    },
    pictures: [],
});

module.exports = mongoose.model("Bug", BugSchema);
