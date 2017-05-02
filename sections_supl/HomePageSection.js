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


module.exports.override("makeSectionTitle", function (heading_elmt, render_opts) {
    var temp_title = this.title || this.generated_title;
    var new_elmt;
    if (temp_title) {
        new_elmt = heading_elmt.makeElement("h4", "panel-title");
        if (this.section_heading_page_id && !this.section_heading_url) {
            this.section_heading_url = UI.pages.get(this.section_heading_page_id)
                .getSimpleURL();
        }
        if (this.section_heading_url) {
            new_elmt = new_elmt.makeElement("a");
            new_elmt.attr("href", this.section_heading_url);
        }
        new_elmt.text(temp_title);
    }
});


module.exports.define("renderLinkOrText", function (element, url, text, css_class, no_link_text) {
    if (this.owner.page.session.allowedURL(url)) {
        element = element.makeElement("a", css_class);
        element.attr("href", url);
        element.text(text, true);
    } else if (no_link_text) {
        element.text(no_link_text, true);
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
    var curr_title;
    var prev_title;
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
        if (curr_title !== prev_title) {
            if (task_array) {
                this.addTasksFromArray(this.tasks_ul_elem, prev_title, task_array);
            }
            prev_title = curr_title;
            task_array = [];
        }
        task_array.push(this.addWorkflowTaskRecord(query, sctn_title, today));
        count += 1;
    }
    query.reset();
    if (task_array) {
        this.addTasksFromArray(this.tasks_ul_elem, curr_title, task_array);
    }
    return count;
});


module.exports.define("addWorkflowTaskRecord", function (query, sctn_title, today) {
    var page = UI.pages.get(query.getColumn("A.page").get());
    var task_obj = {
        id: query.getColumn("A._key").get(),
        title: query.getColumn("B.title").get(),
        url: page.getSimpleURL(query.getColumn("A.page_key").get()),
    };
    var due_date = query.getColumn("A.due_date").get();
    if (this.tasks_title !== sctn_title) {
        this.getSectionElement();                // sets this.sctn_elem
        this.sctn_elem.makeElement("br");
        this.sctn_elem.makeElement("h5").text(sctn_title);
        this.tasks_title = sctn_title;
        this.tasks_ul_elem = null;
    }
    if (!this.tasks_ul_elem) {
        this.tasks_ul_elem = this.sctn_elem.makeElement("ul", "nav nav-pills css_task_group");
    }
    task_obj.overdue = (due_date && due_date < today);
    return task_obj;
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
    outer_li_elem = outer_ul_elem.makeElement("li", "dropdown task-dropdown");
    outer_a_elem = outer_li_elem.makeElement("a", "dropdown-toggle");
    outer_a_elem.attr("data-toggle", "dropdown");
    outer_a_elem.attr("href", "#");
    count_underdue = task_array.length - count_overdue;
    badge_elem = outer_a_elem.makeElement("div", "css_task_badge");
    if (count_underdue > 0) {
        badge_elem.makeElement("div", "badge badge-info", count_underdue.toFixed(0));
    }
    if (count_overdue > 0) {
        badge_elem.makeElement("div", "badge badge-important", count_overdue.toFixed(0));
    }
    outer_a_elem.makeElement("span", "task-menu").text(curr_title);
    outer_a_elem.makeElement("b", "caret task-caret");
    inner_ul_elem = outer_li_elem.makeElement("ul", "dropdown-menu");
    for (i = 0; i < task_array.length && i < this.max_tasks_to_show_per_dropdown; i += 1) {
        inner_li_elem = inner_ul_elem.makeElement("li");
        inner_a_elem = inner_li_elem.makeElement("a", task_array[i].id);
        inner_a_elem.attr("href", task_array[i].url);
        if (task_array[i].overdue) {
            inner_a_elem.makeElement("span", "label label-important").text("Overdue");
            inner_a_elem.text(" ");
        }
        inner_a_elem.text(task_array[i].title);
    }
    if (task_array.length >= this.max_tasks_to_show_per_dropdown) {
        inner_li_elem = inner_ul_elem.makeElement("li");
        inner_a_elem = inner_li_elem.makeElement("a");
        inner_a_elem.attr("href", UI.pages.get("wf_tasks").getSimpleURL());
        inner_a_elem.text("More...");
    }
});


module.exports.define("replaceLastCommaWithAnd", function (str) {
    var index = str.lastIndexOf(",");
    if (index > -1) {
        str = str.substr(0, index) + " and " + str.substr(index + 1);
    }
    return str;
});
