"use strict";

var Core = require("lapis-core/index.js");
var SQL = require("lazuli-sql/index.js");


module.exports = Core.Base.clone({
    id: "Search.Filter",
    filt_field_tb_input: "input-large",
    table_alias: "A",
    remove_filter_icon: "&times;",        // ordinary cross sign; "&#x274C;" heavy cross mark
});


module.exports.override("clone", function (spec) {
    var filter = Core.Base.clone.call(this, spec);
    if (spec.criterion) {        // only if adding a filter to a criterion...
        filter.oper_field = spec.criterion.owner.section.fieldset.addField({
            id: spec.id + "_oper",
            type: "Option",
            tb_input: "input-medium",
            list: spec.base_field.search_oper_list,
            auto_search_oper: spec.base_field.auto_search_oper,
            dflt_search_oper: spec.base_field.dflt_search_oper,
        });
        filter.oper_field.getLoV().blank_label = "[not used]";
        if (filter.dflt_search_oper) {
            filter.oper_field.set(filter.dflt_search_oper);
        }
        if (spec.base_field) {
            filter.filt_field = spec.base_field.getFilterField(spec.criterion.owner.section.fieldset, spec, "_filt");
        }
    } else if (spec.token && spec.sctn) {
        // Token based Filter Support for Report Builder
        filter.filt_field = spec.base_field.getFilterField(spec.sctn.fieldset, spec, "_filt");
    }

    if (filter.filt_field) {
        filter.filt_field.tb_input = filter.filt_field_tb_input;
    }
    return filter;
});


module.exports.define("getTextRepresentation", function () {
    var label = "";
    if (!this.filt_field.isBlank()) {
        label = this.filt_field.label + " " + this.oper_field.getText() + " '" + this.filt_field.getText() + "'";
    }
    return label;
});


/**
* To update this filter's controls based on the passed-in parameter set object, e.g. from the UI
* @param Parameter set object - not used
*/
module.exports.define("update", function (params) {
    var oper = "";

    if (params.page_button === "search_filter_del_" + this.id) {
        this.remove();
        return;
    }
    if (params.search_reset || params.page_button === "page_reset") {
        this.reset();
    }

    if (this.token) {
        // this.debug( "update token filter[" + this.id + "]: " + this.filt_field.get());
        this.owner.section.tokens[this.id] = this.filt_field.getSQL();
        return;
    }

    if (this.oper_field.isBlank() && !this.filt_field.isBlank()) {
        this.oper_field.set(this.oper_field.auto_search_oper);
    }

    // Remove operator when filter field is blank to prevent empty searches causing sql errors
    // This is INTENTIONAL! to allow searches on blank data!
    // if (!this.oper_field.isBlank() && this.filt_field.isBlank()) {
    //     this.reset();
    // }

    oper = this.oper_field.get();
    if (!this.condition) {
        this.condition = this.owner.section.query.addCondition({
            column: this.getColumn(),
            operator: "=",
            value: "",
        });
    }
    if (this.filt_field.isBlank() && oper === "EQ") {
        oper = "NU";
    }
    if (this.filt_field.isBlank() && oper === "NE") {
        oper = "NN";
    }
    this.condition.active = (oper !== "");
    this.condition.value = this.filt_field.getConditionValue();
    this.condition.operator = oper;

    this.debug("filt val: " + this.filt_field.get() + ", cond val:  " + this.condition.value +
            ", filt.isChangedSincePreviousUpdate(): " + this.filt_field.isChangedSincePreviousUpdate());

    this.debug("oper val: " + oper + ", cond oper: " + this.condition.operator +
            ", oper.isChangedSincePreviousUpdate(): " + this.oper_field.isChangedSincePreviousUpdate());

    if (this.filt_field.isChangedSincePreviousUpdate()
            || this.oper_field.isChangedSincePreviousUpdate()) {
        this.debug("update() resetting recordset; oper = " + oper);
        this.owner.section.recordset = 1;
    }
});


module.exports.define("getColumn", function () {
    var column;
    if (this.base_field.id.indexOf(".") !== -1) {
        column = this.base_field.id;
    } else {
        column = this.table_alias + "." + this.base_field.id;
    }
    if (this.filt_field.sql_function) {
        column = " ( " + SQL.Connection.detokenizeAlias(this.filt_field.sql_function, this.table_alias) + " )";
    }
    return column;
});

/**
* To set this filter's default filter value, and/or operator value
* @param filter value string (or null), operator value string (optional)
*/
module.exports.define("setDefaults", function (filt_val, oper_val) {
    if (typeof filt_val === "string") {
        this.filt_field.dflt_search_val = filt_val;
    }
    if (typeof oper_val === "string") {
        this.oper_field.dflt_search_oper = oper_val;
    }
    this.reset();
});


module.exports.define("reset", function () {
    this.filt_field.set(this.filt_field.dflt_search_val || "");
    if (this.oper_field) {
        this.oper_field.set(this.oper_field.dflt_search_oper || "");
    }
    if (!this.filt_field.isBlank() && this.oper_field && this.oper_field.isBlank()) {
        this.oper_field.set(this.oper_field.auto_search_oper);
    }
    if (this.condition) {
        this.condition.active = false;
    }
});


module.exports.override("remove", function () {
    var page = this.owner.section.owner.page;
    this.filt_field.remove();
    page.removeField(this.filt_field);
    this.oper_field.remove();
    page.removeField(this.oper_field);
    if (this.filt_field2) {
        this.filt_field2.remove();
        page.removeField(this.filt_field2);
    }
    Core.Base.remove.call(this);
    if (this.condition) {
        this.condition.remove();
    }
});


module.exports.define("getURLComponent", function () {
    var oper;
    var out = "";

    if (!this.oper_field.isBlank()) {
        oper = this.oper_field.get();
    } else if (!this.filt_field.isBlank()) {
        oper = this.oper_field.auto_search_oper;
    }
    if (oper) {
        out = this.oper_field.getControl() + "=" + oper + "&" +
              this.filt_field.getControl() + "=" + this.filt_field.get();
    }
    return out;
});


/**
* To output HTML representation of this filter within the table element
* @param XmlStream object representing an HTML table of the filters, render_opts
* @return XmlStream object representing the newly-created table row
*/
module.exports.define("render", function (table_elem, render_opts) {
    var tr_elem = table_elem.makeElement("tr");
    var td_elem;


    // if (this.oper_field) {
    //     tr_elem.attr("data-oper", this.oper_field.get());
    // }
    tr_elem.attr("data-advanced-mode", this.owner.section.search_advanced_mode ? "true" : "false");
    if (render_opts.dynamic_page !== false) {
        if (this.owner.section.search_advanced_mode) {
            td_elem = tr_elem.makeElement("td", "css_filter_del");
            td_elem.makeElement("a", "css_cmd css_uni_icon_lrg", "search_filter_del_" + this.id)
                .text(this.remove_filter_icon, true);        // skip XML escaping
        }
    // CL Token filters don't have conditions
    } else if (this.condition && !this.condition.active) {
        return null;
    }
    td_elem = tr_elem.makeElement("td", "css_filter_label");
    this.renderLabel(td_elem, render_opts);

    // CL - Token filters don't have operator fields
    if (this.oper_field) {
        // if (this.owner.section.search_advanced_mode) {
        td_elem = tr_elem.makeElement("td", "css_filter_oper");
        this.oper_field.renderFormGroup(td_elem, render_opts, "table-cell");
        // } else {
        //     td_elem = tr_elem.makeElement("td", "css_filter_oper_disp");
        //     td_elem.text(this.oper_field.getText());
        // }
    }
    td_elem = tr_elem.makeElement("td", "css_filter_val");
    this.renderFilter(td_elem, render_opts);
    return tr_elem;
});


module.exports.define("renderLabel", function (cell_elem, render_opts) {
    this.filt_field.renderLabel(cell_elem, render_opts);
});


module.exports.define("renderFilter", function (td_elem, render_opts) {
    this.filt_field.renderFormGroup(td_elem, render_opts, "table-cell");
});
