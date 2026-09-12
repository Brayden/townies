import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const shape = new THREE.Shape();
shape.moveTo(-1, 0);
shape.lineTo(0, 1);
shape.lineTo(1, 0);
shape.closePath();
const input = [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.CylinderGeometry(1, 1, 1, 10),
  new THREE.IcosahedronGeometry(1, 1),
  new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }),
  new THREE.ConeGeometry(1, 1, 3),
];
const normalized = input.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
const merged = mergeGeometries(normalized, false);
assert.ok(merged);
assert.equal(
  merged.attributes.position.count,
  normalized.reduce((n, g) => n + g.attributes.position.count, 0),
);
assert.ok([...merged.attributes.position.array].every(Number.isFinite));
input.forEach((g) => g.dispose());
normalized.forEach((g) => g.dispose());
merged.dispose();
console.log(
  'PASS: all five town geometry types merge without losing models or producing invalid vertices.',
);
