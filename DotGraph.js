"use strict";

var UI = require("lazuli-ui/index.js");


/**
* To represent a tree structure
*/
module.exports = UI.Section.clone({
    id: "DotGraph",
    max_depth: 4,
    level_type: "Level",      // provides getDotGraph() function
    graph_settings: {
        type: "digraph",
        penwidth: 1,
        bgcolor: "transparent",
    },
    node_settings: {
        fontname: "Arial",
        fontsize: 10,
        shape: "box",
    },
    edge_settings: {
        fontname: "Arial",
        fontsize: 10,
    },
});


module.exports.defbind("setupLogic", "setup", function () {
    if (this.top_level) {
        return;
    }
    this.top_level = UI.DotGraph[this.level_type].clone({
        id: "_top",
        entity_id: this.entity.id,
        owner: this,
        instance: true,
        include_children: true,
        context_key: this.context_key,
        homogen_link_field: this.homogen_link_field,
    });
});


module.exports.override("render", function (element, render_opts) {
    render_opts.max_depth = render_opts.max_depth || this.max_depth;
    UI.Section.render.call(this, element, render_opts);
    this.getSectionElement().makeElement("div", "css_diagram")
        .text(this.getDotGraph(render_opts), true);
});


module.exports.define("getDotGraph", function (render_opts) {
    return this.getDotGraphHeader(render_opts) + this.top_level.getDotGraph(render_opts, 0, this.top_level_key) + " }";
});


module.exports.define("getDotGraphHeader", function () {
    return this.graph_settings.type + " " + this.id + " { " +
        "graph [ penwidth=" + this.graph_settings.penwidth + ",  bgcolor=" + this.graph_settings.bgcolor + " ]; " +
        " node [ fontname=" + this.node_settings.fontname + ", fontsize=" + this.node_settings.fontsize + ", shape=" + this.node_settings.shape + " ]; " +
        " edge [ fontname=" + this.edge_settings.fontname + ", fontsize=" + this.edge_settings.fontsize + " ]; ";
});
