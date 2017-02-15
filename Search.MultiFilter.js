"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");


module.exports = UI.Search.Filter.clone({
    id: "Search.MultiFilter",
    filt_field_tb_input: "input-medium",
});


module.exports.override("clone", function (spec) {
    var filter;
    if (spec.criterion) {        // only if adding a filter to a criterion...
        filter = UI.Search.Filter.clone.call(this, spec);
        filter.filt_field2 = spec.criterion.owner.section.fieldset.addField({
            id: spec.id + "_filt2",
            type: "Attributes",
            editable: true,
            tb_input: "input-mini",
        });
        // filter.filt_field2.set(this.initial_distance);
    } else {
        filter = Core.Base.clone.call(this, spec);
    }
    return filter;
});

