const consoleRouter = require("express").Router();

const mongoose = require("mongoose");

const User = require("../Schema/User.js");
const Project = require("../Schema/Project.js");
const Team = require("../Schema/Team.js");

consoleRouter.post("/changeTeam", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return res.json({ err: 1 });
            user.activeTeam = mongoose.Types.ObjectId(req.body.teamId);
            user.markModified("activeTeam");
            user.save().then(() => res.send("success"));
        }
    );
});

consoleRouter.post("/changeProject", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return res.json({ err: 1 });
            user.activeProject = mongoose.Types.ObjectId(req.body.projectId);
            user.markModified("activeProject");
            user.save().then(() => res.send("success"));
        }
    );
});

consoleRouter.post("/getProjectInfo", (req, res) => {
    console.log(req.body);
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return err;

            if (req.body.activeTeam == project.team) return res.json(project);

            Team.findById(
                mongoose.Types.ObjectId(req.body.activeTeam),
                (err, team) => {
                    console.log("to be implemented");
                }
            );
        }
    );
});

consoleRouter.get("/getConsoleInfo", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        function (err, user) {
            if (err) return console.log(err);
            user.password =
                "$2a$10$UKFB2.cxQrMCqldh3gUZheh6bBIMk/mcJsX3Ys9p6tjl/pRvWN9Yq";
            Team.findById(
                mongoose.Types.ObjectId(user.activeTeam),
                (error, team) => {
                    if (error)
                        return res.json({
                            err: 1,
                            message: "an error occured",
                        });
                    res.json({ user: user, team: team });
                }
            );
        }
    );
});

consoleRouter.post("/darkMode", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return console.log(err);

            user.settings.darkTheme = req.body.darkTheme;
            user.save();
        }
    );
});

module.exports = consoleRouter;
