'use strict';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasRenderableState(value) {
  return isObject(value) && (isObject(value.inputs) || isObject(value.dynamic));
}

function hasLegacyPublishedFaces(value) {
  return isObject(value?.imageUrls)
    && Boolean(value.imageUrls.capturedFront)
    && Boolean(value.imageUrls.capturedBack);
}

function clonePublishedState(value) {
  const cloned = JSON.parse(JSON.stringify(value));
  delete cloned.publishedState;
  delete cloned.publishedAt;
  return cloned;
}

/**
 * Return only the immutable state that is safe to expose publicly.
 *
 * Cards published after publishedState was introduced always use that
 * snapshot. Older cards may use their top-level state only when both captured
 * faces exist, which is the legacy signal that the card was actually
 * published. Draft-only cards deliberately return null.
 */
function selectPublishedDesignData(data) {
  if (!isObject(data)) return null;

  let source = null;
  if (hasRenderableState(data.publishedState)) {
    source = data.publishedState;
  } else if (hasRenderableState(data) && hasLegacyPublishedFaces(data)) {
    source = data;
  }

  if (!source) return null;

  const published = clonePublishedState(source);
  if (data.publishedAt) published.publishedAt = data.publishedAt;
  return published;
}

module.exports = {
  hasLegacyPublishedFaces,
  hasRenderableState,
  selectPublishedDesignData
};
