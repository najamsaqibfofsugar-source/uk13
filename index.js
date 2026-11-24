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

    const apply = () => {
        if (!m) return;
        [m.locale(), "en-gb", "en"].forEach(l => m.updateLocale(l, { longDateFormat: f }));
        m.locale(m.locale());
    };

    const refreshOpenChannel = () => {
        try {
            const channelId = bunny.metro.findByStoreName("SelectedChannelStore")?.getChannelId();
            const messages = bunny.metro.findByStoreName("MessageStore")?.getMessages(channelId)?._array;
            const FluxDispatcher = bunny.metro.common.FluxDispatcher;
            if (!channelId || !messages?.length || !FluxDispatcher) return;

            messages.slice(-30).forEach(msg => {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: typeof msg.toJS === "function" ? msg.toJS() : { ...msg }
                });
            });
        } catch (_) {}
    };

    // Lock Moment.prototype.format immediately so HH:mm can NEVER be output
    const patcher = bunny?.patcher || window.vendetta?.patcher;
    let unpatchFormat;
    if (m?.fn?.format && patcher?.before) {
        unpatchFormat = patcher.before("format", m.fn, (args) => {
            if (typeof args === "string") {
                args = args
                    .replace(/HH:mm:ss/g, "h:mm:ss A")
                    .replace(/HH:mm/g, "h:mm A");
            }
        });
    }

    apply();

    let sub;
    const timers = [];

    return {
        onLoad: function() {
            apply();
            refreshOpenChannel();
            sub = bunny.metro.common.ReactNative.AppState?.addEventListener("change", state => {
                if (state === "active") {
                    apply();
                    refreshOpenChannel();
                    timers.push(setTimeout(refreshOpenChannel, 250));
                }
            });
        },
        onUnload: function() {
            unpatchFormat?.();
            sub?.remove?.();
            timers.forEach(clearTimeout);
            timers.length = 0;
        }
    };
})();
