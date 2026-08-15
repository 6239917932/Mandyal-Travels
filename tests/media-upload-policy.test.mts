import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_MEDIA_BYTES, validateMediaUpload } from '../lib/media/uploadPolicy.ts';

test('media uploads accept bounded modern image formats', () => {
  assert.equal(
    validateMediaUpload({ fileName: 'room.webp', contentType: 'image/webp', byteLength: 1024 })
      .extension,
    'webp',
  );
});

test('media uploads reject executable, mismatched, and oversized content', () => {
  assert.throws(() =>
    validateMediaUpload({ fileName: 'room.exe', contentType: 'image/jpeg', byteLength: 10 }),
  );
  assert.throws(() =>
    validateMediaUpload({
      fileName: 'room.jpg',
      contentType: 'application/javascript',
      byteLength: 10,
    }),
  );
  assert.throws(() =>
    validateMediaUpload({
      fileName: 'room.jpg',
      contentType: 'image/jpeg',
      byteLength: MAX_MEDIA_BYTES + 1,
    }),
  );
});
