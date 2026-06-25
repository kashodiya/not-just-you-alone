#!/usr/bin/env node

/**
 * fix-backrefs.js — Automatically fix all missing bidirectional references.
 * Reads the BIDIRECTIONAL rules and ensures both sides of every link exist.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

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

const BIDIRECTIONAL = [
  { typeA: 'symptom', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'symptoms' },
  { typeA: 'symptom', fieldA: 'relatedInsights', typeB: 'insight', fieldB: 'relatedSymptoms' },
  { typeA: 'symptom', fieldA: 'relatedCrises', typeB: 'crisis', fieldB: 'relatedSymptoms' },
  { typeA: 'cause', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'relatedCauses' },
  { typeA: 'cause', fieldA: 'actionPointers', typeB: 'action', fieldB: 'addressesCauses' },
  { typeA: 'cause', fieldA: 'relatedInsights', typeB: 'insight', fieldB: 'relatedCauses' },
  { typeA: 'cause', fieldA: 'adjacentCrises', typeB: 'crisis', fieldB: 'relatedCauses' },
  { typeA: 'crisis', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'adjacentCrises' },
  { typeA: 'crisis', fieldA: 'relatedSymptoms', typeB: 'symptom', fieldB: 'relatedCrises' },
  { typeA: 'insight', fieldA: 'relatedCauses', typeB: 'cause', fieldB: 'relatedInsights' },
  { typeA: 'insight', fieldA: 'relatedSymptoms', typeB: 'symptom', fieldB: 'relatedInsights' },
  { typeA: 'action', fieldA: 'addressesCauses', typeB: 'cause', fieldB: 'actionPointers' },
  { typeA: 'action', fieldA: 'addressesSymptoms', typeB: 'symptom', fieldB: null }
];

function loadFile(entityType) {
  const filePath = path.join(DATA_DIR, ENTITY_FILES[entityType]);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveFile(entityType, data) {
  const filePath = path.join(DATA_DIR, ENTITY_FILES[entityType]);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Load all data
const allData = {};
for (const type of Object.keys(ENTITY_FILES)) {
  allData[type] = loadFile(type);
}

let fixCount = 0;
const modified = new Set();

for (const rule of BIDIRECTIONAL) {
  if (!rule.fieldB) continue; // skip one-way

  const entitiesA = allData[rule.typeA] || [];
  const entitiesB = allData[rule.typeB] || [];

  for (const entityA of entitiesA) {
    const refs = entityA[rule.fieldA];
    if (!refs || !Array.isArray(refs)) continue;

    for (const refId of refs) {
      const entityB = entitiesB.find(e => e.id === refId);
      if (!entityB) continue;

      if (!entityB[rule.fieldB]) entityB[rule.fieldB] = [];
      if (!entityB[rule.fieldB].includes(entityA.id)) {
        entityB[rule.fieldB].push(entityA.id);
        fixCount++;
        modified.add(rule.typeB);
      }
    }
  }
}

// Save modified files
for (const type of modified) {
  saveFile(type, allData[type]);
}

console.log(`✅ Fixed ${fixCount} missing back-references across ${modified.size} file(s).`);
if (modified.size > 0) {
  console.log(`   Modified: ${[...modified].map(t => ENTITY_FILES[t]).join(', ')}`);
}
