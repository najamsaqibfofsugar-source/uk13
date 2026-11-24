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

    let sub;

    return {
        onLoad: function() {
            apply();
            sub = bunny.metro.common.ReactNative.AppState?.addEventListener("change", state => {
                if (state === "active") {
                    apply();
                    refreshOpenChannel();
                }
            });
        },
        onUnload: function() {
            sub?.remove?.();
        }
    };
})();
