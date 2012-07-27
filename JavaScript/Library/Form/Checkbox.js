var Core = require('Core');
var Class = Core.Class;
var Options = Core.Options;
var Browser = Core.Browser;
var Element = Core.Element;

module.exports = new Class({

  Implements: [Class.Singleton, Class.Binds, Options],

  options: {
    selector: 'input[type=checkbox]',
    thumbSelector: '.thumb',
    leftSelector: '.left',
    className: 'checked',
    max: 49
  },

  initialize: function(container, options) {
    this.setOptions(options);

    this.container = container = document.id(container);

    return this.check(container) || this.setup();
  },

  setup: function() {
    var container = this.container;

    this.thumb = container.getElement(this.options.thumbSelector);
    this.left = container.getElement(this.options.leftSelector);
    this.element = container.getElement(this.options.selector);
    this.element.store(':checkbox', this);

    this.update();

    this.attach();
  },

  attach: function() {
    this.container.addEvents({
      touchstart: this.bound('touchstart'),
      touchmove: this.bound('touchmove'),
      touchend: this.bound('touchend'),
      touchcancel: this.bound('touchcancel')
    });

    this.element.addEvent('change', this.bound('preventDefault'));
  },

  detach: function() {
    this.container.removeEvents({
      touchstart: this.bound('touchstart'),
      touchmove: this.bound('touchmove'),
      touchend: this.bound('touchend'),
      touchcancel: this.bound('touchcancel')
    });

    this.element.removeEvent('change', this.bound('preventDefault'));
  },

  isChecked: function() {
    return this.element.get('checked');
  },

  update: function() {
    var checked = this.isChecked();

    this.container[(checked ? 'add' : 'remove') + 'Class'](this.options.className);
    this.updateStyle(checked ? this.options.max : 0);
  },

  updateStyle: function(delta) {
    delta = Math.max(0, Math.min(delta || 0, this.options.max));
    var style = this.thumb.style;
    style.webkitTransform = style.transform = 'translate3d(' + delta + 'px, 0, 0)';

    delta = (this.options.max - delta);
    this.left.style.right = delta + 13 + 'px';
  },

  preventDefault: function(event) {
    if (event) event.preventDefault();
  },

  touchstart: function(event) {
    this.start = event.page.x;
    if (this.isChecked()) this.start -= this.options.max;

    this.delta = 0;
  },

  touchmove: function(event) {
    event.preventDefault();

    this.thumb.addClass('immediate');
    this.left.addClass('immediate');
    this.moved = true;

    this.delta = event.page.x - this.start;
    this.updateStyle(this.delta);
  },

  touchend: function() {
    var checked = this.delta > (this.options.max / 2);
    if (!this.moved) checked = !this.isChecked();
    this.end(checked);
  },

  touchcancel: function() {
    this.end(this.isChecked());
  },

  end: function(checked) {
    this.thumb.removeClass('immediate');
    this.left.removeClass('immediate');
    this.moved = false;

    (function() {
      this.element.set('checked', checked);
      // iOS doesn't fire the change event when setting the checked attribute manually.
      if (Browser.Platform.ios) this.element.fireEvent('change');
      this.update();
    }).delay(10, this);
  }

});

Element.Properties.checked = {

  set: function(value) {
    this.setProperty('checked', value);
    var instance = this.retrieve(':checkbox');
    if (instance) instance.update();
  }

};
