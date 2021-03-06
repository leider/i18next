'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _EventEmitter2 = require('./EventEmitter');

var _EventEmitter3 = _interopRequireDefault(_EventEmitter2);

function remove(arr, what) {
  var found = arr.indexOf(what);

  while (found !== -1) {
    arr.splice(found, 1);
    found = arr.indexOf(what);
  }
}

var Connector = (function (_EventEmitter) {
  _inherits(Connector, _EventEmitter);

  function Connector(backend, store, services) {
    var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    _classCallCheck(this, Connector);

    _get(Object.getPrototypeOf(Connector.prototype), 'constructor', this).call(this);
    this.backend = backend;
    this.store = store;
    this.services = services;
    this.options = options;
    this.logger = _logger2['default'].create('backendConnector');

    this.state = {};
    this.queue = [];

    this.backend && this.backend.init(services, options.backend, options);
  }

  _createClass(Connector, [{
    key: 'queueLoad',
    value: function queueLoad(languages, namespaces, callback) {
      var _this = this;

      // find what needs to be loaded
      var toLoad = [],
          pending = [],
          toLoadLanguages = [],
          toLoadNamespaces = [];

      languages.forEach(function (lng) {
        var hasAllNamespaces = true;

        namespaces.forEach(function (ns) {
          var name = lng + '|' + ns;

          if (_this.store.hasResourceBundle(lng, ns)) {
            _this.state[name] = 2; // loaded
          } else if (_this.state[name] === 1) {
              if (pending.indexOf(name) < 0) pending.push(name);
            } else {
              _this.state[name] = 1; // pending

              hasAllNamespaces = false;

              if (pending.indexOf(name) < 0) pending.push(name);
              if (toLoad.indexOf(name) < 0) toLoad.push(name);
              if (toLoadNamespaces.indexOf(ns) < 0) toLoadNamespaces.push(ns);
            }
        });

        if (!hasAllNamespaces) toLoadLanguages.push(lng);
      });

      if (toLoad.length || pending.length) {
        this.queue.push({
          pending: pending,
          loaded: {},
          errors: [],
          callback: callback
        });
      }

      return {
        toLoad: toLoad,
        pending: pending,
        toLoadLanguages: toLoadLanguages,
        toLoadNamespaces: toLoadNamespaces
      };
    }
  }, {
    key: 'loaded',
    value: function loaded(name, err, data) {
      var _this2 = this;

      var _name$split = name.split('|');

      var _name$split2 = _slicedToArray(_name$split, 2);

      var lng = _name$split2[0];
      var ns = _name$split2[1];

      if (err) this.emit('failedLoading', lng, ns, err);

      if (data) {
        this.store.addResourceBundle(lng, ns, data);
      }

      // set loaded
      this.state[name] = err ? -1 : 2;
      // callback if ready
      this.queue.forEach(function (q) {
        utils.pushPath(q.loaded, [lng], ns);
        remove(q.pending, name);

        if (err) q.errors.push(err);

        if (q.pending.length === 0 && !q.done) {
          q.errors.length ? q.callback(q.errors) : q.callback();
          _this2.emit('loaded', q.loaded);
          q.done = true;
        }
      });

      // remove done load requests
      this.queue = this.queue.filter(function (q) {
        return !q.done;
      });
    }
  }, {
    key: 'read',
    value: function read(lng, ns, fcName, tried, wait, callback) {
      var _this3 = this;

      if (!tried) tried = 0;
      if (!wait) wait = 250;

      if (!lng.length) return callback(null, {}); // noting to load

      this.backend[fcName](lng, ns, function (err, data) {
        if (err && data /* = retryFlag */ && tried < 5) {
          setTimeout(function () {
            _this3.read.call(_this3, lng, ns, fcName, ++tried, wait * 2, callback);
          }, wait);
          return;
        }
        callback(err, data);
      });
    }
  }, {
    key: 'load',
    value: function load(languages, namespaces, callback) {
      var _this4 = this;

      if (!this.backend) {
        this.logger.warn('No backend was added via i18next.use. Will not load resources.');
        return callback && callback();
      }
      var options = _extends({}, this.backend.options, this.options.backend);

      if (typeof languages === 'string') languages = this.services.languageUtils.toResolveHierarchy(languages);
      if (typeof namespaces === 'string') namespaces = [namespaces];

      var toLoad = this.queueLoad(languages, namespaces, callback);
      if (!toLoad.toLoad.length) {
        if (!toLoad.pending.length) callback(); // nothing to load and no pendings...callback now
        return; // pendings will trigger callback
      }

      // load with multi-load
      if (options.allowMultiLoading && this.backend.readMulti) {
        this.read(toLoad.toLoadLanguages, toLoad.toLoadNamespaces, 'readMulti', null, null, function (err, data) {
          if (err) _this4.logger.warn('loading namespaces ' + toLoad.toLoadNamespaces.join(', ') + ' for languages ' + toLoad.toLoadLanguages.join(', ') + ' via multiloading failed', err);
          if (!err && data) _this4.logger.log('loaded namespaces ' + toLoad.toLoadNamespaces.join(', ') + ' for languages ' + toLoad.toLoadLanguages.join(', ') + ' via multiloading', data);

          toLoad.toLoad.forEach(function (name) {
            var _name$split3 = name.split('|');

            var _name$split32 = _slicedToArray(_name$split3, 2);

            var l = _name$split32[0];
            var n = _name$split32[1];

            var bundle = utils.getPath(data, [l, n]);
            if (bundle) {
              _this4.loaded(name, err, bundle);
            } else {
              var _err = 'loading namespace ' + n + ' for language ' + l + ' via multiloading failed';
              _this4.loaded(name, _err);
              _this4.logger.error(_err);
            }
          });
        });
      }

      // load one by one
      else {
          (function () {
            var read = function read(name) {
              var _this5 = this;

              var _name$split4 = name.split('|');

              var _name$split42 = _slicedToArray(_name$split4, 2);

              var lng = _name$split42[0];
              var ns = _name$split42[1];

              this.read(lng, ns, 'read', null, null, function (err, data) {
                if (err) _this5.logger.warn('loading namespace ' + ns + ' for language ' + lng + ' failed', err);
                if (!err && data) _this5.logger.log('loaded namespace ' + ns + ' for language ' + lng, data);

                _this5.loaded(name, err, data);
              });
            };

            ;

            toLoad.toLoad.forEach(function (name) {
              read.call(_this4, name);
            });
          })();
        }
    }
  }, {
    key: 'saveMissing',
    value: function saveMissing(languages, namespace, key, fallbackValue) {
      if (this.backend && this.backend.create) this.backend.create(languages, namespace, key, fallbackValue);

      // write to store to avoid resending
      this.store.addResource(languages[0], namespace, key, fallbackValue);
    }
  }]);

  return Connector;
})(_EventEmitter3['default']);

exports['default'] = Connector;
module.exports = exports['default'];