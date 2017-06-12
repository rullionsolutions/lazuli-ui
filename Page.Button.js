"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");


module.exports = Core.Base.clone({
    id: "Button",
    label: null,                         // Text label of button
    visible: true,                         // Whether or not this tab is shown (defaults to true)
});


/**
* Generate HTML output for this page button
* @param xmlstream div element object to contain the buttons; render_opts
*/
module.exports.define("render", function (parent_elmt, render_opts) {
    var button_elmt;
    var css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";

    if (this.main_button) {
        css_class += " btn_primary css_button_main";
    }
    button_elmt = parent_elmt.makeElement("li").makeElement("a", css_class, this.id);
    if (this.target) {
        button_elmt.attr("target", this.target);
    }
    if (this.confirm_text) {
        button_elmt.attr("data-confirm-text", this.confirm_text);
    }
    button_elmt.text(this.label);
    return button_elmt;
});


/*
module.exports.define("click", function (event) {
    Log.debug("click() - save? " + this.save);
    if (this.save) {
        this.owner.page.save(this.id);
    }
});
*/

/**
* Create a new button object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created button
* @return Newly-created button object
*/
UI.Page.buttons.override("add", function (spec) {
    var button;
    if (!spec.label) {
        this.throwError("Button label must be specified in spec: " + spec.id);
    }
    button = module.exports.clone(spec);
    UI.Page.buttons.parent.add.call(this, button);
    return button;
});


UI.Page.define("renderButtons", function (page_elem, render_opts) {
    var elmt;
    this.buttons.each(function (button) {
        if (button.visible) {
            if (!elmt) {
                elmt = page_elem.makeElement("ul", "css_hide", "css_payload_page_buttons");
            }
            button.render(elmt, render_opts);
        }
    });
//    return elmt;
});
