
var litmon = (function() {
  
  function createStoreLSKey(storeName) {
    return '_lm#s#' + storeName;
  };
  function createEntryLSKey(storeName, entryID) {
    return '_lm#e#' + entryID + '@' + storeName;
  };
  function createEntryLSKeyRegex(storeName) {
    return new RegExp('^_lm#e#(\\d+)@' + storeName);
  };
  
  
  
  /**
   * @class Base class for localStorage storable classes.
   */
  function StorableObj() {
    this.lsKey = null;
  };
  /**
   * Save entry to local storage.
   */
  StorableObj.prototype.save = function() {
    if (this.lsKey)
      localStorage.setItem(this.lsKey, this.json());
    else
    {
      this.genLocalStorageKey();
      if (this.lsKey)
        localStorage.setItem(this.lsKey, this.json());
    }
  };
  /**
   * Remove entry from local storage.
   */
  StorableObj.prototype.destroy = function() {
    if (this.lsKey)
      localStorage.remove(this.lsKey);
    else
    {
      this.genLocalStorageKey();
      if (this.lsKey)
        localStorage.remove(this.lsKey);
    }
  };
  /**
   * JSON string of data to be saved.
   * @note Not all data is needed to save. So override this function
   *   to only save certain data.
   */
  StorableObj.prototype.json = function() {
    return JSON.stringify(this);
  };
  /**
   * To be overridden.
   */
  StorableObj.prototype.genLocalStorageKey = function() {
  };

 

  /**
   *
   */
  function Store(name) {
    StorableObj.call(this);

    this.name = name;
    this.keyEntryMapping = {};
    // Other properties will be initialized in init()
  };
  Store.prototype = new StorableObj();
  Store.prototype.constructor = Store;
  Store.prototype.genLocalStorageKey = function() {
    if (this.name) {
      this.lsKey = storeLSKeyPrefix + this.name;
      return this.lsKey;
    }
    return null;
  };
  Store.prototype.init() {
    this.genLocalStorageKey();
    var val = localStorage.getItem(this.lsKey);
    if (val == 'null' || val == 'undefined')
      this.create();
    else
      this.loadFromLocalStorage(val);
  };
  Store.prototype.create() {
    this.size = 0;
    this.type = 'str';
    this.nextSlot = 0;
    this.recycledSlots = [];
  };
  Store.prototype.loadFromLocalStorage(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (data.type != 'str')
      throw "Store type doesn't match!"; 
    
    this.size = data.size;
    this.type = 'str';
    this.nextSlot = data.nextSlot;
    this.recycledSlots = data.recycledSlots;
    
    var entryKeyPat = createEntryLSKeyRegex(this.name);
    var entryJsonStr = null;
    var entry = null;
    for (each in localStorage) {
      if (each.match(entryKeyPat)) {
        entryJsonStr = localStorage.getItem(each);
        if (entryJsonStr != 'null' || entryJsonStr != 'undefined') {
          entry = JSON.parse(entryJsonStr);
          this.keyEntryMapping[entry.key] = entry.eid;
        }
      }
    }
  };
  Store.prototype.put(key, val) {
    var entry = this.getEntry_(key);
    if (entry) {// entry exists
      entry.value = val;
    } else {
      var eid = 0;
      if (this.recycleSlots.length > 0)
        eid = this.recycleSlots.shift();
      else {
        eid = this.nextSlot;
        ++ this.nextSlot;
      }
      entry = { 'eid': eid, 'key': key, 'value': val };
      ++ this.size;
    }
    var entryLSKey = createEntryLSKey(this.name, entry.eid));
    localStorage.setItem(entryLSKey, JSON.stringify(entry));
  };
  Store.prototype.get(key) {
    var entry = this.getEntry_(key);
    return entry ? entry.value : null;
  };
  Store.prototype.remove(key) {
    if (this.keyEntryMapping.hasOwnProperty(key)) {
      var eid = this.keyEntryMapping[key];
      localStorage.removeItem(
        createEntryLSKey(this.name, eid));
      this.recycledSlots.push(eid); // Recycle the entry id
      delete this.keyEntryMapping[key];
    }
  };
  Store.prototype.getEntry_(key) {
    if (this.keyEntryMapping.hasOwnProperty(key)) {
      var entryJsonStr = localStorage.getItem(
        createEntryLSKey(this.name, this.keyEntryMapping[key]));
      if (entryJsonStr != 'null' || entryJsonStr != 'undefined') {
        var entry = JSON.parse(entryJsonStr);
        if (entry.key != key)
          throw "Key not matched.";
        return entry;
      }
    }
    return null;
  };

  
  
  function ObjStore() {
    Store.call(this);
    this.type = 'obj';
  };
  ObjStore.prototype = new Store();
  ObjStore.prototype.constructor = ObjStore;

  
  
  
  
  function openStore_(storeName) {
    
  };
  
  
  return {

    openStore: openStore_,

  };

})();
