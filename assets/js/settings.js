const { ipcRenderer } = require('electron');

import * as AppEvents from "./app-events.js";
import XComCampaign from "./xcom-campaign.js";

const eventListeners = {};

async function get(name) {
    try {
        return await ipcRenderer.invoke("get-settings", name);
    }
    catch (e) {
        console.error(`Error while retrieving settings with name "${name}"`);
        console.error(e);
        return null;
    }
}

async function set(name, value) {
    return ipcRenderer.invoke("save-settings", name, value);
}

async function unset(name) {
    return ipcRenderer.invoke("delete-settings", name);
}

/*******************
 *
 * Getters/setters for specific configuration properties
 *
 *******************/



/**** Campaigns ****/

const DELIBERATELY_NONE_CAMPAIGN_ID = "DeliberatelyNoCampaignIdSet";
let currentCampaign = null;

async function deleteCampaign(campaignId) {
    return unset("campaigns." + campaignId).then( async val => {
        const currentCampaignId = await getCurrentCampaignId();

        if (campaignId === currentCampaignId) {
            await setCurrentCampaign(DELIBERATELY_NONE_CAMPAIGN_ID);
        }

        return val;
    });
}

async function getAllCampaigns() {
    const allCampaigns = await get("campaigns");
    delete allCampaigns.current;

    return allCampaigns;
}

async function getCampaign(campaignId) {
    const json = await get("campaigns."  + campaignId);

    if (json) {
        return new XComCampaign(json);
    }
    else {
        return null;
    }
}

async function getCurrentCampaign() {
    if (currentCampaign) {
        return currentCampaign;
    }

    // Use promise chaining to make sure anyone getting the current campaign gets the same object,
    // so modifications are shared
    const currentCampaignId = getCurrentCampaignId();
    const campaign = currentCampaignId.then(id => id && id !== DELIBERATELY_NONE_CAMPAIGN_ID ? getCampaign(id) : null);
    currentCampaign = Promise.resolve(campaign);

    return currentCampaign;
}

async function getCurrentCampaignId() {
    return get("campaigns.current");
}

async function saveCampaign(campaign) {
    return set("campaigns." + campaign.id, campaign.toJsonObj());
}

async function setCurrentCampaign(campaignId) {
    currentCampaign = null;
    const response = await set("campaigns.current", campaignId);

    AppEvents.fireEvent("activeCampaignChanged");

    return response;
}



/**** Soldier loadouts ****/

const defaultLoadouts = {"75573b4c-e08e-4f4b-ad81-6e3489cc54e2":{"classId":"infantry_class_sniper","equipment":["item_archangel_armor","item_gauss_long_rifle","item_laser_pistol","item_alloy_jacketed_rounds","item_illuminator_gunsight","item_targeting_module"],"id":"75573b4c-e08e-4f4b-ad81-6e3489cc54e2","name":"Eminem's \"8 Mile Pie\" Sniper","notes":"His rifle's ready, scope's up, barrel heavy\nCyberdisc killed his medic already, space confetti\nSquadsight only, but last turn he steadied\nCrit penalties, but Precision Shot is ready\nTo take it down, the disc's shell is open now\nNo Hardened perk out, critical scopin', pow\nSqueeze the trigger, one bullet, just hopin' now\nBut the shot missed, turn's done, fuckin how","perks":["perk_squadsight","perk_lone_wolf","perk_precision_shot","perk_ranger","perk_vital_point_targeting","perk_bring_em_on","perk_mayhem"],"geneMods":["gene_mod_depth_perception","gene_mod_muscle_fiber_density"],"officerAbilities":["perk_stay_frosty","perk_semper_vigilans","perk_into_the_breach","perk_band_of_warriors","perk_combined_arms"],"psiAbilities":[]}};

async function deleteSoldierLoadout(id) {
    return unset("soldierLoadouts." + id);
}

async function getSoldierLoadoutById(id) {
    return get("soldierLoadouts." + id);
}

async function getSoldierLoadouts() {
    let loadouts = await get("soldierLoadouts");

    if (!loadouts) {
        // Need to set the loadouts so they can be pulled by ID later
        await setSoldierLoadouts(defaultLoadouts);
    }

    return loadouts || defaultLoadouts;
}

async function saveSoldierLoadout(loadout) {
    return set("soldierLoadouts." + loadout.id, loadout);
}

async function setSoldierLoadouts(loadouts) {
    return set("soldierLoadouts", loadouts);
}

export { get,
         set,

         // Campaigns
         DELIBERATELY_NONE_CAMPAIGN_ID,
         deleteCampaign,
         getAllCampaigns,
         saveCampaign,
         getCampaign,
         getCurrentCampaign,
         getCurrentCampaignId,
         setCurrentCampaign,

         // Loadouts
         deleteSoldierLoadout,
         getSoldierLoadoutById,
         getSoldierLoadouts,
         saveSoldierLoadout,
         setSoldierLoadouts,
         unset
};