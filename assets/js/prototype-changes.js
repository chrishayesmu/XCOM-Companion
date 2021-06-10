/**
 * This file defines some changes to built-in prototypes. DO NOT load this as a module;
 * it needs to load synchronously since it's not directly depended on by anything.
 */

Object.defineProperty(Array.prototype, "last", {
    get: function() {
        return this[this.length - 1];
    }
});

Object.defineProperty(Array.prototype, "remove", {
    value: function(item) {
        const index = this.indexOf(item);

        if (index >= 0) {
            this.splice(index, 1);
        }

        return index >= 0;
    }
});

Object.defineProperty(Math, "clamp", {
    value: function(val, min, max) {
        return Math.max(min, Math.min(val, max));
    }
});

Object.defineProperty(Math, "roundTo", {
    value: function(val, numPlaces) {
        const powerOfTen = Math.pow(10, numPlaces);

        // toFixed converts to a string; we turn it back into a float, both so it can have math done on it,
        // and to drop any trailing zeroes from the string representation
        const asString = (Math.ceil(val * powerOfTen) / powerOfTen).toFixed(numPlaces);
        return parseFloat(asString);
    }
});