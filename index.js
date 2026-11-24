(function() {
    const f = {
        LT: "h:mm A",
        LTS: "h:mm:ss A",
        L: "DD/MM/YYYY",
        LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY h:mm A",
        LLLL: "dddd, D MMMM YYYY h:mm A"
    };

    const apply = () => {
        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        if (!m) return false;

        const cur = m.locale();
        const targets = new Set([cur, "en-gb", "en"]);
        
        targets.forEach(l => {
            if (l) m.updateLocale(l, { longDateFormat: f });
        });

        // Force moment to refresh active locale cache immediately
        if (cur) m.locale(cur);
        return true;
    };

    // 1. Run immediately upon script evaluation (fastest possible execution)
    apply();

    // 2. Keep onLoad as a safety fallback in case Metro wasn't ready at eval time
    return {
        onLoad: apply,
        onUnload: () => {}
    };
})();
