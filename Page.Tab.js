"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");


module.exports = Core.Base.clone({
    id: "Page.Tab",
    label: null,                         // Text label of button
    visible: true,                         // Whether or not this tab is shown (defaults to true)
});


module.exports.define("render", function (parent_elmt, render_opts) {
    if (this.visible) {
        return parent_elmt.makeElement("li", (this.owner.page.page_tab === this ? "active" : null), this.id)
            .attr("role", "presentation")
            .makeElement("a").text(this.label);
    }
    return null;
});


module.exports.define("getJSON", function () {
    var out = {};
    out.id = this.id;
    out.label = this.label;
    return out;
});


/**
* Create a new tab object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created tab
* @return Newly-created tab object
*/
UI.Page.tabs.override("add", function (spec) {
    var tab;
    if (!spec.label) {
        this.throwError("Tab label must be specified in spec");
    }
    tab = module.exports.clone(spec);
    Core.OrderedMap.add.call(this, tab);
    return tab;
});


UI.Page.define("renderTabs", function (parent_elmt, render_opts) {
    var elmt;
    var that = this;
    this.tabs.each(function (tab) {
        that.trace("render tab: " + tab.id + ", visible? " + tab.visible);
        if (tab.visible) {
            elmt = elmt || parent_elmt.makeElement("div", "css_hide", "css_payload_page_tabs");
            tab.render(elmt, render_opts);
        }
    });
});
