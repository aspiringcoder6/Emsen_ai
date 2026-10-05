import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { database } from "../src/database/pool.js";
import { assertStoryboardAssetOwnership, getStoryboardAsset, uploadStoryboardAsset } from "../src/modules/scripts/storyboardAssets.service.js";
import { parseStoryboardUpload } from "../src/modules/scripts/storyboard.schema.js";

test("upload service keeps bytes out of script JSON, scopes reads and rolls back failed storage writes", async () => {
  const userId = randomUUID(), otherUser = randomUUID(), scriptId = randomUUID(), otherScript = randomUUID();
  const rows = new Map<string, { id: string; script_id: string; user_id: string; object_key: string; file_name: string; status: string }>();
  let failUpload = false;
  let storedBytes = 0;
  const query = async (sql: string, values: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.startsWith("SELECT id FROM script_documents")) return { rows: [], rowCount: values[0] === scriptId && values[1] === userId ? 1 : 0 };
    if (sql.startsWith("SELECT COUNT")) return { rows: [{ count: String(rows.size) }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO storyboard_assets")) {
      assert.equal(values.length, 7);
      assert.equal(typeof values[5], "number");
      assert.equal(String(values[6]).startsWith(`storyboards/${userId}/${scriptId}/`), true);
      rows.set(String(values[0]), { id: String(values[0]), script_id: String(values[1]), user_id: String(values[2]), object_key: String(values[6]), file_name: String(values[3]), status: "pending" });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE storyboard_assets")) { rows.get(String(values[0]))!.status = "ready"; return { rows: [], rowCount: 1 }; }
    if (sql.startsWith("DELETE FROM storyboard_assets")) { rows.delete(String(values[0])); return { rows: [], rowCount: 1 }; }
    if (sql.startsWith("SELECT id, object_key")) {
      assert.match(sql, /script_id = \$2 AND user_id = \$3 AND status = 'ready'/);
      const row = rows.get(String(values[0]));
      const found = row && row.script_id === values[1] && row.user_id === values[2] && row.status === "ready";
      return { rows: found ? [row] : [], rowCount: found ? 1 : 0 };
    }
    if (sql.startsWith("SELECT id FROM storyboard_assets")) {
      assert.match(sql, /user_id = \$2 AND script_id = \$3 AND status = 'ready'/);
      const ids = values[0] as string[];
      const matching = [...rows.values()].filter((row) => ids.includes(row.id) && row.user_id === values[1] && row.script_id === values[2] && row.status === "ready");
      return { rows: matching, rowCount: matching.length };
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  mock.method(database, "query", query);
  mock.method(database, "connect", async () => ({ query, release() {} }));
  mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    if (init.method === "PUT" && init.body) {
      if (failUpload) return new Response(null, { status: 503 });
      storedBytes = (init.body as Uint8Array).byteLength;
    }
    return new Response(null, { status: 200 });
  });
  try {
    const input = parseStoryboardUpload({ fileName: "scene.png", mimeType: "image/png", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZc0AAAAASUVORK5CYII=" });
    const asset = await uploadStoryboardAsset(userId, scriptId, input);
    assert.equal(storedBytes, input.bytes.length);
    assert.match(asset.imageUrl, /X-Amz-Signature=/);
    await assert.rejects(() => getStoryboardAsset(otherUser, scriptId, asset.id), /Không tìm thấy/);
    await assert.rejects(() => getStoryboardAsset(userId, otherScript, asset.id), /Không tìm thấy/);
    const frame = { id: "scene", title: "Scene", visual: "", visualPurpose: "", broll: "", dialogue: "", emotionalBeat: "", transition: "", retentionRole: "", direction: "", durationSeconds: 5, illustrationAssetId: asset.id };
    await assertStoryboardAssetOwnership(userId, scriptId, [frame]);
    await assert.rejects(() => assertStoryboardAssetOwnership(userId, otherScript, [frame]), /thuộc đúng/);
    failUpload = true;
    await assert.rejects(() => uploadStoryboardAsset(userId, scriptId, input), /Chưa thể lưu ảnh/);
    assert.equal(rows.size, 1);
    await assert.rejects(() => uploadStoryboardAsset(otherUser, scriptId, input), /Không tìm thấy kịch bản/);
  } finally { mock.restoreAll(); await database.end(); }
});
