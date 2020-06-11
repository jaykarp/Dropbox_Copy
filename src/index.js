import { Dropbox } from "dropbox";
import css from "./styles.css";

/**
 * Build's tree data structure from Dropbox API information.
 * This function reads an array of file/folder paths and recursively builds JSON-like tree.
 *
 * @param {DropboxTypes.files.ListFolderResult} data - The result of a Dropbox API call for files and folders.
 *
 */

const buildTree = data => {
    const output = {};
    let current;

    for (const entries of data.entries) {
        current = output;
        for (const segment of entries.path_lower.split("/")) {
            if (segment !== "") {
                if (!current["children"]) {
                    current["children"] = {};
                }
                if (!(segment in current.children)) {
                    current["children"][segment] = { ...entries };
                }
                current = current["children"][segment];
            }
        }
    }

    return output;
};

/**
 * Creates list structure from buildTree output
 *
 * @param {object} tree - The result of the buildTree function on the Dropbox API call
 * @parent {HTMLElement} parent - The HTMLElement where the tree should be built from (default is document.body)
 *
 */
const displayTree = (
    tree,
    parent = document.body,
    includeFiles = true,
    depth = 0
) => {
    if (!tree.children) {
        return;
    }

    let ul;

    if (!depth) {
        ul = createAndAppend("ul", parent, { classList: "myUL" });
        depth += 1;
    } else {
        ul = createAndAppend("ul", parent, { classList: "nested" });
    }

    for (const child in tree.children) {
        const li = createAndAppend("li", ul);
        if (tree.children[child][".tag"] === "folder") {
            const folder = createAndAppend("span", li, {
                classList: "caret",
                innerHTML: child
            });
            createAndAppend("input", folder.parentElement, {
                type: "checkbox",
                name: "checkbox",
                value: tree.children[child].path_lower
            });
        } else {
            li.innerHTML = child;
            if (includeFiles) {
                createAndAppend("input", li, {
                    type: "checkbox",
                    name: "checkbox",
                    value: tree.children[child].path_lower
                });
            }
        }

        displayTree(tree.children[child], li, includeFiles, depth);
    }
};

/**
 * Helper function to create and append HTMLElements for DisplayTree
 *
 * @param {string} el - The type of HTMLElement that should be created.
 * @param {HTMLELement} par - Where the el param should be appended
 * @param {object} klass - Allows adding classname when creating and Appending
 *
 */

const createAndAppend = (el, par, klass = null) => {
    let _el = document.createElement(el);
    if (klass) {
        for (const param in klass) {
            _el[param] = klass[param];
        }
    }
    par.appendChild(_el);
    return _el;
};

const addDropdown = () => {
    let caretList = document.getElementsByClassName("caret");

    for (const caret of caretList) {
        caret.addEventListener("click", () => {
            let nest = caret.parentElement.querySelector(".nested");
            if (nest) nest.classList.toggle("active");
            caret.classList.toggle("caret-down");
        });
    }
};

const logChecks = ({ target }) => {
    for (const child of target.children) {
        if (child.classList.value === "checked") {
            target.removeChild(child);
        }
    }
    let checked = (target["checked"] = []);
    target.checkbox.forEach(i => {
        if (i.checked) checked.push(i.value);
    });

    createAndAppend("div", target, {
        innerHTML: checked,
        classList: "checked"
    });
};

const callTimeout = async (from, to) => {
    return dbx
        .filesCopyV2({
            from_path: from,
            to_path: to
        })
        .catch(({ error }) => {
            debugger;
            alert(error.error_summary + `- from: ${from} - to: ${to}`);
        });
};

const doCopy = async () => {
    const forms = document.querySelectorAll("form");
    if (forms[0]["checked"].length !== 1) {
        console.warn("Must select one file for copy at a time");
        return;
    }
    if (!forms[1]["checked"].length) {
        console.warn("Must select at least one folder for copy");
    }

    const progress = document.getElementById("progress");
    progress.max = forms[1]["checked"].length;

    for (let path of forms[1]["checked"]) {
        const from = forms[0]["checked"][0];
        const from_split = from.split("/");
        path += "/" + from_split[from_split.length - 1];
        await callTimeout(from, path);
        progress.value += 1;
    }
    start();
};

const buildPage = response => {
    const tree = buildTree(response);

    const SelectForm = createAndAppend("form", document.body, {
        action: "javascript:void(0);",
        onsubmit: logChecks
    });

    const CopyForm = createAndAppend("form", document.body, {
        action: "javascript:void(0);",
        onsubmit: logChecks
    });

    displayTree(tree, SelectForm);
    displayTree(tree, CopyForm, false);

    createAndAppend("input", SelectForm, {
        id: "CopySelect",
        type: "submit",
        value: "Select for Copy"
    });

    createAndAppend("input", CopyForm, {
        id: "LocationSelect",
        type: "submit",
        value: "Select Locations"
    });

    addDropdown();

    createAndAppend("input", document.body, {
        id: "SubmitAll",
        type: "submit",
        value: "Submit All",
        onclick: doCopy
    });

    createAndAppend("progress", document.body, {
        id: "progress",
        value: 0
    });
};

const clearPage = () => {
    const forms = document.body.querySelectorAll("form");
    const inputs = document.body.querySelectorAll("input");
    const progress = document.body.querySelectorAll("progress");
    forms.forEach(f => document.body.removeChild(f));
    inputs.forEach(i => {
        if (i.id === "SubmitAll") {
            document.body.removeChild(i);
        }
    });
    progress.forEach(p => document.body.removeChild(p));
};

const start = () => {
    accessToken = APIInput.value;
    dbx = new Dropbox({
        accessToken,
        fetch
    });

    dbx.filesListFolder({
        path: "",
        recursive: true
    })
        .then(response => {
            if (response["error"])
                alert("Something Did Not Go right, Id call Jay");
            clearPage();
            buildPage(response);
        })
        .catch(({ error }) => {
            alert(error.error[".tag"] + ": something went wrong");
        });
};

const APIForm = createAndAppend("form", document.body, {
    action: "javascript:void(0);",
    onsubmit: start
});

createAndAppend("input", APIForm, {
    id: "APIInput",
    type: "submit",
    value: "Submit API Key"
});

const APIInput = createAndAppend("input", APIForm, {
    id: "APIInput",
    placeholder: "API Key goes here",
    type: "text"
});

let accessToken;
let dbx;
