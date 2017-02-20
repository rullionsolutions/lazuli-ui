"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");


module.exports = Core.Base.clone({
    id: "Search.Criterion",
    index: 0,
});


/**
* To add another Filter to the search page using this Criterion
* @return The new filter object
*/
module.exports.define("newFilter", function () {
    var spec = {
        id: this.base_field.id + "_" + this.index,
        base_field: this.base_field,
        criterion: this,
        index: this.index,
    };
    var filter_type = this.base_field.search_filter;
    var filter;

    this.debug("Filter type: " + filter_type);
    filter = UI.Search[filter_type].clone(spec);
    this.owner.section.filters.add(filter);
    this.index += 1;
    return filter;
});


/**
* Remove all filters for this Criterion and reset index
*/
module.exports.define("clearFilters", function () {
    var i;
    var filter;
    for (i = 0; i < this.index; i += 1) {
        filter = this.owner.section.filters.get(this.id + "_" + i);
        if (filter) {
            filter.remove();
        }
    }
    this.index = 0;
});


/**
* Get the highest index number of filt parameters in the param object for this criterion
* @param params object
* @return highest index number (-1 if none found)
*/
module.exports.define("getHighestIndex", function (params) {
    var regexp = new RegExp(this.id + "_([0-9]+)_filt");
    var highest_index = -1;

    Object.keys(params).forEach(function (i) {
        var match = i.match(regexp);
        if (match) {
            highest_index = highest_index >= parseInt(match[1], 10) ? highest_index :
                parseInt(match[1], 10);
        }
    });
    this.debug("setURLComponentParams() index: " + this.index + ", highest_index: " + highest_index);
    return highest_index;
});


/**
* Get the filter with the index number given (assumed zero if not supplied), and create it if it
* doesn't exist
* @param index number (assumed 0 if not supplied)
* @return corresponding filter object
*/
module.exports.define("getFilter", function (index) {
    var filter;
    index = index || 0;
    filter = this.owner.section.filters.get(this.id + "_" + index);
    while (!filter) {
        this.newFilter();
        filter = this.owner.section.filters.get(this.id + "_" + index);
    }
    return filter;
});


/**
* To update this Search section based on the parameter set object passed in
* @param Parameter set object - unrecognised parameters are ignored
*/
module.exports.define("setURLComponentParams", function (params) {
    var i;
    var highest_index;
    var filter;
    var that = this;

    if (this.owner.section.set_url_params_changes_filters) {
        this.clearFilters();
    }
    highest_index = this.getHighestIndex(params);

    function setField(field, val) {
        that.debug("setURLComponentParams.setField() field.get(): " + field.get() + ", val:" + val);
        if (typeof val === "string" && field.get() !== val) {
            field.set(val);
        }
    }

    // this.index is set to zero if this.set_url_params_changes_filters, so this won't be done...
    for (i = 0; i < this.index; i += 1) {
        filter = this.owner.section.filters.get(this.id + "_" + i);
        if (filter && typeof params[filter.filt_field.getControl()] === "string") {
            setField(filter.filt_field, params[filter.filt_field.getControl()]);
        }
        //  from daily agent
        if (filter && filter.filt_field2 && typeof params[filter.filt_field2.getControl()] === "string") {
            setField(filter.filt_field2, params[filter.filt_field2.getControl()]);
        }
        if (filter && params[filter.oper_field.getControl()]) {
            setField(filter.oper_field, params[filter.oper_field.getControl()]);
        }
    }
    if (!this.owner.section.set_url_params_changes_filters) {
        return;
    }

    for (i = this.index; i <= highest_index; i += 1) {
        filter = this.newFilter();
        if (typeof params[this.id + "_" + i + "_filt"] === "string") {
            setField(filter.filt_field, params[filter.filt_field.getControl()]);
        } else {
            filter.remove();
        }
        if (params[this.id + "_" + i + "_oper"]) {
            setField(filter.oper_field, params[filter.oper_field.getControl()]);
        } else {
            setField(filter.oper_field, this.base_field.auto_search_oper);
        }
    }
});


/**
* To add another Criterion to this search page - a field and/or other definition to be used to
* generate filters
* @param Spec object for the Criterion
* @return The new Criterion object
*/
UI.Search.criteria.override("add", function (base_field) {
    var criterion = module.exports.clone({
        id: base_field.id,
        base_field: base_field,
    });
    Core.OrderedMap.add.call(this, criterion);
    if (this.section.add_criterion_field) {
        this.section.add_criterion_field.getLoV().addItem(base_field.id, base_field.label, true);
    }
    return criterion;
});

