/**
 * Passport initialization.
 *
 * Intializes Passport for incoming requests, allowing authentication strategies
 * to be applied.
 *
 * @return {Function}
 * @api public
 */
module.exports = function initialize(passport) {
  return async (ctx, next) => {
    const req = ctx.req;
    req._passport = {
      instance: passport,
    };

    ctx.login =
    ctx.logIn = req.login.bind(req);

    ctx.logout =
    ctx.logOut = req.logout.bind(req);

    ctx.isAuthenticated = req.isAuthenticated.bind(req);
    ctx.isUnauthenticated = req.isUnauthenticated.bind(req);

    req.session = ctx.session;
    req.query = ctx.query;
    req.body = ctx.request.body;

    if (req.session && req.session[passport._key]) {
      // load data from existing session
      req._passport.session = req.session[passport._key];
    }

    await next();
  };
};
