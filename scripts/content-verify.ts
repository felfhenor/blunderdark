/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs-extra');

const allDataPath = './public/json/all.json';
if (!fs.existsSync(allDataPath)) {
  console.error(
    'public/json/all.json not found. Run "npm run gamedata:build" first.',
  );
  process.exit(1);
}

const allData: Record<string, any[]> = fs.readJsonSync(allDataPath);
const errors: string[] = [];
const warnings: string[] = [];

const idSet = (key: string): Set<string> =>
  new Set((allData[key] || []).map((e: any) => e.id));

const nameSet = (key: string): Set<string> =>
  new Set((allData[key] || []).map((e: any) => e.name));

const nameById = (key: string): Record<string, string> => {
  const map: Record<string, string> = {};
  (allData[key] || []).forEach((e: any) => {
    map[e.id] = e.name;
  });
  return map;
};

// ============================================================
// 0. Global uniqueness — no two entries across ANY type may
//    share the same id or the same name
// ============================================================
const globalNameMap = new Map<string, { type: string; id: string }>();
const globalIdMap = new Map<string, { type: string; name: string }>();

Object.entries(allData).forEach(([type, entries]) => {
  (entries as any[]).forEach((entry: any) => {
    if (globalIdMap.has(entry.id)) {
      const prev = globalIdMap.get(entry.id)!;
      errors.push(
        `Duplicate id "${entry.id}": ${type}/"${entry.name}" collides with ${prev.type}/"${prev.name}"`,
      );
    } else {
      globalIdMap.set(entry.id, { type, name: entry.name });
    }

    if (globalNameMap.has(entry.name)) {
      const prev = globalNameMap.get(entry.name)!;
      errors.push(
        `Duplicate name "${entry.name}": ${type}/${entry.id} collides with ${prev.type}/${prev.id}`,
      );
    } else {
      globalNameMap.set(entry.name, { type, id: entry.id });
    }
  });
});

const research: any[] = allData['research'] || [];
const rooms: any[] = allData['room'] || [];
const roomUpgrades: any[] = allData['roomupgrade'] || [];
const features: any[] = allData['feature'] || [];
const inhabitants: any[] = allData['inhabitant'] || [];
const breedingRecipes: any[] = allData['breedingrecipe'] || [];
const summonRecipes: any[] = allData['summonrecipe'] || [];
const fusionRecipes: any[] = allData['fusionrecipe'] || [];
const synergies: any[] = allData['synergy'] || [];
const reputationEffects: any[] = allData['reputationeffect'] || [];

const roomIds = idSet('room');
const roomNames = nameSet('room');
const inhabitantIds = idSet('inhabitant');
const inhabitantNames = nameById('inhabitant');
const researchNames = nameById('research');

// ============================================================
// 1. Room upgrades are unlocked by research
// ============================================================
const researchUnlockedRoomUpgradeIds = new Set<string>();
research.forEach((node: any) => {
  (node.unlocks || []).forEach((u: any) => {
    if (u.type === 'roomupgrade') {
      researchUnlockedRoomUpgradeIds.add(u.targetRoomupgradeId);
    }
  });
});

roomUpgrades.forEach((ru: any) => {
  if (!researchUnlockedRoomUpgradeIds.has(ru.id)) {
    errors.push(
      `Room upgrade "${ru.name}" (${ru.id}) is not unlocked by any research node`,
    );
  }
});

// ============================================================
// 2. Room upgrades belong to rooms
// ============================================================
const roomOwnedUpgradeIds = new Set<string>();
rooms.forEach((room: any) => {
  (room.roomUpgradeIds || []).forEach((id: string) => {
    roomOwnedUpgradeIds.add(id);
  });
});

roomUpgrades.forEach((ru: any) => {
  if (!roomOwnedUpgradeIds.has(ru.id)) {
    errors.push(
      `Room upgrade "${ru.name}" (${ru.id}) does not belong to any room's roomUpgradeIds`,
    );
  }
});

// ============================================================
// 3. Room features are unlocked by research
// ============================================================
const researchUnlockedFeatureIds = new Set<string>();
research.forEach((node: any) => {
  (node.unlocks || []).forEach((u: any) => {
    if (u.type === 'roomfeature') {
      researchUnlockedFeatureIds.add(u.targetFeatureId);
    }
  });
});

features.forEach((f: any) => {
  if (!researchUnlockedFeatureIds.has(f.id)) {
    errors.push(
      `Feature "${f.name}" (${f.id}) is not unlocked by any research node`,
    );
  }
});

// ============================================================
// 4. Inhabitants are reachable
// ============================================================
const researchUnlockedInhabitantIds = new Set<string>();
research.forEach((node: any) => {
  (node.unlocks || []).forEach((u: any) => {
    if (u.type === 'inhabitant') {
      researchUnlockedInhabitantIds.add(u.targetInhabitantId);
    }
  });
});

const summonResultIds = new Set<string>();
summonRecipes.forEach((r: any) => {
  summonResultIds.add(r.resultInhabitantId);
});

const fusionResultIds = new Set<string>();
fusionRecipes.forEach((r: any) => {
  fusionResultIds.add(r.resultInhabitantId);
});

inhabitants.forEach((inh: any) => {
  const tags: string[] = inh.restrictionTags || [];

  if (tags.includes('converted')) {
    return; // always OK — produced by torture
  }

  if (tags.includes('summoned')) {
    if (!summonResultIds.has(inh.id)) {
      errors.push(
        `Inhabitant "${inh.name}" (${inh.id}) has "summoned" tag but is not a result of any summon recipe`,
      );
    }
    return;
  }

  if (tags.includes('hybrid')) {
    if (!fusionResultIds.has(inh.id)) {
      errors.push(
        `Inhabitant "${inh.name}" (${inh.id}) has "hybrid" tag but is not a result of any fusion recipe`,
      );
    }
    return;
  }

  if (tags.includes('unique')) {
    if (!researchUnlockedInhabitantIds.has(inh.id)) {
      errors.push(
        `Inhabitant "${inh.name}" (${inh.id}) has "unique" tag but is not unlocked by any research node`,
      );
    }
    return;
  }

  // No tags or empty: research-unlocked or available from the start — both OK
});

// ============================================================
// 5. Research nodes are reachable (BFS from roots)
// ============================================================
const researchIdSet = idSet('research');
const prereqMap: Record<string, string[]> = {};
const dependentsMap: Record<string, string[]> = {};

research.forEach((node: any) => {
  prereqMap[node.id] = node.prerequisiteResearchIds || [];
  dependentsMap[node.id] ??= [];
  (node.prerequisiteResearchIds || []).forEach((prereqId: string) => {
    dependentsMap[prereqId] ??= [];
    dependentsMap[prereqId].push(node.id);
  });
});

const rootNodes = research.filter(
  (n: any) =>
    !n.prerequisiteResearchIds || n.prerequisiteResearchIds.length === 0,
);

const reachable = new Set<string>();
const queue = rootNodes.map((n: any) => n.id);
while (queue.length > 0) {
  const current = queue.shift()!;
  if (reachable.has(current)) continue;
  reachable.add(current);
  (dependentsMap[current] || []).forEach((dep: string) => {
    if (!reachable.has(dep)) {
      queue.push(dep);
    }
  });
}

research.forEach((node: any) => {
  if (!reachable.has(node.id)) {
    errors.push(
      `Research node "${node.name}" (${node.id}) is unreachable from any root node`,
    );
  }
});

// ============================================================
// 6. Research nodes have unlocks
// ============================================================
research.forEach((node: any) => {
  if (!node.unlocks || node.unlocks.length === 0) {
    errors.push(`Research node "${node.name}" (${node.id}) has no unlocks`);
  }
});

// ============================================================
// 7. Research tier limits
// ============================================================
const MAX_PER_TIER = 30;
const tierCounts: Record<number, number> = {};
research.forEach((node: any) => {
  tierCounts[node.tier] = (tierCounts[node.tier] || 0) + 1;
});

Object.entries(tierCounts).forEach(([tier, count]) => {
  if ((count as number) > MAX_PER_TIER) {
    warnings.push(
      `Research tier ${tier} has ${count} nodes (limit: ${MAX_PER_TIER})`,
    );
  }
});

// ============================================================
// 8. Breeding recipe parents exist
// ============================================================
breedingRecipes.forEach((r: any) => {
  if (!inhabitantIds.has(r.parentInhabitantAId)) {
    errors.push(
      `Breeding recipe "${r.name}" (${r.id}) references invalid parentInhabitantAId "${r.parentInhabitantAId}"`,
    );
  }
  if (!inhabitantIds.has(r.parentInhabitantBId)) {
    errors.push(
      `Breeding recipe "${r.name}" (${r.id}) references invalid parentInhabitantBId "${r.parentInhabitantBId}"`,
    );
  }
});

// ============================================================
// 9. Summoning recipe results exist
// ============================================================
summonRecipes.forEach((r: any) => {
  if (!inhabitantIds.has(r.resultInhabitantId)) {
    errors.push(
      `Summon recipe "${r.name}" (${r.id}) references invalid resultInhabitantId "${r.resultInhabitantId}"`,
    );
  }
});

// ============================================================
// 10. Fusion recipe references exist
// ============================================================
fusionRecipes.forEach((r: any) => {
  if (!inhabitantIds.has(r.firstInhabitantId)) {
    errors.push(
      `Fusion recipe "${r.name}" (${r.id}) references invalid firstInhabitantId "${r.firstInhabitantId}"`,
    );
  }
  if (!inhabitantIds.has(r.secondInhabitantId)) {
    errors.push(
      `Fusion recipe "${r.name}" (${r.id}) references invalid secondInhabitantId "${r.secondInhabitantId}"`,
    );
  }
  if (!inhabitantIds.has(r.resultInhabitantId)) {
    errors.push(
      `Fusion recipe "${r.name}" (${r.id}) references invalid resultInhabitantId "${r.resultInhabitantId}"`,
    );
  }
});

// ============================================================
// 11. Synergy room references exist
// ============================================================
synergies.forEach((s: any) => {
  (s.conditions || []).forEach((cond: any) => {
    if (cond.roomTypeId && !roomIds.has(cond.roomTypeId)) {
      errors.push(
        `Synergy "${s.name}" (${s.id}) condition references invalid roomTypeId "${cond.roomTypeId}"`,
      );
    }
  });
});

// ============================================================
// 12. Reputation effect room targets exist
// ============================================================
reputationEffects.forEach((re: any) => {
  if (re.effectType === 'unlock_room' && re.targetId) {
    if (!roomNames.has(re.targetId)) {
      errors.push(
        `Reputation effect "${re.name}" (${re.id}) unlock_room references invalid room name "${re.targetId}"`,
      );
    }
  }
});

// ============================================================
// 13. No duplicate research unlocks
// ============================================================
const seenUnlocks = new Map<string, string>();
research.forEach((node: any) => {
  (node.unlocks || []).forEach((u: any) => {
    let key: string | undefined;

    if (u.type === 'room') key = `room:${u.targetRoomId}`;
    else if (u.type === 'inhabitant') key = `inhabitant:${u.targetInhabitantId}`;
    else if (u.type === 'roomupgrade')
      key = `roomupgrade:${u.targetRoomupgradeId}`;
    else if (u.type === 'roomfeature') key = `roomfeature:${u.targetFeatureId}`;
    else if (u.type === 'ability') key = `ability:${u.targetCombatabilityId}`;

    // passive_bonus, feature_flag, biome can legitimately repeat
    if (!key) return;

    if (seenUnlocks.has(key)) {
      errors.push(
        `Duplicate research unlock: "${node.name}" and "${seenUnlocks.get(key)}" both unlock ${key}`,
      );
    } else {
      seenUnlocks.set(key, node.name);
    }
  });
});

// ============================================================
// Report
// ============================================================
if (warnings.length > 0) {
  console.warn(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
}

if (errors.length > 0) {
  console.error(`\n${errors.length} content verification error(s):`);
  errors.forEach((err) => console.error(`  ✗ ${err}`));
  process.exit(1);
}

console.log('\nContent verification passed — no dead or invalid content found.');
