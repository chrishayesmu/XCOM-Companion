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

const shivRanks = {
    "shiv_chassis_alloy": {
        rank: -1,
        name: "Alloy SHIV",
        icon: "assets/img/misc-icons/alloy_shiv.png"
    },
    "shiv_chassis_hover": {
        rank: -1,
        name: "Hover SHIV",
        icon: "assets/img/misc-icons/hover_shiv.png"
    },
    "shiv_chassis_shiv": {
        rank: -1,
        name: "SHIV",
        icon: "assets/img/misc-icons/shiv.png"
    }
};

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
    currentStats.fuel += typeData.fuel || 0;
    currentStats.hp.fromItems += typeData.hp || 0;
    currentStats.mobility.fromItems += typeData.mobility || 0;
    currentStats.will.fromItems += typeData.will || 0;
}

function calculateStatsForPrimary(loadout) {
    const isMec = loadout.classId.startsWith("mec");
    const isShiv = loadout.classId.startsWith("shiv");

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
        fuel: 0,
        hp: {
            base: isMec ? 8 : 4,
            fromItems: 0
        },
        mobility: {
            base: 13,
            fromItems: 0
        },
        will: {
            base: 30,
            fromItems: 0
        },
        maxPossibleWill: 30
    };

    if (loadout.classId === "shiv_chassis_alloy") {
        stats.aim.base = 70;
        stats.damage_reduction.base = 2.5;
        stats.defense.fromItems = 8;
        stats.hp.base = 18;
        stats.hp.fromItems = 4;
        stats.mobility.base = 14;
        stats.mobility.fromItems = 2;
        stats.will.base = 0;
        stats.maxPossibleWill = 0;
    }
    else if (loadout.classId === "shiv_chassis_hover") {
        stats.aim.base = 70;
        stats.damage_reduction.base = 2.0;
        stats.defense.fromItems = 12;
        stats.fuel = 6;
        stats.hp.base = 14;
        stats.hp.fromItems = 2;
        stats.mobility.base = 14;
        stats.mobility.fromItems = 5;
        stats.will.base = 0;
        stats.maxPossibleWill = 0;
    }
    else if (loadout.classId === "shiv_chassis_shiv") {
        stats.aim.base = 70;
        stats.damage_reduction.base = 1.5;
        stats.defense.fromItems = 12;
        stats.hp.base = 8;
        stats.hp.fromItems = 2;
        stats.mobility.base = 14;
        stats.mobility.fromItems = 3;
        stats.will.base = 0;
        stats.maxPossibleWill = 0;
    }

    const soldierClass = DataHelper.soldierClasses[loadout.classId];
    const classPerks = loadout.perks;
    const foundryProjects = loadout.foundryProjects || []; // backwards compatibility
    const currentRank = getLoadoutRank(loadout);
    const officerRank = loadout.officerAbilities.length;
    const psionicsRank = loadout.psiAbilities.length - 1;

    // Stats granted just by leveling up
    for (let i = 0; i <= currentRank.rank; i++) {
        const rankStr = String(i);
        const statsProgression = soldierClass.statProgression[rankStr];

        stats.aim.base += statsProgression.aim || 0;
        stats.hp.base += statsProgression.hp || 0;
        stats.will.base += statsProgression.will || 0;
        stats.maxPossibleWill += (statsProgression.will || 0) + 1; // each rank up has a chance to grant +1 will
    }

    // Account for stats granted by perks, which are only given if the perk is chosen
    // at level up, not if the perk comes from an item or another source
    for (const perk of classPerks) {
        if (perk in soldierClass.perkStatBonuses) {
            const statBonuses = soldierClass.perkStatBonuses[perk];
            stats.aim.base += statBonuses.aim || 0;
            stats.mobility.base += statBonuses.mobility || 0;
            stats.will.base += statBonuses.will || 0;
            stats.maxPossibleWill += statBonuses.will || 0;
        }

        if (perk === "perk_automated_threat_assessment") {
            stats.damage_reduction.base += 0.5;
        }
        else if (perk === "perk_sharpshooter") {
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

    // Account for fatigue from officer ranks and psi abilities
    stats.fatigue_extra_time_hours += 12 * officerRank;
    if (psionicsRank >= 0) {
        stats.fatigue_extra_time_hours += psiFatigueByRank[psionicsRank];
    }

    // Each psi rank adds between 1 and 6 will (chosen randomly)
    stats.will.base       += 1 * loadout.psiAbilities.length;
    stats.maxPossibleWill += 6 * loadout.psiAbilities.length;

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

        // SHIV chassis stats are accounted for already
        if (item.type === "shiv") {
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
        const armor = equippedItems.find(item => item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton");
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

    // #region Add stats from Foundry projects
    if (foundryProjects.includes("foundry_advanced_flight")) {
        if (loadout.classId === "shiv_chassis_hover") {
            stats.fuel += 6;
        }

        if (loadout.equipment.includes("item_archangel_armor") || loadout.equipment.includes("item_seraph_armor")) {
            stats.fuel += 6;
        }

        if (loadout.equipment.includes("item_fuel_cell")) {
            stats.fuel += 6;
        }
    }

    if ( (isMec || isShiv) && foundryProjects.includes("foundry_advanced_servomotors")) {
        stats.mobility.fromItems += 4;
    }

    if ( (isMec || isShiv) && foundryProjects.includes("foundry_shaped_armor")) {
        stats.hp.fromItems += 3;
    }

    if (foundryProjects.includes("foundry_ammo_conservation")) {
        stats.ammo.base += 1;
    }

    if (foundryProjects.includes("foundry_scope_upgrade")) {
        if (loadout.equipment.includes("item_laser_sight")) {
            stats.crit_chance.fromItems += 4;
        }

        if (loadout.equipment.includes("item_scope")) {
            stats.crit_chance.fromItems += 8;
        }
    }

    if (primaryWeapon.type_specific_data.weapon_tier === "plasma" && foundryProjects.includes("foundry_enhanced_plasma")) {
        stats.damage += 1;
    }
    // #endregion

    // #region Add stats from officer abilities
    if (loadout.officerAbilities.includes("perk_esprit_de_corps")) {
        stats.defense.base += 5;
        stats.will.base += 5;
        stats.maxPossibleWill += 5;
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
    if (loadout.classId.startsWith("shiv")) {
        return shivRanks[loadout.classId];
    }

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
        foundryProjects: [],
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
            const longId = shortId ? leadingSubstring + shortId : "";
            destinationArray.push(longId);
        }
    }

    populateArray(loadout.equipment, jsonObj.e, "item_");
    populateArray(loadout.foundryProjects, jsonObj.f, "foundry_");
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

        for (var id of array) {
            id = id || "";

            const shortId = id.substring(leadingSubstring.length);
            exportObj[outputKey].push(shortId);
        }
    }

    copyArrayIfPopulated(loadout.equipment, "e", "item_");
    copyArrayIfPopulated(loadout.foundryProjects, "f", "foundry_");
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