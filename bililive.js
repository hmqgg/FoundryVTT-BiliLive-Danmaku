const MODULE_NAME = "bililive";
const danmaku = {
    client: null,
    giftPublic: false,
    danmakuPublic: false,
    commandPublic: false,
    profanityFilter: [],
    senderFilter: [],
    roomId: 0,
    onDanmaku: onDanmaku,
    onGift: onGift,
    onCommand, onCommand
};

import { dnd5eCommand } from "./modules/dnd5e.js";
export { danmaku };

Hooks.on("init", () => registerSettings());
Hooks.on("ready", () => {
    setupDanmakuClient();
    window.danmaku = danmaku;
});

Hooks.on("renderChatMessage", function (message, html, _) {
    const type = message.getFlag("bililive", "type");
    if (type) {
        html.find(".message-sender").text("");
        html.find(".whisper-to").text("");
        html.find(".message-timestamp").hide();
    }
});

function setupDanmakuClient() {
    try {
        danmaku.client?.terminate();
    } catch (ex) {
        console.error("Bililive | Danmaku Client Termination failed!", ex);
    }

    // Get configs.
    const roomId = Number(getSetting("roomId")) || 0;
    danmaku.giftPublic = Boolean(getSetting("giftPublic")) || false;
    danmaku.danmakuPublic = Boolean(getSetting("danmakuPublic")) || false;
    danmaku.commandPublic = Boolean(getSetting("commandPublic")) || false;
    danmaku.profanityFilter = (getSetting("profanityFilter") || "").split(' ').filter(f => f) || [];
    danmaku.senderFilter = (getSetting("senderFilter") || "").split(' ').filter(f => f) || [];

    // Get Main GM.
    const gm = game.users.find(u => u.isGM && u.active);

    if (roomId > 0 && gm && game.user === gm) {
        console.log("Bililive | Living Room confirmed", roomId);
        danmaku.roomId = roomId;
        danmaku.client = new DanmakuClient(roomId);

        danmaku.client.on("open", () => console.log("Bililive | Listening Bilibili Danmaku..."));
        danmaku.client.on("close", () => console.log("Bililive | Terminated Bilibili Danmaku."));

        // Danmaku event dispatcher.
        danmaku.client.on("event", ({ name, content }) => {
            if (danmaku.senderFilter.includes(content.sender?.name || "")) {
                return;
            }

            if (name === "danmaku") {
                if (content.content?.startsWith("/")) {
                    onCommand(content);
                } else {
                    onDanmaku(content);
                }
            } else if (name === "gift") {
                onGift(content);
            }
        });

        danmaku.client.start();
    }
}

async function onDanmaku({ content, sender }) {
    if (danmaku.profanityFilter.some(f => content.includes(f))) {
        return;
    }

    const requestData = {
        sender: sender.name,
        content: content,
        roomId: danmaku.roomId
    };
    const html = await renderTemplate("./modules/bililive/templates/danmakuMsg.html", requestData);
    const chatMessage = {
        content: html,
        type: 1,
        flags: { "bililive": { type: "danmaku" }},
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("bililive.speaker") })
    };

    if (!danmaku.danmakuPublic) {
        chatMessage.whisper = ChatMessage.getWhisperRecipients("GM");
    }

    ChatMessage.create(chatMessage);
}

async function onGift({ gift, num, sender }) {
    const requestData = {
        sender: sender.name,
        gift: gift.name,
        num: num,
        roomId: danmaku.roomId
    };
    const html = await renderTemplate("./modules/bililive/templates/giftMsg.html", requestData);
    const chatMessage = {
        content: html,
        type: 1,
        flags: { "bililive": { type: "gift" }},
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("bililive.donar") })
    };

    if (!danmaku.giftPublic) {
        chatMessage.whisper = ChatMessage.getWhisperRecipients("GM");
    }

    ChatMessage.create(chatMessage);
}

async function onCommand({ content, sender }) {
    let msg = "";
    switch (game.system.data.name) {
        case "dnd5e":
            // D&D 5e only currently.
            msg = await dnd5eCommand({ content: content?.slice(1), sender: sender });
            break;
    }

    if (msg) {
        const chatMessage = {
            content: msg,
            type: 1,
            flags: { "bililive": { type: "danmaku" }},
            speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("bililive.command") })
        };

        if (!danmaku.commandPublic) {
            chatMessage.whisper = ChatMessage.getWhisperRecipients("GM");
        }

        ChatMessage.create(chatMessage);
    } else {
        // Invalid command, redirect to onDanmaku.
        onDanmaku({ content, sender });
    }
}

function getSetting(key) {
    return game.settings.get(MODULE_NAME, key);
}

function registerSettings() {
    const settings = [
        {
            key: "roomId",
            options: {
                name: game.i18n.localize("bililive.settings.room.name"),
                hint: game.i18n.localize("bililive.settings.room.hint"),
                scope: "world",
                config: true,
                type: String,
                default: ""
            }
        },
        {
            key: "giftPublic",
            options: {
                name: game.i18n.localize("bililive.settings.giftPublic.name"),
                hint: game.i18n.localize("bililive.settings.giftPublic.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        },
        {
            key: "danmakuPublic",
            options: {
                name: game.i18n.localize("bililive.settings.danmakuPublic.name"),
                hint: game.i18n.localize("bililive.settings.danmakuPublic.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        },
        {
            key: "commandPublic",
            options: {
                name: game.i18n.localize("bililive.settings.commandPublic.name"),
                hint: game.i18n.localize("bililive.settings.commandPublic.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        },
        {
            key: "profanityFilter",
            options: {
                name: game.i18n.localize("bililive.settings.profanityFilter.name"),
                hint: game.i18n.localize("bililive.settings.profanityFilter.hint"),
                scope: "world",
                config: true,
                type: String,
                default: ""
            }
        },
        {
            key: "senderFilter",
            options: {
                name: game.i18n.localize("bililive.settings.senderFilter.name"),
                hint: game.i18n.localize("bililive.settings.senderFilter.hint"),
                scope: "world",
                config: true,
                type: String,
                default: ""
            }
        },
    ];

    settings.forEach(s => {
        s.options.onChange = () => setupDanmakuClient();
        game.settings.register(MODULE_NAME, s.key, s.options);
    });
}