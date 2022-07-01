const settingsRouter = require("express").Router();

const mongoose = require("mongoose");

const Team = require("../Schema/Team.js");
const Project = require("../Schema/Project.js");

settingsRouter.post("/saveLabelColorChanges", (req, res) => {
    Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err, team) => {
        if (err) return err;

        for (const key of Object.keys(req.body.changes)) {
            //console.log(key, obj[key]);
            team.labels[key] = req.body.changes[key];
        }

        team.markModified("labels");
        team.save().then(res.send("success"));
    });
});

settingsRouter.post("/deleteSelectedLabels", (req, res) => {
    console.log(req.body);
    Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err, team) => {
        if (err) return err;

        for (const label of req.body.toDelete) {
            delete team.labels[label];
        }

        for (const project of team.projects) {
            Project.findById(
                mongoose.Types.ObjectId(project[1]),
                (err, project) => {
                    if (err) return console.error(err);
                    for (const bug of project.bugs) {
                        for (let i = 0; i < bug.labels.length; i++) {
                            if (req.body.toDelete.includes(bug.labels[i])) {
                                bug.labels.splice(i, 1);
                                i--;
                            }
                        }
                    }
                    project.markModified("bugs");
                    project.save();
                }
            );
        }

        console.log(team.labels);
        team.markModified("labels");
        team.save().then(res.send("success"));
    });
});

settingsRouter.post("/changeAvatar", (req, res) => {
    User.findById(mongoose.Types.ObjectId(req.body.user), async (err, user) => {
        console.log(user);
        if (err) return console.log(err);
        try {
            const uploadedResponse = await cloudinary.uploader.upload(
                req.body.data,
                { upload_preset: "btracker_upload_avatar" }
            );
            user.avatarURL = uploadedResponse.url;
            user.save().then(res.redirect(`${APP_URL}/console/settings`));
        } catch (e) {
            console.error(e);
        }
    });
});

module.exports = settingsRouter;
