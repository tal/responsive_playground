(function() {
  'use strict';

  window.app = new Loblaw();

  app.module('test', function(test) {

    test.view('test', {
      initialize: function() {
      },
      events: {'click': '__test'},
      __test: function() {
        console.log('click test');
      }
    });


    var UserModel = Loblaw.Model.extend({
      initialize: function() {console.log('init user')}
    });
    test.model('user', UserModel);
    test.model('test', {
      initialize: function() {console.log('init test')}
    });

  });

  app.view('test.user', function(test) {
    var TestUser = Loblaw.Model.extend({});

    return TestUser;
  });

  app.init();

  // app.test.views.user === TestUser #=> true
})();
