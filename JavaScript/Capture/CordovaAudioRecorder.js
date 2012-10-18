var Core = require('Core');
var Class = Core.Class;
var Events = Core.Events;
var Options = Core.Options;

var IdleTimer = require('Cordova/IdleTimer');

module.exports = new Class({

  Implements: [Class.Binds, Options, Events],

  extension: 'wav',
  canceled: false,

  initialize: function(filename, options) {
    this.setOptions(options);

    this.filename = filename;
  },

  start: function() {
    window.requestFileSystem(window.LocalFileSystem.PERSISTENT, 0, this.bound('onFileSystemReady'), this.bound('onError'));
  },

  _capture: function() {
    IdleTimer.disable();
    this.fireEvent('start');
    this.media = new window.Media(this.file.fullPath, this.bound('onCaptureSuccess'), this.bound('onCaptureError'));
    this.media.startRecord();

    this.timer = this.update.periodical(1000, this);
  },

  stop: function() {
    IdleTimer.enable();
    clearInterval(this.timer);
    this.media.stopRecord();

    this.fireEvent('cancel');
  },

  cancel: function() {
    this.canceled = true;
    this.stop();
  },

  update: function() {
    this.fireEvent('update');
  },

  onCaptureSuccess: function() {
    var canceled = this.canceled;
    this.canceled = false;
    if (canceled) return;

    this.fireEvent('success', [this.file]);
  },

  onFileSystemReady: function(fileSystem) {
    var options = {
      create: true,
      exclusive: false
    };

    fileSystem.root.getFile(this.getFileName(), options, this.bound('onFileLoadSuccess'), this.bound('onError'));
  },

  onFileLoadSuccess: function(file) {
    this.file = file;
    this._capture();
  },

  onError: function() {
    this.fireEvent('cancel');
    this.fireEvent('error');
    if (this.file) this.file.remove(function() {}, function() {});
  },

  onCaptureError: function() {
    var canceled = this.canceled;
    this.canceled = false;
    if (canceled) return;

    this.fireEvent('cancel');
    this.fireEvent('error');
    this.file.remove(function() {}, function() {});
  },

  getFileName: function() {
    return this.filename + '.' + this.extension;
  }

});
