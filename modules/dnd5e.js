"use strict";

import { danmaku } from "../bililive.js"

async function dnd5eCommand({ content, sender }) {
    let msg = "";

    if (content?.toUpperCase() === "HP") {
        // Get only active users and their characters.
        const pcs = game.users
            .filter(x => x.active)
            .map(x => x.data?.character)
            .filter(x => x)
            .map(x => game.actors.get(x));
        if (pcs.length > 0) {
            msg = await queryHp(sender, pcs);
        }
    } else if (content?.toUpperCase().startsWith("PC")) {
        // Player owned, unnecessary to be active.
        const pcName = content.slice(2).trim();
        const pcs = game.users
            .map(x => x.data?.character)
            .filter(x => x)
            .map(x => game.actors.get(x));
        const pc = pcs.filter(x => x.name.startsWith(pcName))[0];
        if (pc) {
            msg = await queryPc(sender, pc);
        }
    }

    return msg;
}

async function queryHp(sender, pcs) {
    const actors = pcs.map(pc => {
        let hp = `${pc.data.data.attributes.hp.value}`;
        if (pc.data.data.attributes.hp.temp) {
            hp += `+${pc.data.data.attributes.hp.temp}`;
        }
        let hpMax = `${pc.data.data.attributes.hp.max}`;
        if (pc.data.data.attributes.hp.tempmax) {
            hpMax += `+${pc.data.data.attributes.hp.tempmax}`;
        }
        return {
            id: pc.id,
            icon: pc.data.token.img || pc.data.img,
            name: pc.data.name,
            hp: hp,
            hpMax: hpMax
        };
    })
    const requestData = {
        sender: sender.name,
        actors: actors,
        roomId: danmaku.roomId
    };
    const html = await renderTemplate("./modules/bililive/templates/hpQueryMsg.html", requestData);
    return html;
}

async function queryPc(sender, pc) {
    let hp = `${pc.data.data.attributes.hp.value}`;
    if (pc.data.data.attributes.hp.temp) {
        hp += `+${pc.data.data.attributes.hp.temp}`;
    }
    let hpMax = `${pc.data.data.attributes.hp.max}`;
    if (pc.data.data.attributes.hp.tempmax) {
        hpMax += `+${pc.data.data.attributes.hp.tempmax}`;
    }
    let classText = pc.items.filter(x => x.type === "class").map(x => `${x.name} (${x.data.data.subclass})`).join(", ");
    const gp = pc.data.data.currency.pp * 10 + pc.data.data.currency.gp + pc.data.data.currency.pp * 0.5 + pc.data.data.currency.ep * 0.1;
    const requestData = {
        sender: sender.name,
        actor: pc,
        class: classText,
        hp: hp,
        hpMax: hpMax,
        slots: [1, 2, 3, 4 ,5, 6, 7, 8, 9].map(i => mergeObject(pc.data.data.spells[`spell${i}`], { level: `DND5E.SpellLevel${i}` })),
        resources: ["primary", "secondary", "tertiary"].map(i => pc.data.data.resources[i]),
        gp: gp > 0 ? gp.toFixed(1) : 0,
        encumbrance: pc.data.data.attributes.encumbrance.value.toFixed(),
        encumbranceMax: pc.data.data.attributes.encumbrance.max.toFixed(),
        roomId: danmaku.roomId
    };
    const html = await renderTemplate("./modules/bililive/templates/pcQueryMsg.html", requestData);
    return html;
}

export { dnd5eCommand };