import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("video projects keep the script context and persist reviewed transcripts", async () => {
  const { database } = await import("../src/database/pool.js");
  const { migrateDatabase } = await import("../src/database/migrate.js");
  const { createScript, updateScript } = await import("../src/modules/scripts/script.service.js");
  const {
    createVideoProject,
    getVideoPlayback,
    getVideoProject,
    getVideoWorkspace,
    updateVideoTranscript,
  } = await import("../src/modules/video/video.service.js");
  await migrateDatabase();

  const userId = randomUUID();
  try {
    await database.query(
      "INSERT INTO users (id, email, display_name, password_hash, terms_accepted_at) VALUES ($1, $2, 'Video test', 'unused-test-hash', NOW())",
      [userId, `video-test-${userId}@example.invalid`],
    );
    const emptyScript = await createScript(userId, {
      brief: "Một hướng dẫn ngắn cho người mới",
      format: "Video ngắn",
      mode: "manual",
      platform: "TikTok",
      scheduledFor: null,
      targetDurationSeconds: 60,
      title: "Bắt đầu làm content",
    });
    const script = await updateScript(userId, emptyScript.id, {
      advancedSettings: emptyScript.advancedSettings,
      content: {
        body: "[0:05–0:52] Chọn một câu hỏi thật rồi trả lời bằng trải nghiệm của bạn.",
        cta: "[0:52–1:00] Lưu lại và thử quay video đầu tiên nhé.",
        hook: "[0:00–0:05] Bạn không cần hoàn hảo để bắt đầu làm content.",
        storyboard: [],
      },
      creativeStrategy: emptyScript.creativeStrategy,
      revision: emptyScript.revision,
      settings: emptyScript.settings,
      status: "draft",
      title: emptyScript.title,
    });

    const idempotencyKey = `video-project-${randomUUID()}`;
    const created = await createVideoProject(userId, {
      captionPreset: "emsen-clean",
      idempotencyKey,
      scriptId: script.id,
      title: "Video đầu tiên",
    });
    assert.equal(created.teleprompter.hook, script.content.hook);
    assert.equal(created.teleprompter.scriptRevision, script.revision);
    assert.equal(created.settings.aspectRatio, "9:16");

    const duplicate = await createVideoProject(userId, {
      captionPreset: "none",
      idempotencyKey,
      scriptId: script.id,
      title: "Không được tạo trùng",
    });
    assert.equal(duplicate.id, created.id);
    const workspace = await getVideoWorkspace(userId);
    assert.equal(workspace.projects.length, 1);
    assert.equal(workspace.scriptOptions[0]?.projectCount, 1);

    const assetId = randomUUID();
    await database.query(
      `INSERT INTO media_assets (
         id, project_id, user_id, kind, status, file_name, mime_type, size_bytes,
         object_key, idempotency_key, metadata
       ) VALUES ($1, $2, $3, 'source', 'ready', 'clip.webm', 'video/webm', 1024, $4, $5, '{}'::jsonb)`,
      [assetId, created.id, userId, `users/${userId}/projects/${created.id}/source/${assetId}.webm`, `asset-${assetId}`],
    );
    const playback = await getVideoPlayback(userId, created.id, assetId);
    assert.equal(playback.assetId, assetId);
    assert.match(playback.playbackUrl, /X-Amz-Signature=/);

    const segmentId = randomUUID();
    await database.query(
      `INSERT INTO video_transcripts (
         project_id, user_id, status, language, source, model, duration_seconds, segments
       ) VALUES ($1, $2, 'draft', 'vi', 'ai', 'test-model', 60, $3::jsonb)`,
      [created.id, userId, JSON.stringify([{ id: segmentId, startSeconds: 0, endSeconds: 5, text: "Bản AI nghe ban đầu" }])],
    );
    const reviewed = await updateVideoTranscript(userId, created.id, {
      revision: 1,
      segments: [{ id: segmentId, startSeconds: 0, endSeconds: 5, text: "Bản người dùng đã sửa" }],
      status: "approved",
    });
    assert.equal(reviewed.transcript?.revision, 2);
    assert.equal(reviewed.transcript?.status, "approved");
    assert.equal(reviewed.transcript?.segments[0]?.text, "Bản người dùng đã sửa");
    assert.equal(reviewed.status, "transcript-ready");

    const current = await getVideoProject(userId, created.id);
    assert.equal(current.script?.id, script.id);
    assert.equal(current.teleprompter.body, script.content.body);
  } finally {
    await database.query("DELETE FROM users WHERE id = $1", [userId]);
    await database.end();
  }
});
