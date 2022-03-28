require("dotenv").config();
const express = require("express");
const app = express();
let port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    console.log(req);
    res.json({ greeting: "hello world" });
});

app.listen(port, () => {
    console.log(`App is listening at ${port}`);
});

console.log(process.env["db"]);
