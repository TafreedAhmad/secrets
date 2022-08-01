require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
// const md5=require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDb", { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// console.log(process.env.SECRET);


//No need of doing it if we have made hash password usign md5, we just use md5 where we take the password from the user.
// userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
    res.render("Home");
});
app.get("/login", function (req, res) {
    res.render("Login");
});
app.get("/register", function (req, res) {
    res.render("Register");
});

app.post("/register", function (req, res) {


    ///THis will save the user password as in the form of hashh
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        // Store hash in your password DB.
        const newUser = new User({
            email: req.body.username,
            // password: md5(req.body.password)///for md5
            password: hash
        });
        newUser.save(function (err) {
            if (!err) {
                res.render("secrets");
            }
            else {
                console.log(err);
            }
        });
    });
});

app.post("/login", function (req, res) {
    const username = req.body.username;
    // const password = md5(req.body.password);//For md5
    const password = req.body.password;

    User.findOne({ email: username }, function (err, foundOne) {
        if (err) {
            res.send(err);
        } else {
            // if (foundOne.password === password) {
            //     res.render("secrets");
            // }
            if (foundOne) {

                bcrypt.compare(password, foundOne.password, function (err, result) {
                    //result == true
                    if (result === true) {
                        res.render("secrets");
                    }
                    //console.log(result);
                });
            }
        }
    });
});






app.listen(3000, function () {
    console.log("Server started on port 3000");
});