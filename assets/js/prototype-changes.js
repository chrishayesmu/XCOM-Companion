/**
 * This file defines some changes to built-in prototypes. DO NOT load this as a module;
 * it needs to load synchronously since it's not directly depended on by anything.
 */

Object.defineProperty(Array.prototype, "last", {
    get: function() {
        return this[this.length - 1];
    }
});

Object.defineProperty(Math, "roundTo", {
    value: function(val, numPlaces) {
        const powerOfTen = Math.pow(10, numPlaces);
        return (Math.ceil(val * powerOfTen) / powerOfTen).toFixed(numPlaces);
    }
});