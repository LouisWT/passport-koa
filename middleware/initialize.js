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
    ctx._passport = {};
    ctx._passport.instance = passport;
    await next();
  };
};
