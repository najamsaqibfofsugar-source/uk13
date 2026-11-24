(function() {
    const m = bunny.metro.findByProps("updateLocale", "defineLocale"),
        f = {
            LT: "h:mm A",
            LTS: "h:mm:ss A",
            L: "DD/MM/YYYY",
            LL: "D MMMM YYYY",
            LLL: "D MMMM YYYY h:mm A",
            LLLL: "dddd, D MMMM YYYY h:mm A"
        };

    const applyMoment = () => {
        if (!m) return;
        [m.locale(), "en-gb", "en"].forEach(l => m.updateLocale(l, { longDateFormat: f }));
        m.locale(m.locale());
    };

    // Force 12-hour clock globally in Intl.DateTimeFormat while preserving DD/MM/YYYY
    const OrigDTF = Intl.DateTimeFormat;
    function PatchedDTF(locales, options) {
        const opts = options ? { ...options } : {};
        if (opts.hour !== undefined || opts.timeStyle !== undefined) {
            opts.hour12 = true;
            delete opts.hourCycle;
        }
        return new OrigDTF(locales, opts);
    }
    PatchedDTF.prototype = OrigDTF.prototype;
    PatchedDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf.bind(OrigDTF);

    let sub;

    return {
        onLoad: function() {
            Intl.DateTimeFormat = PatchedDTF;
            applyMoment();
            sub = bunny.metro.common.ReactNative.AppState?.addEventListener("change", state => {
                if (state === "active") applyMoment();
            });
        },
        onUnload: function() {
            Intl.DateTimeFormat = OrigDTF;
            sub?.remove?.();
        }
    };
})();
