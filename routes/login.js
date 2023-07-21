const loginRouter = require("express").Router();

const mongoose = require("mongoose");

const User = require("../Schema/User.js");
const bcrypt = require("bcrypt");
const passport = require("passport");

loginRouter.post("/register", async (req, res) => {
    console.log(req.body);
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

loginRouter.post(
    "/login",
    (req, res, next) => {
        console.log("login request received");
        console.log(req.body);
        next();
    },
    passport.authenticate("local", {
        successRedirect: `${process.env.APP_URL}/console`,
        failureRedirect: `${process.env.APP_URL}/login`,
        failureFlash: true,
    })
);

loginRouter.post("/usernameCheck", (req, res) => {
    User.find({ username: req.body.username }, (err, user) => {
        if (err) return console.error(err);
        if (user.length == 0) return res.send("noUser");
        if (user != undefined) return res.send("userExists");
    });
});

loginRouter.delete("/logout", (req, res) => {
    req.logOut(function (err) {
        if (err) return console.error(err);
    });
    res.redirect(`${process.env.APP_URL}`);
});

loginRouter.get("/auth", (req, res) => {
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        console.log("authenticated");
        return res.json({ err: 0 });
    } else {
        console.log("not authenticated");
        res.json({ err: req.session });
    }
});

module.exports = loginRouter;
