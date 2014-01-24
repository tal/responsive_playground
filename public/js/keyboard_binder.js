(function($) {
  'use strict';

  function flipWithArray(obj) {
    var newObj = {}, key, val;

    for (key in obj) {
      val = obj[key];
      if (!(val in newObj)) newObj[val] = [];
      newObj[val].push(key);
    }

    return newObj;
  }


  var actionKeys = {
    '8' : '<backspace>',
    '9' : '<tab>',
    '13': '<return>',
    '16': '<shift>',
    '17': '<ctrl>',
    '18': '<alt>',
    '20': '<caps>',
    '27': '<esc>',
    '32': '<space>',
    '37': '<left>',
    '38': '<up>',
    '39': '<right>',
    '40': '<down>',
    '46': '<delete>',
    '91': '<leftMeta>',
    '93': '<rightMeta>'
  };

  var actionChars = flipWithArray(actionKeys);

  // Make either meta key work as <meta>
  actionChars['<meta>'] = ['91','93'];
  // Allow backspace to work as well for <delete>
  actionChars['<delete>'].push('8');
  actionChars['<backspace>'].push('46');

  var manualKeyCodes = {
    '192': '`~',
    '49' : '1!',
    '50' : '2@',
    '51' : '3#',
    '52' : '4$',
    '53' : '5%',
    '54' : '6^',
    '55' : '7&',
    '56' : '8*',
    '57' : '9(',
    '48' : '0)',
    '189': '-_',
    '187': '=+',
    '219': '[{',
    '221': ']}',
    '220': '\\|',
    '186': ';:',
    '222': '\'"',
    '188': ',<',
    '190': '.>',
    '191': '/?'
  };

  var manualKeyChars = {},
      shiftedManualKeyChars = {};

  (function() {
    var code, chars;

    for (code in manualKeyCodes) {
      chars = manualKeyCodes[code];

      manualKeyChars[chars[0]] = code;
      shiftedManualKeyChars[chars[1]] = code;
    }
  })();

  function processEvent(ev) {
    this.event = ev;
    this.which = ev.which;
    this.type  = ev.type;

    this.target        = ev.target;
    this.currentTarget = ev.currentTarget;
    this.altKey        = ev.altKey;
    this.ctrlKey       = ev.ctrlKey;
    this.metaKey       = ev.metaKey;
    this.shiftKey      = ev.shiftKey;

    if (ev.char) {
      this.char = ev.char;
      this.rawChar = ev.rawChar;
      this.event = ev.event;
    } else if (ev.type === 'keypress') {
      this.char = String.fromCharCode(this.which);
    }
    else if (this.which in actionKeys) {
      this.char = actionKeys[this.which];
      this.rawChar = this.char;
    }
    else if (this.which in manualKeyCodes) {
      this.char    = manualKeyCodes[this.which][ev.shiftKey ? 1 : 0];
      this.rawChar = manualKeyCodes[this.which][1];
    }
    else if (this.which >= 48 && this.which <= 57) {
        var num = this.which;
        if (ev.shiftKey) num += 12;
        this.char = String.fromCharCode(num);
        this.rawChar = String.fromCharCode(this.which);
    }
    else if (this.which >= 65, this.which <= 90) {
        var num = this.which;
        if (!ev.shiftKey) num += 32;
        this.char = String.fromCharCode(num);
        this.rawChar = String.fromCharCode(this.which);
    }
  }

  function KeyBinder(el) {
    this.el = el;

    this._handlers = {};
    this.disallowedCharacters = {};
    this._transformCharacters = {};

    this.hasValue = ('value' in el);

    el.addEventListener('keyup', this._handleKeyUp.bind(this));
    el.addEventListener('keydown', this._handleKeyDown.bind(this));
    el.addEventListener('keypress', this._handleKeyPress.bind(this));
  }

  var bodyKeyBind;
  KeyBinder.body = function() {
    if (!bodyKeyBind) bodyKeyBind = new KeyBinder(document.body);

    return bodyKeyBind;
  }

  KeyBinder.prototype._handleKeyDown = function(ev) {
    if (this.hasValue) {
      this._trackValue = this.el.value;
      this._trackValueEv = ev;
    }
  };

  KeyBinder.prototype._handleKeyUp = function(ev) {
    if (this._trackValue != null) {

      if (this._trackValue !== this.el.value) {
        var ccEv = new ContentChangeEvent({
          newValue: this.el.value,
          oldValue: this._trackValue,
          keyDown: this._trackValueEv,
          keyUp: ev
        });

        this.fireHandlers('contentChange', [ccEv]);
      }

      this._trackValue = null;
      this._trackValueEv = null;
    }
  };

  KeyBinder.prototype._handleKeyPress = function(ev) {
    var kbEv = new KeyBinderEvent(ev);

    if (kbEv.char in this.disallowedCharacters) {
      var cbs = this.disallowedCharacters[kbEv.char], cb;

      ev.preventDefault();

      for (var i = cbs.length - 1; i >= 0; i--) {
        cb = cbs[i]
        if (cb && typeof cb === 'function') cb(kbEv);
      };
    }

    if (kbEv.char in this._transformCharacters) {
      ev.preventDefault();

      var transform = this._transformCharacters[kbEv.char];

      this.el.value += transform.char;

      if (transform.cb) {
        var tEv = new ContentTransformedEvent(kbEv);

        tEv.fromChar = kbEv.char;
        tEv.toChar = transform.char;

        transform.cb(tEv);
      }
    }
  };

  KeyBinder.prototype.fireHandlers = function(handler, args) {
    this._handlers[handler] || (this._handlers[handler] = []);

    for (var i = this._handlers[handler].length - 1; i >= 0; i--) {
      this._handlers[handler][i].apply(null, args);
    };
  };

  KeyBinder.prototype.bindHandler = function(handler, cb) {
    this._handlers[handler] || (this._handlers[handler] = []);

    this._handlers[handler].push(cb);
  };

  KeyBinder.prototype.contentChange = function(cb) {
    this.bindHandler('contentChange', cb);
  };

  KeyBinder.prototype.disallowCharacters = function(chars, cb) {
    var char;

    for (var i = chars.length - 1; i >= 0; i--) {
      char = chars[i];
      if (!(char in this.disallowedCharacters)) this.disallowedCharacters[char] = [];
      if (cb) this.disallowedCharacters[char].push(cb);
    };
  };

  KeyBinder.prototype.transformCharacters = function(source, dest, cb) {
    var from, to;

    for (var i = source.length - 1; i >= 0; i--) {
      from = source[i];
      to = dest[i]

      this._transformCharacters[from] = {
        char: to,
        cb: cb
      };
    };
  };

  function KeyBinderEvent(ev) {
    processEvent.call(this, ev);
  }

  function ContentChangeEvent(opts) {
    processEvent.call(this, opts.keyUp);

    for (var key in opts) this[key] = opts[key];

    this.value = this.newValue;
  }

  function ContentTransformedEvent(ev) {
    processEvent.call(this, ev);
  }

  var modifiers = ['shift','alt','ctrl','meta'];
  function Hotkey(chars, cb) {
    var modifier;
    for (var i = modifiers.length - 1; i >= 0; i--) {
      modifier = modifiers[i];

      this[modifier] = !!chars.match('<'+modifier+'>');
      chars = chars.replace('<'+modifier+'>', '');
    };

    this.key = chars;

    if (this.key.length !== 1) {
      throw('hotkey only supports modifiers and a single key');
    }

    this.cb = cb;

    this.checkEvent = this.checkEvent.bind(this);
  }

  Hotkey.prototype.checkEvent = function(ev) {
    var modifier,
        test = true;

    for (var i = modifiers.length - 1; i >= 0; i--) {
      modifier = modifiers[i];

      if (ev[modifier+'Key'] !== this[modifier]) {
        test = false;
      }
    }

    if (test) {
      test = (ev.rawChar === this.key.toUpperCase());
    }

    if (test) {
      this.cb(ev);
    }
  };

  function Typed(str, delay, cb) {
  }


  window.KeyBinder = KeyBinder;

})(jQuery);
