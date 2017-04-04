"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");


module.exports = UI.Section.clone({
    id: "HomePageSection",
    tb_span: 3,
//    hide_section_if_empty: true,
    max_tasks_to_show_per_dropdown: 10,
});


module.exports.override("getSectionElement", function (render_opts) {
    var temp_title;
    var anchor;

    if (!this.sctn_elem) {
        this.sctn_elem = this.parent_elem.addChild("div", this.id, this.getCSSClass());
        temp_title = this.title || this.generated_title;
        if (temp_title) {
            anchor = this.sctn_elem.addChild("h2", null, "css_section_title");
            if (this.section_heading_url) {
                anchor = anchor.addChild("a");
                anchor.attribute("href", this.section_heading_url);
            }
            if (this.glyphicon) {
                anchor.addChild("i", null, "glyphicon glyphicon-" + this.glyphicon);
            }
            anchor.addText(temp_title);
        }
        if (this.text) {
            this.sctn_elem.addChild("div", null, "css_section_text").addText(this.text, true);    // Valid XML content
        }
    }
    return this.sctn_elem;
});


// module.exports.override("getCSSClass", function (render_opts) {
//     return Parent.getCSSClass.call(this) + " well";
// });


module.exports.define("renderLinkOrText", function (element, url, text, css_class, no_link_text) {
    if (this.owner.page.session.allowedURL(url)) {
        element = element.addChild("a", null, css_class);
        element.attribute("href", url);
        element.addText(text, true);
    } else if (no_link_text) {
        element.addText(no_link_text, true);
    }
});


module.exports.define("renderSingleBadgeLine", function (element, props) {
    var badge_types = [
        "important",
        "warning",
        "success",
        "info",
    ];
    var badge_class = "";
    var conn;
    var resultset;
    var min_exist;
    var max_exist;
    var ge_min;
    var le_max;
    var i;

    if (!props.sql && typeof props.number !== "number") {
        this.throwError("must specify 'sql' or 'number'");
    }
    if (props.sql) {
        conn = SQL.Connection.getQueryConnection("renderSingleBadgeLine");
        try {
            resultset = conn.executeQuery(props.sql);
            resultset.next();
            props.number = resultset.getInt(1);
        } catch (e) {
            this.report(e);
            props.number = "err";
        }
        conn.finishedWithConnection();
    }
    if (typeof props.show_min === "number" && props.number < props.show_min) {
        return null;
    }
    if (typeof props.show_max === "number" && props.number > props.show_max) {
        return null;
    }

    for (i = 0; i < badge_types.length && !badge_class; i += 1) {
        min_exist = (typeof props[badge_types[i] + "_min"] === "number");
        max_exist = (typeof props[badge_types[i] + "_max"] === "number");
        ge_min = (props.number >= props[badge_types[i] + "_min"]);
        le_max = (props.number <= props[badge_types[i] + "_max"]);
        if ((min_exist && !max_exist && ge_min) || (max_exist && !min_exist && le_max)
                || (min_exist && max_exist && ge_min && le_max)) {
            badge_class = badge_types[i];
        }
    }
    if (badge_class === "important") {
        badge_class = "danger";
    }
    badge_class = " list-group-item list-group-item-" + badge_class;
    if (props.url && this.owner.page.session.allowedURL(props.url)) {
        props.anchor_css_class = (props.anchor_css_class || "") + badge_class;
        element = element.makeAnchor(props.anchor_pre_label, props.url,
            props.anchor_css_class, null, props.hover_text, props.target);
    } else {
        element = element.makeElement("li", badge_class);
    }
    element.makeElement("span", "badge" /* + badge_class*/).text(String(props.number));
    if (props.text) {
        element.text("&nbsp;" + props.text);
        // element.makeElement("span", "label label-" + badge_class).text(props.text);
    }
    return element;
});


module.exports.define("addAssignedWorkflowTasks", function (user_id, wf_type_id) {
    var query = Data.entities.get("wf_inst_node").getQuery();
    query.addCondition({
        column: "A.assigned_user",
        operator: "=",
        value: user_id,
    });
    query.addCondition({
        column: "B.wf_type",
        operator: "=",
        value: wf_type_id,
    });
    return this.addWorkflowTasks(query, "Tasks Assigned to You");
});


module.exports.define("addDelegatedWorkflowTasks", function (sql_condition, wf_type_id) {
    var query;
    if (!sql_condition) {
        return 0;
    }
    query = Data.entities.get("wf_inst_node").getQuery();
    query.addCondition({
        full_condition: "A.assigned_user in (" + sql_condition +
            ") and (instr(ifnull(A.attributes, ''), 'PD') = 0)",
    });
    query.addCondition({
        column: "B.wf_type",
        operator: "=",
        value: wf_type_id,
    });
    return this.addWorkflowTasks(query, "Tasks Delegated to You");
});


module.exports.define("addWorkflowTasks", function (query, sctn_title) {
    var today = Date.parse("today");
    var task_obj;
    var curr_title;
    var prev_title;
    var due_date;
    var task_array;
    var count = 0;

    query.addTable({
        table: "wf_inst",
        join_cond: "?._key=A.wf_inst",
    }).addColumn({ name: "title", });
    query.getColumn("A.title").sortTop();
    query.addCondition({
        column: "A.status",
        operator: "=",
        value: "A",         // active nodes
    });
    query.addCondition({
        column: "A.attributes",
        operator: "CO",
        value: "ST",        // show in taskbar
    });
    while (query.next()) {
        curr_title = query.getColumn("A.title").get();
        if (this.tasks_title !== sctn_title) {
            this.getSectionElement();                // sets this.sctn_elem
            this.sctn_elem.addChild("br");
            this.sctn_elem.addChild("h5", null, null, sctn_title);
            this.tasks_title = sctn_title;
            this.tasks_ul_elem = null;
        }
        if (!this.tasks_ul_elem) {
            this.tasks_ul_elem = this.sctn_elem.addChild("ul", null, "nav nav-pills css_task_group");
        }
        if (curr_title !== prev_title) {
            if (task_array) {
                this.addTasksFromArray(this.tasks_ul_elem, prev_title, task_array);
            }
            prev_title = curr_title;
            task_array = [];
        }
        task_obj = {
            id: query.getColumn("A._key").get(),
            title: query.getColumn("B.title").get(),
//            url  : query.getColumn("A.simple_url").get()
            url: "index.html?page_id=" + query.getColumn("A.page").get(),
        };
        if (query.getColumn("A.page_key").get()) {
            task_obj.url += "&page_key=" + query.getColumn("A.page_key").get();
        }
        task_array.push(task_obj);
        due_date = query.getColumn("A.due_date").get();
        task_obj.overdue = (due_date && due_date < today);
        count += 1;
    }
    query.reset();
    if (task_array) {
        this.addTasksFromArray(this.tasks_ul_elem, curr_title, task_array);
    }
    return count;
});


module.exports.define("addTasksFromArray", function (outer_ul_elem, curr_title, task_array) {
    var outer_li_elem;
    var outer_a_elem;
    var badge_elem;
    var inner_ul_elem;
    var inner_li_elem;
    var inner_a_elem;
    var count_underdue = 0;
    var count_overdue = 0;
    var i;

    for (i = 0; i < task_array.length; i += 1) {
        if (task_array[i].overdue) {
            count_overdue += 1;
        }
    }
    outer_li_elem = outer_ul_elem.addChild("li", null, "dropdown task-dropdown");
    outer_a_elem = outer_li_elem.addChild("a", null, "dropdown-toggle");
    outer_a_elem.attribute("data-toggle", "dropdown");
    outer_a_elem.attribute("href", "#");
    count_underdue = task_array.length - count_overdue;
    badge_elem = outer_a_elem.addChild("div", null, "css_task_badge");
    if (count_underdue > 0) {
        badge_elem.addChild("div", null, "badge badge-info", count_underdue.toFixed(0));
    }
    if (count_overdue > 0) {
        badge_elem.addChild("div", null, "badge badge-important", count_overdue.toFixed(0));
    }
    outer_a_elem.addChild("span", null, "task-menu", curr_title);
    outer_a_elem.addChild("b", null, "caret task-caret");
//    outer_li_elem.addChild("b", null, null, curr_title);
    inner_ul_elem = outer_li_elem.addChild("ul", null, "dropdown-menu");
    for (i = 0; i < task_array.length && i < this.max_tasks_to_show_per_dropdown; i += 1) {
        inner_li_elem = inner_ul_elem.addChild("li");
        inner_a_elem = inner_li_elem.addChild("a", task_array[i].id);
        inner_a_elem.attribute("href", task_array[i].url);
        if (task_array[i].overdue) {
            inner_a_elem.addChild("span", null, "label label-important", "Overdue");
            inner_a_elem.addText(" ");
        }
        inner_a_elem.addText(task_array[i].title);
    }
    if (task_array.length >= this.max_tasks_to_show_per_dropdown) {
        inner_li_elem = inner_ul_elem.addChild("li");
        inner_a_elem = inner_li_elem.addChild("a");
        inner_a_elem.attribute("href", "index.html?page_id=wf_tasks");
        inner_a_elem.addText("More...");
    }
});


module.exports.define("replaceLastCommaWithAnd", function (str) {
    var index = str.lastIndexOf(",");
    if (index > -1) {
        str = str.substr(0, index) + " and " + str.substr(index + 1);
    }
    return str;
});
