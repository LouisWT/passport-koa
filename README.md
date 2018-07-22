# passport-koa
koa framework plugin for [passport.js](https://www.npmjs.com/package/passport)

### Usage
```
const Koa = require('koa');
const passport = require('passport');
const passport-koa = require('passport-koa');
const CustomStrategy = require('passport-custom').Strategy;

passport.framework(passport-koa);
passport.use('custom', new CustomStrategy((ctx, done) => {
  const { authorization } = ctx.headers;
  if (authorization === 'token') {
    return done(null, { id: 1 });
  } 
  done(null, false);
}));

const app = new Koa();

app.use(passport.initialize());
app.use(passport.authenticate('custon', { ... }));
```
only difference between passport.js usage is `passport.framework(passport-koa);`， and some options in passport.js is not support in passport-koa

### Difference
passport-koa remove the session parts in passport, if you need session auth in your app, just load session middleware and write or find a strategy.

`passport.authenticate(someStrategy, options)`have some options
```
  failureRedirect: String // when auth failed ctx redirect to this url
  successRedirect: String // when auth successed ctx redirect to this url
  assignProperty: String // when auth successed, you can access user info by ctx.state[assignProperty], default is ctx.state.user
```
