var tea = require('tea')
  , drip = require('drip');

var comparator = require('./comparator');

module.exports = Hash;

function Hash (values) {
  drip.call(this);
  
  var self = this;
  
  this._data = {};
  
  for (var key in values) {
    self.set(key, values[key], true);
  }
}

tea.merge(Hash.prototype, drip.prototype);

Hash.prototype.initialize = function () {};

Hash.prototype.__defineGetter__('length', function () {
  var arr = this.toArray();
  return arr.length;
});

Hash.prototype.__defineGetter__('sum', function() {
  var sum = 0;
  
  this.each(function (value) {
    if (tea.isNumber(value))
      sum+= value;
  });
  
  return sum;
});

Hash.prototype.__defineGetter__('avg', function () {
  var count = 0
    , sum = 0;
  
  this.each(function (value) {
    if (tea.isNumber(value)) {
      count++;
      sum+= value;
    }
  });
  
  return (sum / count) ? (sum / count) : 0;
});

Hash.prototype.__defineGetter__('min', function () {
  var hash = this.clone();
  
  hash.each(function (value, key) {
    if (!tea.isNumber(value))
      hash.del(key, true);
  });
  
  return hash.sort(comparator.ASC).at(0);
});

Hash.prototype.__defineGetter__('max', function () {
  var hash = this.clone();
  
  hash.each(function (value, key) {
    if (!tea.isNumber(value))
      hash.del(key, true);
  });
  
  return hash.sort(comparator.DESC).at(0);
});

Hash.prototype.__defineGetter__('keys', function () {  
  return Object.keys(this._data);
});

Hash.prototype.__defineGetter__('values', function () {
  var vals = [];
  
  this.each(function(value) {
    vals.push(value);
  });
  
  return vals;
});

Hash.prototype.validate = function () {
  return true;
};

Hash.prototype.get = function (key) {
  return this._data[key];
};

Hash.prototype.set = function (key, value, silent) {
  var obj = {};

  obj[key] = value;
  this._data[key] = value;
  
  if (!silent) {
    this.emit('set', key);
    this.emit('set:' + key);
  }
};

Hash.prototype.del = function (key, silent) {
  if (this._data[key])
    delete this._data[key];
  
  if (!silent) {
    this.emit('delete', key);
    this.emit('delete:' + key);
  }
};

Hash.prototype.clone = function () {
  var hash = new Hash();
  tea.merge(hash._data, this._data);
  return hash;
};

Hash.prototype.at = function (index) {
  var key = this.keys()[index];
  return this._data[key];
};

Hash.prototype.index = function (key) {
  var keys = this.keys();
  return keys.indexOf(key);
};

Hash.prototype.each = function (iterator, context) {
  var index = 0;
  context = context || null;
  
  for (var key in this._data) {
    iterator.call(context, this._data[key], key, index);
    index++;
  }
};

Hash.prototype.map = function (iterator, context) {
  var hash = tea.merge({}, this._data)
    , context = context || null;
  
  this.each(function(value, key, index) {
    hash[key] = iterator.call(context, hash[key], key);
  });
  
  return new Hash(hash);
};

Hash.prototype.select = function (iterator, context) {
  var self = this
    , hash = new Hash()
    , context = context || null;
  
  this.each(function(value, key, index) {
    if (iterator.call(context, value, key)) 
      hash.set(key, value, true);
  });
  
  return hash;
};

Hash.prototype.sort = function (iterator) {
  var arr = this.toArray().sort(iterator)
    , hash = new Hash();
  
  for (var i in arr) {
    var item = arr[i];
    hash.set(item.key, item.value);
  }
  
  return hash;
};

Hash.prototype.toArray = function () {
  var arr = [];
  
  this.each(function (value, key) {
    var obj = { key: key, value: value };
    arr.push(obj);
  });
  
  return arr;
};

Hash.prototype.toJSON = function () {
  return JSON.stringify(this._data);
};