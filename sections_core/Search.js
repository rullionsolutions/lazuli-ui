"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.ListQuery.clone({
// module.exports = UI.ItemListQuery.clone({
    id: "Search",
    search_control: "A",       // all search buttons and controls
//    recordset_size: 25,
    criteria: Core.OrderedMap.clone({ id: "Search.criteria", }),
    filters: Core.OrderedMap.clone({ id: "Search.filters", }),
    auto_execute: true,      // always return resultset
    set_url_params_changes_filters: true,
});


module.exports.defbind("cloneSearch", "clone", function () {
    this.criteria = this.parent.criteria.clone({ id: "Search.criteria", });
    this.criteria.section = this;
    this.filters = this.parent.filters.clone({ id: "Search.filters", });
    this.filters.section = this;
});


/**
* One-time set-up of new Search section - creates the 'add_criterion_field' as a drop-down of the
* Criteria
*/
module.exports.defbind("setupGeneral", "setup", function () {
    this.generated_title = "";                // override entity plural title from ListQuery
    this.search_advanced_mode = (this.owner.page.session.search_advanced_mode === true);
    this.owner.page.keep_after_nav_away = true;
});


module.exports.defbind("setupAddCriteriaField", "setup", function () {
    this.fieldset = Data.FieldSet.clone({
        id: "search_internal",
        modifiable: true,
        page: this.owner.page,
        instance: true,
    });
    this.add_criterion_field = this.fieldset.addField({
        id: "add_criterion",
        control: this.id + "_add_criterion",
        type: "Option",
        label: "Add another criterion",
        tb_input: "input-sm",
        editable: true,
        render_radio: false,
        css_reload: true,
    });
    this.add_criterion_field.getLoV().blank_label = "Add new filter...";
});


/**
* Adds a Criterion to this search page for each field in its driving entity marked as visible, and
* creates a new filter for each one marked as search_criterion (terminology issue here!), called
* from x.sections.Search.setup()
*/
module.exports.defbind("addDefaultCriteria", "setup", function () {
    var that = this;
    this.entity.each(function (field) {
        if (field.accessible !== false && field.search_criterion !== false && (typeof field.getComputed !== "function")) {
            that.trace("Adding Field as Criterion: " + field.id + " to section " + that.id);
            that.criteria.add(field);
            if (that.search_control !== "N" && field.search_criterion) {        // don't add default filters if search_control is 'N'one
                that.criteria.get(field.id).newFilter();
            }
        }
    });
    this.add_criterion_field.getLoV().sort("label");
});


/**
* To update this Search section based on the parameter set object passed in
* @param Parameter set object - unrecognised parameters are ignored
*/
module.exports.defbind("updateSearch", "update", function (params) {
    if (params.page_button === "page_search") {
        this.clicked_search = true;
    }
    if (params.page_button === "page_reset" || params.search_reset) {
        this.debug("update() resetting recordset");
        this.recordset = 1;
        this.clicked_search = false;
    } else if (params.page_button === "page_mode") {
        this.search_advanced_mode = !this.search_advanced_mode;
    }
    if (params.page_button === "url_search") {
        this.updateSearchURL(params);
    }
    this.updateNormal(params);
});


module.exports.define("updateSearchURL", function (params) {
    this.setURLComponentParams(params);
    this.setColumnVisibility(params);
    this.clicked_search = true;
});


/**
* To loop through the current filter objects, calling update(params) on each, or removing if
* required, and to add a new one if required
* @param Parameter set object - unrecognised parameters are ignored
*/
module.exports.define("updateNormal", function (params) {
    this.filters.each(function (filter) {
        filter.update(params);
    });
    if (params[this.id + "_add_criterion"]) {
        this.criteria.get(params[this.id + "_add_criterion"]).newFilter();
    }
    this.add_criterion_field.set("");
});


/**
* To build and return a URL query string representing the state of the current filters, by calling
* getURLComponent() on each one
* @return Query string, (no leading '?'), each parameter name/value pair separated by '&'
*/
module.exports.define("getURLComponent", function () {
    var out = "page_button=url_search";
    var i;
    var temp;

    for (i = 0; i < this.filters.length(); i += 1) {
        temp = this.filters.get(i).getURLComponent();
        if (temp) {
            out += "&" + temp;
        }
    }

    return out;
});


/**
* To decompose a query string into a params object of name/value pairs, are act on them by calling
* setURLComponentParams()
* 2 KNOWN PROBLEMs - see comment in code
* @param Query string
*/
module.exports.define("setURLComponent", function (str) {
    var i;
    var parts1 = str.split("&");
    var parts2;
    var params = {};

    for (i = 0; i < parts1.length; i += 1) {
        parts2 = parts1[i].split("=");
        params[parts2[0]] = (parts2.length > 1) ? parts2[1] : "";
    }
    this.debug("Parameters being applied: " + Core.Base.view.call(params));
    this.setURLComponentParams(params);
});


// I think both these issues are dealt with now...

// KNOWN PROBLEM 1 - TODO
// setURLComponent will probably not work for parameters on existing filters because
// setURLComponentParams() does not set these
// because it assumes they have already been set by page.updateFields()

// KNOWN PROBLEM 2 - TODO
// When using a search page, removing and re-adding a filter on the same criterion increments
// the index number
// parameters containing index numbers higher than the current index number of the criterion will
// be not picked up by the code below
/**
* To update this Search section based on the parameter set object passed in",
* @param Parameter set object - unrecognised parameters are ignored",
* @return nothing"
*/
module.exports.define("setURLComponentParams", function (params) {
    // loop over criteria to look for filters that need to be added and only set filt/oper fields
    // of added filters
    this.criteria.each(function (criterion) {
        criterion.setURLComponentParams(params);
    });
});


/**
* To generate the HTML output stream for this search page, calling renderSearch(), then renderList()
* @param x.XmlStream object representing the div containing all the page sections, render_opts
* @return x.XmlStream object representing this section's outer div
*/
module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    this.renderSearch(render_opts, this.getSectionElement(render_opts));
    if (this.auto_execute || this.clicked_search) {
        this.renderList(render_opts);
    }
});


/**
* To generate the HTML output stream representing the table of filters, the 'add new filter'
* drop-down, and the Search and Reset buttons
* @param XmlStream object representing the section div, render_opts
* @return XmlStream object representing the div containing the search buttons
*/
module.exports.define("renderSearch", function (render_opts, parent_elem) {
// module.exports.defbind("renderSearch", "renderBeforeItems", function (render_opts) {
    var i;
    // var table_elem = this.getSectionElement().makeElement("table", "css_search_filters");
    var table_elem = parent_elem.makeElement("table", "css_search_filters");
    var div_elem;

    for (i = 0; i < this.filters.length(); i += 1) {
        this.filters.get(i).render(table_elem, render_opts);
    }
    if (this.search_control !== "N" && render_opts.dynamic_page !== false) {
        // div_elem = this.getSectionElement().makeElement("div", "css_search_control form-inline");
        div_elem = parent_elem.makeElement("div", "css_search_control form-inline");
        div_elem.makeElement("button", "css_cmd btn btn-primary css_button_main", "page_search").text("Search");
        if (this.search_control !== "S") {
            div_elem.makeElement("button", "css_cmd btn btn-default", "page_reset").text("Reset");
        }
        if (this.search_control === "A") {
            div_elem.makeElement("button", "css_cmd btn btn-default" + (this.search_advanced_mode ? " active" : ""), "page_mode")
                .attr("data-toggle", "button")
                .text("Advanced Mode");
            if (this.search_advanced_mode) {
                this.add_criterion_field.renderFormGroup(div_elem, render_opts, "table-cell");
            }
        }
        // Not operational yet because new filters aren't added as a result of parameters being
        // passed in
        div_elem.makeElement("a", "css_force_load", "btn-link")
            .attr("href", this.getSearchURL())
            .text("Bookmark this Search");
    }
});


module.exports.define("getSearchURL", function () {
    return this.owner.page.getSimpleURL() + "&" + this.getURLComponent() + this.getColumnVisibility();
});
