'use strict';

var assert = require('assert');
var VError = require('verror');
var debug = require('debug')('xsenv');
var fs = require('fs');

var cfservice = require('../lib/cfservice');

exports.getServices = getServices;

/**
 * Looks up and returns bound Cloud Foundry services.
 *
 * If a service is not found in VCAP_SERVICES, returns default service configuration loaded from a JSON file.
 *
 * @param query {object} describes requested Cloud Foundry services, each property value is a filter
 *  as described in filterCFServices.
 * @param servicesFile {string} path to JSON file to load default service configuration (default is default-services.json).
 *  If null, do not load default service configuration.
 *
 * @returns {object} with the same properties as in query argument where the value of each
 *  property is the respective service credentials object.
 * @throws Error, if for some of the requested services no or multiple instances are found; Error, if query parameter is not provided
 */
function getServices(query, servicesFile) {
  assert(query && typeof query === 'object', 'Missing mandatory query parameter');
  var defaultServices = loadDefaultServices(servicesFile);

  var result = {};
  for (var key in query) {
    var matches = cfservice.filterCFServices(query[key]);
    if (matches.length === 1) {
      result[key] = matches[0].credentials;
    } else if (matches.length > 1) {
      throw new VError('Found %d services matching %s', matches.length, key);
    } else {
      // not found in VCAP_SERVICES => check servicesFile
      if (!defaultServices[key]) {
        throw new VError('No service matches %s', key);
      }
      debug('No service in VCAP_SERVICES matches %s. Returning default configuration from %s', key, servicesFile);
      result[key] = defaultServices[key];
    }
  }
  return result;
}

function loadDefaultServices(servicesFile) {
  var defaultServices = {};
  if (servicesFile !== null) {
    servicesFile = servicesFile || 'default-services.json';
    if (fs.existsSync(servicesFile)) {
      debug('Loading default service configuration from %s', servicesFile);
      try {
        defaultServices = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
      } catch (err) {
        throw new VError(err, 'Could not parse %s', servicesFile);
      }
    }
  }
  return defaultServices;
}
