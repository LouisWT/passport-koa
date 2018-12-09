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
 *   - `session`          use session
 * 
 * @param {String|Array} name
 * @param {Object} options
 * @return {Function}
 * @api public
 */
module.exports = function authenticate(passport, name, options) {
  if (!name) {
    return new Error('A strategy name require');
  }

  if (typeof options === 'function') {
    throw new Error('Sorry, passport-koa do not support callback, prefer middleware');
  }
  options = options || {};

  return async (ctx, next) => {
    // {
    //   // application instance
    //   app: ctx.app,
    //   // request URL
    //   baseUrl: ctx.url,
    //   // request bodu
    //   body: ctx.request.body,
    //   // cookies
    //   cookies: ctx.cookies,
    //   // cache fresh
    //   fresh: ctx.fresh,
    //   // hostname
    //   hostname: ctx.hostname,
    //   // ip
    //   ip: ctx.ip,
    //   ips: ctx.ips,
    //   // request method
    //   method: ctx.method,
    //   originalUrl: ctx.originalUrl,
    //   // url params
    //   params: ctx.params,
    //   // request path
    //   path: ctx.path,
    //   // request protocol
    //   protocol: ctx.protocol,
    //   // query param
    //   query: ctx.query,
    //   // https
    //   secure: ctx.secure,
    //   // signed cookie
    //   signedCookies: ctx.cookies,
    //   // !ctx.fresh
    //   stale: ctx.stale,
    //   subdomains: ctx.subdomains,
    //   xhr: ctx.headers['X-Requested-With'] === 'XMLHttpRequest',
    //   header: ctx.header,
    //   headers: ctx.headers,
    // };
    const req = ctx.req;

    let strategyPrototype;
    if (typeof name === 'string' && passport._strategies[name])
      strategyPrototype = passport._strategies[name];
    else
      throw new Error('passport.authenticate can not be used before add a strategy');

    async function onSuccess(user, info) {
      // success msg
      let msg;
      info = info || {};
      if (typeof options.successMessage === 'boolean') msg = info.message || info;
      if (typeof options.successMessage === 'string') msg = options.successMessage;
      if (ctx.session && typeof msg === 'string') {
        ctx.session.messages = ctx.session.messages || [];
        ctx.session.messages.push(msg);
      }

      await new Promise((resolve, reject) => {
        ctx.req.logIn(user, options, function (err) {
          if (err) { throw err; }
          
          function complete() {
            if (options.successReturnToOrRedirect) {
              let url = options.successReturnToOrRedirect;
              if (ctx.session && ctx.session.returnTo) {
                url = ctx.session.returnTo;
                delete ctx.session.returnTo;
              }
              resolve({
                type: 'redirect',
                url,
              })
            }
            if (options.successRedirect) {
              resolve({
                type: 'redirect',
                url: options.successRedirect,
              })
            }
            resolve();
          }
          if (options.authInfo !== false) {
            passport.transformAuthInfo(info, ctx, function(err, tinfo) {
              if (err) reject(err);
              ctx.authInfo = tinfo;
              complete();
            });
          } else {
            complete();
          }
        });
      })
      .then(async (value) => {
        if (ctx.req._passport && ctx.req._passport.instance) {
          ctx[ctx.req._passport.instance._userProperty || 'user'] = user;
        }
        if (!value) return await next();
        if (value.type === 'redirect') ctx.redirect(value.url);
      })
      .catch((err) => {
        throw err;
      })  
    }

    async function onFail(challenge, status) {
      let msg = 'Unauthorized';
      // display challenge msg
      if (typeof options.failureMessage === 'boolean' && challenge) {
        msg = challenge.message || challenge;
      }
      // display failureMessage
      if (typeof options.failureMessage === 'string') {
        msg = options.failureMessage;
      }
      // session
      if (ctx.session && typeof msg === 'string') {
        ctx.session.messages = ctx.session.messages || [];
        ctx.session.messages.push(msg);
      }
      // fail redirect
      if (options.failureRedirect) {
        ctx.redirect(options.failureRedirect);
        return;
      }
      ctx.status = status ? status : 401;
      ctx.body = msg;
      if (ctx.status === 401) {
        ctx.set('WWW-Authenticate', msg);
      }
      // fail throw error
      if (options.failWithError) {
        throw new AuthenticationError(http.STATUS_CODES[ctx.status], status);
      }
      return;
    };

    async function onRedirect(url, status) {
      ctx.status = status || 302;
      ctx.set('Location', url);
      ctx.set('Content-Length', '0');
      ctx.redirect(url);
      return;
    };

    async function onError(err) {
      throw err;
    };

    async function processAuth(strategyPrototype) {
      const strategy = Object.create(strategyPrototype);
      await new Promise((resolve, reject) => {
        try {
          strategy.success = function (user, info) {
            resolve({
              type: 'success',
              user,
              info,
            });
          };
          strategy.fail = function (challenge, status) {
            resolve({
              type: 'fail',
              challenge,
              status
            });
          };
          strategy.redirect = function (url, status) {
            resolve({
              type: 'redirect',
              url,
              status
            });
          };
          strategy.pass = async function () {
            resolve({
              type: 'pass',
            });
          };
          strategy.error = function (err) {
            resolve({
              type: 'error',
              err,
            });
          };
          strategy.authenticate(req, options);
        } catch (err) {
          throw err;
        }
      }).then(async (value) => {
        switch (value.type) {
          case 'success': await onSuccess(value.user, value.info);
            break;
          case 'fail': await onFail(value.challenge, value.status);
            break;
          case 'redirect': await onRedirect(value.url, value.status);
            break;
          case 'pass': await next();
            break;
          case 'error': await onError(value.err);
            break;
          default:
            await next();
        }
      })
      .catch((err) => {
        throw err;
      })
    }
    await processAuth(strategyPrototype);
  };
};
