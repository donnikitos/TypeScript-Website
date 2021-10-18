var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.gistPoweredNavBar = void 0;
    const gistPoweredNavBar = (sandbox, ui, showNav) => {
        const gistHash = location.hash.split("#gist/")[1];
        const [gistID, gistStoryIndex] = gistHash.split("-");
        sandbox.editor.updateOptions({ readOnly: true });
        ui.flashInfo(`Opening Gist ${gistID} as a Docset`, 2000);
        const playground = document.getElementById("playground-container");
        playground.style.opacity = "0.5";
        const setCode = (code) => {
            const story = document.getElementById("story-container");
            if (story)
                story.style.display = "none";
            const toolbar = document.getElementById("editor-toolbar");
            if (toolbar)
                toolbar.style.display = "block";
            const monaco = document.getElementById("monaco-editor-embed");
            if (monaco)
                monaco.style.display = "block";
            sandbox.setText(code);
            sandbox.editor.layout();
        };
        const setStory = (html) => {
            const toolbar = document.getElementById("editor-toolbar");
            if (toolbar)
                toolbar.style.display = "none";
            const monaco = document.getElementById("monaco-editor-embed");
            if (monaco)
                monaco.style.display = "none";
            const story = document.getElementById("story-container");
            if (!story)
                return;
            story.style.display = "block";
            story.innerHTML = html;
            // We need to hijack internal links
            for (const a of Array.from(story.getElementsByTagName("a"))) {
                if (!a.pathname.startsWith("/play"))
                    continue;
                // Note the the header generated links also count in here
                // overwrite playground links
                if (a.hash.includes("#code/")) {
                    a.onclick = e => {
                        const code = a.hash.replace("#code/", "").trim();
                        let userCode = sandbox.lzstring.decompressFromEncodedURIComponent(code);
                        // Fallback incase there is an extra level of decoding:
                        // https://gitter.im/Microsoft/TypeScript?at=5dc478ab9c39821509ff189a
                        if (!userCode)
                            userCode = sandbox.lzstring.decompressFromEncodedURIComponent(decodeURIComponent(code));
                        if (userCode)
                            setCode(userCode);
                        e.preventDefault();
                        const alreadySelected = document.getElementById("navigation-container").querySelector("li.selected");
                        if (alreadySelected)
                            alreadySelected.classList.remove("selected");
                        return false;
                    };
                }
                // overwrite gist links
                else if (a.hash.includes("#gist/")) {
                    a.onclick = e => {
                        const index = Number(a.hash.split("-")[1]);
                        const nav = document.getElementById("navigation-container");
                        if (!nav)
                            return;
                        const ul = nav.getElementsByTagName("ul").item(0);
                        const targetedLi = ul.children.item(Number(index) || 0) || ul.children.item(0);
                        if (targetedLi) {
                            const a = targetedLi.getElementsByTagName("a").item(0);
                            // @ts-ignore
                            if (a)
                                a.click();
                        }
                        e.preventDefault();
                        return false;
                    };
                }
                else {
                    a.setAttribute("target", "_blank");
                }
            }
        };
        // const relay = "http://localhost:7071/api/API"
        const relay = "https://typescriptplaygroundgistproxyapi.azurewebsites.net/api/API";
        fetch(`${relay}?gistID=${gistID}`)
            .then((res) => __awaiter(void 0, void 0, void 0, function* () {
            playground.style.opacity = "1";
            sandbox.editor.updateOptions({ readOnly: false });
            const response = yield res.json();
            if ("error" in response) {
                return ui.flashInfo(`Error with getting your gist: ${response.display}.`);
            }
            if (response.type === "code") {
                sandbox.setText(response.code);
                sandbox.setCompilerSettings(response.params);
            }
            else if (response.type === "story") {
                showNav();
                const nav = document.getElementById("navigation-container");
                if (!nav)
                    return;
                const title = document.createElement("h4");
                title.textContent = response.title;
                nav.appendChild(title);
                const ul = document.createElement("ul");
                response.files.forEach((element, i) => {
                    const li = document.createElement("li");
                    switch (element.type) {
                        case "html":
                        case "code": {
                            li.classList.add("selectable");
                            const a = document.createElement("a");
                            let logo;
                            if (element.type === "code") {
                                logo = `<svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="7" height="7" fill="#187ABF"/></svg>`;
                            }
                            else if (element.type === "html") {
                                logo = `<svg width="9" height="11" viewBox="0 0 9 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.5V3.25L6 1H4M8 5.5V10H1V1H4M8 5.5H4V1" stroke="#C4C4C4"/></svg>`;
                            }
                            else {
                                logo = "";
                            }
                            a.innerHTML = `${logo}${element.title}`;
                            a.href = `/play?#gist/${gistID}-${i}`;
                            a.onclick = e => {
                                e.preventDefault();
                                const ed = sandbox.editor.getDomNode();
                                if (!ed)
                                    return;
                                sandbox.editor.updateOptions({ readOnly: false });
                                const alreadySelected = ul.querySelector(".selected");
                                if (alreadySelected)
                                    alreadySelected.classList.remove("selected");
                                li.classList.add("selected");
                                if (element.type === "code") {
                                    setCode(element.code);
                                }
                                else if (element.type === "html") {
                                    setStory(element.html);
                                }
                                const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
                                if (alwaysUpdateURL) {
                                    location.hash = `#gist/${gistID}-${i}`;
                                }
                                return false;
                            };
                            li.appendChild(a);
                            break;
                        }
                        case "hr": {
                            const hr = document.createElement("hr");
                            li.appendChild(hr);
                        }
                    }
                    ul.appendChild(li);
                });
                nav.appendChild(ul);
                const targetedLi = ul.children.item(Number(gistStoryIndex) || 0) || ul.children.item(0);
                if (targetedLi) {
                    const a = targetedLi.getElementsByTagName("a").item(0);
                    // @ts-ignore
                    if (a)
                        a.click();
                }
            }
        }))
            .catch(() => {
            ui.flashInfo("Could not reach the gist to playground API, are you (or it) offline?");
            playground.style.opacity = "1";
            sandbox.editor.updateOptions({ readOnly: false });
        });
    };
    exports.gistPoweredNavBar = gistPoweredNavBar;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL25hdmlnYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVFPLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQU0sRUFBRSxPQUFtQixFQUFFLEVBQUU7UUFDakYsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXBELE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEQsRUFBRSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsTUFBTSxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFeEQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBRSxDQUFBO1FBQ25FLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtRQUVoQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQy9CLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUN4RCxJQUFJLEtBQUs7Z0JBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1lBRXZDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUN6RCxJQUFJLE9BQU87Z0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBRTVDLE1BQU0sTUFBTSxH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QyxDQUFBO1lBQ3BGLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQTtZQUM5QixPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFBO0lBaExZLFFBQUEsaUJBQWlCLHFCQWdMN0IiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFN0b3J5Q29udGVudCA9XG4gIHwgeyB0eXBlOiBcImh0bWxcIjsgaHRtbDogc3RyaW5nOyB0aXRsZTogc3RyaW5nIH1cbiAgfCB7IHR5cGU6IFwiY29kZVwiOyBjb2RlOiBzdHJpbmc7IHBhcmFtczogc3RyaW5nOyB0aXRsZTogc3RyaW5nIH1cbiAgfCB7IHR5cGU6IFwiaHJcIiB9XG5cbmltcG9ydCB0eXBlIHsgU2FuZGJveCB9IGZyb20gXCJ0eXBlc2NyaXB0bGFuZy1vcmcvc3RhdGljL2pzL3NhbmRib3hcIlxuaW1wb3J0IHR5cGUgeyBVSSB9IGZyb20gXCIuL2NyZWF0ZVVJXCJcblxuZXhwb3J0IGNvbnN0IGdpc3RQb3dlcmVkTmF2QmFyID0gKHNhbmRib3g6IFNhbmRib3gsIHVpOiBVSSwgc2hvd05hdjogKCkgPT4gdm9pZCkgPT4ge1xuICBjb25zdCBnaXN0SGFzaCA9IGxvY2F0aW9uLmhhc2guc3BsaXQoXCIjZ2lzdC9cIilbMV1cbiAgY29uc3QgW2dpc3RJRCwgZ2lzdFN0b3J5SW5kZXhdID0gZ2lzdEhhc2guc3BsaXQoXCItXCIpXG5cbiAgc2FuZGJveC5lZGl0b3IudXBkYXRlT3B0aW9ucyh7IHJlYWRPbmx5OiB0cnVlIH0pXG4gIHVpLmZsYXNoSW5mbyhgT3BlbmluZyBHaXN0ICR7Z2lzdElEfSBhcyBhIERvY3NldGAsIDIwMDApXG5cbiAgY29uc3QgcGxheWdyb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWdyb3VuZC1jb250YWluZXJcIikhXG4gIHBsYXlncm91bmQuc3R5bGUub3BhY2l0eSA9IFwiMC41XCJcblxuICBjb25zdCBzZXRDb2RlID0gKGNvZGU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHN0b3J5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdG9yeS1jb250YWluZXJcIilcbiAgICBpZiAoc3RvcnkpIHN0b3J5LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuXG4gICAgY29uc3QgdG9vbGJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZWRpdG9yLXRvb2xiYXJcIilcbiAgICBpZiAodG9vbGJhcikgdG9vbGJhci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG5cbiAgICBjb25zdCBtb25hY28gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1vbmFjby1lZGl0b3ItZW1iZWRcIilcbiAgICBpZiAobW9uYWNvKSBtb25hY28uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuXG4gICAgc2FuZGJveC5zZXRUZXh0KGNvZGUpXG4gICAgc2FuZGJveC5lZGl0b3IubGF5b3V0KClcbiAgfVxuXG4gIGNvbnN0IHNldFN0b3J5ID0gKGh0bWw6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHRvb2xiYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVkaXRvci10b29sYmFyXCIpXG4gICAgaWYgKHRvb2xiYXIpIHRvb2xiYXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG5cbiAgICBjb25zdCBtb25hY28gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1vbmFjby1lZGl0b3ItZW1iZWRcIilcbiAgICBpZiAobW9uYWNvKSBtb25hY28uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG5cbiAgICBjb25zdCBzdG9yeSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RvcnktY29udGFpbmVyXCIpXG4gICAgaWYgKCFzdG9yeSkgcmV0dXJuXG5cbiAgICBzdG9yeS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gICAgc3RvcnkuaW5uZXJIVE1MID0gaHRtbFxuICAgIC8vIFdlIG5lZWQgdG8gaGlqYWNrIGludGVybmFsIGxpbmtzXG4gICAgZm9yIChjb25zdCBhIG9mIEFycmF5LmZyb20oc3RvcnkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhXCIpKSkge1xuICAgICAgaWYgKCFhLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvcGxheVwiKSkgY29udGludWVcbiAgICAgIC8vIE5vdGUgdGhlIHRoZSBoZWFkZXIgZ2VuZXJhdGVkIGxpbmtzIGFsc28gY291bnQgaW4gaGVyZVxuXG4gICAgICAvLyBvdmVyd3JpdGUgcGxheWdyb3VuZCBsaW5rc1xuICAgICAgaWYgKGEuaGFzaC5pbmNsdWRlcyhcIiNjb2RlL1wiKSkge1xuICAgICAgICBhLm9uY2xpY2sgPSBlID0+IHtcbiAgICAgICAgICBjb25zdCBjb2RlID0gYS5oYXNoLnJlcGxhY2UoXCIjY29kZS9cIiwgXCJcIikudHJpbSgpXG4gICAgICAgICAgbGV0IHVzZXJDb2RlID0gc2FuZGJveC5senN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQoY29kZSlcbiAgICAgICAgICAvLyBGYWxsYmFjayBpbmNhc2UgdGhlcmUgaXMgYW4gZXh0cmEgbGV2ZWwgb2YgZGVjb2Rpbmc6XG4gICAgICAgICAgLy8gaHR0cHM6Ly9naXR0ZXIuaW0vTWljcm9zb2Z0L1R5cGVTY3JpcHQ/YXQ9NWRjNDc4YWI5YzM5ODIxNTA5ZmYxODlhXG4gICAgICAgICAgaWYgKCF1c2VyQ29kZSkgdXNlckNvZGUgPSBzYW5kYm94Lmx6c3RyaW5nLmRlY29tcHJlc3NGcm9tRW5jb2RlZFVSSUNvbXBvbmVudChkZWNvZGVVUklDb21wb25lbnQoY29kZSkpXG4gICAgICAgICAgaWYgKHVzZXJDb2RlKSBzZXRDb2RlKHVzZXJDb2RlKVxuXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICBjb25zdCBhbHJlYWR5U2VsZWN0ZWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hdmlnYXRpb24tY29udGFpbmVyXCIpIS5xdWVyeVNlbGVjdG9yKFwibGkuc2VsZWN0ZWRcIikgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgICBpZiAoYWxyZWFkeVNlbGVjdGVkKSBhbHJlYWR5U2VsZWN0ZWQuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gb3ZlcndyaXRlIGdpc3QgbGlua3NcbiAgICAgIGVsc2UgaWYgKGEuaGFzaC5pbmNsdWRlcyhcIiNnaXN0L1wiKSkge1xuICAgICAgICBhLm9uY2xpY2sgPSBlID0+IHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IE51bWJlcihhLmhhc2guc3BsaXQoXCItXCIpWzFdKVxuICAgICAgICAgIGNvbnN0IG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmF2aWdhdGlvbi1jb250YWluZXJcIilcbiAgICAgICAgICBpZiAoIW5hdikgcmV0dXJuXG4gICAgICAgICAgY29uc3QgdWwgPSBuYXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1bFwiKS5pdGVtKDApIVxuXG4gICAgICAgICAgY29uc3QgdGFyZ2V0ZWRMaSA9IHVsLmNoaWxkcmVuLml0ZW0oTnVtYmVyKGluZGV4KSB8fCAwKSB8fCB1bC5jaGlsZHJlbi5pdGVtKDApXG4gICAgICAgICAgaWYgKHRhcmdldGVkTGkpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSB0YXJnZXRlZExpLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYVwiKS5pdGVtKDApXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICBpZiAoYSkgYS5jbGljaygpXG4gICAgICAgICAgfVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhLnNldEF0dHJpYnV0ZShcInRhcmdldFwiLCBcIl9ibGFua1wiKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGNvbnN0IHJlbGF5ID0gXCJodHRwOi8vbG9jYWxob3N0OjcwNzEvYXBpL0FQSVwiXG4gIGNvbnN0IHJlbGF5ID0gXCJodHRwczovL3R5cGVzY3JpcHRwbGF5Z3JvdW5kZ2lzdHByb3h5YXBpLmF6dXJld2Vic2l0ZXMubmV0L2FwaS9BUElcIlxuICBmZXRjaChgJHtyZWxheX0/Z2lzdElEPSR7Z2lzdElEfWApXG4gICAgLnRoZW4oYXN5bmMgcmVzID0+IHtcbiAgICAgIHBsYXlncm91bmQuc3R5bGUub3BhY2l0eSA9IFwiMVwiXG4gICAgICBzYW5kYm94LmVkaXRvci51cGRhdGVPcHRpb25zKHsgcmVhZE9ubHk6IGZhbHNlIH0pXG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzLmpzb24oKVxuICAgICAgaWYgKFwiZXJyb3JcIiBpbiByZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gdWkuZmxhc2hJbmZvKGBFcnJvciB3aXRoIGdldHRpbmcgeW91ciBnaXN0OiAke3Jlc3BvbnNlLmRpc3BsYXl9LmApXG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZS50eXBlID09PSBcImNvZGVcIikge1xuICAgICAgICBzYW5kYm94LnNldFRleHQocmVzcG9uc2UuY29kZSlcbiAgICAgICAgc2FuZGJveC5zZXRDb21waWxlclNldHRpbmdzKHJlc3BvbnNlLnBhcmFtcylcbiAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UudHlwZSA9PT0gXCJzdG9yeVwiKSB7XG4gICAgICAgIHNob3dOYXYoKVxuXG4gICAgICAgIGNvbnN0IG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmF2aWdhdGlvbi1jb250YWluZXJcIilcbiAgICAgICAgaWYgKCFuYXYpIHJldHVyblxuXG4gICAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImg0XCIpXG4gICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGl0bGVcbiAgICAgICAgbmF2LmFwcGVuZENoaWxkKHRpdGxlKVxuXG4gICAgICAgIGNvbnN0IHVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpXG4gICAgICAgIHJlc3BvbnNlLmZpbGVzLmZvckVhY2goKGVsZW1lbnQ6IFN0b3J5Q29udGVudCwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgICBzd2l0Y2ggKGVsZW1lbnQudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcImh0bWxcIjpcbiAgICAgICAgICAgIGNhc2UgXCJjb2RlXCI6IHtcbiAgICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcInNlbGVjdGFibGVcIilcbiAgICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpXG5cbiAgICAgICAgICAgICAgbGV0IGxvZ286IHN0cmluZ1xuICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09PSBcImNvZGVcIikge1xuICAgICAgICAgICAgICAgIGxvZ28gPSBgPHN2ZyB3aWR0aD1cIjdcIiBoZWlnaHQ9XCI3XCIgdmlld0JveD1cIjAgMCA3IDdcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cmVjdCB3aWR0aD1cIjdcIiBoZWlnaHQ9XCI3XCIgZmlsbD1cIiMxODdBQkZcIi8+PC9zdmc+YFxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQudHlwZSA9PT0gXCJodG1sXCIpIHtcbiAgICAgICAgICAgICAgICBsb2dvID0gYDxzdmcgd2lkdGg9XCI5XCIgaGVpZ2h0PVwiMTFcIiB2aWV3Qm94PVwiMCAwIDkgMTFcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwiTTggNS41VjMuMjVMNiAxSDRNOCA1LjVWMTBIMVYxSDRNOCA1LjVINFYxXCIgc3Ryb2tlPVwiI0M0QzRDNFwiLz48L3N2Zz5gXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nbyA9IFwiXCJcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGEuaW5uZXJIVE1MID0gYCR7bG9nb30ke2VsZW1lbnQudGl0bGV9YFxuICAgICAgICAgICAgICBhLmhyZWYgPSBgL3BsYXk/I2dpc3QvJHtnaXN0SUR9LSR7aX1gXG5cbiAgICAgICAgICAgICAgYS5vbmNsaWNrID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICAgICAgICBjb25zdCBlZCA9IHNhbmRib3guZWRpdG9yLmdldERvbU5vZGUoKVxuICAgICAgICAgICAgICAgIGlmICghZWQpIHJldHVyblxuICAgICAgICAgICAgICAgIHNhbmRib3guZWRpdG9yLnVwZGF0ZU9wdGlvbnMoeyByZWFkT25seTogZmFsc2UgfSlcbiAgICAgICAgICAgICAgICBjb25zdCBhbHJlYWR5U2VsZWN0ZWQgPSB1bC5xdWVyeVNlbGVjdG9yKFwiLnNlbGVjdGVkXCIpIGFzIEhUTUxFbGVtZW50XG4gICAgICAgICAgICAgICAgaWYgKGFscmVhZHlTZWxlY3RlZCkgYWxyZWFkeVNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxuXG4gICAgICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gXCJjb2RlXCIpIHtcbiAgICAgICAgICAgICAgICAgIHNldENvZGUoZWxlbWVudC5jb2RlKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC50eXBlID09PSBcImh0bWxcIikge1xuICAgICAgICAgICAgICAgICAgc2V0U3RvcnkoZWxlbWVudC5odG1sKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGFsd2F5c1VwZGF0ZVVSTCA9ICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRpc2FibGUtc2F2ZS1vbi10eXBlXCIpXG4gICAgICAgICAgICAgICAgaWYgKGFsd2F5c1VwZGF0ZVVSTCkge1xuICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaGFzaCA9IGAjZ2lzdC8ke2dpc3RJRH0tJHtpfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoYSlcblxuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBcImhyXCI6IHtcbiAgICAgICAgICAgICAgY29uc3QgaHIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaHJcIilcbiAgICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoaHIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHVsLmFwcGVuZENoaWxkKGxpKVxuICAgICAgICB9KVxuICAgICAgICBuYXYuYXBwZW5kQ2hpbGQodWwpXG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ZWRMaSA9IHVsLmNoaWxkcmVuLml0ZW0oTnVtYmVyKGdpc3RTdG9yeUluZGV4KSB8fCAwKSB8fCB1bC5jaGlsZHJlbi5pdGVtKDApXG4gICAgICAgIGlmICh0YXJnZXRlZExpKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHRhcmdldGVkTGkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhXCIpLml0ZW0oMClcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgaWYgKGEpIGEuY2xpY2soKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgdWkuZmxhc2hJbmZvKFwiQ291bGQgbm90IHJlYWNoIHRoZSBnaXN0IHRvIHBsYXlncm91bmQgQVBJLCBhcmUgeW91IChvciBpdCkgb2ZmbGluZT9cIilcbiAgICAgIHBsYXlncm91bmQuc3R5bGUub3BhY2l0eSA9IFwiMVwiXG4gICAgICBzYW5kYm94LmVkaXRvci51cGRhdGVPcHRpb25zKHsgcmVhZE9ubHk6IGZhbHNlIH0pXG4gICAgfSlcbn1cbiJdfQ==