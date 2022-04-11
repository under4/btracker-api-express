const mongoose = require("mongoose");

const CommentSchema = mongoose.Schema({
    commentText: { type: String, required: true },
    author: mongoose.SchemaTypes.ObjectId,
    comments: [{type:mongoose.SchemaTypes.ObjectId, ref:"Comment"}],
});

module.exports = mongoose.model("Comment", CommentSchema);
