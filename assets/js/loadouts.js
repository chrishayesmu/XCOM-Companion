const lzutf8 = require('lzutf8');

import * as DataHelper from "./data-helper.js";

let activeLoadout = null;

const psiFatigueByRank = [ 24, 30, 36, 48, 60, 72 ];

const officerRanks = [
    {
        rank: 0,
        requiredClassRank: 2,
        name: "Lieutenant",
        icon: "assets/img/soldier-rank-icons/officer_lieutenant.png"
    },
    {
        rank: 1,
        requiredClassRank: 3,
        name: "Captain",
        icon: "assets/img/soldier-rank-icons/officer_captain.png"
    },
    {
        rank: 2,
        requiredClassRank: 4,
        name: "Major",
        icon: "assets/img/soldier-rank-icons/officer_major.png"
    },
    {
        rank: 3,
        requiredClassRank: 5,
        name: "Colonel",
        icon: "assets/img/soldier-rank-icons/officer_colonel.png"
    },
    {
        rank: 4,
        requiredClassRank: 6,
        name: "Field Commander",
        icon: "assets/img/soldier-rank-icons/officer_field_commander.png"
    }
];

const soldierRanks = [
    {
        rank: 0,
        name: "Specialist",
        icon: "assets/img/soldier-rank-icons/specialist.png"
    },
    {
        rank: 1,
        name: "Lance Corporal",
        icon: "assets/img/soldier-rank-icons/lance_corporal.png"
    },
    {
        rank: 2,
        name: "Corporal",
        icon: "assets/img/soldier-rank-icons/corporal.png"
    },
    {
        rank: 3,
        name: "Sergeant",
        icon: "assets/img/soldier-rank-icons/sergeant.png"
    },
    {
        rank: 4,
        name: "Tech Sergeant",
        icon: "assets/img/soldier-rank-icons/tech_sergeant.png"
    },
    {
        rank: 5,
        name: "Gunnery Sergeant",
        icon: "assets/img/soldier-rank-icons/gunnery_sergeant.png"
    },
    {
        rank: 6,
        name: "Master Sergeant",
        icon: "assets/img/soldier-rank-icons/master_sergeant.png"
    }
];

function _addItemStats(item, currentStats) {
    const typeData = item.type_specific_data;

    if (!typeData) {
        return;
    }

    currentStats.aim.fromItems += typeData.aim || 0;
    currentStats.ammo.fromItems += typeData.ammo || 0;
    currentStats.crit_chance.fromItems += typeData.crit_chance || 0;
    currentStats.damage += typeData.damage || 0;
    currentStats.damage_reduction.fromItems += typeData.damage_reduction || 0;
    currentStats.defense.fromItems += typeData.defense || 0;
    currentStats.hp.fromItems += typeData.hp || 0;
    currentStats.mobility.fromItems += typeData.mobility || 0;
    currentStats.will.fromItems += typeData.will || 0;
}

function calculateStatsForPrimary(loadout) {
    // Base stats for a rookie with Strict Screening on
    const stats = {
        aim: {
            base: 65,
            fromItems: 0
        },
        ammo: {
            base: 0,
            fromItems: 0
        },
        crit_chance: {
            base: 0,
            fromItems: 0
        },
        damage: 0,
        damage_reduction: {
            base: 0,
            fromItems: 0
        },
        defense: {
            base: 0,
            fromItems: 0
        },
        fatigue_extra_time_hours: 0,
        hp: {
            base: 4,
            fromItems: 0
        },
        mobility: {
            base: 13,
            fromItems: 0
        },
        will: {
            base: 30,
            fromItems: 0
        }
    };

    const soldierClass = DataHelper.soldierClasses[loadout.classId];
    const classPerks = loadout.perks;
    const currentRank = getLoadoutRank(loadout);
    const psionicsRank = loadout.psiAbilities.length - 1;

    // Stats granted just by leveling up
    for (let i = 0; i <= currentRank.rank; i++) {
        const rankStr = String(i);
        const statsProgression = soldierClass.statProgression[rankStr];

        stats.aim.base += statsProgression.aim || 0;
        stats.hp.base += statsProgression.hp || 0;
        stats.will.base += statsProgression.will || 0;
    }

    // Account for stats granted by perks, which are only given if the perk is chosen
    // at level up, not if the perk comes from an item or another source
    for (const perk of classPerks) {
        if (perk in soldierClass.perkStatBonuses) {
            const statBonuses = soldierClass.perkStatBonuses[perk];
            stats.aim.base += statBonuses.aim || 0;
            stats.mobility.base += statBonuses.mobility || 0;
            stats.will.base += statBonuses.will || 0;
        }

        if (perk === "perk_sharpshooter") {
            stats.crit_chance.base += 10;
        }
        else if (perk === "perk_sprinter") {
            stats.mobility.base += 4;
        }
    }

    // Most gene mods just add fatigue time, except for Iron Skin
    for (const geneMod of loadout.geneMods) {
        stats.fatigue_extra_time_hours += DataHelper.geneMods[geneMod].added_fatigue_hours;

        if (geneMod === "gene_mod_iron_skin") {
            stats.damage_reduction.base += 1;
        }
    }

    // Psionics never adds raw stats, but does add fatigue
    if (psionicsRank >= 0) {
        stats.fatigue_extra_time_hours += psiFatigueByRank[psionicsRank];
    }

    // #region Add stats from equipped items
    const equippedItems = loadout.equipment.filter(itemId => !!itemId).map(itemId => DataHelper.items[itemId]);
    const primaryWeapon = equippedItems.find(item => item && item.type === "loadout_primary");
    stats.ammo.base = primaryWeapon.type_specific_data.base_ammo;
    stats.damage = primaryWeapon.type_specific_data.base_damage;

    // Secondaries should be counted for mobility penalty only (MECs can have multiple)
    const secondaryWeapons = equippedItems.filter(item => item && item.type === "loadout_secondary");
    for (const secondaryWeapon of secondaryWeapons) {
        stats.mobility.fromItems += secondaryWeapon.type_specific_data.mobility;
    }

    for (const item of equippedItems) {
        if (item.type === "loadout_secondary") {
            continue;
        }

        _addItemStats(item, stats);
    }
    // #endregion

    // #region Add stats from some special cross-equipment interactions
    if (["ballistic", "gauss"].includes(primaryWeapon.type_specific_data.weapon_tier) && loadout.equipment.includes("item_alloy_jacketed_rounds")) {
        stats.damage += 1;
    }
    else if (["laser", "pulse"].includes(primaryWeapon.type_specific_data.weapon_tier) && loadout.equipment.includes("item_enhanced_beam_optics")) {
        stats.damage += 1;
    }
    else if (primaryWeapon.type_specific_data.weapon_tier === "plasma" && loadout.equipment.includes("item_plasma_stellerator")) {
        stats.damage += 1;
    }

    if (!["laser", "pulse"].includes(primaryWeapon.type_specific_data.weapon_tier) && loadout.equipment.includes("item_reaper_pack")) {
        // Reaper Pack only works on laser and pulse weapons but the code above doesn't know that, so remove its crit chance bonus
        stats.crit_chance.fromItems -= 16;
    }
    // #endregion

    // #region Add some stats from perks that depend on equipment
    if (classPerks.includes("perk_extra_conditioning")) {
        const armor = equippedItems.find(item => item.type === "loadout_armor");
        stats.hp.fromItems += armor.type_specific_data.extra_conditioning_bonus_hp;
    }

    if (classPerks.includes("perk_lock_and_load")) {
        stats.ammo.base += 1;
    }

    if (classPerks.includes("perk_mayhem")) {
        if (primaryWeapon.type_specific_data.category === "sniper_rifle" || primaryWeapon.type_specific_data.category === "marksman_rifle") {
            stats.damage += 4;
        }
        else if (primaryWeapon.type_specific_data.category === "lmg" || primaryWeapon.type_specific_data.category === "saw") {
            stats.damage += 2;
        }
    }

    if (classPerks.includes("perk_ranger")) {
        stats.damage += 1;
    }
    // #endregion

    // #region Add stats from officer abilities
    if (loadout.officerAbilities.includes("perk_esprit_de_corps")) {
        stats.defense.base += 5;
        stats.will.base += 5;
    }

    if (loadout.officerAbilities.includes("perk_stay_frosty")) {
        stats.fatigue_extra_time_hours -= 24;
    }
    // #endregion

    return stats;
}

function getActiveLoadout() {
    return activeLoadout;
}

function getLoadoutOfficerRank(loadout) {
    return officerRanks[loadout.officerAbilities.length - 1];
}

function getLoadoutRank(loadout) {
    return soldierRanks[loadout.perks.length - 1];
}

function setActiveLoadout(loadout) {
    activeLoadout = loadout;
}

function fromExportString(str) {
    let decompressed = null, jsonObj = null;

    try {
        decompressed = lzutf8.decompress(str, { inputEncoding: "Base64", outputEncoding: "String" });
        jsonObj = JSON.parse(decompressed);
    }
    catch (e) {
        return null;
    }

    const loadout = {
        classId: jsonObj.c,
        equipment: [],
        geneMods: [],
        id: jsonObj.id,
        name: jsonObj.n,
        notes: jsonObj.ns || "",
        perks: [],
        psiAbilities: [],
        officerAbilities: []
    };

    const populateArray = function(destinationArray, inputArray, leadingSubstring) {
        if (!inputArray) {
            return;
        }

        for (const shortId of inputArray) {
            const longId = leadingSubstring + shortId;
            destinationArray.push(longId);
        }
    }

    populateArray(loadout.equipment, jsonObj.e, "item_");
    populateArray(loadout.geneMods, jsonObj.g, "gene_mod_");
    populateArray(loadout.perks, jsonObj.p, "perk_");
    populateArray(loadout.psiAbilities, jsonObj.ps, "psi_");
    populateArray(loadout.officerAbilities, jsonObj.o, "perk_");

    return loadout;
}

function toExportString(loadout) {
    const exportObj = {
        c: loadout.classId,
        n: loadout.name,
        id: loadout.id
    };

    if (loadout.notes) {
        exportObj.ns = loadout.notes.trim();
    }

    const copyArrayIfPopulated = function(array, outputKey, leadingSubstring) {
        if (!array || !array.length) {
            return;
        }

        exportObj[outputKey] = [];

        for (const id of array) {
            const shortId = id.substring(leadingSubstring.length);
            exportObj[outputKey].push(shortId);
        }
    }

    copyArrayIfPopulated(loadout.equipment, "e", "item_");
    copyArrayIfPopulated(loadout.geneMods, "g", "gene_mod_");
    copyArrayIfPopulated(loadout.perks, "p", "perk_");
    copyArrayIfPopulated(loadout.psiAbilities, "ps", "psi_");
    copyArrayIfPopulated(loadout.officerAbilities, "o", "perk_");

    const jsonString = JSON.stringify(exportObj);
    const compressed = lzutf8.compress(jsonString, { outputEncoding: "Base64" });

    return compressed;
}

export {
    calculateStatsForPrimary,
    fromExportString,
    getActiveLoadout,
    getLoadoutOfficerRank,
    getLoadoutRank,
    setActiveLoadout,
    toExportString
};