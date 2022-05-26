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
    labels: {},
    feed: [
        {
            feedText: String,
            date: { type: Date, default: Date.now() },
            source: { id: mongoose.Types.ObjectId, sourceString: String },
            feedType: String,
        },
    ],
    settings: {
        daysToArchive: { type: Number, default: 7 },
    },
    invites: [],
});

module.exports = mongoose.model("Team", TeamSchema);
