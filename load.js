/*jslint node: true */
"use strict";

var Section = require("./Section");

require("./Page");
require("./Page.Tab");
require("./Page.Link");
require("./Page.Button");

Section.registerSectionType(require("./FormBase"));
Section.registerSectionType(require("./Create"));
Section.registerSectionType(require("./Delete"));
Section.registerSectionType(require("./Display"));
Section.registerSectionType(require("./FormParams"));
Section.registerSectionType(require("./Update"));

Section.registerSectionType(require("./ListBase"));
require("./ListBase.Column");
Section.registerSectionType(require("./ListQuery"));
Section.registerSectionType(require("./ListUpdate"));

Section.registerSectionType(require("./Search"));
require("./Search.Criterion");
require("./Search.Filter");
require("./Search.MultiFilter");
require("./Search.RadiusFilter");
require("./Search.ScalarFilter");

Section.registerSectionType(require("./ChangeHistory"));
Section.registerSectionType(require("./Chart"));
