import { AppPage, PageHistoryState } from "./app-page.js";
import { dmg_with_crit, dmg_simulate } from "../damage-calc.js";
import { damageBonuses, items } from "../data-helper.js";
import ItemDisplayPage from "./item-display-page.js";
import PageManager from "../page-manager.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Modal from "../modal.js";

class DamageCalculatorPage extends AppPage {
    static pageId = "damage-calculator-page";

    #damageInput = null;
    #critInput = null;
    #critBonusInput = null;
    #damageResults = null;
    #pageModeSelector = null;
    #calculatorPage = null;
    #simulatorPage = null;
    #explosiveCheck = null;

    // #region Damage Simulation
    #damageFormPreview = null;

    currentResults = null;

    #previewPerks = null;

    #simulationBWDInput = null;
    #simulationBaseDRInput = null;
    #simulationCritInput = null;

    #simulationResultButton = null;

    async showSimulationResult() {
        if (!this.currentResults) {
            return;
        }
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/damage-calculator-page.html", "template-damage-result-table");

        const resultTable = template.querySelector("#damage-result-table > tbody");

        let culmchance = 1;
        for (const value of Object.keys(this.currentResults)) {
            let tr = document.createElement("tr");
            let addedCulm = false;
            const hpDamage = document.createElement("td");
            hpDamage.setAttribute("rowspan", Object.entries(this.currentResults[value]).length);
            hpDamage.append(value);
            tr.append(hpDamage);
            for (const dr of Object.keys(this.currentResults[value])) {
                const dmgBase = document.createElement("td");
                const rolledDmg = parseInt(value) + parseInt(dr);
                dmgBase.append(rolledDmg);
                tr.append(dmgBase);
                resultTable.append(tr);
                const drtd = document.createElement("td");
                drtd.append(dr);
                tr.append(drtd);
                const chance = document.createElement("td");
                chance.append(this.currentResults[value][dr].toLocaleString(undefined, {
                    style: "percent",
                    minimumFractionDigits: 2,
                  }));
                tr.append(chance);
                const culmtd = document.createElement("td");
                culmtd.append(culmchance.toLocaleString(undefined, {
                    style: "percent",
                    minimumFractionDigits: 2,
                  }));
                culmchance -= this.currentResults[value][dr];
                if (!addedCulm) {
                    culmtd.setAttribute("rowspan", Object.entries(this.currentResults[value]).length);
                    tr.append(culmtd);
                    addedCulm = true;
                }
                resultTable.append(tr);
                tr = document.createElement("tr");
            }
        }

        Modal.open(template, null, true);
    }

    recalculateForm() {
        let formData = new FormData(this.#simulatorPage.querySelector("#damage-simulation-form"));
        const selectedWeapon = formData.get('damage-weapon');

        let bwd = 0, mwdmod = 0, mwd_crit = 0;

        const effectiveBonuses = [];
        const effectiveBonusesTarget = [];

        if (selectedWeapon && items[selectedWeapon] && items[selectedWeapon].type_specific_data.damage_min_normal != null && items[selectedWeapon].type_specific_data.damage_max_normal != null) {
            const weapEntry = items[selectedWeapon];
            if (weapEntry.type_specific_data && weapEntry.type_specific_data.category === "shotgun") {
                effectiveBonuses.push({
                    "name": "shotgun",
                    "bonuscat": "shotgun"
                });
            }
            bwd = (weapEntry.type_specific_data.damage_min_normal + weapEntry.type_specific_data.damage_max_normal) / 2;
            this.#simulatorPage.querySelectorAll("#damage-simulation-form .damage-form-dynamic-input").forEach((v) => {
                const attrValue = v.getAttribute("value");
                if (attrValue) {
                    v.readOnly = false;
                    const bonusEntry = this.allBonuses[attrValue];
                    if (bonusEntry && bonusEntry.requires) {
                        v.readOnly = !DamageCalculatorPage.reqCheck(bonusEntry.requires, selectedWeapon, weapEntry);
                    }
                    if (!v.readOnly) {
                        v.classList.remove("perk-off");
                    } else {
                        v.classList.add("perk-off");
                    }
                }
            });
            this.#simulationBWDInput.readOnly = true;
        } else {
            this.#simulatorPage.querySelectorAll("#damage-simulation-form .damage-form-dynamic-input").forEach(v => {
                v.readOnly = false;
                v.classList.remove("perk-off");
            });
            bwd = parseInt(this.#simulationBWDInput.value);
            this.#simulationBWDInput.readOnly = false;
        }

        this.#simulatorPage.querySelectorAll("#damage-simulation-form .damage-form-dynamic-input").forEach((v) => {
            const attrValue = v.getAttribute("value");
            if (attrValue && v.checked && !v.readOnly) {
                const bonusEntry = {...this.allBonuses[attrValue]};
                if (bonusEntry) {
                    if (bonusEntry.adjustable) {
                        const adjustedVal = v.parentNode.querySelector(".item-container input");
                        if (adjustedVal) {
                            bonusEntry.flat = parseFloat(adjustedVal.value);
                        }
                    }
                    if (bonusEntry.category !== "passive" || selectedWeapon) {
                        if (v.getAttribute("data-target")) {
                            effectiveBonusesTarget.push(bonusEntry);
                        } else {
                            effectiveBonuses.push(bonusEntry);
                        }
                    }
                }
            }
        });

        this.#simulationBWDInput.value = bwd;
        const bwd_penalties = effectiveBonuses.filter(b => b.bonuscat === "bwd_penalties");
        if (bwd_penalties && bwd_penalties.length) {
            bwd_penalties.sort((a, b) => {
                if (a.override && !b.override) {
                    return 1;
                } else if (!a.override && b.override) {
                    return -1;
                }

                return 0;
            });
            let newBWD = bwd;
            bwd_penalties.forEach((p) => {
                if (p.override !== undefined) {
                    newBWD = p.override;
                } else {
                    if (p.round === "up") {
                        newBWD = Math.ceil(p.mult * newBWD);
                    } else {
                        newBWD = Math.floor(p.mult * newBWD);
                    }
                }
                if (p.disables) {
                    const nameFilter = b => b.name.startsWith(p.disables);
                    for (let i = effectiveBonuses.findIndex(nameFilter); i >= 0; i = effectiveBonuses.findIndex(nameFilter)) {
                        effectiveBonuses.splice(i, 1);
                    }
                }
            })
            mwdmod = newBWD - bwd;
        }
        
        const mwd_bonuses = effectiveBonuses.filter(b => b.bonuscat === "mwd_bonuses");
        if (mwd_bonuses) {
            mwd_bonuses.forEach((p) => {
                mwdmod += p.flat;
            })
        }
        const mwd_crit_bonuses = effectiveBonuses.filter(b => b.bonuscat === "mwd_crit_bonuses");
        if (mwd_crit_bonuses) {
            mwd_crit_bonuses.forEach((p) => {
                if (p.flat) {
                    mwd_crit += p.flat;
                }
                if (p.mult) {
                    if (p.round === "up") {
                        mwd_crit += Math.ceil(bwd * p.mult);
                    } else {
                        mwd_crit += Math.floor(bwd * p.mult);
                    }
                }
            })
        }

        const armorName = formData.get("damage-armor");
        let armor_dr = parseFloat(this.#simulationBaseDRInput.value) || 0;
        let flat_dr_sum = 0;
        if (armorName != null && items[armorName]) {
            armor_dr = items[armorName].type_specific_data.damage_reduction ?? 0;
            this.#simulationBaseDRInput.readOnly = true;
        } else {
            this.#simulationBaseDRInput.readOnly = false;
        }
        const flat_dr = effectiveBonusesTarget.filter(b => b.bonuscat === "flat_dr");
        if (flat_dr) {
            flat_dr.filter(b => b.flat).forEach((b) => flat_dr_sum += b.flat);
        }

        this.#simulatorPage.querySelector("#damage-form-preview-bwd-mod").value = mwdmod;
        this.#simulatorPage.querySelector("#damage-form-preview-mwd-crit-mod").value = mwd_crit;
        this.#simulationBaseDRInput.value = armor_dr;
        this.#previewPerks.innerText = "";
        effectiveBonuses.forEach((v) => {
            if (v.icon) {
                const icnDiv = document.createElement("div");
                const icn = document.createElement("img");
                icn.src = v.icon;
                if (v.category === "perk" || v.category === "actionoverride") {
                    icn.classList.add("perk-icon");
                }
                icnDiv.append(icn);
                this.#previewPerks.append(icnDiv);
                const mousenterFunc = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    PageManager.instance.showTooltip(event.target.getBoundingClientRect(), v.name);
                };
                const mouseexitfunc = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    PageManager.instance.hideTooltip();
                }
                icnDiv.addEventListener("mouseenter", mousenterFunc);
                icnDiv.addEventListener("mouseout", mouseexitfunc);
            }
        });

        const critchance = parseInt(this.#simulatorPage.querySelector("#damage-form-preview-crit-chance").value) || 0;

        this.currentResults = dmg_simulate(bwd, mwdmod, critchance, mwd_crit, effectiveBonuses, flat_dr_sum + armor_dr, formData.get("damage-cover"), effectiveBonusesTarget, formData.get("explosive") === "true");
    }

    static reqCheck(requirements, itemName, item) {
        const reqEntry = {...item.type_specific_data, "id": itemName, "name": item.name, "type": item.type};

        const reqChecker = function([reqKey, reqVal]) {
            if (reqKey === "or") {
                return Object.entries(reqVal).some(reqChecker);
            } else if (reqKey === "not") {
                return !Object.entries(reqVal).every(reqChecker);
            }

            if (typeof reqVal.some === "function") {
                return reqVal.some(checkVal => reqEntry[reqKey] === checkVal);
            }

            return reqEntry[reqKey] === reqVal;
        }

        return Object.entries(requirements).every(reqChecker);
    }

    async populateSimulationForm(template, data) {
        const bonuses = damageBonuses;
        this.allBonuses = Object.fromEntries(Object.entries(bonuses)
            .filter(([_, v]) => typeof v.map === 'function')
            .map(([bonuscat, v]) => v.map(b => { return {...b, "bonuscat": bonuscat}; })).flat().map(v => [v.name, v]));
        const weapons = Object.entries(items).filter(([_, i]) => 
            i.type_specific_data &&
            i.type_specific_data.damage_min_normal
        );

        const explosiveCheck = this.#explosiveCheck;
        this.#simulationResultButton = template.querySelector("#damage-simulation-result-btn");
        this.#previewPerks = template.querySelector("#damage-form-preview-perks");

        const recalculateFunc = this.recalculateForm.bind(this);

        template.querySelectorAll(".cover-option").forEach((c) => {
            c.addEventListener("click", function () {
                c.querySelector("input").checked = true;
                recalculateFunc();
            });
        });

        weapons.sort(([nameA, a], [nameB, b]) => {
            if (a.type_specific_data.weapon_tier && b.type_specific_data.weapon_tier) {
                return a.type_specific_data.weapon_tier.localeCompare(b.type_specific_data.weapon_tier);
            } else if (a.type_specific_data.weapon_tier) {
                return -1;
            } else if (b.type_specific_data.weapon_tier) {
                return 1;
            }
            else {
                if (a.type_specific_data.category && b.type_specific_data.category) {
                    return a.type_specific_data.category.localeCompare(b.type_specific_data.category);
                } else if (a.type_specific_data.category) {
                    return -1;
                } else if (b.type_specific_data.category) {
                    return 1;
                }
                else {
                    return nameA.localeCompare(nameB);
                }
            }
        });

        weapons.forEach(async ([name, w]) => {
            const weapTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/damage-calculator-page.html", "damage-weapon-selector");
            const weapInput = weapTemplate.querySelector("input");
            weapInput.value = name;
            const bwd = (w.type_specific_data.damage_min_normal + w.type_specific_data.damage_max_normal) / 2;
            weapTemplate.setAttribute("data-damage", bwd);
            weapTemplate.setAttribute("data-item-id", name);
            weapTemplate.querySelector("img").src = w.icon;
            weapTemplate.querySelector(".item-container-name").textContent = w.name;
            weapTemplate.querySelector(".item-container-bwd").textContent = bwd;
            const helpButton = weapTemplate.querySelector("button.item-help-button");
            helpButton.addEventListener("click", async(event) => {
                event.stopPropagation();

                const miniPage = await ItemDisplayPage.generateMiniPage(w);

                Modal.open(miniPage, null, true);
            });
            weapTemplate.addEventListener("click", async(event) => {
                event.stopPropagation();
                
                weapInput.checked = !weapInput.checked;
                explosiveCheck.value = w.type === "loadout_equipment" || (w.type_specific_data && w.type_specific_data.category === "rocket_launcher") || name === "item_grenade_launcher" || name === "item_proximity_mine_launcher";
                this.recalculateForm();
            });
        
            template.querySelector("#damage-form-weapon > details > .item-entries-container").append(weapTemplate);
        });

        const perk_or_equipment_generate = async function (perk, cat, target) {
            const perkTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/damage-calculator-page.html", "damage-option-selector");
            const perkInput = perkTemplate.querySelector("input");
            perkInput.name = cat;
            perkInput.value = perk.name;
            if (target) {
                perkInput.setAttribute("data-target", true);
            }
            
            perkTemplate.querySelector("img").src = perk.icon;
            perkTemplate.querySelector(".item-container-name").textContent = perk.name;
            perkTemplate.setAttribute("data-item-id", perk.name);
        
            perkTemplate.addEventListener("click", async(event) => {
                event.stopPropagation();
                
                perkInput.checked = !perkInput.checked;
                recalculateFunc();
            });

            if (perk.adjustable) {
                const asj = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
                asj.type = "number";
                asj.value = 0;
                if (perk.min !== undefined) {
                    asj.min = parseInt(perk.min);
                }
                if (perk.max !== undefined) {
                    asj.max = parseInt(perk.max);
                }
                if (asj.min > asj.value) {
                    asj.value = asj.min;
                } else if (asj.max < asj.value) {
                    asj.value = asj.max;
                }
                if (target) {
                    asj.step = 0.01;
                }
                asj.addEventListener("click", (e) => e.stopPropagation());
                asj.addEventListener("change", () => {
                    recalculateFunc();
                });
                perkTemplate.querySelector(".item-container").append(asj);
            }
            if (perk.category === "actionoverride") {
                perkInput.type = "radio";
                perkInput.name = "actionoverride";
                perkInput.setAttribute("data-cat", cat);
                perkTemplate.classList.add("damage-perk");
                if (target) {
                    template.querySelector("#damage-form-target-perks > details > .item-entries-container").append(perkTemplate);
                } else {
                    template.querySelector("#damage-form-perks > details > .item-entries-container").append(perkTemplate);
                }
                return;
            }
            switch (perk.category) {
                case "perk":
                    perkTemplate.classList.add("damage-perk");
                    if (target) 
                    {
                        template.querySelector("#damage-form-target-perks > details > .item-entries-container").append(perkTemplate);
                    }
                    else {
                        template.querySelector("#damage-form-perks > details > .item-entries-container").append(perkTemplate);
                    }
                    break;
                case "equipment":
                case "weapon":
                    if (target) 
                    {
                        template.querySelector("#damage-form-target-equipments > details > .item-entries-container").append(perkTemplate);
                    }
                    else {
                        template.querySelector("#damage-form-equipments > details > .item-entries-container").append(perkTemplate);
                    }
                    break;
                case "upgrade":
                    template.querySelector("#damage-form-upgrades > details > .item-entries-container").append(perkTemplate);
                    break;
                case "cover":
                    template.querySelector("#damage-form-target-cover > details > .item-entries-container").append(perkTemplate);
                    break;
                default:
                    perkTemplate.classList.add("no-display");
                    perkInput.checked = true;
                    template.querySelector("#damage-simulation-form").append(perkTemplate);

            }
        }

        bonuses.bwd_penalties.forEach((b) => perk_or_equipment_generate(b, "bwd_penalties"));
        bonuses.mwd_bonuses.forEach((b) => perk_or_equipment_generate(b, "mwd_bonuses"));
        bonuses.mwd_crit_bonuses.forEach((b) => perk_or_equipment_generate(b, "mwd_crit_bonuses"));
        bonuses.dr_pierce.forEach((b) => perk_or_equipment_generate(b, "dr_pierce"));
        bonuses.flat_bonuses.forEach((b) => perk_or_equipment_generate(b, "flat_bonuses"));

        const dr_items = Object.entries(items).filter(([_, i]) => 
            i.type_specific_data &&
            i.type_specific_data.damage_reduction
        );
        const armors = dr_items.filter(([_, i]) => i.type !== "loadout_equipment");
        armors.sort(([_, a], [__, b]) => a.type.localeCompare(b.type));
        const flat_dr_equipments = dr_items.filter(([_, i]) => i.type === "loadout_equipment");
        armors.forEach(async ([name, a]) => {
            const armorTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/damage-calculator-page.html", "damage-armor-selector");
            const armorInput = armorTemplate.querySelector("input");
            armorInput.value = name;
            armorTemplate.setAttribute("data-dr", a.type_specific_data.damage_reduction);
            armorTemplate.setAttribute("data-item-id", name);
            armorTemplate.querySelector("img").src = a.icon;
            armorTemplate.querySelector(".item-container-name").textContent = a.name;
            armorTemplate.querySelector(".item-container-dr").textContent = a.type_specific_data.damage_reduction;
            const helpButton = armorTemplate.querySelector("button.item-help-button");
            helpButton.addEventListener("click", async(event) => {
                event.stopPropagation();

                const miniPage = await ItemDisplayPage.generateMiniPage(a);

                Modal.open(miniPage, null, true);
            });
            armorTemplate.addEventListener("click", async(event) => {
                event.stopPropagation();
                
                armorInput.checked = !armorInput.checked;
                this.recalculateForm();
            });
        
            template.querySelector("#damage-form-target-armor > details > .item-entries-container").append(armorTemplate);
        });
        const flar_dr_perks = flat_dr_equipments.map(([_, b]) => { 
            const equipment_flat_dr_item = {
                "name": b.name,
                "value": b.type_specific_data.damage_reduction,
                "category": "equipment",
                "icon": b.icon,
                "bonuscat": "flat_dr"
            };
            this.allBonuses[b.name] = equipment_flat_dr_item;
            return equipment_flat_dr_item;
        });
        flar_dr_perks.forEach((b) => perk_or_equipment_generate(b, "flat_dr", true));
        bonuses.flat_dr.forEach((b) => perk_or_equipment_generate(b, "flat_dr", true));
        bonuses.percent_dr.forEach((b) => perk_or_equipment_generate(b, "percent_dr", true));
        bonuses.cover_dr.forEach((b) => perk_or_equipment_generate(b, "cover_dr", true));

        this.#simulationBWDInput.addEventListener("change", () => {
            this.recalculateForm();
        });
        this.#simulationBaseDRInput.addEventListener("change", () => {
            this.recalculateForm();
        });
        this.#simulationCritInput.addEventListener("change", () => {
            this.recalculateForm();
        });
        this.#simulationResultButton.addEventListener("click", () => {
            this.showSimulationResult();
        });
    }
    // #endregion

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/damage-calculator-page.html", "damage-calculator-template");

        this.#damageInput = template.querySelector("#dmg-input");
        this.#simulationBWDInput = template.querySelector("#damage-form-preview-bwd");
        if (parseInt(data.damage)) {
            this.#damageInput.value = data.damage;
            this.#simulationBWDInput.value = data.damage;
        }
        this.#critInput = template.querySelector("#crit-input");
        if (parseInt(data.crit)) {
            this.#critInput.value = data.crit;
        }
        this.#critBonusInput = template.querySelector("#crit-bonus-input");
        this.#simulationCritInput = template.querySelector("#damage-form-preview-crit-chance");
        if (parseInt(data.critbonus)) {
            this.#critBonusInput.value = data.critbonus;
            this.#simulationCritInput.value = data.critbonus;
        }
        this.#simulationBaseDRInput = template.querySelector("#damage-form-preview-base-dr");
        this.#damageInput.addEventListener("change", this._generateDamageTable.bind(this));
        this.#critInput.addEventListener("change", this._generateDamageTable.bind(this));
        this.#critBonusInput.addEventListener("change", this._generateDamageTable.bind(this));

        this.#damageResults = template.querySelector("#damage-results");
        this.#pageModeSelector = template.querySelector("#damage-calculator-mode-toggle");
        this.#calculatorPage = template.querySelector("#damage-calculation-content");
        this.#simulatorPage = template.querySelector("#damage-simulation-content");
        this.#explosiveCheck = template.querySelector("#is-explosive");
        this.#pageModeSelector.addEventListener("selectedOptionChanged", this._onSelectedPageModeChanged.bind(this));

        this._generateDamageTable();

        this.populateSimulationForm(template, data);

        return {
            body: template,
            title: {
                icon: "assets/img/item-stat-icons/damage.png",
                text: "Damage Calculator"
            }
        };
    }

    _generateDamageTable() {
        const headers = ["Damage", "% Chance", "% Cumulative"];
        const sizes = new Array(3).fill("175px");
        const values = [];

        const dmg_table = dmg_with_crit(this.#damageInput.value, this.#critInput.value, this.#critBonusInput.value);

        Object.keys(dmg_table).forEach((dmg) => {
            values.push(dmg);
            values.push(dmg_table[dmg].val.toLocaleString(undefined, {
                style: "percent",
                minimumFractionDigits: 2,
              }));
            values.push(dmg_table[dmg].culm.toLocaleString(undefined, {
                style: "percent",
                minimumFractionDigits: 2,
              }));
        });

        const grid = Utils.createGrid(headers, sizes, values);

        this.#damageResults.replaceChildren(grid);
    }

    _onSelectedPageModeChanged(event) {
        const pageMode = event.detail.selectedOption.toLowerCase();

        if (pageMode === "calculation") {
            this.#calculatorPage.classList.remove("hidden-collapse");
            this.#simulatorPage.classList.add("hidden-collapse");
        }
        else {
            this.#calculatorPage.classList.add("hidden-collapse");
            this.#simulatorPage.classList.remove("hidden-collapse");
        }
    }

    makeHistoryState() {
        return new PageHistoryState(this, { damage: this.#damageInput.value, crit: this.#critInput.value, critbonus: this.#critBonusInput.value });
    }
}

export default DamageCalculatorPage