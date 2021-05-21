/**
 * This file defines some changes to built-in prototypes. DO NOT load this as a module;
 * it needs to load synchronously since it's not directly depended on by anything.
 */

Object.defineProperty(Array.prototype, "last", {
    get: function() {
        return this[this.length - 1];
    }
});