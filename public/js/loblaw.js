(function() {
  'use strict';

  function Loblaw() {};

  Loblaw.prototype.module = function loblawModule(name, cb) {
    if (!this[name]) {
      this[name] = new Module();
    }

    var module = this[name];

    cb.call(this, module);
  };

  function closestData($el, key) {
    var $target = $el, value;

    while ($target.length) {
      value = $target.data(key);
      if (value) {
        return value;
      } else {
        $target = $target.parent();
      }
    }

    return;
  }

  function buildModelFromEl(el, Model) {
    var attrs = {}, name, value;

    var json = el.getAttribute('lb-attrs');

    if (json) {
      json = JSON.parse(json);
      for (name in json) {
        attrs[name] = json[name];
      }
    }

    var model_instance = new Model(attrs);
    $(el).data('model', model_instance);
    return model_instance;
  }

  function buildViewFromEl(el, View) {
    var model = closestData($(el),'model');

    return new View({el: el, model: model});
  }

  Loblaw.prototype.init = function initLoblaw(root) {
    root || (root = document);
    var module_els = root.querySelectorAll('[lb-module]');

    for (var i = module_els.length - 1; i >= 0; i--) {
      var module_el = module_els[i];
      var module = this[module_el.getAttribute('lb-module')];

      if (module) {
        var model_els = module_el.querySelectorAll('[lb-model]');

        for (var i=0; i < model_els.length; i++) {
          var model_el = model_els[i];
          var model = module.model(model_el.getAttribute('lb-model'));

          if (model) {
            buildModelFromEl(model_el, model);
          }
        }

        var view_els = module_el.querySelectorAll('[lb-view]');
        for (var i = view_els.length - 1; i >= 0; i--) {
          var view_el = view_els[i];
          var view = module.view(view_el.getAttribute('lb-view'));

          buildViewFromEl(view_el, view);
        };
      }
    }
  };

  function Module() {
    this.views = {};
    this.models = {};
  };
  Loblaw.Module = Module;

  Module.prototype.view = function buildLawblawView(name, args) {
    if (!args) return this.views[name];

    if (args.isLoblawView) {
      this.views[name] = args;
    } else {
      this.views[name] = Loblaw.View.extend(args);
    }

    return this.views[name];
  };

  Module.prototype.model = function buildLawblawModel(name, args) {
    if (!args) return this.models[name];

    if (args.isLoblawModel) {
      this.models[name] = args;
    } else {
      this.models[name] = Loblaw.Model.extend(args);
    }

    return this.models[name];
  }


  Loblaw.View = Backbone.View.extend({});
  Loblaw.View.isLoblawView = true;

  Loblaw.Model = Backbone.Model.extend({});
  Loblaw.Model.isLoblawModel = true;

  window.Loblaw = Loblaw;
})();