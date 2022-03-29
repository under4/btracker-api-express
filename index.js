require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser")
const urlencodedParser = bodyParser.urlencoded({extended: false});
const app = express();
console.log(process.env)
const port = process.env.PORT || 5000;

const User = require("./Schema/User")

const dbKey = process.env["db"];
const db = mongoose.connect(dbKey, () => {
    console.log("connected to database");
});


app.get("/", (req, res) => {
    //console.log(req);
    res.json({ greeting: "hello world" });
});

//new user
app.post("/register",urlencodedParser, (req, res)=>{
    console.log(req)
})

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});
