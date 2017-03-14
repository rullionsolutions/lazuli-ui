/* global module, require */

"use strict";

var Test = require("lazuli-test/UnitTests.js");
var SQL = require("lazuli-sql/index.js");

module.exports = Test.clone({
    id: "UnitTestPage",
});

module.exports.override("test", function () {
    var session = this.changeSession("batch");
    var page;
    var page2;

    // Session tests
    this.assert(session.user_name === "Batch Run", "User name is Batch Run");
    this.assert(typeof session.id === "string" && !isNaN(session.id), "session id is a string, storing a number");
    this.assert(session.active === true, "session is active");
    this.assert(session.visits === 0, "session visits = 0");
    this.assert(session.messages.number === 1, "session messages = 1");
    if (session.id === "1") {
        this.assert(session.messages.getString().indexOf("This is your first log-in") === 0, "session message string begins 'This is your first log-in'");
    } else {
        this.assert(session.messages.getString().indexOf("Welcome back! You last logged in on ") === 0, "session message string begins 'Welcome back! You last logged in on '");
    }

    page = session.getPage("sy_list_search");       // changed from 'home' as will probably change less going forwards
    this.assert(page.id === "sy_list_search", "page id is 'sy_list_search'");
    this.assert(page.toString() === "/Base/Page/sy_list_search/sy_list_search", "page toString() is '/Base/Page/sy_list_search/sy_list_search'");
    this.assert(page.active === true, "page is active");
    this.assert(session.visits === 0, "session visits still = 0");
    this.assert(session.messages.number === 1, "session messages still = 1");
    this.assert(session.visits === 0, "session visits = 0");
    this.assert(typeof page.page_key === "undefined", "page_key is undefined");
    this.assert(page.tabs.length() === 0, "sy_list_search page has 0 tabs");
    // this.assert(page.tabs.get(0).id === "details", "home page tab id = 'details'");
    // this.assert(page.tabs.get(0).label === "Details", "home page tab label = 'Details'");
    // this.assert(page.tabs.get(0).visible === true, "home page tab is visible");
    this.assert(page.sections.length() === 1, "sy_list_search page has 1 section (search)");
    this.assert(page.sections.get(0).id === "main", "sy_list_search page section 0 id = 'main'");
    this.assert(page.sections.get(0).type === "Search", "sy_list_search page section 0 type = 'Search'");
    this.assert(page.sections.get(0).tab === undefined, "sy_list_search page section 0 tab = undefined");
    this.assert(page.sections.get(0).entity === "sy_list", "sy_list_search page section 0 entity = sy_list");
    this.assert(page.links.length() === 1, "sy_list_search page has 1 link");
    this.assert(page.links.get(0).id === "create", "sy_list_search page link 0 id = 'create'");
    this.assert(page.links.get(0).page_to === "sy_list_create", "sy_list_search page link 0 type = 'sy_list_create'");
    this.assert(page.buttons.length() === 0, "sy_list_search page has 0 buttons");
    page.update({});
    this.assert(page.active === true, "page is still active after update");
    this.assert(session.visits === 1, "session visits = 1");
    this.assert(session.messages.number === 1, "session messages still = 1");
    this.assert(session.getPage("sy_list_search") === page, "session getPage(sy_list_search) returns same object");
    page.cancel();
    this.assert(page.active === false, "page is not active after cancel");
    page2 = session.getPage("sy_list_search");
    this.assert(page.active === false, "page is not active after cancel");
    this.assert(page2.active === true, "new page is active after getPage()");


    SQL.connection.executeUpdate("DELETE FROM ac_user WHERE id LIKE 'quent%'");
    SQL.connection.executeUpdate("DELETE FROM ac_user_role WHERE user_id NOT IN ( SELECT _key FROM ac_user )");
    SQL.connection.executeUpdate("DELETE FROM ac_user_deleg WHERE delegater NOT IN ( SELECT _key FROM ac_user )");
    SQL.connection.executeUpdate("DELETE FROM ac_user_deleg WHERE delegatee NOT IN ( SELECT _key FROM ac_user )");


    page = session.getPage("ac_user_create");
    this.assert(page.sections.get(0).fieldset.modifiable === true, "New User record is modifiable - initial create, no values supplied");
    // this.assert(page.sections.get(0).record.row_number === 0, "New User record number = 0");
    this.assert(page.sections.get(0).fieldset.getKey() === "", "New User record key is ''");
    this.assert(page.sections.get(0).fieldset.isValid() === false, "New User record is NOT valid");
    this.assert(page.trans.isValid() === false, "Page transaction is NOT valid");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === false, "Page transaction is NOT modified");
    this.assert(page.trans.getRowCount() === 1, "Page transaction row count = 1");
    this.assert(page.trans.getPartialKeyRowCount() === 1, "Page transaction has 1 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 0, "Page transaction has 0 full-key row");

    page.update({
        create_id: "quentin",
        create_name: "Tarantino, Quentin",
        create_email: "quentin.tarantino@gmail.com",
        create_user_type: "ac.core",
    });
    this.assert(page.trans.isValid() === true, "Page transaction is valid - initial create, after values supplied");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 1, "Page transaction row count = 1");
    this.assert(page.trans.getPartialKeyRowCount() === 0, "Page transaction has 0 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 1, "Page transaction has 1 full-key row");

    page.update({
        page_button: "save",
    });
    this.assert(page.trans.saved, "Create page saved successfully - 1st create");


    page = session.getPage("ac_user_create");
    page.update({
        page_button: "add_row_field_roles",
        add_row_field_roles: "rl_vr_admin",
    });     // added before key defined
    page.update({
        create_id: "quentin",
        create_name: "Tarantino, Quentin",
        create_email: "quentin.tarantino@gmail.com",
        create_user_type: "ac.core",
    });      // dupl key
    this.assert(page.sections.get(0).fieldset.getKey() === "quentin", "New User record key is 'quentin' - even though is duplicate");
    this.assert(page.sections.get(0).fieldset.isValid() === false, "New User record is NOT valid");
    this.assert(page.trans.isValid() === false, "Page transaction is NOT valid");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 2, "Page transaction row count = 2");
    this.assert(page.trans.getPartialKeyRowCount() === 2, "Page transaction has 2 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 0, "Page transaction has 0 full-key row");

    page.update({
        page_button: "save",
    });

    this.assert(!page.trans.saved, "Create page does not save - 2nd create");


    page.update({
        create_id: "quentin2",
        create_email: "quentin.tarantino@hotmail.com",
    });
    this.assert(page.trans.isValid() === true, "Page transaction is valid - key changed to one that doesn't already exist");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 2, "Page transaction row count = 2");
    this.assert(page.trans.getPartialKeyRowCount() === 0, "Page transaction has 0 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 2, "Page transaction has 2 full-key row");
    page.update({
        page_button: "save",
    });
    this.assert(page.trans.saved, "Create page saved successfully - 2nd create");


    page = session.getPage("ac_user_update", "quentin");
    this.assert(page.sections.get(0).fieldset.modifiable === true, "User record is modifiable - 1st update");
    // this.assert(page.sections.get(0).fieldset.row_number === 0, "User record number = 0");
    this.assert(page.sections.get(0).fieldset.getKey() === "quentin", "User record key is 'quentin'");
    this.assert(page.sections.get(0).fieldset.isValid() === true, "User record is valid");
    this.assert(page.trans.isValid() === true, "Page transaction is valid");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === false, "Page transaction is not modified");
    this.assert(page.trans.getRowCount() === 1, "Page transaction row count = 1");
    this.assert(page.trans.getPartialKeyRowCount() === 0, "Page transaction has 0 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 1, "Page transaction has 1 full-key row");

    page.update({
        page_button: "add_row_field_roles",
        add_row_field_roles: "rl_ts_admin",
    });
    this.assert(page.trans.isValid() === true, "Page transaction is valid - new role sub-record added");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 2, "Page transaction row count = 2");
    this.assert(page.trans.getPartialKeyRowCount() === 0, "Page transaction has 0 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 2, "Page transaction has 2 full-key row");

    page.update({
        page_button: "list_add_deleg",
    });
    this.assert(page.trans.isValid() === true, "Page transaction is valid - TODO delegate sub-record added, but no key yet");
    // this.assert(page.trans.isValid() === false, "Page transaction is NOT valid - delegate sub-record added, but no key yet");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 3, "Page transaction row count = 3");
    this.assert(page.trans.getPartialKeyRowCount() === 1, "Page transaction has 1 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 2, "Page transaction has 2 full-key row");

    // page.update({ page_button: "save" });
    // this.assert(!page.trans.saved, "Update page does not save - 1st update");

    page.update({
        deleg_0_delegatee: "batch",
    });
    this.assert(page.trans.isValid() === true, "Page transaction is valid - key of new delegate sub-record supplied");
    this.assert(page.trans.isActive() === true, "Page transaction is active");
    this.assert(page.trans.isModified() === true, "Page transaction is modified");
    this.assert(page.trans.getRowCount() === 3, "Page transaction row count = 3");
    this.assert(page.trans.getPartialKeyRowCount() === 0, "Page transaction has 0 partial-key row");
    this.assert(page.trans.getFullKeyRowCount() === 3, "Page transaction has 3 full-key row");

    page.update({
        page_button: "save",
    });
    this.assert(page.trans.saved, "Update page saved successfully - 1st update");

    if (!page.trans.saved) {
        page.cancel();
    }

    page = session.getPage("ac_user_delete", "quentin");
    page.update({
        page_button: "save",
    });
    this.assert(page.trans.saved, "Delete page saved successfully");

    page = session.getPage("ac_user_delete", "quentin2");
    page.update({
        page_button: "save",
    });
    this.assert(page.trans.saved, "Delete page saved successfully");
});
