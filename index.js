(function() {
    const f = {
        LT: "h:mm A",
        LTS: "h:mm:ss A",
        L: "DD/MM/YYYY",
        LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY h:mm A",
        LLLL: "dddd, D MMMM YYYY h:mm A"
    };

    const targets = new Set(["en-gb", "en"]);
    const unpatches = [];

    const forceFormat = (m) => {
        const cur = m.locale();
        if (cur) targets.add(cur);

        targets.forEach(l => {
            const data = m.localeData(l);
            if (data && data._longDateFormat) {
                Object.assign(data._longDateFormat, f);
            }
        });
    };

    const init = () => {
        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        if (!m) return false;

        // 1. Apply immediately
        forceFormat(m);

        // 2. Patch moment functions so Discord can never overwrite them on app resume
        if (bunny?.patcher?.after && unpatches.length === 0) {
            ["locale", "updateLocale", "defineLocale"].forEach(fn => {
                if (typeof m[fn] === "function") {
                    unpatches.push(
                        bunny.patcher.after(fn, m, () => forceFormat(m))
                    );
                }
            });
        }

        // Refresh active locale
        m.locale(m.locale());
        return true;
    };

    init();

    return {
        onLoad: init,
        onUnload: () => {
            unpatches.forEach(u => u());
            unpatches.length = 0;
        }
    };
})();
