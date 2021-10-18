var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./createElements", "./sidebar/runtime", "./exporter", "./createUI", "./getExample", "./monaco/ExampleHighlight", "./createConfigDropdown", "./sidebar/plugins", "./pluginUtils", "./sidebar/settings", "./navigation"], function (require, exports, createElements_1, runtime_1, exporter_1, createUI_1, getExample_1, ExampleHighlight_1, createConfigDropdown_1, plugins_1, pluginUtils_1, settings_1, navigation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupPlayground = void 0;
    const setupPlayground = (sandbox, monaco, config, i, react) => {
        const playgroundParent = sandbox.getDomNode().parentElement.parentElement.parentElement;
        // UI to the left
        const leftNav = (0, createElements_1.createNavigationSection)();
        playgroundParent.insertBefore(leftNav, sandbox.getDomNode().parentElement.parentElement);
        const dragBarLeft = (0, createElements_1.createDragBar)("left");
        playgroundParent.insertBefore(dragBarLeft, sandbox.getDomNode().parentElement.parentElement);
        leftNav.style.display = "none";
        dragBarLeft.style.display = "none";
        const showNav = () => {
            const right = document.getElementsByClassName("playground-sidebar").item(0);
            const middle = document.getElementById("editor-container");
            middle.style.width = `calc(100% - ${right.clientWidth + 180}px)`;
            leftNav.style.display = "block";
            leftNav.style.width = "180px";
            leftNav.style.minWidth = "180px";
            leftNav.style.maxWidth = "180px";
            dragBarLeft.style.display = "block";
        };
        // UI to the right
        const dragBar = (0, createElements_1.createDragBar)("right");
        playgroundParent.appendChild(dragBar);
        const sidebar = (0, createElements_1.createSidebar)();
        playgroundParent.appendChild(sidebar);
        const tabBar = (0, createElements_1.createTabBar)();
        sidebar.appendChild(tabBar);
        const container = (0, createElements_1.createPluginContainer)();
        sidebar.appendChild(container);
        const plugins = [];
        const tabs = [];
        // Let's things like the workbench hook into tab changes
        let didUpdateTab;
        const registerPlugin = (plugin) => {
            plugins.push(plugin);
            const tab = (0, createElements_1.createTabForPlugin)(plugin);
            tabs.push(tab);
            const tabClicked = e => {
                const previousPlugin = getCurrentPlugin();
                let newTab = e.target;
                // It could be a notification you clicked on
                if (newTab.tagName === "DIV")
                    newTab = newTab.parentElement;
                const newPlugin = plugins.find(p => `playground-plugin-tab-${p.id}` == newTab.id);
                (0, createElements_1.activatePlugin)(newPlugin, previousPlugin, sandbox, tabBar, container);
                didUpdateTab && didUpdateTab(newPlugin, previousPlugin);
            };
            tabBar.appendChild(tab);
            tab.onclick = tabClicked;
        };
        const setDidUpdateTab = (func) => {
            didUpdateTab = func;
        };
        const getCurrentPlugin = () => {
            const selectedTab = tabs.find(t => t.classList.contains("active"));
            return plugins[tabs.indexOf(selectedTab)];
        };
        const defaultPlugins = config.plugins || (0, settings_1.getPlaygroundPlugins)();
        const utils = (0, pluginUtils_1.createUtils)(sandbox, react);
        const initialPlugins = defaultPlugins.map(f => f(i, utils));
        initialPlugins.forEach(p => registerPlugin(p));
        // Choose which should be selected
        const priorityPlugin = plugins.find(plugin => plugin.shouldBeSelected && plugin.shouldBeSelected());
        const selectedPlugin = priorityPlugin || plugins[0];
        const selectedTab = tabs[plugins.indexOf(selectedPlugin)];
        selectedTab.onclick({ target: selectedTab });
        let debouncingTimer = false;
        sandbox.editor.onDidChangeModelContent(_event => {
            const plugin = getCurrentPlugin();
            if (plugin.modelChanged)
                plugin.modelChanged(sandbox, sandbox.getModel(), container);
            // This needs to be last in the function
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                playgroundDebouncedMainFunction();
                // Only call the plugin function once every 0.3s
                if (plugin.modelChangedDebounce && plugin.id === getCurrentPlugin().id) {
                    plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
                }
            }, 300);
        });
        // If you set this to true, then the next time the playground would
        // have set the user's hash it would be skipped - used for setting
        // the text in examples
        let suppressNextTextChangeForHashChange = false;
        // Sets the URL and storage of the sandbox string
        const playgroundDebouncedMainFunction = () => {
            localStorage.setItem("sandbox-history", sandbox.getText());
        };
        sandbox.editor.onDidBlurEditorText(() => {
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                if (suppressNextTextChangeForHashChange) {
                    suppressNextTextChangeForHashChange = false;
                    return;
                }
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
        });
        // Keeps track of whether the project has been set up as an ESM module via a package.json
        let isESMMode = false;
        // When any compiler flags are changed, trigger a potential change to the URL
        sandbox.setDidUpdateCompilerSettings(() => __awaiter(void 0, void 0, void 0, function* () {
            playgroundDebouncedMainFunction();
            // @ts-ignore
            window.appInsights && window.appInsights.trackEvent({ name: "Compiler Settings changed" });
            const model = sandbox.editor.getModel();
            const plugin = getCurrentPlugin();
            if (model && plugin.modelChanged)
                plugin.modelChanged(sandbox, model, container);
            if (model && plugin.modelChangedDebounce)
                plugin.modelChangedDebounce(sandbox, model, container);
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
            // Add an outer package.json with 'module: type' and ensures all the
            // other settings are inline for ESM mode
            const moduleNumber = sandbox.getCompilerOptions().module || 0;
            const isESMviaModule = moduleNumber > 99 && moduleNumber < 200;
            const moduleResNumber = sandbox.getCompilerOptions().moduleResolution || 0;
            const isESMviaModuleRes = moduleResNumber > 2 && moduleResNumber < 100;
            if (isESMviaModule || isESMviaModuleRes) {
                if (isESMMode)
                    return;
                isESMMode = true;
                setTimeout(() => { ui.flashInfo(i("play_esm_mode")); }, 300);
                const nextRes = moduleNumber === 199 ? 99 : 2;
                sandbox.setCompilerSettings({ target: 99, moduleResolution: nextRes });
                sandbox.addLibraryToRuntime(JSON.stringify({ name: "playground", type: "module" }), "/package.json");
            }
        }));
        const skipInitiallySettingHash = document.location.hash && document.location.hash.includes("example/");
        if (!skipInitiallySettingHash)
            playgroundDebouncedMainFunction();
        // Setup working with the existing UI, once it's loaded
        // Versions of TypeScript
        // Set up the label for the dropdown
        const versionButton = document.querySelectorAll("#versions > a").item(0);
        versionButton.innerHTML = "v" + sandbox.ts.version + " <span class='caret'/>";
        versionButton.setAttribute("aria-label", `Select version of TypeScript, currently ${sandbox.ts.version}`);
        // Add the versions to the dropdown
        const versionsMenu = document.querySelectorAll("#versions > ul").item(0);
        // Enable all submenus
        document.querySelectorAll("nav ul li").forEach(e => e.classList.add("active"));
        const notWorkingInPlayground = ["3.1.6", "3.0.1", "2.8.1", "2.7.2", "2.4.1"];
        const allVersions = [...sandbox.supportedVersions.filter(f => !notWorkingInPlayground.includes(f)), "Nightly"];
        allVersions.forEach((v) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = v;
            a.href = "#";
            if (v === "Nightly") {
                li.classList.add("nightly");
            }
            if (v.toLowerCase().includes("beta")) {
                li.classList.add("beta");
            }
            li.onclick = () => {
                const currentURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const params = new URLSearchParams(currentURL.split("#")[0]);
                const version = v === "Nightly" ? "next" : v;
                params.set("ts", version);
                const hash = document.location.hash.length ? document.location.hash : "";
                const newURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}?${params}${hash}`;
                // @ts-ignore - it is allowed
                document.location = newURL;
            };
            li.appendChild(a);
            versionsMenu.appendChild(li);
        });
        // Support dropdowns
        document.querySelectorAll(".navbar-sub li.dropdown > a").forEach(link => {
            const a = link;
            a.onclick = _e => {
                if (a.parentElement.classList.contains("open")) {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                    a.setAttribute("aria-expanded", "false");
                }
                else {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                    a.parentElement.classList.toggle("open");
                    a.setAttribute("aria-expanded", "true");
                    const exampleContainer = a.closest("li").getElementsByTagName("ul").item(0);
                    const firstLabel = exampleContainer.querySelector("label");
                    if (firstLabel)
                        firstLabel.focus();
                    // Set exact height and widths for the popovers for the main playground navigation
                    const isPlaygroundSubmenu = !!a.closest("nav");
                    if (isPlaygroundSubmenu) {
                        const playgroundContainer = document.getElementById("playground-container");
                        exampleContainer.style.height = `calc(${playgroundContainer.getBoundingClientRect().height + 26}px - 4rem)`;
                        const sideBarWidth = document.querySelector(".playground-sidebar").offsetWidth;
                        exampleContainer.style.width = `calc(100% - ${sideBarWidth}px - 71px)`;
                        // All this is to make sure that tabbing stays inside the dropdown for tsconfig/examples
                        const buttons = exampleContainer.querySelectorAll("input");
                        const lastButton = buttons.item(buttons.length - 1);
                        if (lastButton) {
                            redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                        }
                        else {
                            const sections = document.querySelectorAll("ul.examples-dropdown .section-content");
                            sections.forEach(s => {
                                const buttons = s.querySelectorAll("a.example-link");
                                const lastButton = buttons.item(buttons.length - 1);
                                if (lastButton) {
                                    redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                                }
                            });
                        }
                    }
                }
                return false;
            };
        });
        // Handle escape closing dropdowns etc
        document.onkeydown = function (evt) {
            evt = evt || window.event;
            var isEscape = false;
            if ("key" in evt) {
                isEscape = evt.key === "Escape" || evt.key === "Esc";
            }
            else {
                // @ts-ignore - this used to be the case
                isEscape = evt.keyCode === 27;
            }
            if (isEscape) {
                document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                document.querySelectorAll(".navbar-sub li").forEach(i => i.setAttribute("aria-expanded", "false"));
            }
        };
        const shareAction = {
            id: "copy-clipboard",
            label: "Save to clipboard",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function () {
                // Update the URL, then write that to the clipboard
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
                window.navigator.clipboard.writeText(location.href.toString()).then(() => ui.flashInfo(i("play_export_clipboard")), (e) => alert(e));
            },
        };
        const shareButton = document.getElementById("share-button");
        if (shareButton) {
            shareButton.onclick = e => {
                e.preventDefault();
                shareAction.run();
                return false;
            };
            // Set up some key commands
            sandbox.editor.addAction(shareAction);
            sandbox.editor.addAction({
                id: "run-js",
                label: "Run the evaluated JavaScript for your TypeScript file",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                contextMenuGroupId: "run",
                contextMenuOrder: 1.5,
                run: function (ed) {
                    const runButton = document.getElementById("run-button");
                    runButton && runButton.onclick && runButton.onclick({});
                },
            });
        }
        const runButton = document.getElementById("run-button");
        if (runButton) {
            runButton.onclick = () => {
                const run = sandbox.getRunnableJS();
                const runPlugin = plugins.find(p => p.id === "logs");
                (0, createElements_1.activatePlugin)(runPlugin, getCurrentPlugin(), sandbox, tabBar, container);
                (0, runtime_1.runWithCustomLogs)(run, i);
                const isJS = sandbox.config.filetype === "js";
                ui.flashInfo(i(isJS ? "play_run_js" : "play_run_ts"));
                return false;
            };
        }
        // Handle the close buttons on the examples
        document.querySelectorAll("button.examples-close").forEach(b => {
            const button = b;
            button.onclick = (e) => {
                const button = e.target;
                const navLI = button.closest("li");
                navLI === null || navLI === void 0 ? void 0 : navLI.classList.remove("open");
            };
        });
        (0, createElements_1.setupSidebarToggle)();
        if (document.getElementById("config-container")) {
            (0, createConfigDropdown_1.createConfigDropdown)(sandbox, monaco);
            (0, createConfigDropdown_1.updateConfigDropdownForCompilerOptions)(sandbox, monaco);
        }
        if (document.getElementById("playground-settings")) {
            const settingsToggle = document.getElementById("playground-settings");
            settingsToggle.onclick = () => {
                const open = settingsToggle.parentElement.classList.contains("open");
                const sidebarTabs = document.querySelector(".playground-plugin-tabview");
                const sidebarContent = document.querySelector(".playground-plugin-container");
                let settingsContent = document.querySelector(".playground-settings-container");
                if (!settingsContent) {
                    settingsContent = document.createElement("div");
                    settingsContent.className = "playground-settings-container playground-plugin-container";
                    const settings = (0, settings_1.settingsPlugin)(i, utils);
                    settings.didMount && settings.didMount(sandbox, settingsContent);
                    document.querySelector(".playground-sidebar").appendChild(settingsContent);
                    // When the last tab item is hit, go back to the settings button
                    const labels = document.querySelectorAll(".playground-sidebar input");
                    const lastLabel = labels.item(labels.length - 1);
                    if (lastLabel) {
                        redirectTabPressTo(lastLabel, undefined, "#playground-settings");
                    }
                }
                if (open) {
                    sidebarTabs.style.display = "flex";
                    sidebarContent.style.display = "block";
                    settingsContent.style.display = "none";
                }
                else {
                    sidebarTabs.style.display = "none";
                    sidebarContent.style.display = "none";
                    settingsContent.style.display = "block";
                    document.querySelector(".playground-sidebar label").focus();
                }
                settingsToggle.parentElement.classList.toggle("open");
            };
            settingsToggle.addEventListener("keydown", e => {
                const isOpen = settingsToggle.parentElement.classList.contains("open");
                if (e.key === "Tab" && isOpen) {
                    const result = document.querySelector(".playground-options li input");
                    result.focus();
                    e.preventDefault();
                }
            });
        }
        // Support grabbing examples from the location hash
        if (location.hash.startsWith("#example")) {
            const exampleName = location.hash.replace("#example/", "").trim();
            sandbox.config.logger.log("Loading example:", exampleName);
            (0, getExample_1.getExampleSourceCode)(config.prefix, config.lang, exampleName).then(ex => {
                if (ex.example && ex.code) {
                    const { example, code } = ex;
                    // Update the localstorage showing that you've seen this page
                    if (localStorage) {
                        const seenText = localStorage.getItem("examples-seen") || "{}";
                        const seen = JSON.parse(seenText);
                        seen[example.id] = example.hash;
                        localStorage.setItem("examples-seen", JSON.stringify(seen));
                    }
                    const allLinks = document.querySelectorAll("example-link");
                    // @ts-ignore
                    for (const link of allLinks) {
                        if (link.textContent === example.title) {
                            link.classList.add("highlight");
                        }
                    }
                    document.title = "TypeScript Playground - " + example.title;
                    suppressNextTextChangeForHashChange = true;
                    sandbox.setText(code);
                }
                else {
                    suppressNextTextChangeForHashChange = true;
                    sandbox.setText("// There was an issue getting the example, bad URL? Check the console in the developer tools");
                }
            });
        }
        const model = sandbox.getModel();
        model.onDidChangeDecorations(() => {
            const markers = sandbox.monaco.editor.getModelMarkers({ resource: model.uri }).filter(m => m.severity !== 1);
            utils.setNotifications("errors", markers.length);
        });
        // Sets up a way to click between examples
        monaco.languages.registerLinkProvider(sandbox.language, new ExampleHighlight_1.ExampleHighlighter());
        const languageSelector = document.getElementById("language-selector");
        if (languageSelector) {
            const params = new URLSearchParams(location.search);
            const options = ["ts", "d.ts", "js"];
            languageSelector.options.selectedIndex = options.indexOf(params.get("filetype") || "ts");
            languageSelector.onchange = () => {
                const filetype = options[Number(languageSelector.selectedIndex || 0)];
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox, { filetype });
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                // @ts-ignore
                document.location = fullURL;
            };
        }
        // Ensure that the editor is full-width when the screen resizes
        window.addEventListener("resize", () => {
            sandbox.editor.layout();
        });
        const ui = (0, createUI_1.createUI)();
        const exporter = (0, exporter_1.createExporter)(sandbox, monaco, ui);
        const playground = {
            exporter,
            ui,
            registerPlugin,
            plugins,
            getCurrentPlugin,
            tabs,
            setDidUpdateTab,
            createUtils: pluginUtils_1.createUtils,
        };
        window.ts = sandbox.ts;
        window.sandbox = sandbox;
        window.playground = playground;
        console.log(`Using TypeScript ${window.ts.version}`);
        console.log("Available globals:");
        console.log("\twindow.ts", window.ts);
        console.log("\twindow.sandbox", window.sandbox);
        console.log("\twindow.playground", window.playground);
        console.log("\twindow.react", window.react);
        console.log("\twindow.reactDOM", window.reactDOM);
        /** A plugin */
        const activateExternalPlugin = (plugin, autoActivate) => {
            let readyPlugin;
            // Can either be a factory, or object
            if (typeof plugin === "function") {
                const utils = (0, pluginUtils_1.createUtils)(sandbox, react);
                readyPlugin = plugin(utils);
            }
            else {
                readyPlugin = plugin;
            }
            if (autoActivate) {
                console.log(readyPlugin);
            }
            playground.registerPlugin(readyPlugin);
            // Auto-select the dev plugin
            const pluginWantsFront = readyPlugin.shouldBeSelected && readyPlugin.shouldBeSelected();
            if (pluginWantsFront || autoActivate) {
                // Auto-select the dev plugin
                (0, createElements_1.activatePlugin)(readyPlugin, getCurrentPlugin(), sandbox, tabBar, container);
            }
        };
        // Dev mode plugin
        if (config.supportCustomPlugins && (0, plugins_1.allowConnectingToLocalhost)()) {
            window.exports = {};
            console.log("Connecting to dev plugin");
            try {
                // @ts-ignore
                const re = window.require;
                re(["local/index"], (devPlugin) => {
                    console.log("Set up dev plugin from localhost:5000");
                    try {
                        activateExternalPlugin(devPlugin, true);
                    }
                    catch (error) {
                        console.error(error);
                        setTimeout(() => {
                            ui.flashInfo("Error: Could not load dev plugin from localhost:5000");
                        }, 700);
                    }
                });
            }
            catch (error) {
                console.error("Problem loading up the dev plugin");
                console.error(error);
            }
        }
        const downloadPlugin = (plugin, autoEnable) => {
            try {
                // @ts-ignore
                const re = window.require;
                re([`unpkg/${plugin}@latest/dist/index`], (devPlugin) => {
                    activateExternalPlugin(devPlugin, autoEnable);
                });
            }
            catch (error) {
                console.error("Problem loading up the plugin:", plugin);
                console.error(error);
            }
        };
        if (config.supportCustomPlugins) {
            // Grab ones from localstorage
            (0, plugins_1.activePlugins)().forEach(p => downloadPlugin(p.id, false));
            // Offer to install one if 'install-plugin' is a query param
            const params = new URLSearchParams(location.search);
            const pluginToInstall = params.get("install-plugin");
            if (pluginToInstall) {
                const alreadyInstalled = (0, plugins_1.activePlugins)().find(p => p.id === pluginToInstall);
                if (!alreadyInstalled) {
                    const shouldDoIt = confirm("Would you like to install the third party plugin?\n\n" + pluginToInstall);
                    if (shouldDoIt) {
                        (0, plugins_1.addCustomPlugin)(pluginToInstall);
                        downloadPlugin(pluginToInstall, true);
                    }
                }
            }
        }
        if (location.hash.startsWith("#show-examples")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("examples-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        if (location.hash.startsWith("#show-whatisnew")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("whatisnew-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        // Grab the contents of a Gist
        if (location.hash.startsWith("#gist/")) {
            (0, navigation_1.gistPoweredNavBar)(sandbox, ui, showNav);
        }
        return playground;
    };
    exports.setupPlayground = setupPlayground;
    const redirectTabPressTo = (element, container, query) => {
        element.addEventListener("keydown", e => {
            if (e.key === "Tab") {
                const host = container || document;
                const result = host.querySelector(query);
                if (!result)
                    throw new Error(`Expected to find a result for keydown`);
                result.focus();
                e.preventDefault();
            }
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBd0VPLE1BQU0sZUFBZSxHQUFHLENBQzdCLE9BQWdCLEVBQ2hCLE1BQWMsRUFDZCxNQUF3QixFQUN4QixDQUEwQixFQUMxQixLQUFtQixFQUNuQixFQUFFO1FBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYyxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUE7UUFDMUYsaUJBQWlCO1FBRWpCLE1BQU0sT0FBTyxHQUFHLElBQUEsd0NBQXVCLEdBQUUsQ0FBQTtRQUN6QyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFDLENBQUE7UUFFMUYsTUFBTSxXQUFXLEdBQUcsSUFBQSw4QkFBYSxFQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUMsQ0FBQTtRQUU5RixPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDOUIsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRWxDLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRTtZQUNuQixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUE7WUFDNUUsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBRSxDQUFBO1lBQzNELE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGVBQWUsS0FBSyxDQUFD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RSxDQUFBO1lBQ3RELENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtTQUNSO1FBRUQsOEJBQThCO1FBQzlCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDdEMsSUFBQSw4QkFBaUIsRUFBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1NBQ3hDO1FBRUQsT0FBTyxVQUFVLENBQUE7SUFDbkIsQ0FBQyxDQUFBO0lBM2xCWSxRQUFBLGVBQWUsbUJBMmxCM0I7SUFJRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsT0FBb0IsRUFBRSxTQUFrQyxFQUFFLEtBQWEsRUFBRSxFQUFFO1FBQ3JHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEtBQUssRUFBRTtnQkFDbkIsTUFBTSxJQUFJLEdBQUcsU0FBUyxJQUFJLFFBQVEsQ0FBQTtnQkFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQVEsQ0FBQTtnQkFDL0MsSUFBSSxDQUFDLE1BQU07b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBO2dCQUNyRSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2QsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO2FBQ25CO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFNhbmRib3ggPSBpbXBvcnQoXCJAdHlwZXNjcmlwdC9zYW5kYm94XCIpLlNhbmRib3hcbnR5cGUgTW9uYWNvID0gdHlwZW9mIGltcG9ydChcIm1vbmFjby1lZGl0b3JcIilcblxuZGVjbGFyZSBjb25zdCB3aW5kb3c6IGFueVxuXG5pbXBvcnQge1xuICBjcmVhdGVTaWRlYmFyLFxuICBjcmVhdGVUYWJGb3JQbHVnaW4sXG4gIGNyZWF0ZVRhYkJhcixcbiAgY3JlYXRlUGx1Z2luQ29udGFpbmVyLFxuICBhY3RpdmF0ZVBsdWdpbixcbiAgY3JlYXRlRHJhZ0JhcixcbiAgc2V0dXBTaWRlYmFyVG9nZ2xlLFxuICBjcmVhdGVOYXZpZ2F0aW9uU2VjdGlvbixcbn0gZnJvbSBcIi4vY3JlYXRlRWxlbWVudHNcIlxuaW1wb3J0IHsgcnVuV2l0aEN1c3RvbUxvZ3MgfSBmcm9tIFwiLi9zaWRlYmFyL3J1bnRpbWVcIlxuaW1wb3J0IHsgY3JlYXRlRXhwb3J0ZXIgfSBmcm9tIFwiLi9leHBvcnRlclwiXG5pbXBvcnQgeyBjcmVhdGVVSSB9IGZyb20gXCIuL2NyZWF0ZVVJXCJcbmltcG9ydCB7IGdldEV4YW1wbGVTb3VyY2VDb2RlIH0gZnJvbSBcIi4vZ2V0RXhhbXBsZVwiXG5pbXBvcnQgeyBFeGFtcGxlSGlnaGxpZ2h0ZXIgfSBmcm9tIFwiLi9tb25hY28vRXhhbXBsZUhpZ2hsaWdodFwiXG5pbXBvcnQgeyBjcmVhdGVDb25maWdEcm9wZG93biwgdXBkYXRlQ29uZmlnRHJvcGRvd25Gb3JDb21waWxlck9wdGlvbnMgfSBmcm9tIFwiLi9jcmVhdGVDb25maWdEcm9wZG93blwiXG5pbXBvcnQgeyBhbGxvd0Nvbm5lY3RpbmdUb0xvY2FsaG9zdCwgYWN0aXZlUGx1Z2lucywgYWRkQ3VzdG9tUGx1Z2luIH0gZnJvbSBcIi4vc2lkZWJhci9wbHVnaW5zXCJcbmltcG9ydCB7IGNyZWF0ZVV0aWxzLCBQbHVnaW5VdGlscyB9IGZyb20gXCIuL3BsdWdpblV0aWxzXCJcbmltcG9ydCB0eXBlIFJlYWN0IGZyb20gXCJyZWFjdFwiXG5pbXBvcnQgeyBzZXR0aW5nc1BsdWdpbiwgZ2V0UGxheWdyb3VuZFBsdWdpbnMgfSBmcm9tIFwiLi9zaWRlYmFyL3NldHRpbmdzXCJcbmltcG9ydCB7IGdpc3RQb3dlcmVkTmF2QmFyIH0gZnJvbSBcIi4vbmF2aWdhdGlvblwiXG5cbmV4cG9ydCB7IFBsdWdpblV0aWxzIH0gZnJvbSBcIi4vcGx1Z2luVXRpbHNcIlxuXG5leHBvcnQgdHlwZSBQbHVnaW5GYWN0b3J5ID0ge1xuICAoaTogKGtleTogc3RyaW5nLCBjb21wb25lbnRzPzogYW55KSA9PiBzdHJpbmcsIHV0aWxzOiBQbHVnaW5VdGlscyk6IFBsYXlncm91bmRQbHVnaW5cbn1cblxuLyoqIFRoZSBpbnRlcmZhY2Ugb2YgYWxsIHNpZGViYXIgcGx1Z2lucyAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF5Z3JvdW5kUGx1Z2luIHtcbiAgLyoqIE5vdCBwdWJsaWMgZmFjaW5nLCBidXQgdXNlZCBieSB0aGUgcGxheWdyb3VuZCB0byB1bmlxdWVseSBpZGVudGlmeSBwbHVnaW5zICovXG4gIGlkOiBzdHJpbmdcbiAgLyoqIFRvIHNob3cgaW4gdGhlIHRhYnMgKi9cbiAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICAvKiogU2hvdWxkIHRoaXMgcGx1Z2luIGJlIHNlbGVjdGVkIHdoZW4gdGhlIHBsdWdpbiBpcyBmaXJzdCBsb2FkZWQ/IExldHMgeW91IGNoZWNrIGZvciBxdWVyeSB2YXJzIGV0YyB0byBsb2FkIGEgcGFydGljdWxhciBwbHVnaW4gKi9cbiAgc2hvdWxkQmVTZWxlY3RlZD86ICgpID0+IGJvb2xlYW5cbiAgLyoqIEJlZm9yZSB3ZSBzaG93IHRoZSB0YWIsIHVzZSB0aGlzIHRvIHNldCB1cCB5b3VyIEhUTUwgLSBpdCB3aWxsIGFsbCBiZSByZW1vdmVkIGJ5IHRoZSBwbGF5Z3JvdW5kIHdoZW4gc29tZW9uZSBuYXZpZ2F0ZXMgb2ZmIHRoZSB0YWIgKi9cbiAgd2lsbE1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIEFmdGVyIHdlIHNob3cgdGhlIHRhYiAqL1xuICBkaWRNb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBNb2RlbCBjaGFuZ2VzIHdoaWxlIHRoaXMgcGx1Z2luIGlzIGFjdGl2ZWx5IHNlbGVjdGVkICAqL1xuICBtb2RlbENoYW5nZWQ/OiAoc2FuZGJveDogU2FuZGJveCwgbW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIERlbGF5ZWQgbW9kZWwgY2hhbmdlcyB3aGlsZSB0aGlzIHBsdWdpbiBpcyBhY3RpdmVseSBzZWxlY3RlZCwgdXNlZnVsIHdoZW4geW91IGFyZSB3b3JraW5nIHdpdGggdGhlIFRTIEFQSSBiZWNhdXNlIGl0IHdvbid0IHJ1biBvbiBldmVyeSBrZXlwcmVzcyAqL1xuICBtb2RlbENoYW5nZWREZWJvdW5jZT86IChcbiAgICBzYW5kYm94OiBTYW5kYm94LFxuICAgIG1vZGVsOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JVGV4dE1vZGVsLFxuICAgIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnRcbiAgKSA9PiB2b2lkXG4gIC8qKiBCZWZvcmUgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgd2lsbFVubW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogQWZ0ZXIgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgZGlkVW5tb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBBbiBvYmplY3QgeW91IGNhbiB1c2UgdG8ga2VlcCBkYXRhIGFyb3VuZCBpbiB0aGUgc2NvcGUgb2YgeW91ciBwbHVnaW4gb2JqZWN0ICovXG4gIGRhdGE/OiBhbnlcbn1cblxuaW50ZXJmYWNlIFBsYXlncm91bmRDb25maWcge1xuICAvKiogTGFuZ3VhZ2UgbGlrZSBcImVuXCIgLyBcImphXCIgZXRjICovXG4gIGxhbmc6IHN0cmluZ1xuICAvKiogU2l0ZSBwcmVmaXgsIGxpa2UgXCJ2MlwiIGR1cmluZyB0aGUgcHJlLXJlbGVhc2UgKi9cbiAgcHJlZml4OiBzdHJpbmdcbiAgLyoqIE9wdGlvbmFsIHBsdWdpbnMgc28gdGhhdCB3ZSBjYW4gcmUtdXNlIHRoZSBwbGF5Z3JvdW5kIHdpdGggZGlmZmVyZW50IHNpZGViYXJzICovXG4gIHBsdWdpbnM/OiBQbHVnaW5GYWN0b3J5W11cbiAgLyoqIFNob3VsZCB0aGlzIHBsYXlncm91bmQgbG9hZCB1cCBjdXN0b20gcGx1Z2lucyBmcm9tIGxvY2FsU3RvcmFnZT8gKi9cbiAgc3VwcG9ydEN1c3RvbVBsdWdpbnM6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IHNldHVwUGxheWdyb3VuZCA9IChcbiAgc2FuZGJveDogU2FuZGJveCxcbiAgbW9uYWNvOiBNb25hY28sXG4gIGNvbmZpZzogUGxheWdyb3VuZENvbmZpZyxcbiAgaTogKGtleTogc3RyaW5nKSA9PiBzdHJpbmcsXG4gIHJlYWN0OiB0eXBlb2YgUmVhY3RcbikgPT4ge1xuICBjb25zdCBwbGF5Z3JvdW5kUGFyZW50ID0gc2FuZGJveC5nZXREb21Ob2RlKCkucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCFcbiAgLy8gVUkgdG8gdGhlIGxlZnRcblxuICBjb25zdCBsZWZ0TmF2ID0gY3JlYXRlTmF2aWdhdGlvblNlY3Rpb24oKVxuICBwbGF5Z3JvdW5kUGFyZW50Lmluc2VydEJlZm9yZShsZWZ0TmF2LCBzYW5kYm94LmdldERvbU5vZGUoKS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50ISlcblxuICBjb25zdCBkcmFnQmFyTGVmdCA9IGNyZWF0ZURyYWdCYXIoXCJsZWZ0XCIpXG4gIHBsYXlncm91bmRQYXJlbnQuaW5zZXJ0QmVmb3JlKGRyYWdCYXJMZWZ0LCBzYW5kYm94LmdldERvbU5vZGUoKS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50ISlcblxuICBsZWZ0TmF2LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICBkcmFnQmFyTGVmdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcblxuICBjb25zdCBzaG93TmF2ID0gKCkgPT4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcInBsYXlncm91bmQtc2lkZWJhclwiKS5pdGVtKDApIVxuICAgIGNvbnN0IG1pZGRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZWRpdG9yLWNvbnRhaW5lclwiKSFcbiAgICBtaWRkbGUuc3R5bGUud2lkdGggPSBgY2FsYygxMDAlIC0gJHtyaWdodC5jbGllbnRXaWR0aCArIDE4MH1weClgXG5cbiAgICBsZWZ0TmF2LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICBsZWZ0TmF2LnN0eWxlLndpZHRoID0gXCIxODBweFwiXG4gICAgbGVmdE5hdi5zdHlsZS5taW5XaWR0aCA9IFwiMTgwcHhcIlxuICAgIGxlZnROYXYuc3R5bGUubWF4V2lkdGggPSBcIjE4MHB4XCJcbiAgICBkcmFnQmFyTGVmdC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gIH1cblxuICAvLyBVSSB0byB0aGUgcmlnaHRcbiAgY29uc3QgZHJhZ0JhciA9IGNyZWF0ZURyYWdCYXIoXCJyaWdodFwiKVxuICBwbGF5Z3JvdW5kUGFyZW50LmFwcGVuZENoaWxkKGRyYWdCYXIpXG5cbiAgY29uc3Qgc2lkZWJhciA9IGNyZWF0ZVNpZGViYXIoKVxuICBwbGF5Z3JvdW5kUGFyZW50LmFwcGVuZENoaWxkKHNpZGViYXIpXG5cbiAgY29uc3QgdGFiQmFyID0gY3JlYXRlVGFiQmFyKClcbiAgc2lkZWJhci5hcHBlbmRDaGlsZCh0YWJCYXIpXG5cbiAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlUGx1Z2luQ29udGFpbmVyKClcbiAgc2lkZWJhci5hcHBlbmRDaGlsZChjb250YWluZXIpXG5cbiAgY29uc3QgcGx1Z2lucyA9IFtdIGFzIFBsYXlncm91bmRQbHVnaW5bXVxuICBjb25zdCB0YWJzID0gW10gYXMgSFRNTEJ1dHRvbkVsZW1lbnRbXVxuXG4gIC8vIExldCdzIHRoaW5ncyBsaWtlIHRoZSB3b3JrYmVuY2ggaG9vayBpbnRvIHRhYiBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVUYWI6IChuZXdQbHVnaW46IFBsYXlncm91bmRQbHVnaW4sIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB2b2lkIHwgdW5kZWZpbmVkXG5cbiAgY29uc3QgcmVnaXN0ZXJQbHVnaW4gPSAocGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgcGx1Z2lucy5wdXNoKHBsdWdpbilcblxuICAgIGNvbnN0IHRhYiA9IGNyZWF0ZVRhYkZvclBsdWdpbihwbHVnaW4pXG5cbiAgICB0YWJzLnB1c2godGFiKVxuXG4gICAgY29uc3QgdGFiQ2xpY2tlZDogSFRNTEVsZW1lbnRbXCJvbmNsaWNrXCJdID0gZSA9PiB7XG4gICAgICBjb25zdCBwcmV2aW91c1BsdWdpbiA9IGdldEN1cnJlbnRQbHVnaW4oKVxuICAgICAgbGV0IG5ld1RhYiA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50XG4gICAgICAvLyBJdCBjb3VsZCBiZSBhIG5vdGlmaWNhdGlvbiB5b3UgY2xpY2tlZCBvblxuICAgICAgaWYgKG5ld1RhYi50YWdOYW1lID09PSBcIkRJVlwiKSBuZXdUYWIgPSBuZXdUYWIucGFyZW50RWxlbWVudCFcbiAgICAgIGNvbnN0IG5ld1BsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IGBwbGF5Z3JvdW5kLXBsdWdpbi10YWItJHtwLmlkfWAgPT0gbmV3VGFiLmlkKSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKG5ld1BsdWdpbiwgcHJldmlvdXNQbHVnaW4sIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgICAgZGlkVXBkYXRlVGFiICYmIGRpZFVwZGF0ZVRhYihuZXdQbHVnaW4sIHByZXZpb3VzUGx1Z2luKVxuICAgIH1cblxuICAgIHRhYkJhci5hcHBlbmRDaGlsZCh0YWIpXG4gICAgdGFiLm9uY2xpY2sgPSB0YWJDbGlja2VkXG4gIH1cblxuICBjb25zdCBzZXREaWRVcGRhdGVUYWIgPSAoZnVuYzogKG5ld1BsdWdpbjogUGxheWdyb3VuZFBsdWdpbiwgcHJldmlvdXNQbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHZvaWQpID0+IHtcbiAgICBkaWRVcGRhdGVUYWIgPSBmdW5jXG4gIH1cblxuICBjb25zdCBnZXRDdXJyZW50UGx1Z2luID0gKCkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkVGFiID0gdGFicy5maW5kKHQgPT4gdC5jbGFzc0xpc3QuY29udGFpbnMoXCJhY3RpdmVcIikpIVxuICAgIHJldHVybiBwbHVnaW5zW3RhYnMuaW5kZXhPZihzZWxlY3RlZFRhYildXG4gIH1cblxuICBjb25zdCBkZWZhdWx0UGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIHx8IGdldFBsYXlncm91bmRQbHVnaW5zKClcbiAgY29uc3QgdXRpbHMgPSBjcmVhdGVVdGlscyhzYW5kYm94LCByZWFjdClcbiAgY29uc3QgaW5pdGlhbFBsdWdpbnMgPSBkZWZhdWx0UGx1Z2lucy5tYXAoZiA9PiBmKGksIHV0aWxzKSlcbiAgaW5pdGlhbFBsdWdpbnMuZm9yRWFjaChwID0+IHJlZ2lzdGVyUGx1Z2luKHApKVxuXG4gIC8vIENob29zZSB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWRcbiAgY29uc3QgcHJpb3JpdHlQbHVnaW4gPSBwbHVnaW5zLmZpbmQocGx1Z2luID0+IHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkICYmIHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKCkpXG4gIGNvbnN0IHNlbGVjdGVkUGx1Z2luID0gcHJpb3JpdHlQbHVnaW4gfHwgcGx1Z2luc1swXVxuICBjb25zdCBzZWxlY3RlZFRhYiA9IHRhYnNbcGx1Z2lucy5pbmRleE9mKHNlbGVjdGVkUGx1Z2luKV0hXG4gIHNlbGVjdGVkVGFiLm9uY2xpY2shKHsgdGFyZ2V0OiBzZWxlY3RlZFRhYiB9IGFzIGFueSlcblxuICBsZXQgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgc2FuZGJveC5lZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoX2V2ZW50ID0+IHtcbiAgICBjb25zdCBwbHVnaW4gPSBnZXRDdXJyZW50UGx1Z2luKClcbiAgICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcblxuICAgIC8vIFRoaXMgbmVlZHMgdG8gYmUgbGFzdCBpbiB0aGUgZnVuY3Rpb25cbiAgICBpZiAoZGVib3VuY2luZ1RpbWVyKSByZXR1cm5cbiAgICBkZWJvdW5jaW5nVGltZXIgPSB0cnVlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICAgICAgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbigpXG5cbiAgICAgIC8vIE9ubHkgY2FsbCB0aGUgcGx1Z2luIGZ1bmN0aW9uIG9uY2UgZXZlcnkgMC4zc1xuICAgICAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSAmJiBwbHVnaW4uaWQgPT09IGdldEN1cnJlbnRQbHVnaW4oKS5pZCkge1xuICAgICAgICBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpLCBjb250YWluZXIpXG4gICAgICB9XG4gICAgfSwgMzAwKVxuICB9KVxuXG4gIC8vIElmIHlvdSBzZXQgdGhpcyB0byB0cnVlLCB0aGVuIHRoZSBuZXh0IHRpbWUgdGhlIHBsYXlncm91bmQgd291bGRcbiAgLy8gaGF2ZSBzZXQgdGhlIHVzZXIncyBoYXNoIGl0IHdvdWxkIGJlIHNraXBwZWQgLSB1c2VkIGZvciBzZXR0aW5nXG4gIC8vIHRoZSB0ZXh0IGluIGV4YW1wbGVzXG4gIGxldCBzdXBwcmVzc05leHRUZXh0Q2hhbmdlRm9ySGFzaENoYW5nZSA9IGZhbHNlXG5cbiAgLy8gU2V0cyB0aGUgVVJMIGFuZCBzdG9yYWdlIG9mIHRoZSBzYW5kYm94IHN0cmluZ1xuICBjb25zdCBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uID0gKCkgPT4ge1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic2FuZGJveC1oaXN0b3J5XCIsIHNhbmRib3guZ2V0VGV4dCgpKVxuICB9XG5cbiAgc2FuZGJveC5lZGl0b3Iub25EaWRCbHVyRWRpdG9yVGV4dCgoKSA9PiB7XG4gICAgY29uc3QgYWx3YXlzVXBkYXRlVVJMID0gIWxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZGlzYWJsZS1zYXZlLW9uLXR5cGVcIilcbiAgICBpZiAoYWx3YXlzVXBkYXRlVVJMKSB7XG4gICAgICBpZiAoc3VwcHJlc3NOZXh0VGV4dENoYW5nZUZvckhhc2hDaGFuZ2UpIHtcbiAgICAgICAgc3VwcHJlc3NOZXh0VGV4dENoYW5nZUZvckhhc2hDaGFuZ2UgPSBmYWxzZVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld1VSTCA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIFwiXCIsIG5ld1VSTClcbiAgICB9XG4gIH0pXG5cbiAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hldGhlciB0aGUgcHJvamVjdCBoYXMgYmVlbiBzZXQgdXAgYXMgYW4gRVNNIG1vZHVsZSB2aWEgYSBwYWNrYWdlLmpzb25cbiAgbGV0IGlzRVNNTW9kZSA9IGZhbHNlXG5cbiAgLy8gV2hlbiBhbnkgY29tcGlsZXIgZmxhZ3MgYXJlIGNoYW5nZWQsIHRyaWdnZXIgYSBwb3RlbnRpYWwgY2hhbmdlIHRvIHRoZSBVUkxcbiAgc2FuZGJveC5zZXREaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGFzeW5jICgpID0+IHtcbiAgICBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uKClcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgd2luZG93LmFwcEluc2lnaHRzICYmIHdpbmRvdy5hcHBJbnNpZ2h0cy50cmFja0V2ZW50KHsgbmFtZTogXCJDb21waWxlciBTZXR0aW5ncyBjaGFuZ2VkXCIgfSlcblxuICAgIGNvbnN0IG1vZGVsID0gc2FuZGJveC5lZGl0b3IuZ2V0TW9kZWwoKVxuICAgIGNvbnN0IHBsdWdpbiA9IGdldEN1cnJlbnRQbHVnaW4oKVxuICAgIGlmIChtb2RlbCAmJiBwbHVnaW4ubW9kZWxDaGFuZ2VkKSBwbHVnaW4ubW9kZWxDaGFuZ2VkKHNhbmRib3gsIG1vZGVsLCBjb250YWluZXIpXG4gICAgaWYgKG1vZGVsICYmIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSkgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKHNhbmRib3gsIG1vZGVsLCBjb250YWluZXIpXG5cbiAgICBjb25zdCBhbHdheXNVcGRhdGVVUkwgPSAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkaXNhYmxlLXNhdmUtb24tdHlwZVwiKVxuICAgIGlmIChhbHdheXNVcGRhdGVVUkwpIHtcbiAgICAgIGNvbnN0IG5ld1VSTCA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIFwiXCIsIG5ld1VSTClcbiAgICB9XG5cbiAgICAvLyBBZGQgYW4gb3V0ZXIgcGFja2FnZS5qc29uIHdpdGggJ21vZHVsZTogdHlwZScgYW5kIGVuc3VyZXMgYWxsIHRoZVxuICAgIC8vIG90aGVyIHNldHRpbmdzIGFyZSBpbmxpbmUgZm9yIEVTTSBtb2RlXG4gICAgY29uc3QgbW9kdWxlTnVtYmVyID0gc2FuZGJveC5nZXRDb21waWxlck9wdGlvbnMoKS5tb2R1bGUgYXMgbnVtYmVyIHx8IDBcbiAgICBjb25zdCBpc0VTTXZpYU1vZHVsZSA9IG1vZHVsZU51bWJlciA+IDk5ICYmIG1vZHVsZU51bWJlciA8IDIwMFxuICAgIGNvbnN0IG1vZHVsZVJlc051bWJlciA9IHNhbmRib3guZ2V0Q29tcGlsZXJPcHRpb25zKCkubW9kdWxlUmVzb2x1dGlvbiB8fCAwXG4gICAgY29uc3QgaXNFU012aWFNb2R1bGVSZXMgPSBtb2R1bGVSZXNOdW1iZXIgPiAyICYmIG1vZHVsZVJlc051bWJlciA8IDEwMFxuXG4gICAgaWYgKGlzRVNNdmlhTW9kdWxlIHx8IGlzRVNNdmlhTW9kdWxlUmVzKSB7XG4gICAgICBpZiAoaXNFU01Nb2RlKSByZXR1cm5cbiAgICAgIGlzRVNNTW9kZSA9IHRydWVcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4geyB1aS5mbGFzaEluZm8oaShcInBsYXlfZXNtX21vZGVcIikpIH0sIDMwMClcblxuICAgICAgY29uc3QgbmV4dFJlcyA9IG1vZHVsZU51bWJlciA9PT0gMTk5ID8gOTkgOiAyXG4gICAgICBzYW5kYm94LnNldENvbXBpbGVyU2V0dGluZ3MoeyB0YXJnZXQ6IDk5LCBtb2R1bGVSZXNvbHV0aW9uOiBuZXh0UmVzIH0pXG4gICAgICBzYW5kYm94LmFkZExpYnJhcnlUb1J1bnRpbWUoSlNPTi5zdHJpbmdpZnkoeyBuYW1lOiBcInBsYXlncm91bmRcIiwgdHlwZTogXCJtb2R1bGVcIiB9KSwgXCIvcGFja2FnZS5qc29uXCIpXG4gICAgfVxuICB9KVxuXG4gIGNvbnN0IHNraXBJbml0aWFsbHlTZXR0aW5nSGFzaCA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggJiYgZG9jdW1lbnQubG9jYXRpb24uaGFzaC5pbmNsdWRlcyhcImV4YW1wbGUvXCIpXG4gIGlmICghc2tpcEluaXRpYWxseVNldHRpbmdIYXNoKSBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uKClcblxuICAvLyBTZXR1cCB3b3JraW5nIHdpdGggdGhlIGV4aXN0aW5nIFVJLCBvbmNlIGl0J3MgbG9hZGVkXG5cbiAgLy8gVmVyc2lvbnMgb2YgVHlwZVNjcmlwdFxuXG4gIC8vIFNldCB1cCB0aGUgbGFiZWwgZm9yIHRoZSBkcm9wZG93blxuICBjb25zdCB2ZXJzaW9uQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIiN2ZXJzaW9ucyA+IGFcIikuaXRlbSgwKVxuICB2ZXJzaW9uQnV0dG9uLmlubmVySFRNTCA9IFwidlwiICsgc2FuZGJveC50cy52ZXJzaW9uICsgXCIgPHNwYW4gY2xhc3M9J2NhcmV0Jy8+XCJcbiAgdmVyc2lvbkJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGBTZWxlY3QgdmVyc2lvbiBvZiBUeXBlU2NyaXB0LCBjdXJyZW50bHkgJHtzYW5kYm94LnRzLnZlcnNpb259YClcblxuICAvLyBBZGQgdGhlIHZlcnNpb25zIHRvIHRoZSBkcm9wZG93blxuICBjb25zdCB2ZXJzaW9uc01lbnUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiI3ZlcnNpb25zID4gdWxcIikuaXRlbSgwKVxuXG4gIC8vIEVuYWJsZSBhbGwgc3VibWVudXNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIm5hdiB1bCBsaVwiKS5mb3JFYWNoKGUgPT4gZS5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpKVxuXG4gIGNvbnN0IG5vdFdvcmtpbmdJblBsYXlncm91bmQgPSBbXCIzLjEuNlwiLCBcIjMuMC4xXCIsIFwiMi44LjFcIiwgXCIyLjcuMlwiLCBcIjIuNC4xXCJdXG5cbiAgY29uc3QgYWxsVmVyc2lvbnMgPSBbLi4uc2FuZGJveC5zdXBwb3J0ZWRWZXJzaW9ucy5maWx0ZXIoZiA9PiAhbm90V29ya2luZ0luUGxheWdyb3VuZC5pbmNsdWRlcyhmKSksIFwiTmlnaHRseVwiXVxuXG4gIGFsbFZlcnNpb25zLmZvckVhY2goKHY6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpXG4gICAgYS50ZXh0Q29udGVudCA9IHZcbiAgICBhLmhyZWYgPSBcIiNcIlxuXG4gICAgaWYgKHYgPT09IFwiTmlnaHRseVwiKSB7XG4gICAgICBsaS5jbGFzc0xpc3QuYWRkKFwibmlnaHRseVwiKVxuICAgIH1cblxuICAgIGlmICh2LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJiZXRhXCIpKSB7XG4gICAgICBsaS5jbGFzc0xpc3QuYWRkKFwiYmV0YVwiKVxuICAgIH1cblxuICAgIGxpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50VVJMID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoY3VycmVudFVSTC5zcGxpdChcIiNcIilbMF0pXG4gICAgICBjb25zdCB2ZXJzaW9uID0gdiA9PT0gXCJOaWdodGx5XCIgPyBcIm5leHRcIiA6IHZcbiAgICAgIHBhcmFtcy5zZXQoXCJ0c1wiLCB2ZXJzaW9uKVxuXG4gICAgICBjb25zdCBoYXNoID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaC5sZW5ndGggPyBkb2N1bWVudC5sb2NhdGlvbi5oYXNoIDogXCJcIlxuICAgICAgY29uc3QgbmV3VVJMID0gYCR7ZG9jdW1lbnQubG9jYXRpb24ucHJvdG9jb2x9Ly8ke2RvY3VtZW50LmxvY2F0aW9uLmhvc3R9JHtkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0/JHtwYXJhbXN9JHtoYXNofWBcblxuICAgICAgLy8gQHRzLWlnbm9yZSAtIGl0IGlzIGFsbG93ZWRcbiAgICAgIGRvY3VtZW50LmxvY2F0aW9uID0gbmV3VVJMXG4gICAgfVxuXG4gICAgbGkuYXBwZW5kQ2hpbGQoYSlcbiAgICB2ZXJzaW9uc01lbnUuYXBwZW5kQ2hpbGQobGkpXG4gIH0pXG5cbiAgLy8gU3VwcG9ydCBkcm9wZG93bnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5uYXZiYXItc3ViIGxpLmRyb3Bkb3duID4gYVwiKS5mb3JFYWNoKGxpbmsgPT4ge1xuICAgIGNvbnN0IGEgPSBsaW5rIGFzIEhUTUxBbmNob3JFbGVtZW50XG4gICAgYS5vbmNsaWNrID0gX2UgPT4ge1xuICAgICAgaWYgKGEucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LmNvbnRhaW5zKFwib3BlblwiKSkge1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkub3BlblwiKS5mb3JFYWNoKGkgPT4gaS5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKSlcbiAgICAgICAgYS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIsIFwiZmFsc2VcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIubmF2YmFyLXN1YiBsaS5vcGVuXCIpLmZvckVhY2goaSA9PiBpLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpKVxuICAgICAgICBhLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpXG4gICAgICAgIGEuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcInRydWVcIilcblxuICAgICAgICBjb25zdCBleGFtcGxlQ29udGFpbmVyID0gYS5jbG9zZXN0KFwibGlcIikhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidWxcIikuaXRlbSgwKSFcblxuICAgICAgICBjb25zdCBmaXJzdExhYmVsID0gZXhhbXBsZUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKFwibGFiZWxcIikgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgaWYgKGZpcnN0TGFiZWwpIGZpcnN0TGFiZWwuZm9jdXMoKVxuXG4gICAgICAgIC8vIFNldCBleGFjdCBoZWlnaHQgYW5kIHdpZHRocyBmb3IgdGhlIHBvcG92ZXJzIGZvciB0aGUgbWFpbiBwbGF5Z3JvdW5kIG5hdmlnYXRpb25cbiAgICAgICAgY29uc3QgaXNQbGF5Z3JvdW5kU3VibWVudSA9ICEhYS5jbG9zZXN0KFwibmF2XCIpXG4gICAgICAgIGlmIChpc1BsYXlncm91bmRTdWJtZW51KSB7XG4gICAgICAgICAgY29uc3QgcGxheWdyb3VuZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWdyb3VuZC1jb250YWluZXJcIikhXG4gICAgICAgICAgZXhhbXBsZUNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBgY2FsYygke3BsYXlncm91bmRDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMjZ9cHggLSA0cmVtKWBcblxuICAgICAgICAgIGNvbnN0IHNpZGVCYXJXaWR0aCA9IChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtc2lkZWJhclwiKSBhcyBhbnkpLm9mZnNldFdpZHRoXG4gICAgICAgICAgZXhhbXBsZUNvbnRhaW5lci5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke3NpZGVCYXJXaWR0aH1weCAtIDcxcHgpYFxuXG4gICAgICAgICAgLy8gQWxsIHRoaXMgaXMgdG8gbWFrZSBzdXJlIHRoYXQgdGFiYmluZyBzdGF5cyBpbnNpZGUgdGhlIGRyb3Bkb3duIGZvciB0c2NvbmZpZy9leGFtcGxlc1xuICAgICAgICAgIGNvbnN0IGJ1dHRvbnMgPSBleGFtcGxlQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnB1dFwiKVxuICAgICAgICAgIGNvbnN0IGxhc3RCdXR0b24gPSBidXR0b25zLml0ZW0oYnV0dG9ucy5sZW5ndGggLSAxKSBhcyBIVE1MRWxlbWVudFxuICAgICAgICAgIGlmIChsYXN0QnV0dG9uKSB7XG4gICAgICAgICAgICByZWRpcmVjdFRhYlByZXNzVG8obGFzdEJ1dHRvbiwgZXhhbXBsZUNvbnRhaW5lciwgXCIuZXhhbXBsZXMtY2xvc2VcIilcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgc2VjdGlvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwidWwuZXhhbXBsZXMtZHJvcGRvd24gLnNlY3Rpb24tY29udGVudFwiKVxuICAgICAgICAgICAgc2VjdGlvbnMuZm9yRWFjaChzID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IHMucXVlcnlTZWxlY3RvckFsbChcImEuZXhhbXBsZS1saW5rXCIpXG4gICAgICAgICAgICAgIGNvbnN0IGxhc3RCdXR0b24gPSBidXR0b25zLml0ZW0oYnV0dG9ucy5sZW5ndGggLSAxKSBhcyBIVE1MRWxlbWVudFxuICAgICAgICAgICAgICBpZiAobGFzdEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIHJlZGlyZWN0VGFiUHJlc3NUbyhsYXN0QnV0dG9uLCBleGFtcGxlQ29udGFpbmVyLCBcIi5leGFtcGxlcy1jbG9zZVwiKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9KVxuXG4gIC8vIEhhbmRsZSBlc2NhcGUgY2xvc2luZyBkcm9wZG93bnMgZXRjXG4gIGRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBldnQgPSBldnQgfHwgd2luZG93LmV2ZW50XG4gICAgdmFyIGlzRXNjYXBlID0gZmFsc2VcbiAgICBpZiAoXCJrZXlcIiBpbiBldnQpIHtcbiAgICAgIGlzRXNjYXBlID0gZXZ0LmtleSA9PT0gXCJFc2NhcGVcIiB8fCBldnQua2V5ID09PSBcIkVzY1wiXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEB0cy1pZ25vcmUgLSB0aGlzIHVzZWQgdG8gYmUgdGhlIGNhc2VcbiAgICAgIGlzRXNjYXBlID0gZXZ0LmtleUNvZGUgPT09IDI3XG4gICAgfVxuICAgIGlmIChpc0VzY2FwZSkge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5uYXZiYXItc3ViIGxpLm9wZW5cIikuZm9yRWFjaChpID0+IGkuY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIikpXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGlcIikuZm9yRWFjaChpID0+IGkuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpKVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHNoYXJlQWN0aW9uID0ge1xuICAgIGlkOiBcImNvcHktY2xpcGJvYXJkXCIsXG4gICAgbGFiZWw6IFwiU2F2ZSB0byBjbGlwYm9hcmRcIixcbiAgICBrZXliaW5kaW5nczogW21vbmFjby5LZXlNb2QuQ3RybENtZCB8IG1vbmFjby5LZXlDb2RlLktFWV9TXSxcblxuICAgIGNvbnRleHRNZW51R3JvdXBJZDogXCJydW5cIixcbiAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXG5cbiAgICBydW46IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFVwZGF0ZSB0aGUgVVJMLCB0aGVuIHdyaXRlIHRoYXQgdG8gdGhlIGNsaXBib2FyZFxuICAgICAgY29uc3QgbmV3VVJMID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgXCJcIiwgbmV3VVJMKVxuICAgICAgd2luZG93Lm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGxvY2F0aW9uLmhyZWYudG9TdHJpbmcoKSkudGhlbihcbiAgICAgICAgKCkgPT4gdWkuZmxhc2hJbmZvKGkoXCJwbGF5X2V4cG9ydF9jbGlwYm9hcmRcIikpLFxuICAgICAgICAoZTogYW55KSA9PiBhbGVydChlKVxuICAgICAgKVxuICAgIH0sXG4gIH1cblxuICBjb25zdCBzaGFyZUJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2hhcmUtYnV0dG9uXCIpXG4gIGlmIChzaGFyZUJ1dHRvbikge1xuICAgIHNoYXJlQnV0dG9uLm9uY2xpY2sgPSBlID0+IHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgc2hhcmVBY3Rpb24ucnVuKClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIC8vIFNldCB1cCBzb21lIGtleSBjb21tYW5kc1xuICAgIHNhbmRib3guZWRpdG9yLmFkZEFjdGlvbihzaGFyZUFjdGlvbilcblxuICAgIHNhbmRib3guZWRpdG9yLmFkZEFjdGlvbih7XG4gICAgICBpZDogXCJydW4tanNcIixcbiAgICAgIGxhYmVsOiBcIlJ1biB0aGUgZXZhbHVhdGVkIEphdmFTY3JpcHQgZm9yIHlvdXIgVHlwZVNjcmlwdCBmaWxlXCIsXG4gICAgICBrZXliaW5kaW5nczogW21vbmFjby5LZXlNb2QuQ3RybENtZCB8IG1vbmFjby5LZXlDb2RlLkVudGVyXSxcblxuICAgICAgY29udGV4dE1lbnVHcm91cElkOiBcInJ1blwiLFxuICAgICAgY29udGV4dE1lbnVPcmRlcjogMS41LFxuXG4gICAgICBydW46IGZ1bmN0aW9uIChlZCkge1xuICAgICAgICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgICAgICAgcnVuQnV0dG9uICYmIHJ1bkJ1dHRvbi5vbmNsaWNrICYmIHJ1bkJ1dHRvbi5vbmNsaWNrKHt9IGFzIGFueSlcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuXG4gIGNvbnN0IHJ1bkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicnVuLWJ1dHRvblwiKVxuICBpZiAocnVuQnV0dG9uKSB7XG4gICAgcnVuQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBydW4gPSBzYW5kYm94LmdldFJ1bm5hYmxlSlMoKVxuICAgICAgY29uc3QgcnVuUGx1Z2luID0gcGx1Z2lucy5maW5kKHAgPT4gcC5pZCA9PT0gXCJsb2dzXCIpIVxuICAgICAgYWN0aXZhdGVQbHVnaW4ocnVuUGx1Z2luLCBnZXRDdXJyZW50UGx1Z2luKCksIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuXG4gICAgICBydW5XaXRoQ3VzdG9tTG9ncyhydW4sIGkpXG5cbiAgICAgIGNvbnN0IGlzSlMgPSBzYW5kYm94LmNvbmZpZy5maWxldHlwZSA9PT0gXCJqc1wiXG4gICAgICB1aS5mbGFzaEluZm8oaShpc0pTID8gXCJwbGF5X3J1bl9qc1wiIDogXCJwbGF5X3J1bl90c1wiKSlcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSB0aGUgY2xvc2UgYnV0dG9ucyBvbiB0aGUgZXhhbXBsZXNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImJ1dHRvbi5leGFtcGxlcy1jbG9zZVwiKS5mb3JFYWNoKGIgPT4ge1xuICAgIGNvbnN0IGJ1dHRvbiA9IGIgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgICBidXR0b24ub25jbGljayA9IChlOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IGUudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XG4gICAgICBjb25zdCBuYXZMSSA9IGJ1dHRvbi5jbG9zZXN0KFwibGlcIilcbiAgICAgIG5hdkxJPy5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKVxuICAgIH1cbiAgfSlcblxuICBzZXR1cFNpZGViYXJUb2dnbGUoKVxuXG4gIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbmZpZy1jb250YWluZXJcIikpIHtcbiAgICBjcmVhdGVDb25maWdEcm9wZG93bihzYW5kYm94LCBtb25hY28pXG4gICAgdXBkYXRlQ29uZmlnRHJvcGRvd25Gb3JDb21waWxlck9wdGlvbnMoc2FuZGJveCwgbW9uYWNvKVxuICB9XG5cbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWdyb3VuZC1zZXR0aW5nc1wiKSkge1xuICAgIGNvbnN0IHNldHRpbmdzVG9nZ2xlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5Z3JvdW5kLXNldHRpbmdzXCIpIVxuXG4gICAgc2V0dGluZ3NUb2dnbGUub25jbGljayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IG9wZW4gPSBzZXR0aW5nc1RvZ2dsZS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QuY29udGFpbnMoXCJvcGVuXCIpXG4gICAgICBjb25zdCBzaWRlYmFyVGFicyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1wbHVnaW4tdGFidmlld1wiKSBhcyBIVE1MRGl2RWxlbWVudFxuICAgICAgY29uc3Qgc2lkZWJhckNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuICAgICAgbGV0IHNldHRpbmdzQ29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zZXR0aW5ncy1jb250YWluZXJcIikgYXMgSFRNTERpdkVsZW1lbnRcblxuICAgICAgaWYgKCFzZXR0aW5nc0NvbnRlbnQpIHtcbiAgICAgICAgc2V0dGluZ3NDb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBzZXR0aW5nc0NvbnRlbnQuY2xhc3NOYW1lID0gXCJwbGF5Z3JvdW5kLXNldHRpbmdzLWNvbnRhaW5lciBwbGF5Z3JvdW5kLXBsdWdpbi1jb250YWluZXJcIlxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHNldHRpbmdzUGx1Z2luKGksIHV0aWxzKVxuICAgICAgICBzZXR0aW5ncy5kaWRNb3VudCAmJiBzZXR0aW5ncy5kaWRNb3VudChzYW5kYm94LCBzZXR0aW5nc0NvbnRlbnQpXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyXCIpIS5hcHBlbmRDaGlsZChzZXR0aW5nc0NvbnRlbnQpXG5cbiAgICAgICAgLy8gV2hlbiB0aGUgbGFzdCB0YWIgaXRlbSBpcyBoaXQsIGdvIGJhY2sgdG8gdGhlIHNldHRpbmdzIGJ1dHRvblxuICAgICAgICBjb25zdCBsYWJlbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBsYXlncm91bmQtc2lkZWJhciBpbnB1dFwiKVxuICAgICAgICBjb25zdCBsYXN0TGFiZWwgPSBsYWJlbHMuaXRlbShsYWJlbHMubGVuZ3RoIC0gMSkgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgaWYgKGxhc3RMYWJlbCkge1xuICAgICAgICAgIHJlZGlyZWN0VGFiUHJlc3NUbyhsYXN0TGFiZWwsIHVuZGVmaW5lZCwgXCIjcGxheWdyb3VuZC1zZXR0aW5nc1wiKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChvcGVuKSB7XG4gICAgICAgIHNpZGViYXJUYWJzLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIlxuICAgICAgICBzaWRlYmFyQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gICAgICAgIHNldHRpbmdzQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpZGViYXJUYWJzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgICBzaWRlYmFyQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgICAgc2V0dGluZ3NDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXCIucGxheWdyb3VuZC1zaWRlYmFyIGxhYmVsXCIpIS5mb2N1cygpXG4gICAgICB9XG4gICAgICBzZXR0aW5nc1RvZ2dsZS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QudG9nZ2xlKFwib3BlblwiKVxuICAgIH1cblxuICAgIHNldHRpbmdzVG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgICAgY29uc3QgaXNPcGVuID0gc2V0dGluZ3NUb2dnbGUucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LmNvbnRhaW5zKFwib3BlblwiKVxuICAgICAgaWYgKGUua2V5ID09PSBcIlRhYlwiICYmIGlzT3Blbikge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtb3B0aW9ucyBsaSBpbnB1dFwiKSBhcyBhbnlcbiAgICAgICAgcmVzdWx0LmZvY3VzKClcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8vIFN1cHBvcnQgZ3JhYmJpbmcgZXhhbXBsZXMgZnJvbSB0aGUgbG9jYXRpb24gaGFzaFxuICBpZiAobG9jYXRpb24uaGFzaC5zdGFydHNXaXRoKFwiI2V4YW1wbGVcIikpIHtcbiAgICBjb25zdCBleGFtcGxlTmFtZSA9IGxvY2F0aW9uLmhhc2gucmVwbGFjZShcIiNleGFtcGxlL1wiLCBcIlwiKS50cmltKClcbiAgICBzYW5kYm94LmNvbmZpZy5sb2dnZXIubG9nKFwiTG9hZGluZyBleGFtcGxlOlwiLCBleGFtcGxlTmFtZSlcbiAgICBnZXRFeGFtcGxlU291cmNlQ29kZShjb25maWcucHJlZml4LCBjb25maWcubGFuZywgZXhhbXBsZU5hbWUpLnRoZW4oZXggPT4ge1xuICAgICAgaWYgKGV4LmV4YW1wbGUgJiYgZXguY29kZSkge1xuICAgICAgICBjb25zdCB7IGV4YW1wbGUsIGNvZGUgfSA9IGV4XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBsb2NhbHN0b3JhZ2Ugc2hvd2luZyB0aGF0IHlvdSd2ZSBzZWVuIHRoaXMgcGFnZVxuICAgICAgICBpZiAobG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgY29uc3Qgc2VlblRleHQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImV4YW1wbGVzLXNlZW5cIikgfHwgXCJ7fVwiXG4gICAgICAgICAgY29uc3Qgc2VlbiA9IEpTT04ucGFyc2Uoc2VlblRleHQpXG4gICAgICAgICAgc2VlbltleGFtcGxlLmlkXSA9IGV4YW1wbGUuaGFzaFxuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiZXhhbXBsZXMtc2VlblwiLCBKU09OLnN0cmluZ2lmeShzZWVuKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFsbExpbmtzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImV4YW1wbGUtbGlua1wiKVxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGZvciAoY29uc3QgbGluayBvZiBhbGxMaW5rcykge1xuICAgICAgICAgIGlmIChsaW5rLnRleHRDb250ZW50ID09PSBleGFtcGxlLnRpdGxlKSB7XG4gICAgICAgICAgICBsaW5rLmNsYXNzTGlzdC5hZGQoXCJoaWdobGlnaHRcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC50aXRsZSA9IFwiVHlwZVNjcmlwdCBQbGF5Z3JvdW5kIC0gXCIgKyBleGFtcGxlLnRpdGxlXG4gICAgICAgIHN1cHByZXNzTmV4dFRleHRDaGFuZ2VGb3JIYXNoQ2hhbmdlID0gdHJ1ZVxuICAgICAgICBzYW5kYm94LnNldFRleHQoY29kZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1cHByZXNzTmV4dFRleHRDaGFuZ2VGb3JIYXNoQ2hhbmdlID0gdHJ1ZVxuICAgICAgICBzYW5kYm94LnNldFRleHQoXCIvLyBUaGVyZSB3YXMgYW4gaXNzdWUgZ2V0dGluZyB0aGUgZXhhbXBsZSwgYmFkIFVSTD8gQ2hlY2sgdGhlIGNvbnNvbGUgaW4gdGhlIGRldmVsb3BlciB0b29sc1wiKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBjb25zdCBtb2RlbCA9IHNhbmRib3guZ2V0TW9kZWwoKVxuICBtb2RlbC5vbkRpZENoYW5nZURlY29yYXRpb25zKCgpID0+IHtcbiAgICBjb25zdCBtYXJrZXJzID0gc2FuZGJveC5tb25hY28uZWRpdG9yLmdldE1vZGVsTWFya2Vycyh7IHJlc291cmNlOiBtb2RlbC51cmkgfSkuZmlsdGVyKG0gPT4gbS5zZXZlcml0eSAhPT0gMSlcbiAgICB1dGlscy5zZXROb3RpZmljYXRpb25zKFwiZXJyb3JzXCIsIG1hcmtlcnMubGVuZ3RoKVxuICB9KVxuXG4gIC8vIFNldHMgdXAgYSB3YXkgdG8gY2xpY2sgYmV0d2VlbiBleGFtcGxlc1xuICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyTGlua1Byb3ZpZGVyKHNhbmRib3gubGFuZ3VhZ2UsIG5ldyBFeGFtcGxlSGlnaGxpZ2h0ZXIoKSlcblxuICBjb25zdCBsYW5ndWFnZVNlbGVjdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYW5ndWFnZS1zZWxlY3RvclwiKSBhcyBIVE1MU2VsZWN0RWxlbWVudFxuICBpZiAobGFuZ3VhZ2VTZWxlY3Rvcikge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGNvbnN0IG9wdGlvbnMgPSBbXCJ0c1wiLCBcImQudHNcIiwgXCJqc1wiXVxuICAgIGxhbmd1YWdlU2VsZWN0b3Iub3B0aW9ucy5zZWxlY3RlZEluZGV4ID0gb3B0aW9ucy5pbmRleE9mKHBhcmFtcy5nZXQoXCJmaWxldHlwZVwiKSB8fCBcInRzXCIpXG5cbiAgICBsYW5ndWFnZVNlbGVjdG9yLm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZXR5cGUgPSBvcHRpb25zW051bWJlcihsYW5ndWFnZVNlbGVjdG9yLnNlbGVjdGVkSW5kZXggfHwgMCldXG4gICAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gsIHsgZmlsZXR5cGUgfSlcbiAgICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBmdWxsVVJMXG4gICAgfVxuICB9XG5cbiAgLy8gRW5zdXJlIHRoYXQgdGhlIGVkaXRvciBpcyBmdWxsLXdpZHRoIHdoZW4gdGhlIHNjcmVlbiByZXNpemVzXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsICgpID0+IHtcbiAgICBzYW5kYm94LmVkaXRvci5sYXlvdXQoKVxuICB9KVxuXG4gIGNvbnN0IHVpID0gY3JlYXRlVUkoKVxuICBjb25zdCBleHBvcnRlciA9IGNyZWF0ZUV4cG9ydGVyKHNhbmRib3gsIG1vbmFjbywgdWkpXG5cbiAgY29uc3QgcGxheWdyb3VuZCA9IHtcbiAgICBleHBvcnRlcixcbiAgICB1aSxcbiAgICByZWdpc3RlclBsdWdpbixcbiAgICBwbHVnaW5zLFxuICAgIGdldEN1cnJlbnRQbHVnaW4sXG4gICAgdGFicyxcbiAgICBzZXREaWRVcGRhdGVUYWIsXG4gICAgY3JlYXRlVXRpbHMsXG4gIH1cblxuICB3aW5kb3cudHMgPSBzYW5kYm94LnRzXG4gIHdpbmRvdy5zYW5kYm94ID0gc2FuZGJveFxuICB3aW5kb3cucGxheWdyb3VuZCA9IHBsYXlncm91bmRcblxuICBjb25zb2xlLmxvZyhgVXNpbmcgVHlwZVNjcmlwdCAke3dpbmRvdy50cy52ZXJzaW9ufWApXG5cbiAgY29uc29sZS5sb2coXCJBdmFpbGFibGUgZ2xvYmFsczpcIilcbiAgY29uc29sZS5sb2coXCJcXHR3aW5kb3cudHNcIiwgd2luZG93LnRzKVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy5zYW5kYm94XCIsIHdpbmRvdy5zYW5kYm94KVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy5wbGF5Z3JvdW5kXCIsIHdpbmRvdy5wbGF5Z3JvdW5kKVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy5yZWFjdFwiLCB3aW5kb3cucmVhY3QpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnJlYWN0RE9NXCIsIHdpbmRvdy5yZWFjdERPTSlcblxuICAvKiogQSBwbHVnaW4gKi9cbiAgY29uc3QgYWN0aXZhdGVFeHRlcm5hbFBsdWdpbiA9IChcbiAgICBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4gfCAoKHV0aWxzOiBQbHVnaW5VdGlscykgPT4gUGxheWdyb3VuZFBsdWdpbiksXG4gICAgYXV0b0FjdGl2YXRlOiBib29sZWFuXG4gICkgPT4ge1xuICAgIGxldCByZWFkeVBsdWdpbjogUGxheWdyb3VuZFBsdWdpblxuICAgIC8vIENhbiBlaXRoZXIgYmUgYSBmYWN0b3J5LCBvciBvYmplY3RcbiAgICBpZiAodHlwZW9mIHBsdWdpbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25zdCB1dGlscyA9IGNyZWF0ZVV0aWxzKHNhbmRib3gsIHJlYWN0KVxuICAgICAgcmVhZHlQbHVnaW4gPSBwbHVnaW4odXRpbHMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlYWR5UGx1Z2luID0gcGx1Z2luXG4gICAgfVxuXG4gICAgaWYgKGF1dG9BY3RpdmF0ZSkge1xuICAgICAgY29uc29sZS5sb2cocmVhZHlQbHVnaW4pXG4gICAgfVxuXG4gICAgcGxheWdyb3VuZC5yZWdpc3RlclBsdWdpbihyZWFkeVBsdWdpbilcblxuICAgIC8vIEF1dG8tc2VsZWN0IHRoZSBkZXYgcGx1Z2luXG4gICAgY29uc3QgcGx1Z2luV2FudHNGcm9udCA9IHJlYWR5UGx1Z2luLnNob3VsZEJlU2VsZWN0ZWQgJiYgcmVhZHlQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCgpXG5cbiAgICBpZiAocGx1Z2luV2FudHNGcm9udCB8fCBhdXRvQWN0aXZhdGUpIHtcbiAgICAgIC8vIEF1dG8tc2VsZWN0IHRoZSBkZXYgcGx1Z2luXG4gICAgICBhY3RpdmF0ZVBsdWdpbihyZWFkeVBsdWdpbiwgZ2V0Q3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcbiAgICB9XG4gIH1cblxuICAvLyBEZXYgbW9kZSBwbHVnaW5cbiAgaWYgKGNvbmZpZy5zdXBwb3J0Q3VzdG9tUGx1Z2lucyAmJiBhbGxvd0Nvbm5lY3RpbmdUb0xvY2FsaG9zdCgpKSB7XG4gICAgd2luZG93LmV4cG9ydHMgPSB7fVxuICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGluZyB0byBkZXYgcGx1Z2luXCIpXG4gICAgdHJ5IHtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGNvbnN0IHJlID0gd2luZG93LnJlcXVpcmVcbiAgICAgIHJlKFtcImxvY2FsL2luZGV4XCJdLCAoZGV2UGx1Z2luOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJTZXQgdXAgZGV2IHBsdWdpbiBmcm9tIGxvY2FsaG9zdDo1MDAwXCIpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYWN0aXZhdGVFeHRlcm5hbFBsdWdpbihkZXZQbHVnaW4sIHRydWUpXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHVpLmZsYXNoSW5mbyhcIkVycm9yOiBDb3VsZCBub3QgbG9hZCBkZXYgcGx1Z2luIGZyb20gbG9jYWxob3N0OjUwMDBcIilcbiAgICAgICAgICB9LCA3MDApXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJQcm9ibGVtIGxvYWRpbmcgdXAgdGhlIGRldiBwbHVnaW5cIilcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgfVxuICB9XG5cbiAgY29uc3QgZG93bmxvYWRQbHVnaW4gPSAocGx1Z2luOiBzdHJpbmcsIGF1dG9FbmFibGU6IGJvb2xlYW4pID0+IHtcbiAgICB0cnkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgcmUgPSB3aW5kb3cucmVxdWlyZVxuICAgICAgcmUoW2B1bnBrZy8ke3BsdWdpbn1AbGF0ZXN0L2Rpc3QvaW5kZXhgXSwgKGRldlBsdWdpbjogUGxheWdyb3VuZFBsdWdpbikgPT4ge1xuICAgICAgICBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luKGRldlBsdWdpbiwgYXV0b0VuYWJsZSlcbiAgICAgIH0pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJQcm9ibGVtIGxvYWRpbmcgdXAgdGhlIHBsdWdpbjpcIiwgcGx1Z2luKVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICB9XG4gIH1cblxuICBpZiAoY29uZmlnLnN1cHBvcnRDdXN0b21QbHVnaW5zKSB7XG4gICAgLy8gR3JhYiBvbmVzIGZyb20gbG9jYWxzdG9yYWdlXG4gICAgYWN0aXZlUGx1Z2lucygpLmZvckVhY2gocCA9PiBkb3dubG9hZFBsdWdpbihwLmlkLCBmYWxzZSkpXG5cbiAgICAvLyBPZmZlciB0byBpbnN0YWxsIG9uZSBpZiAnaW5zdGFsbC1wbHVnaW4nIGlzIGEgcXVlcnkgcGFyYW1cbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBjb25zdCBwbHVnaW5Ub0luc3RhbGwgPSBwYXJhbXMuZ2V0KFwiaW5zdGFsbC1wbHVnaW5cIilcbiAgICBpZiAocGx1Z2luVG9JbnN0YWxsKSB7XG4gICAgICBjb25zdCBhbHJlYWR5SW5zdGFsbGVkID0gYWN0aXZlUGx1Z2lucygpLmZpbmQocCA9PiBwLmlkID09PSBwbHVnaW5Ub0luc3RhbGwpXG4gICAgICBpZiAoIWFscmVhZHlJbnN0YWxsZWQpIHtcbiAgICAgICAgY29uc3Qgc2hvdWxkRG9JdCA9IGNvbmZpcm0oXCJXb3VsZCB5b3UgbGlrZSB0byBpbnN0YWxsIHRoZSB0aGlyZCBwYXJ0eSBwbHVnaW4/XFxuXFxuXCIgKyBwbHVnaW5Ub0luc3RhbGwpXG4gICAgICAgIGlmIChzaG91bGREb0l0KSB7XG4gICAgICAgICAgYWRkQ3VzdG9tUGx1Z2luKHBsdWdpblRvSW5zdGFsbClcbiAgICAgICAgICBkb3dubG9hZFBsdWdpbihwbHVnaW5Ub0luc3RhbGwsIHRydWUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAobG9jYXRpb24uaGFzaC5zdGFydHNXaXRoKFwiI3Nob3ctZXhhbXBsZXNcIikpIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhhbXBsZXMtYnV0dG9uXCIpPy5jbGljaygpXG4gICAgfSwgMTAwKVxuICB9XG5cbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNzaG93LXdoYXRpc25ld1wiKSkge1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3aGF0aXNuZXctYnV0dG9uXCIpPy5jbGljaygpXG4gICAgfSwgMTAwKVxuICB9XG5cbiAgLy8gR3JhYiB0aGUgY29udGVudHMgb2YgYSBHaXN0XG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjZ2lzdC9cIikpIHtcbiAgICBnaXN0UG93ZXJlZE5hdkJhcihzYW5kYm94LCB1aSwgc2hvd05hdilcbiAgfVxuXG4gIHJldHVybiBwbGF5Z3JvdW5kXG59XG5cbmV4cG9ydCB0eXBlIFBsYXlncm91bmQgPSBSZXR1cm5UeXBlPHR5cGVvZiBzZXR1cFBsYXlncm91bmQ+XG5cbmNvbnN0IHJlZGlyZWN0VGFiUHJlc3NUbyA9IChlbGVtZW50OiBIVE1MRWxlbWVudCwgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCwgcXVlcnk6IHN0cmluZykgPT4ge1xuICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgIGlmIChlLmtleSA9PT0gXCJUYWJcIikge1xuICAgICAgY29uc3QgaG9zdCA9IGNvbnRhaW5lciB8fCBkb2N1bWVudFxuICAgICAgY29uc3QgcmVzdWx0ID0gaG9zdC5xdWVyeVNlbGVjdG9yKHF1ZXJ5KSBhcyBhbnlcbiAgICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHRvIGZpbmQgYSByZXN1bHQgZm9yIGtleWRvd25gKVxuICAgICAgcmVzdWx0LmZvY3VzKClcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIH1cbiAgfSlcbn1cbiJdfQ==