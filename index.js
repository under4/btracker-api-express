//require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
let port = process.env["port"] || 3000;

const dbKey = process.env["db"];
const db = mongoose.connect(dbKey, () => {
    console.log("connected to database");
});

app.get("/", (req, res) => {
    console.log(req);
    res.json({ greeting: "hello world" });
});

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});
