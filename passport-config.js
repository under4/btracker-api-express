const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

function initializePass(passport, getUserByEmail, getUserId) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail({ username: email });
        //console.log(user, " user");
        if (user == null) {
            return done(null, false, { message: "No user found" });
        }

        try {
            if(await bcrypt.compare(password, user.password)) {
                console.log("login success ")
                return done(null, user)
            } else {
                console.log("login fail ")
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
    passport.deserializeUser((id, done) => done(null, getUserId({ id: id })));
}

module.exports = initializePass;
