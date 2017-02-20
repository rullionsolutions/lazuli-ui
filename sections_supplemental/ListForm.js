"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ListBase.clone({
    id: "ListForm",
});


module.exports.define("renderRepeat", function (parent_elmt, render_opts) {
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.renderRow(parent_elmt, render_opts, this.record);
    }
    this.query.reset();
});


/**
* To render an object (usually a fieldset) as a form block, using FormBase.render()
*(not implemented)
* @param element (xmlstream), render_opts, row_obj
* @returns the return value of FormBase.render()
*/
module.exports.define("renderRow", function (parent_elmt, render_opts, row_obj) {
    this.fieldset = row_obj;
    return UI.FormBase.render.call(this, parent_elmt, render_opts);
});


module.exports.define("getRepeatFormText", function (row_obj) {
    return null;
});
