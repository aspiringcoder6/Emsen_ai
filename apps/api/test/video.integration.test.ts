import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("video projects keep the script context and persist reviewed transcripts", async () => {
  const { database } = await import("../src/database/pool.js");
  const { migrateDatabase } = await import("../src/database/migrate.js");
  const { createScript, updateScript } = await import("../src/modules/scripts/script.service.js");
  const {
    createVideoProject,
    getVideoDownload,
    getVideoPlayback,
    getVideoProject,
    getVideoWorkspace,
    startVideoRender,
    updateVideoCutDraft,
    updateVideoRenderSettings,
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

    const pauseDecisionId = randomUUID();
    await database.query(
      `INSERT INTO video_cut_drafts (
         project_id, user_id, transcript_revision, status, source, model,
         original_duration_seconds, estimated_duration_seconds, decisions
       ) VALUES ($1, $2, 2, 'draft', 'ai', 'test-model', 60, 56, $3::jsonb)`,
      [created.id, userId, JSON.stringify([
        {
          action: "keep", confidence: 0.9, endSeconds: 5, id: segmentId,
          kind: "speech", reason: "Giữ ý chính", segmentId, startSeconds: 0,
          suggestedAction: "keep", text: "Bản người dùng đã sửa",
        },
        {
          action: "cut", confidence: 0.95, endSeconds: 9, id: pauseDecisionId,
          kind: "pause", reason: "Khoảng lặng dài", segmentId: null, startSeconds: 5,
          suggestedAction: "cut", text: "Khoảng lặng dài",
        },
      ])],
    );
    const savedCut = await updateVideoCutDraft(userId, created.id, {
      decisions: [
        { action: "keep", id: segmentId },
        { action: "keep", id: pauseDecisionId },
      ],
      revision: 1,
      status: "draft",
    });
    assert.equal(savedCut.cutDraft?.revision, 2);
    const previewAssetId = randomUUID();
    await database.query(
      `INSERT INTO media_assets (
         id, project_id, user_id, kind, status, file_name, mime_type, size_bytes,
         object_key, idempotency_key, metadata
       ) VALUES ($1, $2, $3, 'output', 'ready', 'preview.mp4', 'video/mp4', 2048, $4, $5, $6::jsonb)`,
      [
        previewAssetId,
        created.id,
        userId,
        `users/${userId}/projects/${created.id}/preview/${previewAssetId}.mp4`,
        `preview-${previewAssetId}`,
        JSON.stringify({ cutRevision: 2, durationSeconds: 60, purpose: "cut-preview" }),
      ],
    );
    const previewPlayback = await getVideoPlayback(userId, created.id, previewAssetId);
    assert.equal(previewPlayback.assetId, previewAssetId);
    const approvedCut = await updateVideoCutDraft(userId, created.id, {
      decisions: [
        { action: "keep", id: segmentId },
        { action: "keep", id: pauseDecisionId },
      ],
      revision: 2,
      status: "approved",
    });
    assert.equal(approvedCut.cutDraft?.status, "approved");
    assert.equal(approvedCut.cutDraft?.estimatedDurationSeconds, 60);
    assert.equal(approvedCut.cutPreview?.assetId, previewAssetId);
    assert.equal(approvedCut.cutPreview?.stale, false);
    assert.equal(approvedCut.status, "ready-to-render");

    const renderSettings = await updateVideoRenderSettings(userId, created.id, {
      captionAccentColor: "#8FCB7D",
      captionPosition: "lower-third",
      captionPreset: "emsen-clean",
      captionTextColor: "#FFFFFF",
      revision: approvedCut.revision,
      showBrandMark: true,
    });
    assert.equal(renderSettings.settings.renderSettingsRevision, 2);
    const rendering = await startVideoRender(userId, created.id, {
      confirmed: true,
      cutRevision: renderSettings.cutDraft!.revision,
      idempotencyKey: `render-${randomUUID()}`,
      renderSettingsRevision: renderSettings.settings.renderSettingsRevision,
    });
    assert.equal(rendering.status, "rendering");
    assert.equal(rendering.jobs[0]?.type, "render");
    assert.equal(rendering.jobs[0]?.status, "queued");
    const finalAssetId = randomUUID();
    await database.query(
      `INSERT INTO media_assets (
         id, project_id, user_id, kind, status, file_name, mime_type, size_bytes,
         object_key, idempotency_key, metadata
       ) VALUES ($1, $2, $3, 'output', 'ready', 'emsen-video.mp4', 'video/mp4', 4096, $4, $5, $6::jsonb)`,
      [
        finalAssetId,
        created.id,
        userId,
        `users/${userId}/projects/${created.id}/final/${finalAssetId}.mp4`,
        `final-${finalAssetId}`,
        JSON.stringify({
          cutRevision: 2,
          durationSeconds: 60,
          purpose: "final-render",
          renderSettingsRevision: 2,
          transcriptRevision: 2,
        }),
      ],
    );
    await database.query(
      `UPDATE media_jobs
       SET status = 'succeeded', progress = 100, finished_at = NOW(), updated_at = NOW()
       WHERE project_id = $1 AND user_id = $2 AND type = 'render'`,
      [created.id, userId],
    );
    await database.query(
      "UPDATE media_projects SET status = 'completed' WHERE id = $1 AND user_id = $2",
      [created.id, userId],
    );
    const completed = await getVideoProject(userId, created.id);
    assert.equal(completed.finalOutput?.assetId, finalAssetId);
    assert.equal(completed.finalOutput?.stale, false);
    const download = await getVideoDownload(userId, created.id, finalAssetId);
    assert.equal(download.assetId, finalAssetId);
    assert.match(download.downloadUrl, /response-content-disposition=/);

    const changedTranscript = await updateVideoTranscript(userId, created.id, {
      revision: reviewed.transcript!.revision,
      segments: reviewed.transcript!.segments,
      status: "approved",
    });
    assert.equal(changedTranscript.cutDraft?.stale, true);
    assert.equal(changedTranscript.finalOutput?.stale, true);
    assert.equal(changedTranscript.status, "transcript-ready");

    const current = await getVideoProject(userId, created.id);
    assert.equal(current.script?.id, script.id);
    assert.equal(current.teleprompter.body, script.content.body);
  } finally {
    await database.query("DELETE FROM users WHERE id = $1", [userId]);
    await database.end();
  }
});
