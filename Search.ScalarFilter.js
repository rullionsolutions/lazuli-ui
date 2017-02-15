"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");


module.exports = UI.Search.Filter.clone({
    id: "Search.ScalarFilter",
});


module.exports.override("clone", function (spec) {
    var filter;
    if (spec.criterion) {        // only if adding a filter to a criterion...
        filter = UI.Search.Filter.clone.call(this, spec);
        filter.filt_field2 = spec.criterion.owner.section.fieldset.cloneField(spec.base_field, {
            id: spec.id + "_filt2",
            editable: true,
            mandatory: false,
            tb_input: filter.filt_field_tb_input,
        });
    } else {
        filter = Core.Base.clone.call(this, spec);
    }
    return filter;
});


module.exports.override("update", function (params) {
    UI.Search.Filter.update.call(this, params);
    if (this.condition) {
        this.condition.value2 = this.filt_field2.get();
    }
});


module.exports.override("reset", function () {
    UI.Search.Filter.reset.call(this);
    this.filt_field2.set("");
});


module.exports.override("getURLComponent", function () {
    var out = UI.Search.Filter.getURLComponent.call(this);
    if (out && !this.filt_field2.isBlank()) {
        out += "&" + this.filt_field2.getControl() + "=" + this.filt_field2.get();
    }
    return out;
});


module.exports.override("renderFilter", function (td_elem, render_opts) {
    this.filt_field.renderFormGroup(td_elem, render_opts, "table-cell");
    td_elem.makeElement("span").text(" and ");
    this.filt_field2.renderFormGroup(td_elem, render_opts, "table-cell");
});
