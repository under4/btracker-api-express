if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 5000;


const dbKey = process.env["db"];
const cors = require("cors");
const flash = require("express-flash");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const cookieParser = require("cookie-parser");

const passport = require("passport");
const methodOverride = require("method-override");
const { cloudinary } = require("./utils/cloudinary");
const APP_URL = process.env.APP_URL;

const db = mongoose.connect(dbKey, () => {
    console.log("connected to database");
});



app.enable("trust proxy");

app.set("trust proxy", 1);

app.use(cookieParser('xxx'));

app.use(
    cors({
        origin: APP_URL,
        credentials: true,
        optionsSuccessStatus: 200,
        exposedHeaders: ["Set-Cookie"],
    })
    );
    
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: false }));
app.use(flash());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        cookieName: 'session',
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
            secure: true,
        },
        saveUninitialized: false,
        resave: false,
        store: new MongoStore({
            client: mongoose.connection.getClient(),
            collectionName: "sessions",
            stringify: false,
            autoRemove: "interval",
            autoRemoveInterval: 1
            }),
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
const User = require("./Schema/User.js");
const Bug = require("./Schema/Bug");
const Team = require("./Schema/Team");
const Project = require("./Schema/Project");

const settingsRouter = require("./routes/settings");
const consoleRouter = require("./routes/console");
const loginRouter = require("./routes/login");
const teamRouter = require("./routes/team");
const bugRouter = require("./routes/bug.js");

app.use("/settings", settingsRouter);
app.use("/console", consoleRouter);
app.use("/login", loginRouter);
app.use("/team", teamRouter);
app.use("/bug", bugRouter);

const initializePass = require("./utils/passport-config");
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


app.post("/postToFeed", (req, res) => {
    User.findById(
        mongoose.Types.ObjectId(req.session.passport.user),
        (err, user) => {
            if (err) return err;
            Team.findById(
                mongoose.Types.ObjectId(req.body.team),
                (err, team) => {
                    if (err) return err;
                    team.feed.unshift({
                        feedText: req.body.feed,
                        source: {
                            id: req.session.passport.user,
                            sourceString: user.name,
                        },
                        feedType: "user",
                        //date: Schema default
                    });

                    if (team.feed.length > 100) {
                        team.feed = team.feed.slice(0, 99);
                    }
                    team.markModified("feed");
                    team.save().then(res.send("success"));
                }
            );
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

app.get("/hello", (req, res) => {
    return res.send("hello");
});

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});
