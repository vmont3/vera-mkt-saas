"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTruncatedHash = generateTruncatedHash;
function generateTruncatedHash(masterHash, targetBits = 128) {
    const hexChars = targetBits / 4;
    return masterHash.substring(0, hexChars);
}
