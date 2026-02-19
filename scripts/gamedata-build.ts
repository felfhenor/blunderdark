/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */

const { isArray, isString, isObject } = require('es-toolkit/compat');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const path = require('path');

fs.ensureDirSync('./public/json');

const allData: Record<string, any[]> = {};
const trackedIds: Record<string, boolean> = {};
const idToName: Record<string, Record<string, string>> = {};

// preload
const processFiles = () => {
  fs.readdirSync('gamedata').forEach((folder: string) => {
    fs.readdirSync(`gamedata/${folder}`).forEach((file: string) => {
      try {
        const filename = path.basename(file, '.yml');
        const doc = yaml.load(
          fs.readFileSync(`gamedata/${folder}/${filename}.yml`),
        );

        idToName[folder] ??= {};
        allData[folder] ??= [];
        allData[folder].push(...doc);

        doc.forEach((entry: any) => {
          if (!entry.name) {
            console.error(`Entry "${entry.id}" has no name.`);
            return;
          }

          if (idToName[folder][entry.name]) {
            console.error(
              `Name "${entry.name}" already exists somewhere in the content.`,
            );
            process.exit(1);
          }

          if (trackedIds[entry.id]) {
            console.error(
              `Id "${entry.id}" already exists somewhere in the content.`,
            );
            process.exit(1);
          }

          trackedIds[entry.id] = true;
          idToName[folder][entry.name] = entry.id;
        });

        console.log(`Loaded ${folder}/${file} - ${doc.length} entries...`);
      } catch (e) {
        console.error(e);
      }
    });
  });
};

const rewriteDataIds = () => {
  const allIds = Object.keys(allData).reverse();
  console.log(`Valid identifiers: ${allIds.join(', ')}`);

  const getIdForName = (name: string, type: string) => {
    const res = idToName[type][name];
    if (!res) {
      console.error(`Name ${name} (${type}) has no corresponding id.`);
      process.exit(1);
    }

    return res;
  };

  // explicit aliases for keys that don't naturally contain their folder name
  const keyAliases: Record<string, string> = {
    shapeId: 'roomshape',
  };

  // magically transform any key that requests an id to that id
  const iterateObject = (entry: any) => {
    Object.keys(entry).forEach((entryKey) => {
      // no match, skip
      const keyMatch =
        allIds.find((id) => entryKey.toLowerCase().includes(id)) ??
        keyAliases[entryKey];
      if (!keyMatch) {
        // check deeper, if it's an array we want to check our sub objects
        if (isArray(entry[entryKey])) {
          entry[entryKey].forEach((subObj: any) => {
            iterateObject(subObj);
          });

          // if it's not an array, but an object, we want to dig deeper
        } else if (isObject(entry[entryKey])) {
          iterateObject(entry[entryKey]);
        }

        return;
      }

      // if the property name has id in it, we rewrite it
      if (entryKey.toLowerCase().includes('id')) {
        // match
        // our match key is an array of strings, so we rewrite them all to be ids
        if (isArray(entry[entryKey])) {
          entry[entryKey] = entry[entryKey].map((i: string) =>
            getIdForName(i, keyMatch),
          );
        }

        // our match key is a simple string, so we rewrite it to be an id
        else if (entry[entryKey] !== 'Any') {
          entry[entryKey] = getIdForName(entry[entryKey], keyMatch);
        }

        // otherwise, if it's an array, we go deeper, again
      } else {
        if (isArray(entry[entryKey])) {
          if (isString(entry[entryKey][0])) {
            entry[entryKey] = entry[entryKey].map((i: string) =>
              getIdForName(i, keyMatch),
            );
          } else {
            entry[entryKey].forEach((subObj: any) => {
              iterateObject(subObj);
            });
          }

          // and if it's an object instead of an array, we still want to dive in
        } else if (isObject(entry[entryKey])) {
          iterateObject(entry[entryKey]);
        }
      }
    });
  };

  allIds.forEach((key) => {
    Object.values(allData[key]).forEach((entry) => {
      iterateObject(entry);
    });
  });

  // write
  allIds.forEach((key) => {
    fs.writeJsonSync(`./public/json/${key}.json`, allData[key]);
  });

  fs.writeJsonSync('public/json/all.json', allData);
};

const validateResearchTree = () => {
  const researchNodes = allData['research'];
  if (!researchNodes || researchNodes.length === 0) {
    return;
  }

  console.log(`\nValidating research tree (${researchNodes.length} nodes)...`);

  const errors: string[] = [];
  const nodeIds = new Set(researchNodes.map((n: any) => n.id));

  // 1. Validate all prerequisite references point to valid node IDs
  researchNodes.forEach((node: any) => {
    if (!isArray(node.prerequisiteResearchIds)) return;
    node.prerequisiteResearchIds.forEach((prereqId: string) => {
      if (!nodeIds.has(prereqId)) {
        errors.push(
          `Node "${node.name}" (${node.id}) has invalid prerequisite "${prereqId}" — no matching research node exists`,
        );
      }
    });
  });

  // 2. Check every branch has at least one root node (no prerequisiteResearchIds)
  const branches = new Set(researchNodes.map((n: any) => n.branch));
  branches.forEach((branch: string) => {
    const branchNodes = researchNodes.filter((n: any) => n.branch === branch);
    const rootNodes = branchNodes.filter(
      (n: any) => !n.prerequisiteResearchIds || n.prerequisiteResearchIds.length === 0,
    );
    if (rootNodes.length === 0) {
      errors.push(
        `Branch "${branch}" has no root node (a node with empty prerequisiteResearchIds)`,
      );
    }
  });

  // 3. Circular dependency detection via DFS
  const adjacency: Record<string, string[]> = {};
  researchNodes.forEach((node: any) => {
    adjacency[node.id] = isArray(node.prerequisiteResearchIds)
      ? node.prerequisiteResearchIds.filter((id: string) => nodeIds.has(id))
      : [];
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const nodeNameById: Record<string, string> = {};
  researchNodes.forEach((n: any) => {
    nodeNameById[n.id] = n.name;
  });

  const detectCycle = (nodeId: string, path: string[]): boolean => {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path
        .slice(cycleStart)
        .map((id) => nodeNameById[id] || id)
        .join(' -> ');
      errors.push(
        `Circular dependency detected: ${cycle} -> ${nodeNameById[nodeId] || nodeId}`,
      );
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    for (const prereqId of adjacency[nodeId] || []) {
      if (detectCycle(prereqId, path)) return true;
    }

    path.pop();
    inStack.delete(nodeId);
    return false;
  };

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      detectCycle(nodeId, []);
    }
  }

  // 4. Validate unlock effects reference valid content IDs
  const allContentIds = new Set(Object.keys(trackedIds));
  researchNodes.forEach((node: any) => {
    if (!isArray(node.unlocks)) return;
    node.unlocks.forEach((unlock: any, idx: number) => {
      if (!unlock.type) {
        errors.push(`Node "${node.name}" unlock[${idx}] is missing "type" field`);
        return;
      }
      if (unlock.type === 'passive_bonus') {
        if (!unlock.bonusType) {
          errors.push(`Node "${node.name}" unlock[${idx}] passive_bonus is missing "bonusType"`);
        }
        return;
      }
      if (unlock.type === 'feature_flag') {
        if (!unlock.featureFlag) {
          errors.push(`Node "${node.name}" unlock[${idx}] feature_flag is missing "featureFlag"`);
        }
        if (!unlock.description) {
          errors.push(`Node "${node.name}" unlock[${idx}] feature_flag is missing "description"`);
        }
        return;
      }
      const targetFieldMap: Record<string, string> = {
        room: 'targetRoomId',
        inhabitant: 'targetInhabitantId',
        ability: 'targetCombatabilityId',
        upgrade: 'targetUpgradepathId',
      };
      const targetField = targetFieldMap[unlock.type];
      const targetId = targetField ? unlock[targetField] : undefined;
      if (!targetId) {
        errors.push(`Node "${node.name}" unlock[${idx}] (${unlock.type}) is missing "${targetField}"`);
        return;
      }
      if (!allContentIds.has(targetId)) {
        errors.push(`Node "${node.name}" unlock[${idx}] (${unlock.type}) references invalid ID "${targetId}"`);
      }
    });
  });

  if (errors.length > 0) {
    console.error(`\nResearch tree validation failed with ${errors.length} error(s):`);
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`Research tree validation passed — ${researchNodes.length} nodes, ${branches.size} branches, no errors.`);
};

processFiles();
rewriteDataIds();
validateResearchTree();
