const mongoose = require("mongoose");



const TeamSchema = mongoose.Schema({
    name: {type: String, required:true},
    users: [mongoose.SchemaTypes.ObjectId],
    projects: [{type:app}],
    labels: []
});

module.exports = mongoose.model("Team", TeamSchema);
