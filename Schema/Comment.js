const mongoose = require("mongoose");

const CommentSchema = mongoose.Schema({
    commentText: { type: String, required: true },
    author: {authorId: mongoose.SchemaTypes.ObjectId, authorName:String},
    comments: [{type:mongoose.SchemaTypes.ObjectId, ref:"Comment"}],
    date: {type:Date, default:Date.now()},
});

module.exports = mongoose.model("Comment", CommentSchema);
