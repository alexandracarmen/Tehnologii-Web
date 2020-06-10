const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt-nodejs');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const AuthTokenStrategy = require('passport-auth-token').Strategy;
const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password: 'postgres',
    // password : '=bm#E3UV9@Tj-tKn',
    database : 'app_tw'
  }
});


const { tokenSecret } = require('../../config');


const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;


const getUserByColumn = async (column, value) => {
  const users = await knex.from('users').select().where(column, value);
  return users.length ? users[0] : null;
};


passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
},
  async function (email, password, callback) {
    try {
      const user = await getUserByColumn('email', email);
      if (!user) {
        return callback(null, false);
      }

      bcrypt.compare(password, user.password, function (err, res) {
        if (err) {
          callback(err);
        }
        if (!res) {
          return callback(null, false);
        }
        delete user.password;
        return callback(null, user);
      });
    } catch (err) {
      return callback(err);
    }
}));


passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey   : tokenSecret
  },
  async function (jwtPayload, callback) {
    try {
      const user = await getUserByColumn('id', jwtPayload.id);
      delete user.password;
      return callback(null, user);

    } catch (err) {
      return callback(err);
    }
  }
));


const authenticate = async (req, res) => {
  return new Promise((success, reject) => {
    passport.authenticate('jwt', {session: false}, (err, user) => {
      req.user = user;
      if(!user) {
        res.statusCode = 401;
        res.end('Token not valid');
        return;
      }
      success(user);
    })(req, res);
  });
};


module.exports = {
  authenticate
};