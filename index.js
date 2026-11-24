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

    // Forces the currently open channel's native chat view to redraw timestamps
    const refreshActiveChannel = () => {
        try {
            const SelectedChannelStore = bunny?.metro?.findByStoreName?.("SelectedChannelStore");
            const MessageStore = bunny?.metro?.findByStoreName?.("MessageStore");
            const FluxDispatcher = bunny?.metro?.common?.FluxDispatcher;

            const channelId = SelectedChannelStore?.getChannelId?.();
            if (!channelId || !MessageStore || !FluxDispatcher) return;

            const messages = MessageStore.getMessages?.(channelId);
            const lastMsg = messages?.last?.();
            if (lastMsg) {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: typeof lastMsg.toJS === "function" ? lastMsg.toJS() : { ...lastMsg }
                });
            }
        } catch (_) {}
    };

    const start = () => {
        apply();

        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        const patcher = bunny?.patcher || window.vendetta?.patcher;

        // 1. Intercept locale definitions BEFORE Moment applies 24-hour formats
        if (m && patcher?.before && unpatches.length === 0) {
            ["updateLocale", "defineLocale"].forEach(fn => {
                if (typeof m[fn] === "function") {
                    unpatches.push(patcher.before(fn, m, (args) => {
                        if (args[1] && typeof args[1] === "object") {
                            args[1].longDateFormat = { ...args[1].longDateFormat, ...f };
                        }
                    }));
                }
            });
        }

        // 2. Re-apply & refresh the open server channel when waking from background
        const AppState = bunny?.metro?.common?.ReactNative?.AppState;
        if (AppState?.addEventListener) {
            const sub = AppState.addEventListener("change", state => {
                if (state === "active") {
                    apply();
                    setTimeout(() => {
                        apply();
                        refreshActiveChannel();
                    }, 100);
                }
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
