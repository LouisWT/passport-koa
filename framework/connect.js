/**
 * Module dependencies.
 */
const initialize = require('../middleware/initialize');
const authenticate = require('../middleware/authenticate');
/**
 * Framework support for Koa2.
 *
 * This module provides support for using Passport with Koa2.
 *
 * @return {Object}
 * @api protected
 */
module.exports = {
  initialize,
  authenticate,
};
