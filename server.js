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

app.use(
    cors({
        origin: process.env.APP_URL,
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
const { type } = require("express/lib/response");
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

app.get("/", (req, res) => {
    res.json({ greeting: "hello world" });
});

//new user
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
                console.log(hash);
                if (data == null) {
                    const newUser = new User({
                        name: req.body.name,
                        username: req.body.email,
                        password: hash,
                    });
                    console.log(newUser);
                    newUser.save().then(() => {
                        res.send("success");
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

app.get("/getConsoleInfo", (req, res) => {
    //console.log(req)
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
                res.send("success");
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

                    const newProject = new Project({
                        name: req.body.newProjectName,
                        team: mongoose.Types.ObjectId(user.activeTeam),
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
                        .then(res.json({ err: 0, message: "Success" }));
                }
            );
        }
    );
});

app.post("/postBug", (req,res)=>{
    Project.findById(req.body.project, (err,project)=>{
        if(err)return res.json({err: 1})

        const labels = req.body.labels.split(",")

        const newBug = new Bug({
            author: req.session.passport.user,
            bugTitle: req.body.bug,
            description: req.body.description,
            labels: labels,
            priority: req.body.priority,
        })
        console.log(newBug)
    })
})

app.post("/getProjectInfo", (req, res) => {
    console.log(req.body.activeTeam)


    Project.findById(mongoose.Types.ObjectId(req.body.projectId), (err, project)=>{
        if(err) return err

        if(req.body.activeTeam == project.team) return res.json(project)
        
        Team.findById(mongoose.Types.ObjectId(req.body.activeTeam), (err,team) => {console.log("to be implemented")})
    })
    
});

app.delete("/logout", (req, res) => {
    req.logOut();
    res.redirect(`${process.env.APP_URL}`);
});

app.get("/auth", (req, res) => {
    console.log("isAuthenticated(): ", req.isAuthenticated());

    if (req.isAuthenticated()) {
        return res.json({ err: 0 });
    } else {
        res.json({ err: 1 });
    }
});

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});