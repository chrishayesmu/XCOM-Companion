import * as Utils from "./utils.js";

// Load all the JSON data at once
const baseFacilityData = await fetch("assets/data/base-facilities.json").then(response => response.json());
const councilRequestData = await fetch("assets/data/council-requests.json").then(response => response.json());
const enemyData = await fetch("assets/data/enemies.json").then(response => response.json());
const foundryProjectData = await fetch("assets/data/foundry-projects.json").then(response => response.json());
const geneModData = await fetch("assets/data/gene-mods.json").then(response => response.json());
const itemData = await fetch("assets/data/items.json").then(response => response.json());
const mapData = await fetch("assets/data/maps.json").then(response => response.json());
const perkData = await fetch("assets/data/perks.json").then(response => response.json());
const psiAbilityData = await fetch("assets/data/psi-abilities.json").then(response => response.json());
const soldierClassData = await fetch("assets/data/soldier-classes.json").then(response => response.json());
const techTreeData = await fetch("assets/data/tech-tree.json").then(response => response.json());
const ufoData = await fetch("assets/data/ufos.json").then(response => response.json());
const worldData = await fetch("assets/data/world.json").then(response => response.json());

const baseFacilities = baseFacilityData.facilities;
const enemies = enemyData.enemies;
const enemyDamageRanges = enemyData.damage_ranges_by_base_damage;
const foundryProjects = foundryProjectData.foundry_projects;
const geneMods = geneModData.gene_mods;
const items = itemData.items;
const maps = mapData.maps;
const perks = perkData.perks;
const psiAbilities = psiAbilityData.abilities;
const technologies = techTreeData.technologies;
const ufos = ufoData.ufos;

// ------------------------------------------------------------------
// Process the data into a form we can readily use throughout the app
// ------------------------------------------------------------------

// --------------- Continents/countries ------------------
// No processing to do
const continents = worldData.continents;
const countries = worldData.countries;

// --------------- Research credits ------------------
// Research credits are entirely synthesized from other data
const researchCredits = {};
const creditTypes = [ "aerospace", "all", "armor", "cybernetics", "gauss_weapons", "laser_weapons", "plasma_weapons", "psionics", "weapons" ];

for (let i = 0; i < creditTypes.length; i++) {
    researchCredits[creditTypes[i]] = {
        id: "research_credit_" + creditTypes[i],
        name: Utils.capitalizeEachWord(creditTypes[i]),
        benefitsFoundryProjects: [],
        benefitsResearch: []
    };
}

// --------------- Perks ------------------
for (let perkId in perkData.perks) {
    perkData.perks[perkId].id = perkId;
}

// --------------- Soldier classes ------------------
const soldierClasses = {};

for (let i = 0; i < soldierClassData.classes.length; i++) {
    const soldierClass = soldierClassData.classes[i];

    const convertedClass = {
        "id": soldierClass.id,
        "name": soldierClass.name,
        "hideInSearch": soldierClass.hideInSearch || false,
        "icon": soldierClass.icon,
        "defaultLoadout": soldierClass.default_loadout,
        "loadoutSlots": soldierClass.loadout_slots,
        "perks": {},
        "perkStatBonuses": soldierClass.perk_stat_bonuses,
        "statProgression": soldierClass.stat_progression
    };

    // Pull in the perk data
    for (let rank in soldierClass.perks) {
        const perkOptions = soldierClass.perks[rank];
        convertedClass.perks[rank] = [];

        for (let i = 0; i < perkOptions.length; i++) {
            const perkId = perkOptions[i];

            if (!(perkId in perkData.perks)) {
                console.error("Unrecognized perk ID: " + perkId + ". It may have been missed in the perks.json data file.");
                continue;
            }

            convertedClass.perks[rank].push(perkData.perks[perkId]);
        }
    }

    soldierClasses[soldierClass.id] = convertedClass;
}

// --------------- Council requests ------------------
const councilRequests = {};

for (let i = 0; i < councilRequestData.requests.length; i++) {
    const request = councilRequestData.requests[i];
    request.id = "council_request_" + request.requested_item.substring(5);
    request.prerequisite = techTreeData.technologies[request.prerequisite];
    request.requested_item = itemData.items[request.requested_item];

    councilRequests[request.id] = request;
}

// --------------- Enemies ------------------
for (let enemyId in enemyData.enemies) {
    const enemy = enemyData.enemies[enemyId];
    enemy.id = enemyId;
    enemy.icon = "assets/img/enemy-icons/" + enemyId.substring("enemy_".length) + ".png";

    if (enemy.base_perks) {
        for (let i = 0; i < enemy.base_perks.length; i++) {
            enemy.base_perks[i] = dataObjectById(enemy.base_perks[i]);
        }
    }

    for (let i = 0; i < enemy.research_upgrades.length; i++) {
        const upgrade = enemy.research_upgrades[i];

        if (upgrade.perk) {
            upgrade.perk = dataObjectById(upgrade.perk);
        }
    }

    enemy.hasNavigationUpgrades = !!enemy.research_upgrades.find(upgrade => !!upgrade.chance);
    enemy.hasLeaderRanks = !!enemy.leader_ranks;

    if (enemy.hasLeaderRanks) {
        for (let i = 0; i < enemy.leader_ranks.length; i++) {
            const leaderRank = enemy.leader_ranks[i];

            if (leaderRank.perks) {
                const perks = [];
                for (const perk of leaderRank.perks) {
                    perks.push(dataObjectById(perk));
                }

                leaderRank.perks = perks;
            }
        }
    }

}

// --------------- Facilities ------------------
for (let key in baseFacilityData.facilities) {
    const facility = baseFacilityData.facilities[key];
    facility.id = key;

    if (facility.research_prerequisite) {
        const techId = facility.research_prerequisite;
        facility.research_prerequisite = techTreeData.technologies[techId];
    }
}

// --------------- Foundry projects ------------------
for (let id in foundryProjectData.foundry_projects) {
    const project = foundryProjectData.foundry_projects[id];
    project.id = id;

    // Foundry icons weren't originally included and this is way easier than adding them in the data file
    project.icon = "assets/img/foundry-icons/" + id.substring(8) + ".png";

    if (project.research_prerequisites) {
        for (let i = 0; i < project.research_prerequisites.length; i++) {
            const prereqId = project.research_prerequisites[i];
            project.research_prerequisites[i] = techTreeData.technologies[prereqId];
        }
    }
}

// --------------- Gene mods ------------------
for (let id in geneModData.gene_mods) {
    const mod = geneModData.gene_mods[id];
    const perk = perkData.perks[mod.perk];
    const prereqTech = techTreeData.technologies[mod.research_prerequisite];

    mod.id = id;
    mod.description = perk.description;
    mod.icon = perk.icon;
    mod.name = perk.name;
    mod.perk = perk;
    mod.research_prerequisite = prereqTech;

    // Gene mod perks shouldn't show in search separately from the mods themselves
    perk.hideInSearch = true;
}

// --------------- Items ------------------
for (let id in itemData.items) {
    const item = itemData.items[id];
    item.id = id;
    item.icon = "assets/img/item-icons/" + id.substring(5) + ".png";

    if (item.type_specific_data && item.type_specific_data.grants_perks) {
        for (let i = 0; i < item.type_specific_data.grants_perks.length; i++) {
            const perkId = item.type_specific_data.grants_perks[i];
            item.type_specific_data.grants_perks[i] = perkData.perks[perkId];

            if (!perkData.perks[perkId]) {
                console.error(`Item ${item.id} references non-existent perk ${perkId}`);
            }
        }
    }

    if (item.type_specific_data && item.type_specific_data.damage_min_normal && item.type_specific_data.damage_max_normal) {
        item.type_specific_data.base_damage = (item.type_specific_data.damage_min_normal + item.type_specific_data.damage_max_normal) / 2;
    }

    if (item.research_prerequisites) {
        for (let i = 0; i < item.research_prerequisites.length; i++) {
            const prereqId = item.research_prerequisites[i];
            item.research_prerequisites[i] = techTreeData.technologies[prereqId];
        }
    }

    if (item.foundry_prerequisites) {
        for (let i = 0; i < item.foundry_prerequisites.length; i++) {
            const prereqId = item.foundry_prerequisites[i];
            item.foundry_prerequisites[i] = foundryProjectData.foundry_projects[prereqId];
        }
    }
}

// --------------- Maps ------------------
for (let key in mapData.maps) {
    const data = mapData.maps[key];
    data.id = key;
    data.image = "assets/img/maps/" + key.substring(4) + ".png";
}

// --------------- Psi abilities ------------------
for (let id in psiAbilityData.abilities) {
    const ability = psiAbilityData.abilities[id];
    ability.id = id;

    if (ability.research_prerequisite) {
        ability.research_prerequisite = techTreeData.technologies[ability.research_prerequisite];
    }
}

// --------------- Research ------------------
for (let techId in techTreeData.technologies) {
    const tech = techTreeData.technologies[techId];

    // Assign the ID as a field for convenience, and make sure they all have an 'unlocks' field for later
    tech.id = techId;
    tech.unlocks = {};

    // Replace each prereq by the corresponding object
    if (tech.prerequisites && tech.prerequisites.research) {
        for (let i = 0; i < tech.prerequisites.research.length; i++) {
            const prereqTechId = tech.prerequisites.research[i];
            const prereqTech = techTreeData.technologies[prereqTechId];

            tech.prerequisites.research[i] = prereqTech;

            // Also populate a list of "leading to" techs on the other side of the prereq relationship
            if (!prereqTech.leadsTo) {
                prereqTech.leadsTo = {};
            }

            prereqTech.leadsTo[techId] = tech;
        }
    }
}

// --------------- UFOs ------------------
for (let ufoId in ufoData.ufos) {
    ufoData.ufos[ufoId].id = ufoId;
    ufoData.ufos[ufoId].image = `assets/img/ufos/${ufoId}.png`;
}

// ----------------------------------------------------------------------------------------------------
//
// Go through various types of content and figure out which other content they're connected to
//
// ----------------------------------------------------------------------------------------------------

for (let i = 0; i < councilRequestData.requests.length; i++) {
    const request = councilRequestData.requests[i];
    const prereqTech = request.prerequisite;

    if (!prereqTech.unlocks.councilRequests) {
        prereqTech.unlocks.councilRequests = [];
    }

    prereqTech.unlocks.councilRequests.push(request);

    const requestedItem = request.requested_item;

    if (!requestedItem.usedIn) {
        requestedItem.usedIn = [];
    }

    // TODO add quantity (not sure what?)
    requestedItem.usedIn.push({
        outcome: request
    });
}

// --------------- Gene mods ------------------

for (let key in geneModData.gene_mods) {
    const geneMod = geneModData.gene_mods[key];
    const prereqTech = geneMod.research_prerequisite;

    if (!prereqTech.unlocks.geneMods) {
        prereqTech.unlocks.geneMods = [];
    }

    prereqTech.unlocks.geneMods.push(geneMod);
}

// --------------- Facilities ------------------

for (let key in baseFacilityData.facilities) {
    const facility = baseFacilityData.facilities[key];

    for (let itemId in facility.normal_build.cost) {
        if (itemId === "money") {
            continue;
        }

        const item = itemData.items[itemId];

        if (!item.usedIn) {
            item.usedIn = [];
        }

        item.usedIn.push({
            outcome: facility,
            quantity: facility.normal_build.cost[itemId]
        });
    }

    if (facility.research_prerequisite) {
        const prereqTech = facility.research_prerequisite;

        if (!prereqTech.unlocks.facilities) {
            prereqTech.unlocks.facilities = [];
        }

        prereqTech.unlocks.facilities.push(facility);
    }
}

// --------------- Foundry projects ------------------

for (let id in foundryProjectData.foundry_projects) {
    const project = foundryProjectData.foundry_projects[id];

    for (let itemId in project.cost) {
        if (itemId === "money") {
            continue;
        }

        const item = itemData.items[itemId];

        if (!item.usedIn) {
            item.usedIn = [];
        }

        item.usedIn.push({
            outcome: project,
            quantity: project.cost[itemId]
        });
    }

    if (project.benefits_from_credits) {
        for (let i = 0; i < project.benefits_from_credits.length; i++) {
            const creditType = project.benefits_from_credits[i];

            researchCredits[creditType].benefitsFoundryProjects.push(project);
        }
    }

    if (project.research_prerequisites) {
        for (let i = 0; i < project.research_prerequisites.length; i++) {
            const prereq = project.research_prerequisites[i];

            if (!prereq.unlocks.foundryProjects) {
                prereq.unlocks.foundryProjects = [];
            }

            prereq.unlocks.foundryProjects.push(project);
        }
    }
}

// --------------- Items ------------------

for (let itemId in itemData.items) {
    const item = itemData.items[itemId];

    if (item.normal_build) {
        for (let otherItemId in item.normal_build.cost) {
            if (otherItemId === "money") {
                continue;
            }

            const otherItem = itemData.items[otherItemId];

            if (!otherItem.usedIn) {
                otherItem.usedIn = [];
            }

            otherItem.usedIn.push({
                outcome: item,
                quantity: item.normal_build.cost[otherItemId]
            });
        }
    }

    if (item.research_prerequisites) {
        for (let i = 0; i < item.research_prerequisites.length; i++) {
            const tech = item.research_prerequisites[i];

            if (!tech.unlocks.items) {
                tech.unlocks.items = [];
            }

            tech.unlocks.items.push(item);
        }
    }

    if (item.foundry_prerequisites) {
        for (let i = 0; i < item.foundry_prerequisites.length; i++) {
            const project = item.foundry_prerequisites[i];

            if (!project.unlocks) {
                project.unlocks = [];
            }

            project.unlocks.push(item);
        }
    }
}

// --------------- Psi abilities ------------------

for (let id in psiAbilityData.abilities) {
    const ability = psiAbilityData.abilities[id];
    const prereqTech = ability.research_prerequisite;

    if (!prereqTech) {
        continue;
    }

    if (!prereqTech.unlocks.psiAbilities) {
        prereqTech.unlocks.psiAbilities = [];
    }

    prereqTech.unlocks.psiAbilities.push(ability);
}

// --------------- Research ------------------
for (let techId in techTreeData.technologies) {
    const tech = techTreeData.technologies[techId];

    if (tech.cost) {
        for (let itemId in tech.cost) {
            if (itemId === "money") {
                continue;
            }

            const item = itemData.items[itemId];

            if (!item.usedIn) {
                item.usedIn = [];
            }

            item.usedIn.push({
                outcome: tech,
                quantity: tech.cost[itemId]
            });
        }
    }

    if (tech.benefits_from_research_credit_types) {
        for (let i = 0; i < tech.benefits_from_research_credit_types.length; i++) {
            const creditType = tech.benefits_from_research_credit_types[i];

            researchCredits[creditType].benefitsResearch.push(tech);
        }
    }

    if (tech.grants_research_credit) {
        researchCredits[tech.grants_research_credit].grantedBy = tech;
    }
}

function dataObjectById(id) {
    if (id.startsWith("enemy")) {
        return enemies[id];
    }
    else if (id.startsWith("facility")) {
        return baseFacilities[id];
    }
    else if (id.startsWith("foundry")) {
        return foundryProjects[id];
    }
    else if (id.startsWith("gene_mod")) {
        return geneMods[id];
    }
    else if (id.startsWith("infantry_class") || id.startsWith("mec_class") || id.startsWith("shiv_chassis")) {
        return soldierClasses[id];
    }
    else if (id.startsWith("item")) {
        return items[id];
    }
    else if (id.startsWith("map")) {
        return maps[id];
    }
    else if (id.startsWith("perk")) {
        return perks[id];
    }
    else if (id.startsWith("psi")) {
        return psiAbilities[id];
    }
    else if (id.startsWith("research")) {
        return technologies[id];
    }
    else if (id.startsWith("ufo")) {
        return ufos[id];
    }
    else {
        throw new Error(`Unknown data object ID ${id}`);
    }
}

function getInfantryClasses() {
    const classes = [];

    for (let classId in soldierClasses) {
        if (!classId.startsWith("infantry")) {
            continue;
        }

        classes.push(soldierClasses[classId]);
    }

    return classes;
}

function getMecClasses() {
    const classes = [];

    for (let classId in soldierClasses) {
        if (!classId.startsWith("mec")) {
            continue;
        }

        classes.push(soldierClasses[classId]);
    }

    return classes;
}

function getResearchCreditSource(creditType) {
    for (let techId in techTreeData.technologies) {
        const tech = techTreeData.technologies[techId];

        if (tech.grants_research_credit === creditType) {
            return tech;
        }
    }

    return null;
}

function typeOf(dataObject) {
    const id = typeof(dataObject) === "string" ? dataObject : dataObject.id;

    const typeByPrefix = {
        "enemy": "Enemy",
        "facility": "Facility",
        "foundry": "Foundry",
        "gene_mod": "Gene Mod",
        "infantry_class": "Class",
        "item": "Item",
        "mec_class": "MEC Class",
        "map": "Map",
        "perk": "Perk",
        "psi": "Psi Ability",
        "research": "Research",
        "ufo": "UFO"
    };

    for (const [key, value] of Object.entries(typeByPrefix)) {
        if (id.startsWith(key)) {
            return value;
        }
    }

    return "";
}

export {
    baseFacilities,
    continents,
    councilRequests,
    countries,
    dataObjectById,
    enemies,
    enemyDamageRanges,
    foundryProjects,
    geneMods,
    getInfantryClasses,
    getMecClasses,
    getResearchCreditSource,
    items,
    maps,
    perks,
    psiAbilities,
    researchCredits,
    soldierClasses,
    technologies,
    typeOf,
    ufos
};