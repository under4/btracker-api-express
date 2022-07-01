const bugRouter = require("express").Router();

const mongoose = require("mongoose");

const User = require("../Schema/User.js");
const Project = require("../Schema/Project.js");
const Bug = require("../Schema/Bug.js");
const Team = require("../Schema/Team.js");
const Comment = require("../Schema/Comment.js");

const APP_URL = process.env.APP_URL;

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

bugRouter.post("/uploadImage", (req, res) => {
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

bugRouter.post("/markBugOpen", (req, res) => {
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

bugRouter.post("/openBug", (req, res) => {
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

bugRouter.post("/followBug", (req, res) => {
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

bugRouter.post("/commit", (req, res) => {
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
                    team.save().then(project.save().then(res.send("success")));
                }
            );
        }
    );
});

bugRouter.post("/deleteBug", (req, res) => {
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

bugRouter.post("/postComment", (req, res) => {
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

bugRouter.post("/getBug", (req, res) => {
    Project.findById(req.body.projectId, (err, project) => {
        if (err) return res.json({ err: 1 });
        return res.json(
            project.bugs.filter((bug) => bug._id == req.body.bugId)[0]
        );
    });
});

bugRouter.post("/getArchivedBug", (req, res) => {
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

bugRouter.post("/getArchivedBugs", (req, res) => {
    Project.findById(req.body.project, (err, project) => {
        if (err) return res.json({ err: 1 });
        if (project.archivedBugs.length == 0) {
            return res.json({ error: 1 });
        }
        return res.json({ bugs: project.archivedBugs });
    });
});

bugRouter.post("/postBug", (req, res) => {
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

            const labels = req.body.labels.toLowerCase().split(",");
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

bugRouter.post("/archive", (req, res) => {
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

bugRouter.post("/editBug", (req, res) => {
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

                    const labels = req.body.labels.toLowerCase().split(",");
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

bugRouter.post("/markBugComplete", (req, res) => {
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

bugRouter.post("/markBugOngoing", (req, res) => {
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

bugRouter.post("/postReply", (req, res) => {
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

module.exports = bugRouter;
