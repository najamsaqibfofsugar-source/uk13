(function() {
    const f = {
        LT: "h:mm A",
        LTS: "h:mm:ss A",
        L: "DD/MM/YYYY",
        LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY h:mm A",
        LLLL: "dddd, D MMMM YYYY h:mm A"
    };

    const unpatches = [];

    const apply = () => {
        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        if (!m) return;

        const cur = m.locale();
        [...new Set([cur, "en-gb", "en"])].forEach(l => {
            if (l) m.updateLocale(l, { longDateFormat: f });
        });
        if (cur) m.locale(cur);
    };

    // Forces all cached messages in the open channel to redraw their timestamps
    const refreshChannel = (channelId) => {
        try {
            const SelectedChannelStore = bunny?.metro?.findByStoreName?.("SelectedChannelStore");
            const MessageStore = bunny?.metro?.findByStoreName?.("MessageStore");
            const FluxDispatcher = bunny?.metro?.common?.FluxDispatcher;

            const id = channelId || SelectedChannelStore?.getChannelId?.();
            if (!id || !MessageStore || !FluxDispatcher) return;

            const messages = MessageStore.getMessages?.(id)?._array;
            if (!Array.isArray(messages) || messages.length === 0) return;

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: typeof msg.toJS === "function" ? msg.toJS() : { ...msg }
                });
            }
        } catch (_) {}
    };

    const start = () => {
        const m = bunny?.metro?.findByProps?.("updateLocale", "defineLocale");
        const patcher = bunny?.patcher || window.vendetta?.patcher;

        if (m && patcher && unpatches.length === 0) {
            // 1. Lock Locale.prototype.longDateFormat so Moment NEVER returns 24h formats
            const localeProto = Object.getPrototypeOf(m.localeData?.());
            if (localeProto && typeof localeProto.longDateFormat === "function" && patcher.instead) {
                unpatches.push(
                    patcher.instead("longDateFormat", localeProto, function(args, orig) {
                        return f[args[0]] || orig.apply(this, args);
                    })
                );
            }

            // 2. Fix args[1] when Discord defines or updates a locale
            if (patcher.before) {
                ["updateLocale", "defineLocale"].forEach(fn => {
                    if (typeof m[fn] === "function") {
                        unpatches.push(patcher.before(fn, m, (args) => {
                            if (args?.[1] && typeof args[1] === "object") {
                                args[1].longDateFormat = { ...args[1].longDateFormat, ...f };
                            }
                        }));
                    }
                });
            }
        }

        apply();

        // 3. Redraw active channel messages on app wake-up
        const AppState = bunny?.metro?.common?.ReactNative?.AppState;
        if (AppState?.addEventListener) {
            const sub = AppState.addEventListener("change", state => {
                if (state === "active") {
                    apply();
                    refreshChannel();
                }
            });
            if (sub?.remove) unpatches.push(() => sub.remove());
        }

        // 4. Redraw messages whenever switching into a previously cached channel
        const FluxDispatcher = bunny?.metro?.common?.FluxDispatcher;
        if (FluxDispatcher?.subscribe) {
            const onSelect = (event) => {
                if (event?.channelId) refreshChannel(event.channelId);
            };
            FluxDispatcher.subscribe("CHANNEL_SELECT", onSelect);
            unpatches.push(() => FluxDispatcher.unsubscribe("CHANNEL_SELECT", onSelect));
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
