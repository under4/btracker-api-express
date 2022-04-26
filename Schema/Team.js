const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema({
    name: { type: String, required: true },
    users: [],
    projects: [
        [
            { type: String },
            { type: mongoose.SchemaTypes.ObjectId, ref: "Project" },
        ],
    ],
    labels: [{ name: String, color: String }],
    feed: [{feedText:String, date:Date, source:{id:mongoose.Types.ObjectId, sourceString:String}}],
});

module.exports = mongoose.model("Team", TeamSchema);
