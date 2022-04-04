const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

function initializePass(passport, getUserByEmail, getUserId) {
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail({ username: email });
        console.log(user);
        if (user == null) {
            return done(null, false, { message: "No user found" });
        }

        try {
            //console.log(password);
            //console.log(user);
            if (
                await bcrypt.compare(
                    password,
                    user.password,
                    (err, result) => result
                )
            ) {
                console.log("correct pass");
                return done(null, user);
            } else {
                console.log("wrong pass");
                return done(null, false, { message: "Password incorrect" });
            }
        } catch (e) {
            return done(e);
        }
    };

    passport.use(
        new LocalStrategy({ usernameField: "email" }, authenticateUser)
    );
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((user, done) => {});
}

module.exports = initializePass;
