import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./store.js',import.meta.url),'utf8');

assert.match(source,/const STORAGE_KEY = 'fluxa\.mvp\.v1';/,'primary local data key must remain stable across URL-path moves');
assert.match(source,/const BACKUP_KEY = 'fluxa\.mvp\.v1\.backup';/,'backup key must remain stable across URL-path moves');
assert.match(source,/const RECOVERY_KEY = 'fluxa\.mvp\.v1\.recovery';/,'recovery key must remain stable across URL-path moves');
assert.doesNotMatch(source,/STORAGE_KEY[^\n]*(?:location|pathname|\/fluxa\/)/,'primary storage identity must not depend on deployment pathname');
assert.doesNotMatch(source,/BACKUP_KEY[^\n]*(?:location|pathname|\/fluxa\/)/,'backup storage identity must not depend on deployment pathname');
assert.doesNotMatch(source,/RECOVERY_KEY[^\n]*(?:location|pathname|\/fluxa\/)/,'recovery storage identity must not depend on deployment pathname');

console.log('root-promotion-storage-key.test.mjs: ok');
