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
    exports.getDTSFileForModuleWithVersion = exports.getFiletreeForModuleWithVersion = exports.getNPMVersionForModuleReference = exports.getNPMVersionsForModule = void 0;
    //  https://github.com/jsdelivr/data.jsdelivr.com
    const getNPMVersionsForModule = (config, moduleName) => {
        const url = `https://data.jsdelivr.com/v1/package/npm/${moduleName}`;
        return api(config, url);
    };
    exports.getNPMVersionsForModule = getNPMVersionsForModule;
    const getNPMVersionForModuleReference = (config, moduleName, reference) => {
        const url = `https://data.jsdelivr.com/v1/package/resolve/npm/${moduleName}@${reference}`;
        return api(config, url);
    };
    exports.getNPMVersionForModuleReference = getNPMVersionForModuleReference;
    const getFiletreeForModuleWithVersion = (config, moduleName, version) => __awaiter(void 0, void 0, void 0, function* () {
        const url = `https://data.jsdelivr.com/v1/package/npm/${moduleName}@${version}/flat`;
        const res = yield api(config, url);
        if (res instanceof Error) {
            return res;
        }
        else {
            return Object.assign(Object.assign({}, res), { moduleName,
                version });
        }
    });
    exports.getFiletreeForModuleWithVersion = getFiletreeForModuleWithVersion;
    const getDTSFileForModuleWithVersion = (config, moduleName, version, file) => __awaiter(void 0, void 0, void 0, function* () {
        // file has a prefix / in falr mode
        const url = `https://cdn.jsdelivr.net/npm/${moduleName}@${version}${file}`;
        const f = config.fetcher || fetch;
        const res = yield f(url, { headers: { "User-Agent": `Type Acquisition ${config.projectName}` } });
        if (res.ok) {
            return res.text();
        }
        else {
            return new Error("OK");
        }
    });
    exports.getDTSFileForModuleWithVersion = getDTSFileForModuleWithVersion;
    function api(config, url) {
        const f = config.fetcher || fetch;
        // This breaks Safari/Firefox
        // const isWebWorker =
        //   typeof self !== 'undefined' &&
        //   // @ts-ignore
        //   typeof self.WorkerGlobalScope !== 'undefined'
        // const isBrowser =
        //   isWebWorker || (
        //     typeof window !== 'undefined' &&
        //     typeof window.document !== 'undefined' &&
        //     typeof fetch !== 'undefined'
        //   )
        // // Don't pass in custom headers when the user-agent is a browser, this is
        // // so we keep the request classed as a COR "simple"
        // const headers: any = isBrowser ? {} : { "User-Agent": `Type Acquisition ${config.projectName}` }
        return f(url).then(res => {
            if (res.ok) {
                return res.json().then(f => f);
            }
            else {
                return new Error("OK");
            }
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NhbmRib3gvc3JjL3ZlbmRvci9hdGEvYXBpcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBRUEsaURBQWlEO0lBRTFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxNQUEwQixFQUFFLFVBQWtCLEVBQUUsRUFBRTtRQUN4RixNQUFNLEdBQUcsR0FBRyw0Q0FBNEMsVUFBVSxFQUFFLENBQUE7UUFDcEUsT0FBTyxHQUFHLENBQXVELE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUMvRSxDQUFDLENBQUE7SUFIWSxRQUFBLHVCQUF1QiwyQkFHbkM7SUFFTSxNQUFNLCtCQUErQixHQUFHLENBQUMsTUFBMEIsRUFBRSxVQUFrQixFQUFFLFNBQWlCLEVBQUUsRUFBRTtRQUNuSCxNQUFNLEdBQUcsR0FBRyxvREFBb0QsVUFBVSxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBQ3pGLE9BQU8sR0FBRyxDQUE2QixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFBO0lBSFksUUFBQSwrQkFBK0IsbUNBRzNDO0lBSU0sTUFBTSwrQkFBK0IsR0FBRyxDQUM3QyxNQUEwQixFQUMxQixVQUFrQixFQUNsQixPQUFlLEVBQ2YsRUFBRTtRQUNGLE1BQU0sR0FBRyxHQUFHLDRDQUE0QyxVQUFVLElBQUksT0FBTyxPQUFPLENBQUE7UUFDcEYsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQWMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTtZQUN4QixPQUFPLEdBQUcsQ0FBQTtTQUNYO2FBQU07WUFDTCx1Q0FDSyxHQUFHLEtBQ04sVUFBVTtnQkFDVixPQUFPLElBQ1I7U0FDRjtJQUNILENBQUMsQ0FBQSxDQUFBO0lBaEJZLFFBQUEsK0JBQStCLG1DQWdCM0M7SUFFTSxNQUFNLDhCQUE4QixHQUFHLENBQzVDLE1BQTBCLEVBQzFCLFVBQWtCLEVBQ2xCLE9BQWUsRUFDZixJQUFZLEVBQ1osRUFBRTtRQUNGLG1DQUFtQztRQUNuQyxNQUFNLEdBQUcsR0FBRyxnQ0FBZ0MsVUFBVSxJQUFJLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQTtRQUMxRSxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQTtRQUNqQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDVixPQUFPLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtTQUNsQjthQUFNO1lBQ0wsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUN2QjtJQUNILENBQUMsQ0FBQSxDQUFBO0lBZlksUUFBQSw4QkFBOEIsa0NBZTFDO0lBRUQsU0FBUyxHQUFHLENBQUksTUFBMEIsRUFBRSxHQUFXO1FBQ3JELE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFBO1FBRWpDLDZCQUE2QjtRQUU3QixzQkFBc0I7UUFDdEIsbUNBQW1DO1FBQ25DLGtCQUFrQjtRQUNsQixrREFBa0Q7UUFFbEQsb0JBQW9CO1FBQ3BCLHFCQUFxQjtRQUNyQix1Q0FBdUM7UUFDdkMsZ0RBQWdEO1FBQ2hELG1DQUFtQztRQUNuQyxNQUFNO1FBRU4sNEVBQTRFO1FBQzVFLHNEQUFzRDtRQUN0RCxtR0FBbUc7UUFHbkcsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRTtnQkFDVixPQUFPLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFNLENBQUMsQ0FBQTthQUNwQztpQkFBTTtnQkFDTCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2FBQ3ZCO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVRBQm9vdHN0cmFwQ29uZmlnIH0gZnJvbSBcIi5cIlxuXG4vLyAgaHR0cHM6Ly9naXRodWIuY29tL2pzZGVsaXZyL2RhdGEuanNkZWxpdnIuY29tXG5cbmV4cG9ydCBjb25zdCBnZXROUE1WZXJzaW9uc0Zvck1vZHVsZSA9IChjb25maWc6IEFUQUJvb3RzdHJhcENvbmZpZywgbW9kdWxlTmFtZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHVybCA9IGBodHRwczovL2RhdGEuanNkZWxpdnIuY29tL3YxL3BhY2thZ2UvbnBtLyR7bW9kdWxlTmFtZX1gXG4gIHJldHVybiBhcGk8eyB0YWdzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+OyB2ZXJzaW9uczogc3RyaW5nW10gfT4oY29uZmlnLCB1cmwpXG59XG5cbmV4cG9ydCBjb25zdCBnZXROUE1WZXJzaW9uRm9yTW9kdWxlUmVmZXJlbmNlID0gKGNvbmZpZzogQVRBQm9vdHN0cmFwQ29uZmlnLCBtb2R1bGVOYW1lOiBzdHJpbmcsIHJlZmVyZW5jZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHVybCA9IGBodHRwczovL2RhdGEuanNkZWxpdnIuY29tL3YxL3BhY2thZ2UvcmVzb2x2ZS9ucG0vJHttb2R1bGVOYW1lfUAke3JlZmVyZW5jZX1gXG4gIHJldHVybiBhcGk8eyB2ZXJzaW9uOiBzdHJpbmcgfCBudWxsIH0+KGNvbmZpZywgdXJsKVxufVxuXG5leHBvcnQgdHlwZSBOUE1UcmVlTWV0YSA9IHsgZGVmYXVsdDogc3RyaW5nOyBmaWxlczogQXJyYXk8eyBuYW1lOiBzdHJpbmcgfT47IG1vZHVsZU5hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nIH1cblxuZXhwb3J0IGNvbnN0IGdldEZpbGV0cmVlRm9yTW9kdWxlV2l0aFZlcnNpb24gPSBhc3luYyAoXG4gIGNvbmZpZzogQVRBQm9vdHN0cmFwQ29uZmlnLFxuICBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gIHZlcnNpb246IHN0cmluZ1xuKSA9PiB7XG4gIGNvbnN0IHVybCA9IGBodHRwczovL2RhdGEuanNkZWxpdnIuY29tL3YxL3BhY2thZ2UvbnBtLyR7bW9kdWxlTmFtZX1AJHt2ZXJzaW9ufS9mbGF0YFxuICBjb25zdCByZXMgPSBhd2FpdCBhcGk8TlBNVHJlZU1ldGE+KGNvbmZpZywgdXJsKVxuICBpZiAocmVzIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICByZXR1cm4gcmVzXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnJlcyxcbiAgICAgIG1vZHVsZU5hbWUsXG4gICAgICB2ZXJzaW9uLFxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY29uc3QgZ2V0RFRTRmlsZUZvck1vZHVsZVdpdGhWZXJzaW9uID0gYXN5bmMgKFxuICBjb25maWc6IEFUQUJvb3RzdHJhcENvbmZpZyxcbiAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICB2ZXJzaW9uOiBzdHJpbmcsXG4gIGZpbGU6IHN0cmluZ1xuKSA9PiB7XG4gIC8vIGZpbGUgaGFzIGEgcHJlZml4IC8gaW4gZmFsciBtb2RlXG4gIGNvbnN0IHVybCA9IGBodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtLyR7bW9kdWxlTmFtZX1AJHt2ZXJzaW9ufSR7ZmlsZX1gXG4gIGNvbnN0IGYgPSBjb25maWcuZmV0Y2hlciB8fCBmZXRjaFxuICBjb25zdCByZXMgPSBhd2FpdCBmKHVybCwgeyBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgVHlwZSBBY3F1aXNpdGlvbiAke2NvbmZpZy5wcm9qZWN0TmFtZX1gIH0gfSlcbiAgaWYgKHJlcy5vaykge1xuICAgIHJldHVybiByZXMudGV4dCgpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcihcIk9LXCIpXG4gIH1cbn1cblxuZnVuY3Rpb24gYXBpPFQ+KGNvbmZpZzogQVRBQm9vdHN0cmFwQ29uZmlnLCB1cmw6IHN0cmluZyk6IFByb21pc2U8VCB8IEVycm9yPiB7XG4gIGNvbnN0IGYgPSBjb25maWcuZmV0Y2hlciB8fCBmZXRjaFxuXG4gIC8vIFRoaXMgYnJlYWtzIFNhZmFyaS9GaXJlZm94XG5cbiAgLy8gY29uc3QgaXNXZWJXb3JrZXIgPVxuICAvLyAgIHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyAmJlxuICAvLyAgIC8vIEB0cy1pZ25vcmVcbiAgLy8gICB0eXBlb2Ygc2VsZi5Xb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCdcblxuICAvLyBjb25zdCBpc0Jyb3dzZXIgPVxuICAvLyAgIGlzV2ViV29ya2VyIHx8IChcbiAgLy8gICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gIC8vICAgICB0eXBlb2Ygd2luZG93LmRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJlxuICAvLyAgICAgdHlwZW9mIGZldGNoICE9PSAndW5kZWZpbmVkJ1xuICAvLyAgIClcblxuICAvLyAvLyBEb24ndCBwYXNzIGluIGN1c3RvbSBoZWFkZXJzIHdoZW4gdGhlIHVzZXItYWdlbnQgaXMgYSBicm93c2VyLCB0aGlzIGlzXG4gIC8vIC8vIHNvIHdlIGtlZXAgdGhlIHJlcXVlc3QgY2xhc3NlZCBhcyBhIENPUiBcInNpbXBsZVwiXG4gIC8vIGNvbnN0IGhlYWRlcnM6IGFueSA9IGlzQnJvd3NlciA/IHt9IDogeyBcIlVzZXItQWdlbnRcIjogYFR5cGUgQWNxdWlzaXRpb24gJHtjb25maWcucHJvamVjdE5hbWV9YCB9XG5cblxuICByZXR1cm4gZih1cmwpLnRoZW4ocmVzID0+IHtcbiAgICBpZiAocmVzLm9rKSB7XG4gICAgICByZXR1cm4gcmVzLmpzb24oKS50aGVuKGYgPT4gZiBhcyBUKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKFwiT0tcIilcbiAgICB9XG4gIH0pXG59XG4iXX0=