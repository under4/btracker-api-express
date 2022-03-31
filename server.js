if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 5000;
const bcrypt = require("bcrypt")
const dbKey = process.env["db"];
const cors = require("cors");
const flash = require("express-flash")
const session = require("express-session")
const passport = require("passport");
const methodOverride = require("method-override")

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:false}))
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))

const User = require("./Schema/User");


const initializePass = require("./passport-config")
initializePass(
    passport,
    username => {
        User.findOne({username: username}, (err, data)=>{
            if(err){return console.log(err)}
            if(data!=null){return data}
        })})


const db = mongoose.connect(dbKey, () => {
    console.log("connected to database");
});

app.get("/", (req, res) => {
    console.log(req);
    res.json({ greeting: "hello world" });
});

//new user
app.post("/register", async (req, res) => {
    try{
        const hashedPass = await bcrypt.hash(req.body.password, 10);
        User.findOne({username: req.body.email}, function(err, data){
            if(err){return console.log(err)}
            console.log(data)
            console.log(hashedPass)
            if(data==null){
                const newUser = new User({
                    username: req.body.email,
                    password: hashedPass
                })
                newUser.save()
                    .then(data => {
                        res.send("success")
                    })
            } else {
                res.send("fail")
            }
        })
    } catch {

    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/console",
    failureRedirect: `${process.env.APP_URL}/signin`,
    failureFlash:true
}))

app.delete("/logout", (req,res)=>{
    req.logOut();
    res.redirect("/")
})

function checkAuth(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect(`${process.env.APP_URL}/signin`)
}

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});