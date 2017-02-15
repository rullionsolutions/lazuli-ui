"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.Base.clone({
    id: "sections.Tree.Node",
    visible: true,
    level: 0,
});


module.exports.override("clone", function (spec) {
    var obj = Core.Base.clone.call(this, spec);
    obj.children = [];
    return obj;
});


module.exports.define("addChild", function (spec) {
    var child;
    spec.parent = this;
    spec.level = this.level + 1;
    child = this.clone(spec);
    child.seq = this.children.length;
    this.children.push(child);
    this.debug("addChild() created child node with id: " + child.id + ", added to parent: " + this.id + ", being its " + child.seq + "th child");
    return child;
});


module.exports.define("render", function (element, render_opts) {
    var li_elem;

    if (this.tree.table_layout) {
        li_elem = this.renderItemTableLayout(element, render_opts);
        this.renderChildren(element, render_opts);
    } else {
        li_elem = this.renderItem(element, render_opts);
        this.renderChildren(li_elem, render_opts);
    }
});


module.exports.define("renderItem", function (ul_elem, render_opts) {
    var li_elem = ul_elem.addChild("li");
    if (this.children && this.children.length > 0) {
        li_elem.addChild("a", null, "css_hier_ctrl css_uni_icon_lrg");
    }
    if (this.label) {
        li_elem.addText(this.label);
    }
    return li_elem;
});


module.exports.define("renderItemTableLayout", function (table_elem, render_opts) {
    var tr_elem = table_elem.addChild("tr");
    var td_elem;
    var i;

    if (this.children && this.children.length > 0) {
        tr_elem.attribute("class", "css_expanded");
    }
    for (i = 0; i < this.level; i += 1) {
        tr_elem.addChild("td");
    }
    if (this.label) {
        td_elem = tr_elem.addChild("td");
        td_elem.attribute("colspan", (20 - this.level).toFixed(0));
        if (this.children && this.children.length > 0) {
            td_elem.addChild("a", null, "css_hier_ctrl css_uni_icon_lrg");
        }
        td_elem.addText(this.label);
    }
    return tr_elem;
});


module.exports.define("renderChildren", function (li_elem, render_opts) {
    var i;
    var ul_elem;

    for (i = 0; this.children && i < this.children.length; i += 1) {
        if (i === 0) {
            ul_elem = li_elem.addChild("ul");
        }
        this.children[i].render(ul_elem, render_opts);
    }
});
