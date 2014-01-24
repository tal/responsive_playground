(function() {
  'use strict';

  var once = 0;

  window.BananaStand = function BananaStand() {
    this.middleware = Array.prototype.slice.call(arguments);;
  };

  var locStorInterface = {
    get: function get(key) { return window.localStorage.getItem(key); },
    set: function set(key, value) {
      // force failure for testing of the priority middleware
      if (key == 'omg' && once < 2) {
        once += 1;
        throw 'yo';
      }
      return window.localStorage.setItem(key, value);
    },
    del: function del(key) { return window.localStorage.removeItem(key); }
  };

  BananaStand.prototype.setupPipeline = function() {
    var next = locStorInterface;

    for (var i = this.middleware.length - 1; i >= 0; i--) {
      next = new this.middleware[i](next);
    }

    this.pipeline = next;
  };

  BananaStand.prototype.getPipeline = function() {
    if (!this.pipeline) {
      this.setupPipeline();
    }

    return this.pipeline;
  };

  BananaStand.prototype.get = function get(key) {
    return this.getPipeline().get(key);
  };

  BananaStand.prototype.set = function set(key, value) {
    return this.getPipeline().set(key, value);
  };

  BananaStand.prototype.del = function del(key) {
    var val = this.get(key);
    this.getPipeline().del(key);
    return val;
  };

  BananaStand.Middleware = function Middleware(app) {
    this.app = app;
  }

  _.extend(BananaStand.Middleware.prototype, {
    get: function(key) { return this.app.get(key); },
    del: function(key) { return this.app.del(key); },
    set: function(key, value) { return this.app.set(key,value); }
  });

  BananaStand.Middleware.extend = function(protoProps, staticProps) {
    var parent = this;
    var child;
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }
    _.extend(child, parent, staticProps);
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;
    if (protoProps) _.extend(child.prototype, protoProps);

    child.__super__ = parent.prototype;

    return child;
  };


  function namespace(namespace) {
    return BananaStand.Middleware.extend({
      namespace: namespace,
      get: function(key) { return this.app.get(this.namespace+key); },
      del: function(key) { return this.app.del(this.namespace+key); },
      set: function(key, value) { return this.app.set(this.namespace+key,value); }
    });
  }

  var json = BananaStand.Middleware.extend({
    get: function(key) {
      var value = this.app.get(key);
      if (value !== undefined) {
        try {
          value = JSON.parse(value);
        } catch(e) {}
      }
      return value;
    },
    set: function(key, value) {
      if (value !== undefined) {
        try {
          value = JSON.stringify(value);
        } catch(e) {}
      }
      return this.app.set(key, value);
    }
  });

  // This shoudl always be the first middleware because of how
  // the callback is returned for set
  var priority = BananaStand.Middleware.extend({
    priority: {
      'fooz': 1000,
      'famo': 199,
      'bozo': 299
    },
    set: function(key, value) {
      try {
        this.app.set(key, value);
      } catch(e) {
        var c = [];
        _.each(this.priority, function(priority, key) {
          if (localStorage.hasOwnProperty(key)) {
            c.push({key: key, p: priority});
          }
        });

        var smallest_key = _.min(c, function(obj) { return obj.p});

        if (smallest_key) {
          nana.del(smallest_key.key);
          return this.set(key, value);
        } else {
          // Nothing to pop out of the queue so error out.
          throw e;
        }

      }
    }
  });

  window.nana = new BananaStand(priority,json);
  localStorage.clear();
  nana.set('fooz', 'asdf');
  nana.set('famo', 'asdf');
  nana.set('bozo', 'asdf');
  nana.set('omg', [1,2,3]);
  // nana.del('fooz');
  console.log('result', nana.get('fooz'));
})();
