"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNTAGPayload = buildNTAGPayload;
function buildNTAGPayload(data) {
    return {
        uid: data.uid,
        hTrunc: data.hTrunc,
        integrityCode: data.integrityCode,
        counter: data.counter,
        verifyUrl: `https://qc.app/v/${data.tagId}`,
    };
}
