# passport-koa
koa framework plugin for [passport.js](https://www.npmjs.com/package/passport)

### Usage
```
const Koa = require('koa');
const Router = require('koa-router');
const passportKoa = require('passport-koa');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mysql = require('mysql2/promise');
const session = require('koa-session');
const pool = mysql.createPool({
  "host": "127.0.0.1",
  "port": 3306,
  "user": "root",
  "password": "passpord",
  "database": "your database name",
  "namedPlaceholders": true
});

const CONFIG = {
  key: 'koa:sess', 
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
};

const queryOne = async (sql, params) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(sql, params);
    return rows[0];
  } catch (error) {
    console.error(sql);
    console.error(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
  return 'error';
};

const app = new Koa();
app.keys= ['lwt'];
const router = new Router();

// use passport-koa
passport.framework(passportKoa);

// use passport as always
passport.use('local', new LocalStrategy({ passReqToCallback: true, }, async function (reqest, username, password, done) {
  try {
    const result = await queryOne(`SELECT id FROM account WHERE name=:username`, {
      username,
    });
    console.log(result)
    if (result) {
      done(null, result)
    } else {
      done(null, false);
    }
  } catch (err) {
    await done(err);
  } 
}))

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

router.get('/', passport.authenticate('local', {
  successRedirect: '/success',
  failureRedirect: '/failure',
}));

router.get('/success', async (ctx, next) => {
  console.log(ctx.session.passport.user);
  ctx.body = 'success';
  await next();
});

router.get('/failure', async (ctx, next) => {
  console.log(ctx.session.passport.user);
  ctx.body = 'failure';
  ctx.logout();
  await next();
})

router.get('/middle', passport.authenticate('local'), async (ctx, next) => {
  console.log(ctx.req.user);
  console.log(ctx.user);
  console.log(ctx.isAuthenticated());
  ctx.body = 'middle';
  await next();
})

router.get('/changename', passport.authenticate('local'), async (ctx, next) => {
  console.log(ctx.req.current);
  console.log(ctx.current);
  ctx.body = 'changename';
  await next();
})

router.get('/login', async (ctx, next) => {
  const user = { username: 'lwt', id: 1 };
  ctx.login(user, function(err) {
    if (err) { return next(err); }
    return ctx.redirect('/users');
  });
})

router.get('/users', async(ctx, next) => {
  console.log(ctx.session.passport.user);
  ctx.body = 'user';
  await next();
})

app.use(session(CONFIG, app));

app.use(passport.initialize({
  // use ctx.current to access user info
  // userProperty: 'current'
}))

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000, () => {
  console.log('listen 3000')
});
```
only difference between passport.js usage is `passport.framework(passport-koa);`， and some options in passport.js is not support in passport-koa

