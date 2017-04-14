"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");
var UI = require("lazuli-ui/index.js");

// var pages = {};

/**
* Unit of system interaction, through the User Interface or a Machine Interface
*/
module.exports = Core.Base.clone({
    id: "Page",
    trans: null,
    prompt_message: false,                // set in setupButtons() if transactional
    tab_sequence: false,
    tab_forward_only: false,
    allow_no_modifications: false,
    record_parameters: true,
    skin: "index.html",
    internal_state: 0,
//    page_tab: 0
    tabs: Core.OrderedMap.clone({ id: "Page.tabs", }),
    sections: Core.OrderedMap.clone({ id: "Page.sections", }),
    links: Core.OrderedMap.clone({ id: "Page.links", }),
    buttons: Core.OrderedMap.clone({ id: "Page.buttons", }),
});


module.exports.register("setupStart");
module.exports.register("setupEnd");
module.exports.register("updateStart");
module.exports.register("updateBeforeSections");
module.exports.register("updateAfterSections");
module.exports.register("updateEnd");
module.exports.register("presave");
module.exports.register("success");
module.exports.register("failure");
module.exports.register("cancel");
module.exports.register("renderStart");
module.exports.register("renderEnd");


module.exports.defbind("registerPage", "cloneType", function () {
    UI.pages[this.id] = this;

    if (this.entity_id && !this.entity) {
        this.entity = Data.entities.getThrowIfUnrecognized(this.entity_id);
    }
    if (this.page_key_entity_id && !this.page_key_entity) {
        this.page_key_entity = Data.entities.getThrowIfUnrecognized(this.page_key_entity_id);
    }
});


module.exports.defbind("initialize", "cloneInstance", function () {
    this.active = true;
    this.fields = {};
    this.emails = [];
});


module.exports.defbind("clonePage", "clone", function () {
    this.internal_state = 10;
    this.tabs = this.parent.tabs.clone({
        id: this.id + ".tabs",
        page: this,
        instance: this.instance,
    });
    this.sections = this.parent.sections.clone({
        id: this.id + ".sections",
        page: this,
        instance: this.instance,
    });
    this.links = this.parent.links.clone({
        id: this.id + ".links",
        page: this,
        instance: this.instance,
    });
    this.buttons = this.parent.buttons.clone({
        id: this.id + ".buttons",
        page: this,
        instance: this.instance,
    });
    this.internal_state = 19;
});


/**
* Initialise a Page instance for use - add buttons, call setup on Sections, etc
*/
module.exports.define("setup", function () {
    var i;
    this.internal_state = 20;
    this.debug("starting setup");
    if (!this.session) {
        this.throwError("no session property supplied");
    }
    this.internal_state = 21;
    this.happen("setupStart");
    this.internal_state = 23;
    this.getPrimaryRow();
    if (!this.full_title) {
        this.full_title = this.title;
    }
    this.internal_state = 24;
    this.setupButtons();
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).happen("setup");
    }
    if (this.tabs.length() > 0) {
        this.page_tab = this.tabs.get(0);
    }
//    this.setupCall();
    this.internal_state = 28;
    this.happen("setupEnd");
    this.internal_state = 29;
    if (this.instance) {
        this.http_status = 200;
        this.http_message = "OK";
    }
});


/**
* Initialise the buttons and outcomes of a Page
*/
module.exports.define("setupButtons", function () {
    var that = this;
    if (this.outcomes) {
        Object.keys(this.outcomes).forEach(function (id) {
            that.outcomes[id].id = id;
            that.outcomes[id].save = true;
            that.outcomes[id].main_button = false;
            that.buttons.add(that.outcomes[id]);
        });
    }
    if (this.tab_sequence) {
        this.buttons.add({
            id: "prev_tab",
            label: "Previous",
            main_button: false,
            css_class: "",
        });
        this.buttons.add({
            id: "next_tab",
            label: "Next",
            main_button: false,
            css_class: "btn-primary",
        });
    }
    if (this.transactional) {
        if (!this.prompt_message) {
            this.prompt_message = "Navigating away from this page will mean losing any data changes you've entered";
        }
        // save is NOT main_button to prevent page submission when enter is pressed
        if (!this.outcomes) {
            this.buttons.add({
                id: "save",
                label: "Save",
                main_button: false,
                save: true,
                css_class: "btn-primary",
            });
        }
        this.buttons.add({
            id: "cancel",
            label: "Cancel",
        });
    }
});


module.exports.define("getArea", function () {
    var area = this.area || this.area_id || (this.entity && this.entity.area);
    if (typeof area === "string") {
        area = Data.areas.getThrowIfUnrecognized(area);
    }
    return area;
});


/**
* To determine whether or not the given session has permission to access this page with the given
* key, according to the following logic:
* @param session (object); page key (string) mandatory if page requires a key; cached_record
* (object) optional, only for checkRecordSecurity()
* @return 'allowed' object, with properties: access (boolean), page_id, page_key, text (for user),
* reason (more technical)
*/
module.exports.define("allowed", function (session, page_key, cached_record) {
    var allowed = {
        access: false,
        page_id: this.id,
        user_id: session.user_id,
        page_key: page_key,
        reason: "no security rule found",
        toString: function () {
            return this.text + " to " + this.page_id + ":" + (this.page_key || "[no key]") + " for " + this.user_id + " because " + this.reason;
        },
    };

    this.checkBasicSecurity(session, allowed);

    if (this.wf_type && page_key && session.allowedPageTask(this.id, page_key, allowed)) {
        allowed.access = true;
    } else if (this.workflow_only) {            // Workflow-only page
        allowed.reason = "workflow-only page";
        allowed.access = false;       // even if access was set true by checkBasicSecurity()
    } else if (allowed.access) {
        this.checkRecordSecurity(session, page_key, cached_record, allowed);
    }
    if (!allowed.text) {
        allowed.text = "access " + (allowed.access ? "granted" : "denied");
    }
    return allowed;
});


/**
* To obtain the page security result for this user from the given page object
* @param session (object), allowed object
*/
module.exports.define("checkBasicSecurity", function (session, allowed) {
    var area = this.getArea();

    if (this.security) {
        session.checkSecurityLevel(this.security, allowed, "page");
    }
    if (!allowed.found && this.entity && this.entity.security) {
        session.checkSecurityLevel(this.entity.security, allowed, "entity");
    }
    if (!allowed.found && area && area.security) {
        session.checkSecurityLevel(area.security, allowed, "area");
    }
});


/**
* To determine security access to this page based on its primary record;
* @param session (object); page key (string); cached_record (FieldSet object, optional), allowed
* object
* if cached_record is supplied, access is implied
*/
module.exports.define("checkRecordSecurity", function (session, page_key, cached_record, allowed) {
    var page_entity = this.page_key_entity || this.entity;
    if (page_entity && page_key && !cached_record && page_entity.addSecurityCondition) {
        this.trace("checking record security for entity: " + page_entity.id + ", key: " + page_key);
        if (!page_entity.getSecurityRecord(session, page_key)) {
            allowed.access = false;
            allowed.reason = "record security for entity: " + page_entity.id + ", key: " + page_key;
        }
    }
});


// ---------------------------------------------------------------------------------------  update
/**
* Update page's state using the parameter map supplied
* @param params: object map of strings
*/
module.exports.define("update", function (params) {
    this.internal_state = 30;
    this.session.newVisit(this.id, this.getPageTitle(), this.record_parameters ? params : null,
        this.page_key);
    this.updateReferParams(params);
    this.internal_state = 31;
    if (!this.transactional && !this.trans && this.primary_row) {
        this.primary_row.reload();
    }
    this.internal_state = 32;
    this.happen("updateStart", params);
    this.updateFields(params);
    this.updateTabs(params);
    this.internal_state = 33;
    this.happen("updateBeforeSections", params);
    this.internal_state = 34;
    this.updateSections(params);
    this.internal_state = 35;
//        this.updateCall(params);
    this.happen("updateAfterSections", params);
    this.internal_state = 36;
    if (this.transactional) {
        this.updateTrans(params);
    }
    this.internal_state = 37;
    this.happen("updateEnd", params);
    this.internal_state = 38;
    this.internal_state = 39;
});


module.exports.define("updateReferParams", function (params) {
    if (params.refer_page_id && params.refer_page_id !== this.id) {
        this.exit_url = UI.pages.get(params.refer_page_id).getSimpleURL(params.refer_page_key);
        this.refer_page = this.session.getPageFromCache(params.refer_page_id);
        this.debug("Set exit_url from refer_page_id: " + this.exit_url);
        if (this.refer_page && params.refer_section_id) {
            if (!this.session.refer_sections) {
                this.session.refer_sections = {};
            }
            this.session.refer_sections[this.id] =
                this.refer_page.sections.get(params.refer_section_id);
            this.debug("Refer section: " + this.session.refer_sections[this.id]);
        }
    }
});


/**
* Update the fields added to this.fields from params
* @param params: object map of strings
*/
module.exports.define("updateFields", function (params) {
    var that = this;
    if (!this.fields) {
        return;
    }
    Object.keys(this.fields).forEach(function (field_id) {
        that.fields[field_id].setFromParams(params);
    });
});


/**
* Set this.page_tab (reference to tab object) using params.page_tab (string)
* @param params: object map of strings
*/
module.exports.define("updateTabs", function (params) {
    this.prev_tab = this.page_tab;
    this.moveToTab(params.page_tab, params.page_button);
});


module.exports.define("moveToTab", function (tab_ref, page_button) {
    var tabs = this.tabs;
    var curr_tab_ix;
    var curr_tab_visible = false;
    var first_visible_tab_ix;
    var last_visible_tab_ix;
    var prev_visible_tab_ix;
    var next_visible_tab_ix;
    var move_to_ix;

    if (this.page_tab) {
        curr_tab_ix = tabs.indexOf(this.page_tab.id);
    }
    this.tabs.each(function (tab) {
        if (tab.visible) {
            last_visible_tab_ix = tabs.indexOf(tab);
            if (last_visible_tab_ix === curr_tab_ix) {
                curr_tab_visible = true;
            }
            if (typeof first_visible_tab_ix !== "number") {
                first_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix < curr_tab_ix) {
                prev_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix > curr_tab_ix && typeof next_visible_tab_ix !== "number") {
                next_visible_tab_ix = last_visible_tab_ix;
            }
        }
    });
    if (typeof tab_ref === "number") {
        move_to_ix = tab_ref;
    } else if (tab_ref && this.tabs.indexOf(tab_ref) > -1) {
        move_to_ix = this.tabs.indexOf(tab_ref);
    } else if (tab_ref && parseInt(tab_ref, 10).toFixed(0) === tab_ref) {
        move_to_ix = parseInt(tab_ref, 10);
    } else if (page_button === "next_tab") {
        move_to_ix = next_visible_tab_ix;
    } else if (page_button === "prev_tab" && !this.tab_forward_only) {
        move_to_ix = prev_visible_tab_ix;
    } else if (!curr_tab_visible) {
        move_to_ix = next_visible_tab_ix || first_visible_tab_ix;
    }
    if (typeof move_to_ix === "number") {
        if (move_to_ix < 0 || move_to_ix >= tabs.length()) {
            this.session.messages.add({
                type: "E",
                text: "Invalid tab",
                tab_index: move_to_ix,
            });
        } else if (!this.tab_sequence || !this.tab_forward_only
                || move_to_ix === (curr_tab_ix + 1)) {
            if (tabs.get(move_to_ix).visible) {
                this.page_tab = tabs.get(move_to_ix);
                curr_tab_ix = move_to_ix;
            } else {
                this.session.messages.add({
                    type: "E",
                    text: "Invalid tab",
                    tab_index: move_to_ix,
                });
            }
        }
    }

    this.trace("updateTabs(): 1st " + first_visible_tab_ix + ", last " + last_visible_tab_ix + ", prev " +
        prev_visible_tab_ix + ", next " + next_visible_tab_ix + ", curr " + curr_tab_ix);
    if (this.tab_sequence) {
        this.buttons.get("prev_tab").visible = (curr_tab_ix > first_visible_tab_ix) && !this.tab_forward_only;
        this.buttons.get("next_tab").visible = (curr_tab_ix < last_visible_tab_ix);
        this.buttons.each(function (button) {
            if (button.save || (typeof button.show_at_last_visible_tab === "boolean" && button.show_at_last_visible_tab)) {
                button.visible = (curr_tab_ix === last_visible_tab_ix);
            }
        });
    }
});


module.exports.define("moveToFirstErrorTab", function () {
    var move_to_tab = 999;
    var i;
    var section;

    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);

        this.trace("moveToFirstErrorTab() " + section.id + ", " + section.visible + ", " +
            section.isValid() + ", " + section.tab + ", " + move_to_tab);
        if (section.visible && !section.isValid() && section.tab
                && this.tabs.indexOf(section.tab) < move_to_tab) {
            move_to_tab = this.tabs.indexOf(section.tab);
        }
    }
    if (move_to_tab < 999) {
        this.moveToTab(move_to_tab);
    }
});


/**
* Call update(params) on each section in the Page
* @param params: object map of strings
*/
module.exports.define("updateSections", function (params) {
    var i;
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).happen("update", params);
    }
});


/**
* Cancel or attempt to Save this page depending on params.page_button
* @param params: object map of strings
*/
module.exports.define("updateTrans", function (params) {
    var first_warnings;
    var save;

    if (!this.trans) {
        this.throwError("transaction not created");
    }
    if (!this.trans.isActive()) {
        this.throwError("transaction not active");
    }
    this.trans.update();
    this.outcome_id = params.page_button;
    this.trans.messages.include_field_messages = false;
    first_warnings = this.trans.messages.firstWarnings();
    save = this.outcome_id
            && this.buttons.get(this.outcome_id)
            && this.buttons.get(this.outcome_id).save;
    if (this.outcome_id === "cancel") {
        this.cancel();
    } else if (save) {
        if (first_warnings) {        // unreported warnings
            this.trans.messages.add({
                type: "W",
                report: false,
                warned: true,
                text: "Save aborted due to first-time-shown warnings",
            });
        } else if (this.challengeTokenOkay(params)) {
            this.trans.messages.include_field_messages = true;
            this.save();
        }
    }
});


// returns HTTP status code, if 200 writes HTML to writer, else JSON
// async version on nirvana branch
module.exports.define("exchange", function (params, xmlstream, render_opts) {
    if (!this.instance) {
        this.throwError("must only be called on an instance object");
    }
    // if (this.active === false) {
        // if (this.http_status === 200) {
        //     this.throwError("page status set false incorrectly - call cancel()");
        // }
    // }
    if (this.active) {
        this.update(params);
    }
    if (this.active && !render_opts.bypass_render) {
        this.render(xmlstream, render_opts);
    }
    this.session.updateVisit(this.trans, parseInt(params.visit_start_time, 10));
    return this.getExchangeReturn(render_opts);
});


module.exports.define("getExchangeReturn", function (render_opts) {
    var out = {
        http_status: this.http_status,
        http_message: this.http_message,
    };
    if (this.redirect_url) {
        out.redirect_url = this.redirect_url;
        if (this.redirect_new_window) {
            out.redirect_new_window = this.redirect_new_window;
        }
    }
    return out;
});

/**
* Create an email from the given spec object, to be sent if/when the page saves successfully
* @param spec: properties object for email - required: to_addr or to_user, text_string or subject
*   and body; page and session added automatically
* @return unsent email object
*/
module.exports.define("addEmail", function (spec) {
    spec.page = this;
    spec.trans = this.trans;
    spec.session = this.session;
    // addded to this.emails array in ac_email.initialize() - calls addEmailRow()
    return Data.entities.get("ac_email").create(spec);
});


module.exports.define("addEmailRow", function (email_row) {
    if (this.emails.indexOf(email_row) !== -1) {
        this.warn("An email with id: " + email_row.id + " has already been queued");
    } else {
        this.emails.push(email_row);
    }
});

/**
* Send the emails queued to this page by calls to addEmail()
*/
module.exports.define("sendEmails", function () {
    var i;
    for (i = 0; i < this.emails.length; i += 1) {
        try {
            this.emails[i].send();
        } catch (e) {
            this.report(e);
        }
    }
});


/**
* Instantiate a new workflow starting with this page
* @param Record object representing the base record, workflow template id
* @return New workflow instance object
*/
module.exports.define("instantiateWorkflow", function (record, wf_tmpl_id, wf_inst_ref_field) {
    var wf_inst = Data.entities.get("ac_wf_inst").instantiate(this.getTrans(), wf_tmpl_id, record.getKey());
    wf_inst.first_node.getField("page").set(this.id);        // First node's page is just set to current page
    wf_inst.first_node.getField("title").set(this.title);
//    if (wf_inst.first_node.getField("page").get() !== this.id) {
//        this.throwError("first node page mismatch");
//            expected_page_id: wf_inst.first_node.getField("page").get() });
//    }
    this.addPerformingWorkflowNode(wf_inst.getKey(), wf_inst.first_node.getField("id").get());
    wf_inst.getField("title").set(record.getLabel("workflow_title"));
    if (wf_inst_ref_field) {
        record.getField(wf_inst_ref_field).set(wf_inst.getKey());
    }
    return wf_inst;
});


/**
* Called at beginning of save(); does nothing here - to be overridden
* @param outcome_id: text id string, 'save' by default
*/
module.exports.define("presave", function () {
    var i;
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).happen("presave");
    }
    this.happen("presave");
    this.trans.presave(this.outcome_id);
});


/**
* If page is valid, attempt to commit transaction; if failure occurs during save, page is cancelled
*/
module.exports.define("save", function () {
    var i;
    // All errors should be reported "locally", if appropriate for user
    if (!this.trans.isValid()) {
        this.error("Page.save() exiting - trans is initially not valid: " + this.trans.messages.getString());
//        this.trans.reportErrors();
        this.session.messages.add({
            type: "E",
            text: "not saved due to error",
        });
        this.moveToFirstErrorTab();
        return;
    }
    try {
        this.presave();
        if (!this.trans.isValid()) {
            this.debug("Page.save() cancelling - trans is not valid after presave()");
            this.throwError({
                type: "E",
                text: "not saved due to error",
            });
        }
        // if (this.performing_wf_nodes) {
        //     for (i = 0; i < this.performing_wf_nodes.length; i += 1) {
        //         this.performing_wf_nodes[i].complete(this.outcome_id);
        //     }
        // }
        // failures in performing_wf_nodes[i].complete() are irreversible
        // if (!this.trans.isValid()) {
        //     this.debug("Page.save() cancelling - trans is not valid after performing_wf_nodes[...].complete()");
        //     this.throwError({
        //         type: "E",
        //         text: "not saved due to error",
        //     });
        // }
        if (!this.allow_no_modifications && !this.trans.isModified()) {
            this.throwError({
                type: "W",
                text: "no changes made",
            });
        }
        this.trans.save(this.outcome_id);                    // commit transaction
        this.reportSaveMessage();
        this.happen("success");
        this.redirect_url = this.exit_url_save || this.exit_url
            || this.session.last_non_trans_page_url;
        this.sendEmails();
        this.http_status = 204;
        this.http_message = "saved";
        this.prompt_message = null;
        // clearPageCache() calls cancel() on ALL pages including this one, so set active false
        // first
        this.active = false;
    } catch (e) {
//        this.trans.reportErrors();
        if (e.type && e.text) {
            this.session.messages.add({
                text: e.text,
                type: e.type,
            });
        } else {
            this.report(e);
            this.session.messages.add({
                text: "save failed",
                type: "E",
            });
            this.session.messages.add({
                text: e,
                type: "E",
            });
        }

        this.error("Page.save() cancelling - trans.save() or sendEmails() failed: " + this.trans.messages.getString());
        this.happen("failure");
        this.cancel();
    }
});


module.exports.define("reportSaveMessage", function () {
    var text = "Saved";
    if (this.session.online) {
        // show undo link if online session and no auto steps involved
        if (this.trans.next_auto_steps_to_perform.length === 0 && !this.hide_undo_link_on_save) {
            text += " " + IO.XmlStream.left_bracket_subst + "a class='css_undo_link' href='" +
                UI.pages.get("ac_tx_undo").getSimpleURL(this.trans.id) +
                "&page_button=undo'" + IO.XmlStream.right_bracket_subst + "undo" +
                IO.XmlStream.left_bracket_subst + "/a" + IO.XmlStream.right_bracket_subst;
        }
    } else {
        text += " transaction: " + this.trans.id;
    }
    this.session.messages.add({
        type: "I",
        text: text,
    });
});

/**
* Cancel this page and redirect to previous one; throws Error if page is already not active
*/
module.exports.define("cancel", function (http_status, http_message) {
    if (this.active !== true) {
        this.throwError("subsequent call to cancel()");
    }
    this.http_status = http_status || 204;
    this.http_message = http_message || "cancelled";
    this.prompt_message = null;
    this.happen("cancel");
    this.redirect_url = (this.exit_url_cancel || this.exit_url
        || this.session.last_non_trans_page_url);
    if (this.trans && this.trans.active) {
        this.trans.cancel();
    }
    this.active = false;
});


// ---------------------------------------------------------------------------------------  render
/**
* Generate HTML output for this page, given its current state; calls renderSections,
* renderButtons, renderLinks, renderTabs, renderDetails
* <div id='css_payload_page'>
*   <div id='css_payload_page_sections'>
*   <div id='css_payload_page_buttons' class='css_hide'>
*   <div id='css_payload_page_links'   class='css_hide'>
*   <div id='css_payload_page_tabs'    class='css_hide'>
*   <div id='css_payload_page_details' class='css_hide'>
* @param xmlstream element object to be the parent of the page-level div element; render_opts is a
* map of settings: all_sections boolean (defaults false), include_buttons boolean (defaults true)
* @return xmlstream element object for the div.css_page element representing the page, which was
* added to the argument
*/
module.exports.define("render", function (element, render_opts) {
    var page_elem;
    this.render_error = false;

// SF - I'm trying this here - I want trans messages to be in the stack for one reload after the
// trans page is last current
//    this.session.messages.trans = this.trans;
    try {
        if (!this.active) {
            this.throwError("page not active");
        }
        if (typeof this.override_render_all_sections === "boolean") {
            render_opts.all_sections = this.override_render_all_sections;
        }
        page_elem = element.makeElement("div", null, "css_payload_page");
        // done in Display section update
        // if (this.getPrimaryRow() && !this.getPrimaryRow().modifiable) {
        //     this.getPrimaryRow().reload(this.page_key);
        // }
        this.happen("renderStart", {
            page_element: page_elem,
            render_opts: render_opts,
        });
        this.renderSections(page_elem, render_opts, this.page_tab ? this.page_tab.id : null);
        if (render_opts.include_buttons !== false) {
            this.renderButtons(page_elem, render_opts);
        }
        if (render_opts.show_links !== false) {
            this.renderLinks(page_elem, render_opts);
        }
        this.renderTabs(page_elem, render_opts);
        this.renderDetails(page_elem, render_opts);
        this.happen("renderEnd", {
            page_element: page_elem,
            render_opts: render_opts,
        });
    } catch (e) {
        this.report(e);
        // Better to output immediately in render stream, otherwise not reported until next visit
        this.render_error = true;
        this.throwError("Error in Page.render: [" + this.id + "] " + this.title);
    }
    return page_elem;
});


/**
* Call render() on each section that is associated with current tab or has no tab
* @param xmlstream page-level div element object; render_opts
* @return xmlstream div element object containing the section divs
*/
module.exports.define("renderSections", function (page_elem, render_opts, page_tab_id) {
    var sections_elem = page_elem.makeElement("div", null, "css_payload_page_sections");
    var div_elem;
    var row_span = 0;
    var i;
    var section;
    var tab;

    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);
        tab = section.tab && this.tabs.get(section.tab);
        if (section.visible && section.accessible !== false && (!tab || tab.visible)
                && (render_opts.all_sections || !tab || section.tab === page_tab_id)) {
            row_span += section.tb_span;
            if (!div_elem || row_span > 12) {
                div_elem = sections_elem.makeElement("div", "row");
                row_span = section.tb_span;
            }
            section.render(div_elem, render_opts);
        }
    }
    return sections_elem;
});


module.exports.define("renderDetails", function (page_elem, render_opts) {
    var details_elmt = page_elem.makeElement("div", "css_hide", "css_payload_page_details");
    var area = this.getArea();
    var entity_search_page;

    details_elmt.attr("data-page-id", this.id);
    details_elmt.attr("data-page-skin", this.skin);
    details_elmt.attr("data-page-title", this.getPageTitle());
    details_elmt.attr("data-area-id", (area && area.id) || "");
    details_elmt.attr("data-page-key", this.page_key || "");
    details_elmt.attr("data-page-glyphicon", this.glyphicon || (this.entity && this.entity.glyphicon) || (area && area.glyphicon) || "");
    if (this.description) {
        details_elmt.attr("data-page-description", this.description);
    }
    if (this.page_tab) {
        details_elmt.attr("data-page-tab", this.page_tab.id);
    }
    if (this.browser_timeout) {
        details_elmt.attr("data-browser-timeout", String(this.browser_timeout));
    }
    if (this.prompt_message) {
        details_elmt.attr("data-prompt-message", this.prompt_message);
    }
    if (!this.challenge_token) {
        this.challenge_token = Core.Format.getRandomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    details_elmt.attr("data-challenge-token", this.challenge_token);
    if (this.entity) {
        entity_search_page = this.entity.getSearchPage();
        if (entity_search_page && entity_search_page.id !== this.id
                && entity_search_page.allowed(this.session).access) {
            details_elmt.attr("data-search-page", entity_search_page.id);
        }
        if (this.session.refer_sections && this.session.refer_sections[this.id]
                && this.page_key && this.session.refer_sections[this.id].outputNavLinks) {
            this.session.refer_sections[this.id].outputNavLinks(this.page_key, details_elmt);
        }
    }
});


/**
* Create the digest object returned in JSON form as the response to an HTTP POST
* @return Digest object containing tabs, links, and various other properties of the page
*/
module.exports.define("getJSON", function () {
    var out = {};
    var area = this.getArea();
    var entity_search_page;
    var i;

    out.id = this.id;
    out.skin = this.skin;
    out.title = this.getPageTitle();
    out.area = area && area.id;
    out.prompt_message = this.prompt_message;
    if (this.page_key) {
        out.page_key = this.page_key;
    }
    if (this.description) {
        out.description = this.description;
    }
    if (this.browser_timeout) {
        out.browser_timeout = this.browser_timeout;
    }
    if (this.redirect_url) {
        if (this.session.allowedURL(this.redirect_url, true)) {
            this.debug("Redirecting to: " + this.redirect_url);
            out.redirect_url = this.redirect_url;
        } else {
            this.debug("Redirect URL not allowed: " + this.redirect_url + "; going home: " + this.session.home_page_url);
            // go home if target page is not allowed / does not exist
            out.redirect_url = this.session.home_page_url;
        }
        if (this.redirect_new_window) {
            out.redirect_new_window = this.redirect_new_window;
        }
        delete this.redirect_url;     // allow redirect to this page, to wipe URL parameters
    }
    if (this.page_tab) {
        out.page_tab = this.page_tab.id;
    }
    if (this.entity) {
        entity_search_page = this.entity.getSearchPage();
//        this.trace("Search Page: " + entity_search_page);
        if (entity_search_page && entity_search_page.id !== this.id
                && entity_search_page.allowed(this.session).access) {
            out.entity_search_page = entity_search_page.id;
        }
        if (this.session.refer_section && this.session.refer_section.entity === this.entity.id
                && this.page_key && this.session.refer_section.outputNavLinks) {
            this.session.refer_section.outputNavLinks(this.page_key, out);
        }
    }
    out.glyphicon = this.glyphicon
        || (this.entity && this.entity.glyphicon)
        || (area && area.glyphicon);
    out.tabs = [];
    for (i = 0; i < this.tabs.length(); i += 1) {
        if (this.tabs.get(i).visible) {
            out.tabs.push(this.tabs.get(i).getJSON());
        }
    }
    out.links = [];
    for (i = 0; i < this.links.length(); i += 1) {
        if (this.links.get(i).isVisible(this.session, null, this.primary_row)) {
            out.links.push(this.links.get(i).getJSON());
        }
    }
    out.includes = [];
    for (i = 0; this.includes && i < this.includes.length; i += 1) {
        out.includes.push(this.includes[i]);
    }
    return out;
});


/**
* Create an object to be output as JSON containing additional data requested as a separated HTTP
* request
* @param params object representing the HTTP parameters
* @return Digest object containing additional data, perhaps according to HTTP parameters
*/
module.exports.define("extraJSON", function (params) {
    return undefined;
});


/**
* Add argument field to page's map of fields, throwing an exception if the control id is already
* in use
* @param Field object to add to the page's map
*/
module.exports.define("addField", function (field) {
    var control = field.getControl();
    this.trace("Adding field " + field + " to page.fields with control: " + control);
    if (this.fields[control]) {
        this.throwError("field with this control already exists: " + control);
    }
    this.fields[control] = field;
});


/**
* Remove argument field from page's map of fields
* @param Field object to remove from the page's map
*/
module.exports.define("removeField", function (field) {
    delete this.fields[field.getControl()];
});


/**
* Return the singleton Transaction object belonging to this Page instance, creating it if necessary
* @return Transaction object belonging to this Page instance
*/
module.exports.define("getTrans", function () {
    if (!this.trans) {
        this.trans = this.session.getNewTrans({
            page: this,
            allow_no_modifications: this.allow_no_modifications,
        });
    }
    return this.trans;
});


/**
* Returns the primary row of this page, if it has one
* @return Descendent of Entity object, modifiable if the page is transactional
*/
module.exports.define("getPrimaryRow", function () {
    if (!this.primary_row) {
        if (this.transactional) {
            if (!this.entity) {
                return null;
//                this.throwError("transaction page must specify entity");
            }
            if (this.page_key_entity) {        // Setting for page_key to relate to different entity
                this.primary_row = this.getTrans().createNewRow(this.entity.id);
            } else if (this.page_key) {
                this.primary_row = this.getTrans().getActiveRow(this.entity.id, this.page_key);
            } else {
                this.primary_row = this.getTrans().createNewRow(this.entity.id);
            }
        } else if (this.entity && this.page_key) {
            this.primary_row = this.entity.getRow(this.page_key);        // non-transaction
        }
        if (this.primary_row && this.primary_row.messages) {
            this.primary_row.messages.prefix = "";              // avoid prefix text in messages
        }
    }
    if (!this.full_title && this.primary_row && this.primary_row.action !== "C") {
        this.full_title = this.title + ": " + this.primary_row.getLabel("page_title_addl");
    }
    return this.primary_row;
});


/**
* Returns the minimal query string referencing this page, including its page_key if it has one
* @return Relative URL, i.e. '{skin}#page_id={page id}[&page_key={page key}]'
*/
module.exports.define("getSimpleURL", function (override_key) {
    var page_key = override_key || this.page_key;
    return this.skin + "#page_id=" + this.id + (page_key ? "&page_key=" + page_key : "");
});


/**
* Returns the page title text string
* Page title text string
*/
module.exports.define("getPageTitle", function () {
    return this.full_title;
});


module.exports.define("addPerformingWorkflowNode", function (inst_id, node_id) {
    var wf_inst;
    var inst_node;

    if (!this.performing_wf_nodes) {
        this.performing_wf_nodes = [];
    }

    this.debug("addPerformingWorkflowNode, inst_id: " + inst_id + ", node_id: " + node_id);
    wf_inst = Data.entities.get("ac_wf_inst").retrieve(this.getTrans(), inst_id);
    inst_node = wf_inst.getNode(node_id);
    inst_node.page = this;
    this.performing_wf_nodes.push(inst_node);
    this.automatic = this.automatic || inst_node.getField("attributes").isItem("AU");
    if (inst_node.params) {
        this.addProperties(inst_node.params);
    }
    return inst_node;
});


module.exports.define("challengeTokenOkay", function (params) {
    var msg;
    // Only check the challenge token if it has been created (through a call to page.render())
    if (this.challenge_token) {
        if (!params.challenge_token) {
            msg = "no challenge token";
        } else if (params.challenge_token !== this.challenge_token) {
            msg = "incorrect challenge token";
        }
    } else if (params.challenge_token) {
        msg = "page lost on server side, restarting...";
    }
    if (msg) {
        this.session.messages.add({
            type: "E",
            text: msg,
        });
    }
    return !msg;
});


module.exports.define("setRedirectUrl", function (obj, params) {
    if (this.login_redirect_url) {
        this.throwError("not done");
        // if (!obj.hasOwnProperty("page")) {
        //     obj.page = {};
        // }
        // params.page_id = this.login_redirect_url;
        // obj.page.redirect_url = Lib.joinParams(params);
    }
});


module.exports.define("keepAfterNavAway", function () {
    if (typeof this.keep_after_nav_away === "boolean") {
        return this.keep_after_nav_away;
    }
    return this.transactional;
});
