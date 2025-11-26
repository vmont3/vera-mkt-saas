"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMasterHash = generateMasterHash;
const js_sha3_1 = require("js-sha3");
function generateMasterHash(quantumSeed, uid, subjectId, assetId) {
    const input = `${quantumSeed}:${uid}:${subjectId}:${assetId || ''}`;
    return (0, js_sha3_1.sha3_512)(input);
}
