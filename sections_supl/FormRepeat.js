"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


/**
* To represent a list of database records belonging to some parent record
*/
module.exports = UI.FormBase.clone({
    id: "FormRepeat",
    layout: "flexbox",
});

module.exports.defbind("setup", "setup", function () {
    if (!this.record) {
        this.setupRecord();
    }
    if (!this.query) {
        this.setupQuery();
    }
    if (!this.row_control_field) {
        this.setupRowControl();
    }
    if (this.link_field && this.owner.page.page_key) {
        this.setLinkField(this.link_field, this.owner.page.page_key);
    }
    this.generated_title = this.record.getPluralLabel();
});


module.exports.define("setupRecord", function () {
    this.record = this.entity.getRecord({
        modifiable: false,
        page: this.owner.page,
    });
    this.fieldset = this.record;
});


module.exports.define("setupQuery", function () {
    this.query = this.entity.getQuery(true);        // default sort
    this.query.get_found_rows = true;
});


module.exports.define("setupRowControl", function () {
    if (typeof this.show_row_control !== "boolean") {
        this.show_row_control = !!this.record.getDisplayPage();
    }
    if (this.show_row_control) {
        this.row_control_field = Data.Reference.clone({
            id: "_row_control",
            label: "",
            ref_entity: this.entity.id,
            session: this.owner.page.session,
            dropdown_label: "Action",
            dropdown_button: true,
            dropdown_css_class: "btn-xs",
        });
    }
});


/**
* Set up link field relationship (requires this.query to be present)
* @param link_field: string column id, value: string value to use in filter condition,
* condition is false if not supplied
*/
module.exports.define("setLinkField", function (link_field, value) {
    if (this.key_condition) {
        this.key_condition.remove();
    }
    if (value) {
        this.key_condition = this.query.addCondition({
            column: "A." + link_field,
            operator: "=",
            value: value,
        });
    } else {
        this.key_condition = this.query.addCondition({
            full_condition: "false",
        });        // prevent load if no value supplied
    }
});


module.exports.define("addFunction", function (spec) {
    var field;
    var query_column;
    spec.name = spec.id;
    spec.list_column = true;            // visible unless overridden by visible property
    field = this.record.addField(spec);
    query_column = field.addColumnToTable(this.query.main, spec);
    field.query_column = query_column.id;
    this.debug("query_column: " + query_column);
    return field;
});


module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    this.parent_elem = element;
    this.rows = 0;
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.renderRow(render_opts, this.record);
    }
    this.query.reset();
});

module.exports.define("renderRow", function (render_opts) {
    var count = 0;
    var h3_elem;

    if (!this.fieldset) {
        this.throwError("formbase no fieldset");
    }
    if (this.rows > 0) {
        this.sctn_elem.makeElement("hr");
    }
    if (this.record_title_field) {
        h3_elem = this.getFormElement(render_opts).addChild("h3");
        h3_elem.addText(this.fieldset.getField(this.record_title_field).getText());
//        this.fieldset.getField(this.record_title_field).renderUneditable(h3_elem, render_opts);
    }
    count = this.fieldset.renderForm(this.getSectionElement(render_opts), render_opts, this.layout,
        this.field_group, this.hide_blank_uneditable_fields);

    if (this.row_control_field && render_opts.dynamic_page !== false) {
        this.row_control_field.set(this.record.getKey());
        this.row_control_field.renderNavOptions(this.getSectionElement(render_opts),
            render_opts, this.record);
    }
    // this.sctn_elem will be set if hide_section_if_empty = false
    if (count === 0 && this.sctn_elem) {
        this.sctn_elem.makeElement("div", "css_form_footer").text("no items");
    }
    this.rows += 1;
    return count;
});

module.exports.define("rowURL", function (row_elem) {
    var display_page = this.record.getDisplayPage();
    if (display_page) {
        row_elem.attribute("url", display_page.getSimpleURL(this.query.columns["A._key"].get())
            + this.getReferURLParams());
    }
});
