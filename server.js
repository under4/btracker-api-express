if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 5000;
const bcrypt = require("bcrypt");
const dbKey = process.env["db"];
const cors = require("cors");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");
const methodOverride = require("method-override");
const { cloudinary } = require("./utils/cloudinary");
const APP_URL = process.env.APP_URL;

app.use(
    cors({
        origin: APP_URL,
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: false }));
app.use(flash());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        },
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});

const Comment = require("./Schema/Comment");
const User = require("./Schema/User");
const Bug = require("./Schema/Bug");
const Team = require("./Schema/Team");
const Project = require("./Schema/Project");

const initializePass = require("./passport-config");
initializePass(
    passport,
    async (username) => {
        const userQuery = User.findOne(username).exec();
        const user = await userQuery;
        return user;
    },
    async (id) => {
        const idQuery = User.find(id).exec();
        const idResult = await idQuery;
        return idResult;
    }
);

const db = mongoose.connect(dbKey, () => {
    console.log("connected to database");
});

const random = (max) => {
    return Math.floor(Math.random() * (max + 1));
};

const notify = (sUser, team, project, bug, type, following) => {
    console.log(sUser, team, project, bug, type, following);
    for (let toNotify of following) {
        User.findById(toNotify, function (err, user) {
            if (err) {
                return err;
            }
            let newNotif = {
                project: { id: project.id, name: project.name },
                team: { id: team.id, name: team.name },
                bug: { id: bug.id, name: bug.name },
            };
            switch (type) {
                case "edit":
                    newNotif.text = `${bug.name} has been edited by ${sUser}.`;
                    break;
                case "close":
                    newNotif.text = `${bug.name} has been closed by ${sUser}.`;
                    break;
                case "reopen":
                    newNotif.text = `${bug.name} has been reopened by ${sUser}.`;
                    break;
                case "assign":
                    newNotif.text = `${bug.name} has been assigned to you by ${sUser}.`;
                    break;
                case "reply":
                    newNotif.text = `${sUser} has replied to your comment.`;
                    break;
                case "inReview":
                    newNotif.text = `${sUser} marked ${bug.name} to review.`;
                    break;
                default:
                    newNotif.text = `unaccounted type notification`;
            }
            user.notifications.unshift(newNotif);
            user.markModified("notifications");
            user.save();
        });
    }
};

app.get("/", (req, res) => {
    res.json({ greeting: "hello world" });
});

app.post("/register", async (req, res) => {
    try {
        const hashedPass = bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
                return console.log(err);
            }
            User.findOne({ username: req.body.email }, function (err, data) {
                if (err) {
                    return console.log(err);
                }
                if (data == null) {
                    const newUser = new User({
                        name: req.body.name,
                        username: req.body.email,
                        password: hash,
                    });
                    newUser.save().then(() => {
                        res.redirect(`${process.env.APP_URL}/login/signin`);
                    });
                } else {
                    res.send("fail");
                }
            });
        });
    } catch {
        res.redirect(`${process.env.APP_URL}/login/register`);
    }
});

app.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: `${process.env.APP_URL}/console`,
        failureRedirect: `${process.env.APP_URL}/login`,
        failureFlash: true,
    })
);

app.post("/searchTeams", function (req, res) {
    Team.find({ name: { $regex: `${req.body.query}` } }, (err, teams) => {
        if (err) return console.log(err);
        const result = [];
        teams.map((team) => result.push({ team: team.name, teamId: team._id }));
        res.json({ team: result });
    });
});

app.post("/searchUsers", function (req, res) {
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

app.post("/inviteUser", function (req, res) {
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

app.post("/joinTeam", function (req, res) {
    Team.findById(mongoose.Types.ObjectId(req.body.team), (err, team) => {
        if (err) return console.log(err);
        User.findById(
            mongoose.Types.ObjectId(req.session.passport.user),
            (err, user) => {
                if (err) return console.error(err);
                team.invites.push({
                    name: user.name,
                    id: req.session.passport.user,
                    avatar: user.avatarURL,
                });

                team.markModified("invites");
                team.save().then(res.redirect(`${APP_URL}/console/newTeam`));
            }
        );
    });
});

app.post("/acceptTeamInvite", function (req, res) {
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

app.post("/ignoreTeamInvite", function (req, res) {
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
            user.markModified("invites");
            user.save().then(res.json({ data: user.invites }));
        }
    );
});

app.post("/changeTeam", (req, res) => {
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

app.post("/changeProject", (req, res) => {
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

app.post("/getBug", (req, res) => {
    Project.findById(req.body.projectId, (err, project) => {
        if (err) return res.json({ err: 1 });
        return res.json(
            project.bugs.filter((bug) => bug._id == req.body.bugId)[0]
        );
    });
});

app.post("/getArchivedBug", (req, res) => {
    Project.findById(req.body.projectId, (err, project) => {
        if (err) return res.json({ err: 1 });
        if (project.archivedBugs.length == 0) {
            return res.json({ error: 1 });
        }
        return res.json(
            project.archivedBugs.filter((bug) => bug._id == req.body.bugId)[0]
        );
    });
});

app.get("/getConsoleInfo", (req, res) => {
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

app.post("/createTeam", (req, res) => {
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
                }
            );
            newTeam.users.push([req.session.passport.user, "lead"]);

            newTeam.save().then(() => {
                res.redirect(`${APP_URL}/console/team`);
            });
        }
    });
});

app.post("/createProject", (req, res) => {
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

app.post("/postBug", (req, res) => {
    Project.findById(req.body.project, (err, project) => {
        if (err) return res.json({ err: 1 });

        var due = req.body.due;
        if (due == "") {
            due = new Date();
            due = new Date(due.setDate(due.getDate() + 7));
        }

        for (var i = 0; i < project.bugs.length; i++) {
            if (project.bugs[i].status === "closed") {
                project.archivedBugs.push(project.bugs.splice(i, 1)[0]);
            }
        }

        const bugId =
            project.projectIdentifier.toUpperCase() +
            "-" +
            project.bugIdIncrementer;

        const newBug = new Bug({
            bugId: bugId,
            author: {
                authorId: req.session.passport.user,
                authorName: req.body.name,
            },
            bugTitle: req.body.bug,
            description: req.body.description,
            priority: req.body.priority,
            status: "open",
            due: due,
        });

        Team.findById(mongoose.Types.ObjectId(project.team), (err, team) => {
            //console.log(team);
            if (err) return err;
            team.feed.unshift({
                feedText: `A new bug has been posted by ${req.body.name}`,
                date: new Date(),
                source: { sourceString: project.name, sourceId: project._id },
                feedType: "new",
                closeDate: null,
            });
            if (team.feed.length < 100) {
                team.feed.splice(100, team.feed.length - 100);
            }

            const labels = req.body.labels.split(",");
            for (let i = 0; i < labels.length; i++) {
                labels[i] = labels[i].trim();
                if (labels[i].length < 1) {
                    labels.splice(i, 1);
                    i--;
                }
            }

            for (let label of labels) {
                if (!team.labels[label]) {
                    team.labels[label] = `rgb(${random(150)}, ${random(
                        150
                    )}, ${random(150)})`;
                }
            }
            if (team.feed.length < 100) {
                team.feed.splice(100, 1);
            }

            newBug.labels = labels;
            project.markModified("bugs");
            project.markModified("archivedBugs");
            team.markModified("labels");
            team.markModified("feed");
            team.save();

            project.bugIdIncrementer = project.bugIdIncrementer + 1;
            project.bugs.push(newBug);
            project
                .save()
                .then(res.redirect(`${APP_URL}/console/bug/${newBug._id}`));
        });
    });
});

app.post("/getArchivedBugs", function (req, res) {
    Project.findById(
        mongoose.Types.ObjectId(req.body.project),
        (err, project) => {
            if (err) return console.log(err);
            res.json({ bugs: project.archivedBugs });
        }
    );
});

app.post("/archive", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }

            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been archived by ${req.body.name}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "edit",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }
                    //project.bugs[index].status = "archived";
                    project.archivedBugs.push(project.bugs.splice(index, 1)[0]);
                    team.markModified("feed");
                    project.markModified("bugs");
                    project.markModified("archivedBugs");
                    team.save().then(
                        project
                            .save()
                            .then(res.redirect(`${APP_URL}/console/archive`))
                    );
                }
            );
        }
    );
});

app.post("/editBug", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.project),
        (err, project) => {
            if (err) return console.log(err);

            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i].status == "closed") {
                    project.archivedBugs.push(project.bugs.splice(i, 1)[0]);
                }
            }

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }

            project.bugs[index].bugTitle = req.body.bug;
            project.bugs[index].description = req.body.description;
            project.bugs[index].priority = req.body.priority;
            project.bugs[index].due =
                req.body.due != "" ? req.body.due : project.bugs[index].due;

            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been edited by ${req.body.name}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "edit",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, team.feed.length - 100);
                    }
                    //update labels

                    const labels = req.body.labels.split(",");
                    for (let i = 0; i < labels.length; i++) {
                        labels[i] = labels[i].trim();
                        if (labels[i].length < 1) {
                            labels.splice(i, 1);
                            i--;
                        }
                    }
                    for (let label of labels) {
                        if (!team.labels[label]) {
                            team.labels[label] = `rgb(${random(150)}, ${random(
                                150
                            )}, ${random(150)})`;
                        }
                    }
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }
                    project.bugs[index].labels = labels;

                    //notify users
                    if (project.bugs[index].followedBy.length > 0) {
                        User.findById(
                            mongoose.Types.ObjectId(req.session.passport.user),
                            (err, sourceUser) => {
                                if (err) return err;
                                notify(
                                    sourceUser.name,
                                    { name: team.name, id: team._id },
                                    { name: project.name, id: project._id },
                                    {
                                        name: project.bugs[index].bugId,
                                        id: project.bugs[index]._id,
                                    },
                                    "edit",
                                    project.bugs[index].followedBy
                                );
                            }
                        );
                    }

                    team.markModified("labels");
                    team.markModified("feed");
                    project.markModified("bugs");
                    project.markModified("archivedBugs");
                    team.save().then(
                        project
                            .save()
                            .then(
                                res.redirect(
                                    `${APP_URL}/console/bug/${req.body.bugId}`
                                )
                            )
                    );
                }
            );
        }
    );
});

app.post("/markBugComplete", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    console.log(project.bugs[index]);
                    i = project.bugs.length;
                }
            }

            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been closed by ${req.body.state.usrName}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "close",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    //notify users
                    if (project.bugs[index].followedBy.length > 0) {
                        User.findById(
                            mongoose.Types.ObjectId(req.session.passport.user),
                            (err, sourceUser) => {
                                if (err) return err;
                                notify(
                                    sourceUser.name,
                                    { name: team.name, id: team._id },
                                    { name: project.name, id: project._id },
                                    {
                                        name: project.bugs[index].bugId,
                                        id: project.bugs[index]._id,
                                    },
                                    "close",
                                    project.bugs[index].followedBy
                                );
                            }
                        );
                    }

                    team.markModified("feed");
                    project.bugs[index].status = "closed";
                    project.bugs[index].closeDate = Date(Date.now());
                    project.archivedBugs.push(project.bugs.splice(index, 1)[0]);
                    project.markModified("bugs");
                    project.markModified("archivedBugs");
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

app.post("/markBugOngoing", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }

            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been marked Ongoing by ${req.body.state.usrName}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "ongoing",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    team.markModified("feed");
                    project.bugs[index].status = "ongoing";
                    project.bugs[index].closeDate = Date(Date.now());
                    project.markModified("bugs");
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

app.post("/changeAvatar", (req, res) => {
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

app.post("/uploadImage", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        async (err, project) => {
            if (err) return console.log(err);
            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }
            try {
                const uploadedResponse = await cloudinary.uploader.upload(
                    req.body.data,
                    { upload_preset: "btracker_upload" }
                );
                console.log(uploadedResponse);
                console.log(project.bugs[index].pictures);
                if (project.bugs[index].pictures == undefined) {
                    project.bugs[index].pictures = [];
                }
                project.bugs[index].pictures.push(uploadedResponse.url);

                project.markModified("bugs");
                project
                    .save()
                    .then(res.redirect(`${APP_URL}/console/${req.body.bugId}`));
            } catch (e) {
                console.error(e);
            }
        }
    );
});

app.post("/markBugOpen", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }
            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been reopened by ${req.body.state.usrName}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "open",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    team.markModified("feed");
                    project.bugs[index].status = "open";
                    project.markModified("bugs");
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

app.post("/openBug", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.archivedBugs.length; i++) {
                if (project.archivedBugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }
            console.log(project.archivedBugs[index]);
            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.archivedBugs[index].bugId} has been reopened by ${req.body.state.usrName}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "open",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    team.markModified("feed");
                    project.archivedBugs[index].status = "open";
                    project.bugs.push(project.archivedBugs.splice(index, 1)[0]);
                    project.markModified("bugs");
                    project.markModified("archivedBugs");
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

app.post("/followBug", (req, res) => {
    console.log("here");
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);

            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }
            project.bugs[index].followedBy.includes(req.session.passport.user)
                ? project.bugs[index].followedBy.splice(
                      project.bugs[index].followedBy.indexOf(
                          req.session.passport.user
                      ),
                      1
                  )
                : project.bugs[index].followedBy.push(
                      req.session.passport.user
                  );
            project.markModified("bugs");
            project.save().then(res.send("success"));
        }
    );
});

app.post("/commit", (req, res) => {
    let open = 0;
    let close = 0;
    let ongoing = 0;
    let inReview = 0;
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return console.log(err);
            for (let change of req.body.changes) {
                let index;
                for (var i = 0; i < project.bugs.length; i++) {
                    if (project.bugs[i]._id == change[0]) {
                        index = i;
                        i = project.bugs.length;
                    }
                }
                switch (change[1]) {
                    case "openBugs":
                        open++;
                        project.bugs[index].status = "open";
                        break;
                    case "closeBugs":
                        close++;
                        project.bugs[index].status = "closed";
                        project.bugs[index].closeDate = new Date(Date.now());
                        project.archivedBugs.push(
                            project.bugs.splice(index, 1)[0]
                        );
                        break;
                    case "ongoingBugs":
                        ongoing++;
                        project.bugs[index].status = "ongoing";
                        break;
                    case "inReview":
                        inReview++;
                        project.bugs[index].status = "inReview";
                        break;
                }
            }

            const feedTextFunction = function () {
                let openText = open > 0 ? `Opened ${open} ` : "";
                let closeText = close > 0 ? `Closed ${close} ` : "";
                let ongoingText =
                    ongoing > 0 ? `marked Ongoing ${ongoing} ` : "";
                let inReviewText =
                    inReview > 0 ? `marked to Review ${inReview} ` : "";
                return openText + closeText + ongoingText + inReviewText;
            };

            const feedText = feedTextFunction();

            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${req.body.state.usrName} has ${feedText} bugs`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "change",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    team.markModified("feed");
                    project.markModified("bugs");
                    project.markModified("archivedBugs");
                    team.save().then(
                        project
                            .save()
                            .then(res.redirect(`${APP_URL}/console/bugs`))
                    );
                }
            );
        }
    );
});

app.post("/deleteBug", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.projectId),
        (err, project) => {
            if (err) return err;
            console.log(project);
            let index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                    i = project.bugs.length;
                }
            }
            Team.findById(
                mongoose.Types.ObjectId(project.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: `${project.bugs[index].bugId} has been deleted by ${req.body.state.usrName}`,
                        date: new Date(),
                        source: {
                            sourceString: project.name,
                            sourceId: project._id,
                        },
                        feedType: "delete",
                    });
                    if (team.feed.length < 100) {
                        team.feed.splice(100, 1);
                    }

                    project.bugs.splice(index, 1);

                    team.markModified("feed");
                    project.markModified("bugs");
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

app.post("/postComment", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.project),
        (err, project) => {
            if (err) return err;

            const newComment = new Comment({
                author: {
                    authorId: req.session.passport.user,
                    authorName: req.body.name,
                },
                commentText: req.body.comment,
                comments: [],
            });
            var index;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    index = i;
                }
            }

            project.bugs[index].comments.push(newComment);
            project.markModified("bugs");
            project
                .save()
                .then(res.redirect(`${APP_URL}/console/bug/${req.body.bugId}`));
        }
    );
});

app.post("/darkMode", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return console.log(err);

            user.settings.darkTheme = req.body.darkTheme;
            user.save();
        }
    );
});

app.post("/postReply", (req, res) => {
    Project.findById(
        mongoose.Types.ObjectId(req.body.project),
        (err, project) => {
            if (err) return err;

            const reply = new Comment({
                author: {
                    authorId: req.session.passport.user,
                    authorName: req.body.name,
                },
                commentText: req.body.comment,
                comments: [],
            });

            var bIndex;
            for (var i = 0; i < project.bugs.length; i++) {
                if (project.bugs[i]._id == req.body.bugId) {
                    bIndex = i;
                }
            }
            function traverseComments(comments) {
                for (let comment of comments) {
                    if (comment.comments.length > 0) {
                        traverseComments(comment.comments);
                    }
                    if (comment._id == req.body.commentId) {
                        comment.comments.push(reply);
                    }
                }
            }
            traverseComments(project.bugs[bIndex].comments);

            project.markModified("bugs");
            project
                .save()
                .then(res.redirect(`${APP_URL}/console/bug/${req.body.bugId}`));
        }
    );
});

app.post("/clearNotifs", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return err;
            user.notifications = [];
            user.markModified("notifications");
            user.save().then(res.send("success"));
        }
    );
});

app.get("/checkNotifs", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return err;

            return res.send(user.notifications);
        }
    );
});

app.post("/getProjectInfo", (req, res) => {
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

app.delete("/logout", (req, res) => {
    req.logOut();
    res.redirect(`${process.env.APP_URL}`);
});

app.get("/auth", (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ err: 0 });
    } else {
        res.json({ err: 1 });
    }
});

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});
