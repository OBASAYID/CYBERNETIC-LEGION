/**
 * SFU adapter stub — today all media is peer-to-peer.
 * When scaling: instantiate mediasoup Router or Janus session here and route offers/answers through SFU.
 *
 * @param {object} _config — from shared/config.js
 */
function createSfuAdapter(_config) {
  return {
    mode: "p2p",
    /** @returns {Promise<void>} */
    async dispose() {},
  };
}

module.exports = { createSfuAdapter };
