const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcrypt")

function initializePass(passport, getUserByEmail){
    const authenticateUser = async (username, password, done) => {
        const user = getUserByEmail(username)
        if(user == null){return done(null, false, {message: "No user found"})}

        try {
            if(await bcrypt.compare(password, user.password)){
                return done(null, user)
            } else {
                return done(null, false, {message: "Password incorrect"})
            }
        } catch(e){
            return done(e)
        }
    }

    passport.use(new LocalStrategy({usernameField: "username"}, authenticateUser))
    passport.serializeUser((user, done)=> done(null,user.id))
    passport.deserializeUser((user, done)=> {})
}

module.exports = initializePass

