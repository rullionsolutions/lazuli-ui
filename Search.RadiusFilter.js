"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.Search.Filter.clone({
    id: "Search.RadiusFilter",
    filt_field_tb_input: "input-small",
    initial_distance: 50,           // km
});


module.exports.override("clone", function (spec) {
    var filter;
    var column;
    if (spec.criterion) {        // only if adding a filter to a criterion...
        filter = UI.Search.Filter.clone.call(this, spec);
        filter.filt_field2 = spec.criterion.owner.section.fieldset.addField({
            id: spec.id + "_filt2",
            type: "Number",
            editable: true,
            tb_input: "input-mini",
        });
        filter.filt_field2.set(this.initial_distance);
    } else {
        filter = Core.Base.clone.call(this, spec);
    }
    column = filter.getColumn();
    filter.base_postcode = filter.criterion.base_postcode || "LEFT(" + column + ", INSTR(" + column + ", ' ') - 1)";
    return filter;
});


module.exports.override("update", function (params) {
    UI.Search.Filter.update.call(this, params);
    // reset distance if empty
    if (this.filt_field2.isBlank()) {
        this.filt_field2.set(this.initial_distance);
    }
    // if (!this.condition) {
    //     this.condition = this.owner.section.query.addCondition({
    //         column: "'X'",
    //         operator: "=",
    //         value: ""
    //     });
    // }
    this.debug("RadiusFilter.update() " + this.condition + ", " + this.filt_field.get() + ", " + this.filt_field2.get() + ", " + this.base_postcode);
    if (this.condition && (this.filt_field.get() !== this.prev_postcode ||
            this.filt_field2.get() !== this.condition.value)) {
        this.setRadiusCondition();
    }
});


module.exports.define("setRadiusCondition", function () {
    var district1;
    this.prev_postcode = this.filt_field.get();
    district1 = Data.Entity.field_types.get("Postcode").getDistrict(this.filt_field.get());
//  district2 = x.fields.Postcode.getDistrict(this.criterion.base_postcode);
    this.condition.column = "( " +
        "SELECT SQRT(POW(ZP1.easting - ZP2.easting, 2) + POW(ZP1.northing - ZP2.northing, 2))/1000 as dist " +
        "  FROM ad_uk_postcode ZP1, ad_uk_postcode ZP2 " +
        " WHERE ZP1._key = " + SQL.Connection.escape(district1) + " AND ZP2._key = " + this.base_postcode + " )";
    this.condition.value = this.filt_field2.get();
//    this.condition.operator = oper;
    this.debug("update() resetting recordset");
    this.owner.section.recordset = 1;
});


module.exports.override("reset", function () {
    UI.Search.Filter.reset.call(this);
    this.filt_field2.set(this.initial_distance);
});


module.exports.override("getURLComponent", function () {
    var out = UI.Search.Filter.getURLComponent.call(this);
    if (out && !this.filt_field2.isBlank()) {
        out += "&" + this.filt_field2.getControl() + "=" + this.filt_field2.get();
    }
    return out;
});

/*
module.exports.override("renderLabel", function (div, render_opts) {
    return div.makeLabel("Within", this.id, "control-label",
        (render_opts.dynamic_page !== false && this.description));
});
*/

module.exports.override("renderFilter", function (td_elem, render_opts) {
    this.filt_field.renderFormGroup(td_elem, render_opts, "table-cell");
    td_elem.makeElement("span").text("distance in km");
    this.filt_field2.renderFormGroup(td_elem, render_opts, "table-cell");
// this.filt_field.addClientSideProperties(cell_elem, render_opts);
});


module.exports.override("getTextRepresentation", function () {
    var label = "";
    if (!this.filt_field.isBlank()) {
        label = this.filt_field.label + " " + this.filt_field2.getText() + " km of '" + this.filt_field.getText() + "'";
    }
    return label;
});

