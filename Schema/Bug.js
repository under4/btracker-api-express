const mongoose = require("mongoose");



const BugSchema = mongoose.Schema({
    author: {type:mongoose.SchemaTypes.ObjectId, required:true},
    bugTitle: {type:String, required:true},
    description: String,
    status: String,
    labels: [{labelText:String, colorValue:String}],
    comments: [mongoose.SchemaTypes.ObjectId]
});

module.exports = mongoose.model("Bug", BugSchema);
