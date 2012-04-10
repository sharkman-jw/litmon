var litmon = (function () {
  "use strict";
  var testmode = false; // Enable this for unit tests.
  
  function litmonError(errmsg) {
    return {
      name: "litmon Error", 
      level: "litmon", 
      message: errmsg, 
      htmlMessage: errmsg
    }
  };
  
  function validateAlphanumeric(s) {
    return s.match(/^[A-Za-z0-9_\.]$/) != null;
  };
  
  /**
   * @class Base class for localStorage storable classes.
   */
  function LSObj() {
    this.lsKey = null;
  };
  LSObj.retrieve = function (lsKey, proto) {
    var val = window.localStorage.getItem(lsKey);
    if (val == 'null' || val == 'undefined') {
      return null;
    }
    var obj = JSON.parse(val);
    if (proto) {
      obj.__proto__ = proto;
    }
    return obj;
  };
  /**
   * Save entry to local storage.
   */
  LSObj.prototype.save = function() {
    if (this.lsKey) {
      window.localStorage.setItem(this.lsKey, this.json());
    }
  };
  /**
   * Remove entry from local storage.
   */
  LSObj.prototype.destroy = function() {
    if (this.lsKey) {
      window.localStorage.removeItem(this.lsKey);
      this.lsKey = null;
    }
  };
  /**
   * JSON string of data to be saved.
   * @note Not all data is needed to save. So override this function
   *   to only save certain data.
   */
  LSObj.prototype.json = function() {
    return JSON.stringify(this);
  };
  
  
  
  /**
   * class StoreCore
   */
  function StoreCore(name, keyField, type) {
    if (!validateAlphanumeric(name)) {
      throw litmonError("Only alphanumerics, '_', '.', and spaces are allowed in store names");
    }
    this.name = name;
    this.keyField = keyField ? keyField : null;
    // The following will be set during init
    //this.type = type ? type : 'obj';
    //this.cached = {}; // Cached key - 
  }
  StoreCore.prototype = new LSObj();
  StoreCore.prototype.constructor = StoreCore;
  StoreCore.prototype.put = function(obj) {
    if (!obj.hasOwnProperty(this.keyField)) {
      return false; // Skip if input obj doesn't have key field
    }
    var entryKey = obj[this.keyField];
    var entryLSKey = storeCore_makeLSKeyForEntry(this, entryKey);
    this.cached[entryKey] = entryLSKey;
    window.localStorage.setItem(entryLSKey, JSON.stringify(obj));
    return true;
  };
  StoreCore.prototype.del = function(key) {
    // Try to retrieve lsKey from cached mapping
    var found = true;
    var entryLSKey = this.cached[key];
    if (!entryLSKey) { // Not found, make the lsKey on the fly
      entryLSKey = storeCore_makeLSKeyForEntry(this, key);
      found = false;
    }
    window.localStorage.removeItem(entryLSKey);
    if (found) {
      delete this.cached[key]; // Update cached data
    }
  };
  StoreCore.prototype.get = function(key, proto) {
    // Try to retrieve lsKey from cached mapping
    var found = true;
    var entryLSKey = this.cached[key];
    if (!entryLSKey) { // Not found, make the lsKey on the fly
      entryLSKey = storeCore_makeLSKeyForEntry(this, key);
      found = false;
    }
    // Retrieve obj from localStorage
    var obj = LSObj.retrieve(entryLSKey, proto);
    if (obj) { // Got entry
      if (!found) { // But not found in mapping
        this.cached[key] = entryLSKey; // Update mapping
      }
    } else if (found) { // No such entry, but found in mapping
      delete this.cached[key]; // Remove bad key - lsKey mapping
    }
    return obj;
  };
  //Store.prototype.filter = function(criteria) {
  // TODO
  //};
  StoreCore.prototype.clear = function() {
    var pat = storeCore_makeLSKeyPatternForEntry(this);
    var each;
    for (each in window.localStorage) {
      if (each.match(pat)) {
        window.localStorage.removeItem(each);
      }
    }
    this.type = 'obj';
    this.cached = {};
  };
  StoreCore.prototype.destroy = function() {
    this.clear();
    LSObj.prototype.destroy.call(this);
    this.name = null;
  };
  StoreCore.prototype.json = function() {
    return JSON.stringify({
      name: this.name,
      keyField: this.keyField,
      type: this.type
    });
  };
  //
  // StoreCore's "private" methods
  //
  function storeCore_makeLSKey(self) {
    if (self.name) {
      self.lsKey = '_lm#s#' + self.name;
      return self.lsKey;
    }
    return null;
  };
  function storeCore_makeLSKeyForEntry(self, entryKey) {
    return storeCore_makeLSKey(self) + '#' + entryKey;
  };
  function storeCore_makeLSKeyPatternForEntry(self) {
    return new RegExp('^_lm#s#' + self.name + '#');
  };
  function storeCore_init(self) {
    storeCore_makeLSKey(self);
    var obj = LSObj.retrieve(self.lsKey);
    if (obj) { // Opening existing store
      storeCore_load(self, obj);
    } else { // Create new store
      storeCore_create(self);
    }
  };
  function storeCore_create(self) {
    if (!self.keyField) {
      throw "Must provide keyField to create store.";
    }
    self.type = 'obj';
    self.cached = {};
    self.save();
  };
  function storeCore_load(self, data) {
    if (data.type != 'obj') {
      throw "Store with same name '" + self.name + "' but different data type already exists.";
    }
    if (self.keyField && self.keyField != data.keyField) {
      throw "Store with same name '" + self.name + "' but different keyField already exists.";
    }
    
    // Load store attributes
    self.type = 'obj';
    self.keyField = data.keyField;
    self.cached = {}; // key and lsKey mapping
    
    // Load entries
    /* To improve init performace, we don't preload all existing entries
    var pat = storeGenLocalStorageKeyPatternForEntry(self),
      obj, each;
    for (each in window.localStorage) {
      if (each.match(pat)) {
        obj = LSObj.retrieve(each);
        if (obj && obj.hasOwnProperty(self.keyField)) {
          self.data[obj[self.keyField]] = each;
        }
        else {
          window.localStorage.removeItem(each);
        }
      }
    }*/
  };
  
  var openedStores = {};

  /**
   * class Store: an accessor to StoreCore
   */
  function Store(name, keyField) {
    this.name = name;
    var store = openedStores[name];
    if (store) { // Store already opened
      if (keyField && keyField != store.keyField) {
        throw "Store with same name '" + store.name + "' but different keyField already exists.";
      }
    } else { // Store not open
      store = new StoreCore(name, keyField);
      storeCore_init(store);
      openedStores[name] = store;
    }
  }
  Store.prototype.put = function(obj) {
    var store = openedStores[this.name];
    if (store) {
      return store.put(obj);
    } else {
      throw 'Store not exists anymore';
    }
  };
  Store.prototype.del = function(key) {
    var store = openedStores[this.name];
    if (store) {
      store.del(key);
    } else {
      throw 'Store not exists anymore';
    }
  };
  Store.prototype.get = function(key, proto) {
    var store = openedStores[this.name];
    if (store) {
      return store.get(key, proto);
    } else {
      throw 'Store not exists anymore';
    }
  };
  Store.prototype.clear = function() {
    var store = openedStores[this.name];
    if (store) {
      store.clear();
    } else {
      throw 'Store not exists anymore';
    }
  };
  Store.prototype.destroy = function() {
    var store = openedStores[this.name];
    if (store) {
      store.destroy();
      delete openedStores[this.name];
    }
  };
  
  
  
  function openStore_(storeName, keyField) {
    return new Store(storeName, keyField);
  };
  
  if (testmode) {
    return {
      openStore: openStore_,
      stores: openedStores
    };
  }
  
  return {
    openStore: openStore_,
    
    LSObject: LSObj
  };
})();

// TODO:
// Runtime store
// Str store
