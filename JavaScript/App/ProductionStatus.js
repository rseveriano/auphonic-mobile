var Core = require('Core');
var Class = Core.Class;
var Options = Core.Options;
var Events = Core.Events;

var API = require('API');

var TextProgressIndicator = require('UI/TextProgressIndicator');

var Auphonic = require('Auphonic');

module.exports = new Class({

  Implements: [Options, Events, Class.Binds],

  options: {
    url: null,
    delay: 1000,
    /*onUpdate: function() {},*/
    /*onFinish: function() {}*/
  },

  stopped: false,

  initialize: function(element, options) {
    this.setOptions(options);

    this.element = document.id(element);

    this.progress = new TextProgressIndicator(this.element);
    this.progress.start();
  },

  stop: function() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.progress.stop();
    return this;
  },

  check: function(production) {
    this.production = production;
    var url = this.options.url.substitute(production);
    API.invalidate(url); // prevent caching
    API.call(url).on({
      success: this.bound('update'),
      error: this.bound('error')
    });

    return this;
  },

  update: function(response) {
    // If the updater was stopped during a request, cancel it now
    if (this.stopped) {
      this.stopped = false;
      return;
    }

    // Check for an inconsistent state and stop if no production was received ever.
    if (response && response.data) this.production = response.data;
    if (!this.production) {
      this.stop();
      return;
    }

    var production = this.production;
    this.fireEvent('update', [production]);
    // change_allowed means processing has finished
    if (production.change_allowed) {
      this.stop();
      this.fireEvent('finish', [production]);
      return;
    }

    this.progress.updateText(Auphonic.getStatusString(production.status));
    this.timer = this.check.delay(this.options.delay, this, [production]);

    return this;
  },

  onOnline: function() {
    this.check(this.production);

    window.removeEventListener('online', this.bound('onOnline'), false);
    document.removeEventListener('online', this.bound('onOnline'), false);
  },

  error: function() {
    window.addEventListener('online', this.bound('onOnline'), false);
    document.addEventListener('online', this.bound('onOnline'), false);
  }

});

