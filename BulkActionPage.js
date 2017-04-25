"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "BulkActionPage",
    target_page: "",
    target_outcome: "",
    redirect_page: null,        // where to go to afterwards
    title: "Bulk Action",
    security: { all: true, },
});


// C9918
module.exports.sections.addAll([
    {
        id: "info",
        type: "Section",
    },
]);


module.exports.sections.get("info").override("render", function (element, render_opts) {
    var child = element.makeElement("div");
    var bulk_actions = String(this.owner.page.selected_keys.length);

    child.attr("style", "margin-bottom: 10px");
    child.text("This page acts on " + bulk_actions + (bulk_actions !== 1 ? " row" : " rows"));
});


module.exports.outcomes = {
    default_save: {
        label: "Save",
        css_class: "btn-primary",
    },
    default_cancel: {
        label: "Cancel",
    },
};


module.exports.define("getParams", function (params) {
    this.sections.each(function (section) {
        if (section.fieldset) { // 9918
            section.fieldset.each(function (field) {
                if (field.visible) {
                    params[section.id + "_" + field.id] = field.get();
                }
            });
        }
    });
});


module.exports.define("bulkAction", function (section) {
    var params = { page_button: this.target_outcome, };
    var that = this;
    var target_page = UI.pages.get(this.target_page);
    var success = 0;
    var errors = [];
    var access = [];

    this.session.messages.prevent_reporting = true;
    this.selected_keys.forEach(function (key) {
        var page;
        var allowed = target_page.allowed(that.session, key);

        if (allowed.access) {
            page = that.session.getPage(that.target_page, key);
            that.getParams(params); // C10794
            // that.sections.each(function (section) {
            //     if (section.fieldset) { //9918
            //         section.fieldset.each(function (field) {
            //             if (field.visible) {
            //                 params[section.id + "_" + field.id] = field.get();
            //             }
            //         });
            //     }
            // });
            page.update(params);
            if (that.sticky_messages) {
                page.update(params);
            }

            if (!page.trans.saved) {
                errors.push({
                    record: key,
                    text: page.trans.messages.getString(),
                });
            } else {
                success += 1;
            }
        } else {            // TODO
            allowed.type = "W";
            // that.session.messages.add(allowed);
            access.push(allowed); // C9918
        }
    });

    this.session.messages.prevent_reporting = false;
    if (this.default_bulk_message) {
        this.session.messages.add(this.default_bulk_message);
    }

    this.session.messages.add({
        type: "I",
        text: success + " action(s) performed",
    });
    if ((access.length + errors.length) > 0) {
        this.session.messages.add({
            type: "E",
            text: (access.length + errors.length) + " action(s) failed",
        });
    }

    access.forEach(function (access_msg) {
        that.session.messages.add(access_msg);
    });
    errors.forEach(function (error) {
        that.session.messages.add({
            type: "E",
            text: "Record " + error.record + " could not be saved due to following error: " + error.text,
        });
    });

    this.redirect();
});


module.exports.define("redirect", function () {
    this.redirect_url = UI.pages.get(this.redirect_page).getSimpleURL(this.page_key);
    this.active = false;
});


module.exports.defbind("bulk", "updateAfterSections", function (params) {
    if (this.session.refer_section) {
        this.session.refer_section.clearRowSelections();
        this.session.refer_section.resetToStart();
        this.session.refer_section.query.limit_offset = 0;
    }
    if (params.selected_keys) {
        this.selected_keys = JSON.parse(params.selected_keys.replace(/&quot;/gm, '"'));
    }
    if (!this.selected_keys || this.selected_keys.length === 0) {
        this.throwError({ id: "no_records_selected", });
    }
});


module.exports.defbind("defaultOutcomes", "updateAfterSections", function (params) {
    if (params.page_button === "default_cancel") {
        this.redirect();
    } else if (params.page_button === "default_save") {
        this.bulkAction();
    }
});
