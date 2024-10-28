import { damageBonuses } from "./data-helper.js";

function damage_dice(dmg) {
    if (typeof dmg !== "number") {
      throw "Must enter a number";
    }
    if (dmg < 0) {
      throw "Must enter positive number";
    }
    if (dmg === 0) {
      return [0];
    }
    const min_dmg = dmg - Math.ceil((dmg - 1) / 4);
    const max_dmg = dmg + Math.ceil((dmg - 1) / 4);
    const end_dice = (dmg - 1) % 4;
    const damage_faces = new Array(max_dmg - min_dmg + 1).fill(0).map((_, i) => {
      const curr_dmg = i + min_dmg;
      if (end_dice !== 0 && (curr_dmg === min_dmg || curr_dmg === max_dmg)) {
        return new Array(end_dice).fill(curr_dmg);
      }
  
      return new Array(4).fill(curr_dmg);
    });
    return damage_faces.flat();
  }
  
  function damage_normal(dmg) {
    const faces = damage_dice(dmg);
    const face_group = faces.reduce(
      (c, d) => ({ ...c, [d]: 1 + (c[d] ?? 0) }),
      {}
    );
    return Object.fromEntries(
      Object.keys(face_group).map((k) => [k, face_group[k] / faces.length])
    );
  }
  
  function damage_crit(dmg) {
    const faces = damage_dice(dmg);
    const max_dmg = faces[faces.length - 1];
    let face_group = {};
    if (dmg % 2) {
      const new_dice = faces
        .map((i) => i + dmg * 0.5)
        .map((i) => (i < max_dmg ? max_dmg : i));
      face_group = new_dice.reduce(
        (c, d) => ({ ...c, [d]: 1 + (c[d] ?? 0) }),
        {}
      );
      face_group = Object.entries(face_group).reduce((c, d) => {
        const cd = parseFloat(d[0]);
        if (cd % 1 === 0) {
          return { ...c, [cd]: d[1] };
        }
        const result = { ...c };
        if (cd === faces[0] + (dmg * 0.5)) {
          // For minimum damage, use reverse logic and apply ceiling damage first
          if (d[1] <= 2) {
            result[cd + 0.5] = d[1] + (result[cd + 0.5] ?? 0);
          } else {
            result[cd - 0.5] = d[1] - 2 + (result[cd - 0.5] ?? 0);
            result[cd + 0.5] = 2 + (result[cd + 0.5] ?? 0);
          }
        }
        else if (d[1] <= 2) {
          result[cd - 0.5] = d[1] + (result[cd - 0.5] ?? 0);
        } else {
          result[cd - 0.5] = 2 + (result[cd - 0.5] ?? 0);
          result[cd + 0.5] = d[1] - 2 + (result[cd + 0.5] ?? 0);
        }
        return result;
      }, {});
    } else {
      face_group = faces.reduce((c, d) => {
        let crit = d + dmg * 0.5;
        if (crit < max_dmg) {
          crit = max_dmg;
        }
        return { ...c, [crit]: 1 + (c[crit] ?? 0) };
      }, {});
    }
    return Object.fromEntries(
      Object.keys(face_group).map((k) => [k, face_group[k] / faces.length])
    );
  }

  function add_chance(dmg, chance, dict) {
    if (dmg < 0) {
      dmg = 0;
    }
    if (!dict[dmg]) {
      dict[dmg] = chance;
    } else {
      dict[dmg] += chance;
    }
  }

  export function dmg_simulate(bwd, mwd_mod, critchance, critbonuses, bonuses, flat_dr, cover, targetBonuses, explosive) {
    const dmg_rolls = dmg_range(bwd + mwd_mod, critbonuses);
    const dmg_chances = {};
    const crit_fixed = (parseInt(critchance) || 0) / 100;
    Object.entries(dmg_rolls.normal).forEach(([dmg, chance]) => {
      dmg = parseInt(dmg);
      if (explosive) {
        add_chance(dmg - 1, chance * 0.33 * (1 - crit_fixed), dmg_chances);
        add_chance(dmg, chance * 0.34 * (1 - crit_fixed), dmg_chances);
        add_chance(dmg + 1, chance * 0.33 * (1 - crit_fixed), dmg_chances);
      } else {
        add_chance(dmg, chance * (1 - crit_fixed), dmg_chances);
      }
    });
    if (critchance) {
      Object.entries(dmg_rolls.crit).forEach(([dmg, chance]) => {
        if (explosive) {
          add_chance(dmg - 1, chance * 0.33 * crit_fixed, dmg_chances);
          add_chance(dmg, chance * 0.34 * crit_fixed, dmg_chances);
          add_chance(dmg + 1, chance * 0.33 * crit_fixed, dmg_chances);
        } else {
          add_chance(dmg, chance * crit_fixed, dmg_chances);
        }
      });
    }

    let current_dr = parseFloat(flat_dr);
    const pierce = bonuses.filter(b => b.bonuscat === "dr_pierce" && b.percentage !== undefined);
    const post_pierce = bonuses.filter(b => b.bonuscat === "dr_pierce" && b.percentage === undefined);

    const percent_dr = targetBonuses.filter(b => b.bonuscat === "percent_dr");
    percent_dr.sort((a, b) => {
      if (a.dmg_mod && b.dmg_mod) {
        return b.dmg_mod - a.dmg_mod;
      }
      if (a.dmg_mod) {
        return 1;
      }
      if (b.dmg_mod) {
        return -1;
      }
      return 0;
    });
    const cover_dr = targetBonuses.filter(b => b.bonuscat === "cover_dr");
    const dmg_table = Object.entries(dmg_chances).map(([dmg, pct]) => {
      dmg = parseFloat(dmg);
      let net_dmg = Math.max(0, dmg - current_dr);
      percent_dr.forEach((dr) => {
        if (dr.dmg_mod) {
          if (dr.dmg_mod < 0) {
            net_dmg *= (1 - dr.value) + (dr.value * Math.min((0 - dr.dmg_mod) / net_dmg, 1))
          } else if (dr.dmg_mod > 0 && net_dmg < dmg) {
            let ex_dr_net = Math.min(dmg, net_dmg + dr.dmg_mod)
            net_dmg -= Math.max(0, ex_dr_net * dr.value);
          }
        } else {
          net_dmg *= 1 - dr.value;
        }
      });

      pierce.forEach(b => {
        let pierce_amt = (dmg - net_dmg) * b.percentage;
        if (b.min !== undefined) {
          pierce_amt = Math.max(pierce_amt, b.min);
        }
        if (b.max !== undefined) {
          pierce_amt = Math.min(pierce_amt, b.max);
        }
        net_dmg = Math.min(net_dmg + pierce_amt, dmg);
      });

      if (cover !== "no") {
        let cover_mult = 1.0;
        let cover_add = 0;

        cover_dr.forEach((b) => {
          if (b.mult) {
            cover_mult += b.mult;
          }
          if (b.flat) {
            cover_add += b.flat;
          }
        });
        net_dmg = net_dmg - ((cover_mult * (cover === "low" ? damageBonuses.low_cover_dr : damageBonuses.full_cover_dr)) + cover_add)
      }

      post_pierce.forEach(p => {
        if (p.flat) {
          net_dmg += p.flat;
        }
      });

      net_dmg = Math.min(net_dmg, dmg);

      let total_dr = dmg - net_dmg;
      if (total_dr > 0) {
        if (bonuses.some((b) => b.bonuscat === "shotgun") && !bonuses.some((b) => b.override_shotgun)) {
          total_dr *= 1.5;
        }
      }

      net_dmg = Math.max(0, dmg - total_dr);
      return {
        basedmg: dmg,
        eff_dr: total_dr,
        eff_dmg: net_dmg,
        pct: pct
      }
    });
    const bouns_dmg = bonuses.filter(b => b.bonuscat === "flat_bonuses");
    bouns_dmg.sort(b => b.use_bwd);
    const net_dmg = dmg_table.reduce((a, c) => {
      const prev = {...a};

      const addDamage = function (dr, pct) {
        if (!pct) {
          return;
        }
        const net_dmg = c.basedmg - dr;
        let eff_dmg = net_dmg;

        bouns_dmg.forEach((b) => {
          let plus_dmg = 0;
          if (b.ignore_dr || net_dmg > 0) {
            if (b.use_bwd) {
              plus_dmg = bwd * b.mult;
            } else {
              plus_dmg = net_dmg * b.mult;
            }
            
            if (b.round === "down") {
              plus_dmg = Math.floor(plus_dmg);
            } else if (b.round === "up") {
              plus_dmg = Math.ceil(plus_dmg);
            } else {
              plus_dmg = Math.round(plus_dmg);
            }

            if (b.min) {
              plus_dmg = Math.max(b.min, plus_dmg);
            }
            if (b.max) {
              plus_dmg = Math.min(b.max, plus_dmg);
            }

            if (plus_dmg) {
              eff_dmg += plus_dmg;
            }
          }
        });

        if (prev[eff_dmg]) {
          prev[eff_dmg][dr] = (prev[eff_dmg][dr] || 0) + pct;
        } else {
          prev[eff_dmg] = {[dr]: pct};
        }
      };

      if (Math.floor(c.eff_dr) === c.eff_dr) {
        addDamage(c.eff_dr, c.pct);
      } else {
        const floorP = c.eff_dr % 1;
        addDamage(Math.floor(c.eff_dr), c.pct * (1 - floorP));
        addDamage(Math.ceil(c.eff_dr), c.pct * floorP);
      }

      return prev;
    }, {});
    return net_dmg;
  }
  
  export function dmg_range(dmg, crit_bonus) {
    dmg = parseInt(dmg);
    if (dmg === NaN) {
      throw "Damage must be a number";
    }
    try {
      if (crit_bonus !== null && crit_bonus !== undefined) {
        crit_bonus = parseInt(crit_bonus);
      } else {
        crit_bonus = 0;
      }
    } catch {
      crit_bonus = 0;
    }
    if (crit_bonus === NaN) {
      throw "Crit bonus must be a number";
    }
    return {
      normal: damage_normal(dmg),
      crit: damage_crit(dmg + crit_bonus),
    };
  }
  
  export function dmg_with_crit(dmg, crit, crit_bonus) {
    crit = parseFloat(crit);
    if (crit < 0 || crit > 100) {
      throw "Invalid crit amount";
    }
    const range = dmg_range(dmg, crit_bonus);
    return Object.fromEntries(
      Object.keys(range.normal)
        .concat(Object.keys(range.crit))
        .reduce((c, v) => {
          if (c.includes(v)) {
            return c;
          } else {
            return [...c, v];
          }
        }, [])
        .map((dmg) => [
          dmg,
          (range.normal[dmg] ?? 0) * (1 - crit / 100) +
            (range.crit[dmg] ?? 0) * (crit / 100),
        ])
        .filter(([_, chance]) => chance)
        .reduce(
          (c, [dmg, chance]) => [
            ...c,
            [dmg, { val: chance, culm: c.reduce((c, [_, v]) => c - v.val, 1) }],
          ],
          []
        )
    );
  }
  