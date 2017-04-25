"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Section.clone({
    id: "Tree",
    show_root_node: true,
    table_layout: false,
    root_node_spec: {
        id: "root_node",
        label: "Root Node",
        level: 0,
    },
});


module.exports.define("setup", function () {
    this.root_node_spec.tree = this;
    this.root_node = this.Node.clone(this.root_node_spec);
});


module.exports.override("render", function (element, render_opts) {
    var sctn_elem;
    var div_elem;
    var ul_elem;

    UI.Section.render.call(this, element, render_opts);
    sctn_elem = this.getSectionElement(render_opts);
    if (this.table_layout) {
        div_elem = sctn_elem.makeElement("table", "css_tree_table_layout form-inline");
        if (this.show_root_node) {
            this.root_node.render(div_elem, render_opts);
        } else {
            this.root_node.renderChildren(div_elem, render_opts);
        }
    } else {
        div_elem = sctn_elem.makeElement("div", "form-inline col-md-8");
        if (this.show_root_node) {
            ul_elem = div_elem.makeElement("ul");
            this.root_node.render(ul_elem, render_opts);
        } else {
            this.root_node.renderChildren(div_elem, render_opts);
        }
    }
});
