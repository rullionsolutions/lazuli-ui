"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var UI = require("lazuli-ui/index.js");

/**
* To represent a component of a page with display content
*/

module.exports = Core.Base.clone({
    id: "Section",
    visible: true,
    width: "100%",
    tb_span: 12,        // replacing width
    right_align_numbers: false,
});


module.exports.register("setup");
module.exports.register("update");
module.exports.register("presave");
module.exports.register("success");
module.exports.register("failure");
module.exports.register("cancel");
module.exports.register("render");


/**
* Inheritance hook for one-time initialisation logic for this page section; called by x.Page.setup()
* before setupCall()
*/
module.exports.defbind("setEntity", "setup", function () {
    if (typeof this.entity === "string" && !this.entity_id) {       // backward-compatibility - use entity_id instead of entity to specify string going forwards
        this.entity_id = this.entity;
    }
    if (typeof this.entity !== "object" && this.entity_id) {        // any section that uses a primary entity object can either specify entity_id or call overrideEntity() in page::setupStart
        this.entity = Data.entities.getThrowIfUnrecognized(this.entity_id);
    }
});


module.exports.defbind("setAccessible", "setup", function () {
    var allowed = { access: false, };
    if (this.apply_entity_security && this.entity) {
        if (this.entity.security) {
            this.owner.page.session.checkSecurityLevel(this.entity.security, allowed, "entity");
        }
        if (!allowed.found && this.entity.area) {
            this.owner.page.session.checkSecurityLevel(
                Data.areas.getThrowIfUnrecognized(this.entity.area).security, allowed, "area");
        }
        this.accessible = allowed.access;
    }
});


module.exports.define("overrideEntity", function (entity_id) {
    // not using getRecord() - don't want an instance...
    this.entity = Data.entities.getThrowIfUnrecognized(entity_id).clone({
        id: entity_id,
        skip_registration: true,
    });
    return this.entity;
});


/**
* Begin render logic for this page section, call this.getSectionElement() to create the other div
* for the section, unless this.hide_section_if_empty is set to suppress this; called by
* Page.renderSections() is this.visible and other tab-related logic
* @param x.XmlStream object representing the section-containing div; 'render_opts' object map that
* controls aspects of page appearance
*/
module.exports.define("render", function (element, render_opts) {
    this.sctn_elem = null;
    this.parent_elem = element;
    if (!this.hide_section_if_empty) {
        this.getSectionElement(render_opts);
    }
    this.happen("render", render_opts);
});


/**
* To output the opening elements of the section on first call - the outer div, its title and
* introductory text, and sets this.sctn_elem which is used by subsequent render logic for the
* section; can be called repeatedly to return this.sctn_elem
* @param 'render_opts' object map that controls aspects of page appearance
* @return x.XmlStream object representing the main div of the section, to which subsequent
* content should be added
*/
module.exports.define("getSectionElement", function (render_opts) {
    var temp_title;
    if (!this.sctn_elem) {
        this.sctn_elem = this.parent_elem.addChild("div", this.id, this.getCSSClass());
        temp_title = this.title || this.generated_title;
        if (temp_title) {
            this.sctn_elem.addChild("h2", null, "css_section_title").addText(temp_title);
        }
        if (this.text) {
            this.sctn_elem.addChild("div", null, "css_section_text").addText(this.text, true);    // Valid XML content
        }
    }
    return this.sctn_elem;
});


/**
* To determine the CSS class(es) for the div element of this page, including its tb_span, and
* whether or not numbers should be right-aligned",
* @param 'render_opts' object map that controls aspects of page appearance",
* @return String content of the div element's CSS class attribute"
*/
module.exports.define("getCSSClass", function (render_opts) {
    var css_class = "css_section css_section_" + (this.css_type_override || this.type) + " span" + /* TB3: " col-md-" +*/ this.tb_span;
    if (this.right_align_numbers) {
        css_class += " css_right_align_numbers";
    }
    return css_class;
});


/**
* To report whether or not this section is entirely valid, to be overridden",
* @param none",
* @return true (to be overridden)"
*/
module.exports.define("isValid", function () {
    return true;
});


/**
* To return the URL parameters to include in order to reference back to this section object",
* @param none",
* @return String URL fragment, beginning with '&'"
*/
module.exports.define("getReferURLParams", function () {
    return "&refer_page=" + this.owner.page.id + "&refer_section=" + this.id;
});


module.exports.define("deduceKey", function () {
    var key;
    var link_field;

    if (this.key) {                         // key specified directly as a property
        key = this.key;
    } else if (this.link_field) {           // via 'link_field' property
        link_field = this.owner.page.getPrimaryRow().getField(this.link_field);
        if (!link_field) {
            this.throwError("link field invalid");
        }
        key = link_field.get();
    } else if (this.owner.page.page_key_entity) {       // having same entity as page_key_entity
        if (this.entity.id === this.owner.page.page_key_entity.id && this.owner.page.page_key) {
            key = this.owner.page.page_key;
        }
    // having same key as page
    } else if (this.entity.id === this.owner.page.entity.id && this.owner.page.page_key) {
        key = this.owner.page.page_key;
    }
    return key;
});


/**
* Create a new section object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created section
* @return Newly-created section object
*/
UI.Page.sections.override("add", function (spec) {
    var section;
    if (!spec.type) {
        this.throwError("Section type must be specified in spec: " + spec.id);
    }
    section = UI.sections.getThrowIfUnrecognized(spec.type).clone(spec);
    Core.OrderedMap.add.call(this, section);
    return section;
});

