(function() {

var storage = this.localStorage;

var erase = function(key){
  storage.removeItem(key);
  return this;
}.overloadGetter();

this.LocalStorage = {

  set: function(key, value){
    storage.setItem(key, JSON.stringify(value));
    return this;
  }.overloadSetter(),

  get: function(key){
    return JSON.parse(storage.getItem(key));
  }.overloadGetter(),

  erase: function(){
    erase.apply(this, arguments);
    return this;
  },

  clear: function() {
    localStorage.clear();
  }

};

})();