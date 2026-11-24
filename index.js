(function() {
    const f = {
        LT: "h:mm A",
        LTS: "h:mm:ss A",
        L: "DD/MM/YYYY",
        LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY h:mm A",
        LLLL: "dddd, D MMMM YYYY h:mm A"
    };

    let updating = false;
    const unpatches = [];

    const apply = () => {
        if (updating) return;
        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        if (!m) return;

        updating = true;
        try {
            const cur = m.locale();
            [...new Set([cur, "en-gb", "en"])].forEach(l => {
                if (l) m.updateLocale(l, { longDateFormat: f });
            });
            if (cur) m.locale(cur);
        } finally {
            updating = false;
        }
    };

    const start = () => {
        apply();

        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        const patcher = bunny?.patcher || window.vendetta?.patcher;

        // 1. Re-apply whenever Discord touches Moment's locale methods
        if (m && patcher?.after && unpatches.length === 0) {
            ["updateLocale", "defineLocale", "locale"].forEach(fn => {
                if (typeof m[fn] === "function") {
                    unpatches.push(patcher.after(fn, m, apply));
                }
            });
        }

        // 2. Re-apply whenever the app wakes up from background sleep
        const AppState = bunny?.metro?.common?.ReactNative?.AppState;
        if (AppState?.addEventListener) {
            const sub = AppState.addEventListener("change", state => {
                if (state === "active") apply();
            });
            if (sub?.remove) unpatches.push(() => sub.remove());
        }
    };

    start();

    return {
        onLoad: start,
        onUnload: () => {
            unpatches.forEach(u => u());
            unpatches.length = 0;
        }
    };
})();
