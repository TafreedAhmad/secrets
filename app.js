require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();


app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));



//////Setting the express session
app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: true,
    cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());



////Connect to DB
mongoose.connect("mongodb://localhost:27017/userDb", { useNewUrlParser: true, useUnifiedTopology: true });

///////DB SETUP
///Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

/////MODEL
const User = new mongoose.model("User", userSchema);


////Serializing and deserializing
passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});



////Adding the google authentications 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) {

            return cb(err, user);
        });
    }
));



app.get("/", function (req, res) {
    res.render("Home");
});

app.get("/auth/google", passport.authenticate('google', {

    scope: ["profile"]

}));

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });

app.get("/login", function (req, res) {
    res.render("Login");
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
    });
    res.redirect("/");
});

app.get("/register", function (req, res) {
    res.render("Register");
});

app.get("/secrets", function (req, res) {

    //// $ne= not equal to null
    User.find({ "secrets": { $ne: null } }, function(err, foundUsers){
        if (err) {
            console.log(err);            
        } else {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets : foundUsers});
                                                
            }
            
        }
    })
})

app.get("/submit", function (req, res) {

    if (req.isAuthenticated()) {
        res.render("submit");
    }
    else {
        res.redirect("login");
    }
})


app.post("/submit", function (req, res) {

    const submittedSecret = req.body.secret;

    // console.log(user);
    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect("secrets");
                    }
                })
            }

        }
    })


});



app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function () {
                console.log(user);
                res.redirect("/secrets");
            });

        }
    })


});

// Handle 'POST' requests made on the '/login' route:
app.post("/login", passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));




app.listen(3000, function () {
    console.log("Server started on port 3000");
});