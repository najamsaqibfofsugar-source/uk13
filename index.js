(function() {
    const m = bunny.metro.findByProps("updateLocale", "defineLocale"),
        SelectedChannelStore = bunny.metro.findByStoreName("SelectedChannelStore"),
        MessageStore = bunny.metro.findByStoreName("MessageStore"),
        FluxDispatcher = bunny.metro.common.FluxDispatcher,
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
            const channelId = SelectedChannelStore?.getChannelId();
            if (!channelId || !MessageStore || !FluxDispatcher) return;

            const messages = MessageStore.getMessages(channelId)?._array;
            if (!Array.isArray(messages) || !messages.length) return;

            messages.slice(-20).forEach(msg => {
                if (!msg?.id || !msg?.channel_id) return;
                // Pass only serializable primitive/JSON fields so native Android never crashes
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: {
                        id: msg.id,
                        channel_id: msg.channel_id,
                        content: msg.content,
                        timestamp: msg.timestamp?.toISOString?.() || String(msg.timestamp),
                        edited_timestamp: msg.editedTimestamp?.toISOString?.() || msg.edited_timestamp || null
                    }
                });
            });
        } catch (_) {}
    };

    const patcher = bunny?.patcher || window.vendetta?.patcher;
    let unpatchFormat;
    if (m?.fn?.format && patcher?.before) {
        unpatchFormat = patcher.before("format", m.fn, (args) => {
            if (typeof args[0] === "string") {
                args[0] = args[0]
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
