/*jslint node: true */
"use strict";

var Page      = require("../Page_Server"),
    XmlStream = require("../../io/XmlStream"),
    Promise   = require("q"),
    Log       = require("../../base/Log");

//Log.level = Log.levels.debug;

function testPage(test, page, params, render_opts, expect) {
    var xmlstream = XmlStream.clone({ id: "div" });
    test.expect(Object.keys(expect).length);

    function check(expect_prop_id, actual) {
        if (expect[expect_prop_id]) {
            test.equal(expect[expect_prop_id], actual, page.id + " - " + expect_prop_id + " is " + actual + ", should be " + expect[expect_prop_id]);
        }
    }
    page.post(params, xmlstream, render_opts, function (http_status, http_message, redirect_url) {
        check("http_status" , http_status);
        check("http_message", http_message);
        check("redirect_url", redirect_url);
        check("xmlstream"   , xmlstream.out.collector);
//        def.resolve(http_status);
        test.done();
    });
//    return def.promise;
}

module.exports.main = function (test) {
    var page;
    page = Page.clone({ id: "page1", instance: true });
    testPage(test, page, {}, null, { http_status: 200, http_message: "OK" });
};

module.exports.cancelInSetup = function (test) {
    var page = Page.clone({ id: "page1", instance: true });
    page.define("testCancel", function () {
        this.cancel(999, "Test Cancel");
    });
    page.bind("testCancel", "setupEnd");
    testPage(test, page, {}, null, { http_status: 999, http_message: "Test Cancel" });
};

module.exports.cancelTwice = function (test) {
    var page = Page.clone({ id: "page1", instance: true });
    page.define("testCancel", function () {
        this.cancel(999, "Test Cancel");
    });
    page.bind("testCancel", "setupEnd");
    page.define("testCancel2", function () {
        this.cancel(999, "Test Cancel2");
    });
    page.bind("testCancel2", "setupEnd");
    testPage(test, page, {}, null, { http_status: 999, http_message: "Test Cancel" });
};



module.exports.basicXmlstream1 = function (test) {
    var page = Page.clone({ id: "page1", instance: true });
    page.tabs.add({ id: "tab", label: "blah" });
    testPage(test, page, {}, null, { http_status: 200, http_message: "OK", xmlstream: "<div><div class='css_page_tabs'><li id='tab'><a>blah</a></li></div></div>" });
};

module.exports.basicXmlstream2 = function (test) {
    var page = Page.clone({ id: "page1", instance: true });
    page.tabs.add({ id: "tab", label: "blah" });
    page.tabs.get("tab").visible = false;
    page.buttons.add({ id: "some_button", label: "Click Me" });
    testPage(test, page, {}, null, { http_status: 200, http_message: "OK", xmlstream: "<div><div class='css_page_buttons'><button id='some_button' class='btn css_cmd'>Click Me</button></div></div>" });
};
