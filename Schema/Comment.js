const mongoose = require("mongoose");

const CommentSchema = mongoose.Schema({
    commentText: { type: String, required: true },
    author: mongoose.SchemaTypes.ObjectId,
    comments: [CommentSchema],
});

module.exports = mongoose.model("Comment", CommentSchema);
