// litmon - a wrapper of localStorage, with not many functionalities
// Usages:
// + litmon
// - Create an objects store: var store = litmon.openStore(storeName, keyField)
// - Open an existing objects store: var store = litmon.openStore(storeName)
//
// + Store 
// - Put (add or update) an object: store.put(obj)
// - Get an object: var obj = store.get(key)
// - Get an object and install prototype: var obj = store.get(key, proto)
// - Delete an object: store.del(key)
// - Clear: clear all entries
// - Destroy: clear all entries and destroy store completely

var litmon = (function () {
  "use strict";

  /**
   * @class Base class for localStorage storable classes.
   */
  function LSObj() {
    this.lsKey = null;
  }
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
   * class Store
   */
  function Store(name, keyField) {
    LSObj.call(this);

    this.name = name;
    this.keyField = keyField ? keyField : null;
  }
  Store.prototype = new LSObj();
  Store.prototype.constructor = Store;
  Store.prototype.put = function(obj) {
    if (!obj.hasOwnProperty(this.keyField)) {
      return false;
    }
    var entryKey = obj[this.keyField];
    var entryLSKey = storeGenLocalStorageKeyForEntry(this, entryKey);
    this.data[entryKey] = entryLSKey;
    window.localStorage.setItem(entryLSKey, JSON.stringify(obj));
    return true;
  };
  Store.prototype.del = function(key) {
    // Try cached mapping first
    var foundInMapping = true;
    var entryLSKey = this.data[key];
    // If not found, generate lsKey on the fly
    if (!entryLSKey) {
      entryLSKey = storeGenLocalStorageKeyForEntry(this, key);
      foundInMapping = false;
    }
    window.localStorage.removeItem(entryLSKey);
    if (foundInMapping) {
      delete this.data[key]; // Update mapping
    }
  };
  Store.prototype.get = function(key, proto) {
    // Try cached mapping first
    var foundInMapping = true;
    var entryLSKey = this.data[key];
    // If not found, generate lsKey on the fly
    if (!entryLSKey) {
      entryLSKey = storeGenLocalStorageKeyForEntry(this, key);
      foundInMapping = false;
    }
    // Retrieve obj from localStorage
    var obj = LSObj.retrieve(this.data[key], proto);
    if (obj) {
      if (!foundInMapping)
        this.data[key] = entryLSKey;
      return obj;
    }
    if (foundInMapping) {
      delete this.data[key]; // Update mapping
    }
    return null;
  };
  //Store.prototype.filter = function(criteria) {
  //};
  Store.prototype.clear = function() {
    var pat = storeGenLocalStorageKeyPatternForEntry(this),
      each;
    for (each in window.localStorage) {
      if (each.match(pat))
        window.localStorage.removeItem(each);
    }
    this.type = 'obj';
    this.data = {};
  };
  Store.prototype.destroy = function() {
    this.clear();
    console.log("All entries cleared.")
    LSObj.prototype.destroy.call(this);
    console.log("localStorage cleared.")
  };
  Store.prototype.json = function() {
    return JSON.stringify({
      name: this.name,
      type: this.type,
      keyField: this.keyField
    });
  };
  //
  // Store's "private" methods
  //
  function storeGenLocalStorageKey(self) {
    if (self.name) {
      self.lsKey = '_lm#s#' + self.name;
      return self.lsKey;
    }
    return null;
  };
  function storeGenLocalStorageKeyForEntry(self, entryKey) {
    return storeGenLocalStorageKey(self) + '#' + entryKey;
  };
  function storeGenLocalStorageKeyPatternForEntry(self) {
    return new RegExp('^_lm#s#' + self.name + '#');
  };
  /**
   * Initialize store.
   */
  function storeInit(self) {
    // Check if store exists or not
    storeGenLocalStorageKey(self);
    var data = LSObj.retrieve(self.lsKey);
    if (data) {
      storeLoad(self, data);
    } else {
      storeCreate(self);
    }
  };
  function storeCreate(self) {
    if (!self.keyField) {
      throw "Must provide keyField to create store.";
    }
    self.type = 'obj';
    self.data = {};
    self.save();
  };
  /**
   * Initialize store from localStorage.
   */
  function storeLoad(self, data) {
    if (data.type != 'obj') {
      throw "Store type doesn't match: " + data.type + '. Expected: obj';
    }
    
    if (self.keyField && self.keyField != data.keyField) {
      throw "Store with same name '" + self.name + "' but different keyField already exists.";
    }
    
    // Load store attributes
    self.type = 'obj';
    self.keyField = data.keyField;
    self.data = {}; // key and lsKey mapping
    
    // Load entries
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
    }
  };
  
  
  
  function openStore_(storeName, keyField) {
    var store = new Store(storeName, keyField);
    storeInit(store);
    return store;
  };
  
  return {
    openStore: openStore_
  };
})();

// TODO:
// Move store attributes out of Store class, use a hidden "manager" to manage
// all stores' attributes.
//


