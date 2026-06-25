#!/usr/bin/env node

/**
 * data-cli.js — Data management tool for Find Who Am I
 *
 * Handles CRUD operations on the JSON knowledge graph with
 * automatic bidirectional referential integrity.
 *
 * Usage:
 *   node tools/data-cli.js validate
 *   node tools/data-cli.js list <entity-type>
 *   node tools/data-cli.js get <id>
 *   node tools/data-cli.js add <entity-type> <json-string>
 *   node tools/data-cli.js update <id> <field> <value>
 *   node tools/data-cli.js link <id1> <id2> <field1> [field2]
 *   node tools/data-cli.js unlink <id1> <id2> <field1> [field2]
 *   node tools/data-cli.js delete <id>
 *   node tools/data-cli.js check-refs
 *   node tools/data-cli.js stats
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

// --- File & Entity Type Mapping ---

const ENTITY_FILES = {
  symptom: 'symptoms.json',
  cause: 'causes.json',
  insight: 'insights.json',
  pattern: 'patterns.json',
  action: 'actions.json',
  crisis: 'adjacent-crises.json',
  module: 'modules.json',
  prompt: 'prompts.json'
};

// Fields that contain references to other entities (by ID)
const REF_FIELDS = {
  symptom: ['relatedCauses', 'relatedInsights', 'relatedCrises'],
  cause: ['symptoms', 'relatedCauses', 'relatedInsights', 'actionPointers', 'adjacentCrises'],
  insight: ['relatedCauses', 'relatedSymptoms', 'relatedCrises'],
  pattern: ['involvedCauses'],
  action: ['addressesCauses', 'addressesSymptoms'],
  crisis: ['relatedCauses', 'relatedSymptoms'],
  prompt: ['mapsTo.causes', 'mapsTo.symptoms']
};

// Bidirectional link mappings: if A links to B via fieldA, B should link to A via fieldB
const BIDIRECTIONAL = [
  { typeA: 'symptom', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'symptoms' },
  { typeA: 'symptom', fieldA: 'relatedInsights', typeB: 'insight', fieldB: 'relatedSymptoms' },
  { typeA: 'cause', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'relatedCauses' },
  { typeA: 'cause', fieldA: 'actionPointers', typeB: 'action', fieldB: 'addressesCauses' },
  { typeA: 'cause', fieldA: 'relatedInsights', typeB: 'insight', fieldB: 'relatedCauses' },
  { typeA: 'action', fieldA: 'addressesSymptoms', typeB: 'symptom', fieldB: null },
  { typeA: 'crisis', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'adjacentCrises' },
  { typeA: 'crisis', fieldA: 'relatedSymptoms', typeB: 'symptom', fieldB: 'relatedCrises' }
];

// --- Data Loading ---

function loadFile(entityType) {
  const filePath = path.join(DATA_DIR, ENTITY_FILES[entityType]);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Invalid JSON in ${ENTITY_FILES[entityType]}: ${e.message}`);
    return null;
  }
}

function saveFile(entityType, data) {
  const filePath = path.join(DATA_DIR, ENTITY_FILES[entityType]);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadAll() {
  const all = {};
  for (const type of Object.keys(ENTITY_FILES)) {
    all[type] = loadFile(type);
    if (all[type] === null) return null; // JSON parse error
  }
  return all;
}

function getEntityType(id) {
  const prefix = id.split('-')[0];
  const mapping = {
    symptom: 'symptom',
    cause: 'cause',
    insight: 'insight',
    pattern: 'pattern',
    action: 'action',
    crisis: 'crisis',
    module: 'module',
    prompt: 'prompt'
  };
  return mapping[prefix] || null;
}

function findEntity(all, id) {
  const type = getEntityType(id);
  if (!type || !all[type]) return null;
  const entity = all[type].find(e => e.id === id);
  return entity ? { type, entity } : null;
}

function getAllIds(all) {
  const ids = new Set();
  for (const type of Object.keys(all)) {
    if (all[type]) {
      for (const entity of all[type]) {
        ids.add(entity.id);
      }
    }
  }
  return ids;
}

// --- Commands ---

function cmdValidate() {
  console.log('🔍 Validating all data files...\n');
  let errors = 0;
  let warnings = 0;

  for (const [type, file] of Object.entries(ENTITY_FILES)) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⬜ ${file} — not yet created`);
      continue;
    }
    const data = loadFile(type);
    if (data === null) {
      errors++;
      continue;
    }
    // Check for duplicate IDs
    const ids = data.map(e => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      console.log(`  ❌ ${file} — duplicate IDs: ${dupes.join(', ')}`);
      errors++;
    }
    // Check all entities have an id
    const noId = data.filter(e => !e.id);
    if (noId.length > 0) {
      console.log(`  ❌ ${file} — ${noId.length} entities without id`);
      errors++;
    }
    if (dupes.length === 0 && noId.length === 0) {
      console.log(`  ✅ ${file} — ${data.length} entities, valid`);
    }
  }

  console.log(`\n${errors === 0 ? '✅ All files valid' : `❌ ${errors} error(s) found`}`);
  return errors === 0;
}

function cmdCheckRefs() {
  console.log('🔗 Checking referential integrity...\n');
  const all = loadAll();
  if (!all) return false;

  const allIds = getAllIds(all);
  let danglingCount = 0;
  let missingBackRefCount = 0;

  // Check all references point to existing IDs
  for (const [type, entities] of Object.entries(all)) {
    if (!entities) continue;
    const refFields = REF_FIELDS[type] || [];
    for (const entity of entities) {
      for (const field of refFields) {
        let refs;
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          refs = entity[parent] ? entity[parent][child] : null;
        } else {
          refs = entity[field];
        }
        if (!refs || !Array.isArray(refs)) continue;
        for (const ref of refs) {
          if (!allIds.has(ref)) {
            console.log(`  ⚠️  ${entity.id}.${field} → "${ref}" (NOT FOUND)`);
            danglingCount++;
          }
        }
      }
    }
  }

  // Check bidirectional consistency
  for (const rule of BIDIRECTIONAL) {
    const entitiesA = all[rule.typeA] || [];
    const entitiesB = all[rule.typeB] || [];
    if (!rule.fieldB) continue; // one-way reference

    for (const entityA of entitiesA) {
      const refs = entityA[rule.fieldA];
      if (!refs || !Array.isArray(refs)) continue;
      for (const refId of refs) {
        const entityB = entitiesB.find(e => e.id === refId);
        if (!entityB) continue; // already caught by dangling check
        const backRefs = entityB[rule.fieldB];
        if (!backRefs || !backRefs.includes(entityA.id)) {
          console.log(`  🔄 Missing back-ref: ${refId}.${rule.fieldB} should contain "${entityA.id}"`);
          missingBackRefCount++;
        }
      }
    }
  }

  if (danglingCount === 0 && missingBackRefCount === 0) {
    console.log('  ✅ All references valid, all bidirectional links consistent');
  } else {
    console.log(`\n  Summary: ${danglingCount} dangling ref(s), ${missingBackRefCount} missing back-ref(s)`);
  }
  return danglingCount === 0 && missingBackRefCount === 0;
}

function cmdList(entityType) {
  if (!ENTITY_FILES[entityType]) {
    console.log(`Unknown entity type: ${entityType}`);
    console.log(`Valid types: ${Object.keys(ENTITY_FILES).join(', ')}`);
    return;
  }
  const data = loadFile(entityType);
  if (!data || data.length === 0) {
    console.log(`No ${entityType} entities found.`);
    return;
  }
  console.log(`\n${entityType.toUpperCase()} (${data.length}):\n`);
  for (const entity of data) {
    const title = entity.title || entity.label || entity.text || '';
    console.log(`  ${entity.id} — ${title}`);
  }
  console.log('');
}

function cmdGet(id) {
  const all = loadAll();
  if (!all) return;
  const result = findEntity(all, id);
  if (!result) {
    console.log(`Entity "${id}" not found.`);
    return;
  }
  console.log(JSON.stringify(result.entity, null, 2));
}

function cmdAdd(entityType, jsonStr) {
  if (!ENTITY_FILES[entityType]) {
    console.log(`Unknown entity type: ${entityType}`);
    return false;
  }
  let newEntity;
  try {
    newEntity = JSON.parse(jsonStr);
  } catch (e) {
    console.log(`Invalid JSON: ${e.message}`);
    return false;
  }
  if (!newEntity.id) {
    console.log('Entity must have an "id" field.');
    return false;
  }

  const data = loadFile(entityType) || [];
  if (data.find(e => e.id === newEntity.id)) {
    console.log(`Entity "${newEntity.id}" already exists. Use update instead.`);
    return false;
  }

  data.push(newEntity);
  saveFile(entityType, data);
  console.log(`✅ Added ${newEntity.id} to ${ENTITY_FILES[entityType]}`);

  // Handle bidirectional links
  addBackReferences(entityType, newEntity);
  return true;
}

function addBackReferences(entityType, entity) {
  const all = loadAll();
  if (!all) return;

  for (const rule of BIDIRECTIONAL) {
    let refs, targetType, targetField;
    if (rule.typeA === entityType && rule.fieldB) {
      refs = entity[rule.fieldA];
      targetType = rule.typeB;
      targetField = rule.fieldB;
    } else if (rule.typeB === entityType && rule.fieldB) {
      refs = entity[rule.fieldB];
      targetType = rule.typeA;
      targetField = rule.fieldA;
    } else {
      continue;
    }

    if (!refs || !Array.isArray(refs)) continue;

    const targetData = loadFile(targetType);
    if (!targetData) continue;
    let modified = false;

    for (const refId of refs) {
      const target = targetData.find(e => e.id === refId);
      if (!target) continue;
      if (!target[targetField]) target[targetField] = [];
      if (!target[targetField].includes(entity.id)) {
        target[targetField].push(entity.id);
        modified = true;
        console.log(`  🔗 Added back-ref: ${refId}.${targetField} ← ${entity.id}`);
      }
    }
    if (modified) saveFile(targetType, targetData);
  }
}

function cmdUpdate(id, field, value) {
  const type = getEntityType(id);
  if (!type) {
    console.log(`Cannot determine entity type from id: ${id}`);
    return false;
  }
  const data = loadFile(type);
  if (!data) return false;
  const entity = data.find(e => e.id === id);
  if (!entity) {
    console.log(`Entity "${id}" not found.`);
    return false;
  }

  // Parse value — try JSON first, fall back to string
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }

  const oldValue = entity[field];
  entity[field] = parsed;
  saveFile(type, data);
  console.log(`✅ Updated ${id}.${field}`);
  console.log(`   Old: ${JSON.stringify(oldValue)}`);
  console.log(`   New: ${JSON.stringify(parsed)}`);
  return true;
}

function cmdLink(id1, id2, field1, field2) {
  const all = loadAll();
  if (!all) return false;

  const result1 = findEntity(all, id1);
  const result2 = findEntity(all, id2);
  if (!result1) { console.log(`Entity "${id1}" not found.`); return false; }
  if (!result2) { console.log(`Entity "${id2}" not found.`); return false; }

  // Add id2 to id1's field1
  const data1 = loadFile(result1.type);
  const entity1 = data1.find(e => e.id === id1);
  if (!entity1[field1]) entity1[field1] = [];
  if (!entity1[field1].includes(id2)) {
    entity1[field1].push(id2);
    saveFile(result1.type, data1);
    console.log(`✅ ${id1}.${field1} ← ${id2}`);
  } else {
    console.log(`  (${id1}.${field1} already contains ${id2})`);
  }

  // Add id1 to id2's field2 (if specified)
  if (field2) {
    const data2 = loadFile(result2.type);
    const entity2 = data2.find(e => e.id === id2);
    if (!entity2[field2]) entity2[field2] = [];
    if (!entity2[field2].includes(id1)) {
      entity2[field2].push(id1);
      saveFile(result2.type, data2);
      console.log(`✅ ${id2}.${field2} ← ${id1}`);
    } else {
      console.log(`  (${id2}.${field2} already contains ${id1})`);
    }
  }
  return true;
}

function cmdUnlink(id1, id2, field1, field2) {
  const all = loadAll();
  if (!all) return false;

  const result1 = findEntity(all, id1);
  const result2 = findEntity(all, id2);
  if (!result1) { console.log(`Entity "${id1}" not found.`); return false; }
  if (!result2) { console.log(`Entity "${id2}" not found.`); return false; }

  // Remove id2 from id1's field1
  const data1 = loadFile(result1.type);
  const entity1 = data1.find(e => e.id === id1);
  if (entity1[field1] && entity1[field1].includes(id2)) {
    entity1[field1] = entity1[field1].filter(x => x !== id2);
    saveFile(result1.type, data1);
    console.log(`✅ Removed ${id2} from ${id1}.${field1}`);
  }

  // Remove id1 from id2's field2 (if specified)
  if (field2) {
    const data2 = loadFile(result2.type);
    const entity2 = data2.find(e => e.id === id2);
    if (entity2[field2] && entity2[field2].includes(id1)) {
      entity2[field2] = entity2[field2].filter(x => x !== id1);
      saveFile(result2.type, data2);
      console.log(`✅ Removed ${id1} from ${id2}.${field2}`);
    }
  }
  return true;
}

function cmdDelete(id) {
  const type = getEntityType(id);
  if (!type) {
    console.log(`Cannot determine entity type from id: ${id}`);
    return false;
  }
  const data = loadFile(type);
  if (!data) return false;

  const idx = data.findIndex(e => e.id === id);
  if (idx === -1) {
    console.log(`Entity "${id}" not found.`);
    return false;
  }

  // Find all references TO this entity in other files
  const all = loadAll();
  const references = [];
  for (const [otherType, entities] of Object.entries(all)) {
    if (!entities) continue;
    for (const entity of entities) {
      for (const [field, val] of Object.entries(entity)) {
        if (Array.isArray(val) && val.includes(id)) {
          references.push({ entityId: entity.id, type: otherType, field });
        }
      }
    }
  }

  if (references.length > 0) {
    console.log(`\n⚠️  "${id}" is referenced by ${references.length} other fields:`);
    for (const ref of references) {
      console.log(`    ${ref.entityId}.${ref.field}`);
    }
    console.log(`\n  Removing entity and cleaning up all references...`);

    // Clean up references
    for (const ref of references) {
      const refData = loadFile(ref.type);
      const refEntity = refData.find(e => e.id === ref.entityId);
      if (refEntity && refEntity[ref.field]) {
        refEntity[ref.field] = refEntity[ref.field].filter(x => x !== id);
      }
      saveFile(ref.type, refData);
    }
  }

  // Remove the entity
  data.splice(idx, 1);
  saveFile(type, data);
  console.log(`✅ Deleted "${id}" from ${ENTITY_FILES[type]}`);
  if (references.length > 0) {
    console.log(`✅ Cleaned ${references.length} reference(s)`);
  }
  return true;
}

function cmdStats() {
  const all = loadAll();
  if (!all) return;

  console.log('\n📊 Data Statistics:\n');
  let totalEntities = 0;
  let totalRefs = 0;

  for (const [type, entities] of Object.entries(all)) {
    if (!entities || entities.length === 0) continue;
    console.log(`  ${type}: ${entities.length} entities`);
    totalEntities += entities.length;

    let refCount = 0;
    for (const entity of entities) {
      for (const [field, val] of Object.entries(entity)) {
        if (Array.isArray(val)) refCount += val.length;
      }
    }
    totalRefs += refCount;
  }

  console.log(`\n  Total: ${totalEntities} entities, ~${totalRefs} references`);
  console.log('');
}

// --- CLI Entry Point ---

const [,, command, ...args] = process.argv;

switch (command) {
  case 'validate':
    cmdValidate();
    break;
  case 'check-refs':
    cmdCheckRefs();
    break;
  case 'list':
    cmdList(args[0]);
    break;
  case 'get':
    cmdGet(args[0]);
    break;
  case 'add':
    cmdAdd(args[0], args.slice(1).join(' '));
    break;
  case 'update':
    cmdUpdate(args[0], args[1], args.slice(2).join(' '));
    break;
  case 'link':
    cmdLink(args[0], args[1], args[2], args[3]);
    break;
  case 'unlink':
    cmdUnlink(args[0], args[1], args[2], args[3]);
    break;
  case 'delete':
    cmdDelete(args[0]);
    break;
  case 'stats':
    cmdStats();
    break;
  default:
    console.log(`
Find Who Am I — Data CLI

Usage:
  node tools/data-cli.js <command> [args]

Commands:
  validate            Check all JSON files for valid syntax & structure
  check-refs          Find dangling references & missing back-references
  list <type>         List all entities of a type (symptom, cause, insight, pattern, action, crisis)
  get <id>            Show full entity by ID
  add <type> <json>   Add new entity (auto-creates back-references)
  update <id> <field> <value>   Update a field on an entity
  link <id1> <id2> <field1> [field2]   Add bidirectional link between entities
  unlink <id1> <id2> <field1> [field2] Remove link between entities
  delete <id>         Delete entity and clean up all references to it
  stats               Show counts and reference statistics

Entity types: symptom, cause, insight, pattern, action, crisis, module, prompt
    `);
}
