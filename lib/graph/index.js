
var tea = require('tea')
  , drip = require('drip');

var Hash = require('../hash')
  , Schema = require('../schema')
  , Model = require('../model');

module.exports = Graph;

function Graph (options) {
  var self = this;
  
  drip.call(this);
  
  options = options || {};
  
  this._flags = new Hash();
  this._models = new Hash();
  this._objects = new Hash();
  
  this.store = options.store || this.store || null;
  
  this.__defineGetter__('types', function () {
    return self._models.keys();
  });
  
  this.__defineGetter__('count', function () {
    return self._objects.length;
  });
  
  this.initialize(options);
}

tea.merge(Graph.prototype, drip.prototype);

Graph.extend = tea.extend;

Graph.toString = function () {
  return '[object Graph]';
};

// public initilize function
Graph.prototype.initialize = function () {};

Graph.prototype.flag = function (key, value) {
  if ('undefined' === typeof value || null === value) {
    return this._flags.get(key);
  } else {
    if (!Array.isArray(key))
      key = [ key ];
    
    key.forEach(function (elem) {
      this._flags.set(elem, value);
      this.emit('flag:' + elem, value);
    }, this);
    
    return value;
  }
};

Graph.prototype.define = function (type, object) {
  if (!tea.isString(type) && !object) {
    object = type;
    type = object.type || null;
  }
  
  if (tea.isType(object, 'model')) {
    if (!type && object.type != 'model') {
      type = object.type;
    } else if (!type && object.type == 'model') {
      throw new Error('Graph#define - invalid type from model');
    }
    
    this._models.set(type, object);
  } else if (object instanceof Schema) {
    this._models.set(type, Model.extend(type, { schema: object }));
  } else if (!tea.isFunction(object) && tea.isObject(object)) {
    this._models.set(type, Model.extend(type, { schema: new Schema(object) }));
  } else {
    throw new Error('Seed#Graph - Unable to define type [' + type + '] from object: ' + object.toString()); 
  }
};

Graph.prototype.set = function (address, attributes) {
  var type = address.split('/')[1]
    , id = address.split('/')[2]
    , model = this._models.get(type)
    , isnew = true;
  
  attributes = attributes || {};
  
  if (!model)
    throw new Error('Type [' + type + '] not defined for Seed#Graph');
  
  if (!id)
    throw new Error('No id for Seed#Graph of type [' + type + ']');
  
  attributes.id = id;
  
  var object = this._objects.get(address);
  
  if (!object) {
    object = new model(attributes, { parent: this });
  } else {
    object.set(attributes);
    isnew = false;
  }
  
  this._objects.set(address, object);
  
  object.flag('dirty', true);
  this.emit(((isnew) ? 'add:' : 'change:') + type + ':' + address, object);
  this.emit('dirty:' + type + ':' + address, object);
  
  return object;
};

Graph.prototype.get = function (address) {
  return this._objects.get(address);
};

Graph.prototype.del = function (address) {
  this._objects.del(address);
  return;
};

Graph.prototype.push = function (opts, callback) {
  if (!this.store) throw new Error('Can\'t fetch without a storage definition');
  
  var self = this
    , count = 0
    , ret_err = null;
  
  if (opts && tea.isFunction(opts)) {
    callback = opts;
    opts = {};
  }
  
  if (!tea.isFunction(callback))
    callback = function () {};
  
  opts = opts || {};
  
  var after = function (err) {
    count++;
    if (err && ret_err === null)
      ret_err = err;
    if (count == self.count) {
      //self._refreshLookups();
      callback.call(self, ret_err);
    }
  };
  
  this.each(function (model) {
    model.save.call(model, opts, after);
  });
};

Graph.prototype.pull = function (opts, callback) {
  if (!this.store) throw new Error('Can\'t fetch without a storage definition');
  
  var self = this
    , count = 0
    , ret_err = null;
  
  if (opts && tea.isFunction(opts)) {
    callback = opts;
    opts = {};
  }
  
  if (!tea.isFunction(callback))
    callback = function () {};
  
  opts = opts || {};
  
  var after = function (err) {
    count++;
    if (err && ret_err === null)
      ret_err = err;
    if (count == self.count) {
      //self._refreshLookups();
      callback.call(self, ret_err);
    }
  };
  
  this.each(function (model) {
    model.fetch.call(model, opts, after);
  });
};

Graph.prototype.fetch = function (type, query, callback) {
  if (this._models.count === 0) throw new Error('Can\'t fetch without a model definition');
  if (!this.store) throw new Error('Can\'t fetch without a storage definition');
  
  var self = this
    , store = this.store;
  
  if (query && tea.isFunction(query)) {
    callback = query;
    query = {};
  }
  
  if (!tea.isFunction(callback))
    callback = function () {};
  
  query = query || {};
  
  var success = function (data) {
    data.forEach(function(attrs) {
      self.set('/' + type + '/' + attrs.id, attrs);
    });
    
    callback.call(self, null);
  };
  
  var failure = function (err) {
    callback.call(self, err);
  };
  
  var sync = store.sync('fetch', { type: type }, query);
  sync.then(success, failure);
};

Graph.prototype.each = function (type, iterator, context) {
  if (tea.isFunction(type)) {
    context = iterator;
    iterator = type;
    type = null;
  }
  
  context = context || null;
  
  if (type) {
    var models = this._objects.select(function (model) {
      return model.type == type;
    });
    
    models.each(iterator, context);
  } else {
    this._objects.each(iterator, context);
  }
};

Graph.prototype.all = function (type) {
  if (type) {
    var models = this._objects.select(function (model) {
      return model.type == type;
    });
    
    return models;
  } else {
    return this._objects.clone();
  }
};