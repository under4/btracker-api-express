const teamRouter = require("express").Router();

const mongoose = require("mongoose");

const User = require("../Schema/User.js");

teamRouter.post("/acceptTeamInvite", function (req, res) {
    Team.findById(mongoose.Types.ObjectId(req.body.teamId), (err, team) => {
        if (err) return console.log(err);
        User.findById(
            mongoose.Types.ObjectId(req.session.passport.user),
            (err, user) => {
                if (err) return console.error(err);

                let index;
                for (let i = 0; i < user.invites.length; i++) {
                    if (user.invites[i].team.id == req.body.teamId) {
                        i = index;
                        i = user.invites.length;
                    }
                }
                user.invites.splice(index, 1);

                team.users.push([user._id, "member", user.name]);
                user.teams.push([team.name, team._id]);
                team.markModified("users");

                team.save().then(user.save().then(res.send("success")));
            }
        );
    });
});

teamRouter.post("/ignoreTeamInvite", function (req, res) {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return console.error(err);
            let index;
            for (let i = 0; i < user.invites.length; i++) {
                if (user.invites[i].team.id == req.body.teamId) {
                    index = i;
                    i = user.invites.length;
                }
            }

            user.invites.splice(index, 1);
            user.markModified("invites");
            user.save().then(res.json({ data: user.invites }));
        }
    );
});

teamRouter.post("/acceptUserRequest", function (req, res) {
    console.log(req.body);
    Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err, team) => {
        if (err) return console.log(err);
        User.findById(mongoose.Types.ObjectId(req.body.id), (err, user) => {
            if (err) return console.error(err);

            let teamIndex;
            for (let i = 0; i < team.invites.length; i++) {
                if (team.invites[i].id == req.body.id) {
                    teamIndex = i;
                    i = team.invites.length;
                }
            }

            team.invites.splice(teamIndex, 1);
            team.markModified("invites");
            team.save();

            team.users.push([user._id, "member", user.name]);
            user.teams.push([team.name, team._id, 1]);
            team.markModified("users");
            user.markModified("teams");

            team.save().then(user.save().then(res.send("success")));
        });
    });
});

teamRouter.post("/ignoreUserRequest", (req, res) => {
    //console.log(req);
    Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err, team) => {
        if (err) return console.error(err);

        let teamIndex;
        for (let i = 0; i < team.invites.length; i++) {
            if (team.invites[i].id == req.body.id) {
                teamIndex = i;
                i = team.invites.length;
            }
        }

        team.invites.splice(teamIndex, 1);
        team.markModified("invites");
        console.log(team.invites);
        team.save().then(() => {
            res.send("success");
        });
    });
});

teamRouter.post("/removeUser", (req, res) => {
    console.log(req);
    Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err, team) => {
        if (err) return console.error(err);

        let teamIndex;
        for (let i = 0; i < team.users.length; i++) {
            if (team.users[i][0] == req.body.id) {
                teamIndex = i;
                i = team.users.length;
            }
        }

        User.findById(mongoose.Types.ObjectId(req.body.id), (err, user) => {
            if (err) return console.error(err);

            let userTeamIndex;
            for (let i = 0; i < user.teams.length; i++) {
                if (user.teams[i][1] == req.body.activeTeam) {
                    userTeamIndex = i;
                    i = user.teams.length;
                }
            }

            user.teams.splice(userTeamIndex, 1);
            team.users.splice(teamIndex, 1);
            team.markModified("users");
            user.markModified("teams");
            user.save().then(() => {
                team.save().then(res.send("success"));
            });
        });
    });
});

teamRouter.post("/createTeam", (req, res) => {
    Team.findOne({ name: req.body.teamName }, function (err, data) {
        if (err) {
            return console.log(err);
        }
        if (data == null) {
            const newTeam = new Team({
                name: req.body.teamName,
                users: [],
            });
            User.findById(
                mongoose.Types.ObjectId(req.session.passport.user),
                function (error, user) {
                    if (error) {
                        return console.log(error);
                    }
                    user.teams.push([
                        req.body.teamName,
                        mongoose.Types.ObjectId(newTeam.id),
                        1,
                    ]);
                    user.activeTeam = newTeam.id;
                    user.save();
                    newTeam.users.push([
                        req.session.passport.user,
                        "lead",
                        user.name,
                    ]);
                    newTeam.save().then(() => {
                        res.redirect(`${APP_URL}/console/team`);
                    });
                }
            );
        }
    });
});

teamRouter.post("/searchTeams", function (req, res) {
    Team.find({ name: { $regex: `${req.body.query}` } }, (err, teams) => {
        if (err) return console.log(err);
        const result = [];
        teams.map((team) => result.push({ team: team.name, teamId: team._id }));
        res.json({ team: result });
    });
});

teamRouter.post("/createProject", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return res.json({ err: 1, message: "an error occured" });
            Team.findById(
                mongoose.Types.ObjectId(user.activeTeam),
                (error, team) => {
                    if (error)
                        return res.json({
                            err: 1,
                            message: "an error occured",
                        });

                    if (
                        team.projects.filter(
                            (project) => project[0] == req.body.newProjectName
                        ) > 0
                    )
                        return res.json({
                            err: 1,
                            message:
                                "This team already has a project by that name",
                        });

                    const words = req.body.newProjectName.split(" ");
                    const identifier =
                        words.length > 1
                            ? words[0][0] + words[1][0]
                            : words[0][0] + words[0][1];
                    const newProject = new Project({
                        name: req.body.newProjectName,
                        team: mongoose.Types.ObjectId(user.activeTeam),
                        projectIdentifier: identifier,
                    });
                    team.projects.push([
                        req.body.newProjectName,
                        newProject.id,
                    ]);
                    team.save();
                    user.activeProject = newProject.id;
                    user.save();
                    newProject
                        .save()
                        .then(res.redirect(`${APP_URL}/console/dashboard`));
                }
            );
        }
    );
});

teamRouter.post("/inviteUser", function (req, res) {
    console.log(req.body);
    User.findById(mongoose.Types.ObjectId(req.body.id), (err, user) => {
        if (err) return console.log(err);
        if (!user.invites) {
            user.invites = [];
        }
        if (
            user.invites.filter((invite) => invite.team.id == req.body.team.id)
                .length == 0
        ) {
            user.invites.push({
                team: { id: req.body.team.id, name: req.body.team.name },
            });
            user.save().then(res.send("success"));
        } else {
            res.send("error");
        }
    });
});

teamRouter.post("/joinTeam", function (req, res) {
    Team.findById(mongoose.Types.ObjectId(req.body.team), (err, team) => {
        if (err) return console.log(err);
        User.findById(
            mongoose.Types.ObjectId(req.session.passport.user),
            (err, user) => {
                if (err) return console.error(err);

                let alreadySent = false;

                for (let invite of team.invites) {
                    if (invite.id == req.session.passport.user) {
                        alreadySent = true;
                    }
                }

                if (!alreadySent) {
                    team.invites.push({
                        name: user.name,
                        id: req.session.passport.user,
                        avatar: user.avatarURL,
                    });

                    team.markModified("invites");
                    team.save().then(res.send("success"));
                } else {
                    res.send("alreadySent");
                }
            }
        );
    });
});

teamRouter.post("/searchUsers", function (req, res) {
    User.find({ username: { $regex: `${req.body.query}` } }, (err, users) => {
        if (err) return console.log(err);
        const result = [];
        users.map((user) =>
            result.push({
                user: user.name,
                userId: user._id,
                avatar: user.avatarURL,
            })
        );
        console.log(result);
        res.json({ users: result });
    });
});

module.exports = teamRouter;
