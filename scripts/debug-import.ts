import { Ntag424Encoder } from '../src/modules/tag-encoding/encoder/Ntag424Encoder';
import { NfcHardwareDriver } from '../src/modules/tag-encoding/driver/NfcHardwareDriver';
import { TagEncodingJob } from '../src/modules/tag-encoding/domain/TagEncodingTypes';

import { Ntag424Crypto } from '../src/modules/tag-encoding/crypto/Ntag424Crypto';

console.log("Ntag424Crypto imported");
const rnd = Ntag424Crypto.generateRandom(16);
console.log("Random generated", rnd);
