/**
 * Module dependencies.
 */
const http = require('http');
const AuthenticationError = require('passport/lib/errors/authenticationerror');


/**
 * Authenticates requests.
 *
 * Applies the `name`ed strategy (or strategies) to the incoming request, in
 * order to authenticate the request.  If authentication is successful, the user
 * will be logged in and populated at `req.user` and a session will be
 * established by default.  If authentication fails, an unauthorized response
 * will be sent.
 *
 * Options:
 *   - `successRedirect`  After successful login, redirect to given URL
 *   - `successMessage`   True to store success message in
 *                        req.session.messages, or a string to use as override
 *                        message for success.
 *   - `failureRedirect`  After failed login, redirect to given URL
 *   - `failureMessage`   True to store failure message in
 *                        req.session.messages, or a string to use as override
 *                        message for failure.
 *   - `assignProperty`   Assign the object provided by the verify callback to given property
 *
 * @param {String|Array} name
 * @param {Object} options
 * @param {Function} callback
 * @return {Function}
 * @api public
 */
module.exports = function authenticate(passport, name, options) {
  if (!name) {
    return new Error('A strategy name require');
  }
  if (typeof options === 'function') {
    options = {};
    return new Error('Sorry, not support callback by now')
  }
  options = options || {};
  return async (koaCtx, koaNext) => {
    const runPro = new Promise((resolve, reject) => {
      const runCtx = (ctx, next) => {
        let failure = {};
        function failed() {
          const challenge = failure.challenge;
          // if (callback) {
          //   return next(false, callback(null, false, challenge, failure.status));
          // }
          if (options.failureRedirect) {
            return ctx.redirect(options.failureRedirect);
          }

          ctx.status = 401;
          ctx.set('WWW-Authenticate', challenge);
          ctx.body = challenge;
          return next(new AuthenticationError(http.STATUS_CODES[ctx.status], 401));
        }

        const layer = name;
        const prototype = passport._strategy(layer);
        if (!prototype) { return next(new Error(`Unknown authentication strategy "${layer}"`)); }
        const strategy = Object.create(prototype);

        strategy.success = (user, info) => {
          // if (callback) {
          //   return next(false, callback(null, user, info));
          // }
          if (options.assignProperty) {
            ctx.state = ctx.state ? ctx.state : {};
            ctx.state[options.assignProperty] = user;
          } else {
            ctx.state.user = user;
          }
          if (options.successRedirect) {
            ctx.redirect(options.successRedirect);
          }
          return next();
        };

        strategy.fail = (challenge, status) => {
          if (typeof challenge === 'number') {
            status = challenge;
            challenge = undefined;
          }

          failure = { challenge, status };
          failed();
        };

        strategy.redirect = (url, status) => {
          ctx.status = status || 302;
          ctx.set('Location', url);
          ctx.set('Content-Length', '0');
        };

        strategy.pass = () => {
          return next();
        };

        strategy.error = (err) => {
          // if (callback) {
          //   return next(false, callback(err));
          // }
          return next(err);
        };
        strategy.authenticate(ctx, options);
      };
      runCtx(koaCtx, (err, result) => {
        if (err) reject(new Error(err));
        else resolve(result);
      });
    });
    try {
      await runPro;
      await koaNext();
    } catch (error) {
      if (options.failWithError) {
        console.log(error);
      }
    }
  };
};
