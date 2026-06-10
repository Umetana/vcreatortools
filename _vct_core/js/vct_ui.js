// ================================
// VCT Core Monitor UI
// ================================

(function (global) {
  const els = {};
  const state = {
    runtime: null,
    logger: null,
    dangerAction: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    Object.assign(els, {
      enabled: $('core-enabled'),
      core: $('status-core'),
      oneSdk: $('status-onesdk'),
      lastComment: $('status-last-comment'),
      streamId: $('status-stream-id'),
      db: $('status-db'),
      dbVersion: $('status-db-version'),
      migration: $('status-migration'),
      usersTotal: $('status-users-total'),
      supportsTotal: $('status-supports-total'),
      usersCount: $('status-users-count'),
      supportsCount: $('status-supports-count'),
      lastUser: $('status-last-user'),
      lastSupport: $('status-last-support'),
      mode: $('status-mode'),
      saveUsers: $('status-save-users'),
      saveSupports: $('status-save-supports'),
      debug: $('status-debug'),
      log: $('status-log'),
      controlRefresh: $('control-refresh'),
      clearStreamSupports: $('control-clear-stream-supports'),
      clearAllSupports: $('control-clear-all-supports'),
      clearAllUsers: $('control-clear-all-users'),
      dangerOverlay: $('danger-overlay'),
      dangerTitle: $('danger-title'),
      dangerSubtitle: $('danger-subtitle'),
      dangerMessage: $('danger-message'),
      dangerUnlock: $('danger-unlock'),
      dangerConfirmButton: $('danger-confirm-button'),
      dangerClose: $('danger-close'),
      dangerCancel: $('danger-cancel')
    });
  }

  function setText(el, text, status = '') {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('ok', 'warn', 'bad');
    if (status) {
      el.classList.add(status);
    }
  }

  function formatTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  }

  function render(status) {
    if (!status) return;

    const config = status.config || {};
    const dbInfo = status.dbInfo || {};
    const dbStats = status.dbStats || {};

    setText(els.enabled, config.enabled ? 'enabled' : 'disabled', config.enabled ? 'ok' : 'warn');
    setText(els.streamId, status.streamId || '-');

    setText(els.core, status.coreStatus || 'waiting', getRuntimeTone(status.coreStatus));
    setText(els.oneSdk, status.oneSdkStatus || 'waiting', getOneSdkTone(status.oneSdkStatus));

    if (status.dbError) {
      setText(els.db, status.dbError, 'bad');
    } else if (status.dbReady) {
      setText(els.db, dbInfo.name || 'vct_common_data', 'ok');
    } else if (global.VCT_IDB) {
      setText(els.db, dbInfo.name || 'vct_common_data', 'warn');
    } else {
      setText(els.db, 'VCT_IDB not found', 'bad');
    }

    setText(els.dbVersion, String(dbInfo.version || 'unknown'));
    setText(els.mode, config.oneSdkMode || 'diff');
    setText(els.saveUsers, config.saveUsers ? 'on' : 'off', config.saveUsers ? 'ok' : 'warn');
    setText(els.saveSupports, config.saveSupports ? 'on' : 'off', config.saveSupports ? 'ok' : 'warn');
    setText(els.debug, config.debug ? 'on' : 'off');
    setText(els.usersTotal, dbStats.usersTotal == null ? '-' : String(dbStats.usersTotal));
    setText(els.supportsTotal, dbStats.supportsTotal == null ? '-' : String(dbStats.supportsTotal));
    setText(els.usersCount, String(status.usersSaved || 0));
    setText(els.supportsCount, String(status.supportsSaved || 0));
    setText(els.lastComment, formatTime(status.lastCommentAt));
    setText(els.lastUser, formatTime(status.lastUserSavedAt));
    setText(els.lastSupport, formatTime(status.lastSupportSavedAt));

    if (status.migration) {
      setText(els.migration, status.migration.text, status.migration.status);
    }
  }

  function getRuntimeTone(value) {
    if (value === 'running') return 'ok';
    if (value === 'boot error') return 'bad';
    if (value === 'disabled' || value === 'starting') return 'warn';
    return '';
  }

  function getOneSdkTone(value) {
    if (value === 'connected') return 'ok';
    if (value === 'not found' || value === 'ready error') return 'bad';
    if (value === 'readying') return 'warn';
    return '';
  }

  function renderLog(lines = []) {
    if (!els.log) return;
    els.log.textContent = lines.join('\n');
    els.log.scrollTop = els.log.scrollHeight;
  }

  function openDangerPanel(options = {}) {
    const {
      title = '危険な操作',
      subtitle = 'この操作は元に戻せません。',
      message = '削除対象を確認してください。',
      confirmLabel = '削除を実行',
      onConfirm = null
    } = options;

    state.dangerAction = typeof onConfirm === 'function' ? onConfirm : null;
    setText(els.dangerTitle, title);
    setText(els.dangerSubtitle, subtitle);
    setText(els.dangerMessage, message);

    if (els.dangerUnlock) {
      els.dangerUnlock.checked = false;
    }

    if (els.dangerConfirmButton) {
      els.dangerConfirmButton.textContent = confirmLabel;
      els.dangerConfirmButton.disabled = true;
    }

    if (els.dangerOverlay) {
      els.dangerOverlay.classList.add('is-open');
      els.dangerOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDangerPanel() {
    state.dangerAction = null;

    if (els.dangerUnlock) {
      els.dangerUnlock.checked = false;
    }

    if (els.dangerConfirmButton) {
      els.dangerConfirmButton.disabled = true;
    }

    if (els.dangerOverlay) {
      els.dangerOverlay.classList.remove('is-open');
      els.dangerOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  function bindControlEvents() {
    els.controlRefresh?.addEventListener('click', () => {
      state.runtime?.refreshDbStats().catch((err) => {
        state.logger?.error(`DB stats refresh failed: ${err?.message || err}`);
      });
    });

    els.clearStreamSupports?.addEventListener('click', () => {
      const streamId = state.runtime?.getStreamId() || '';
      openDangerPanel({
        title: 'このStreamの supports を削除',
        subtitle: '現在の streamId に紐づく supports を削除します。',
        message: `streamId=${streamId} の supports を削除します。users は削除されません。この操作は元に戻せません。`,
        confirmLabel: 'このStreamを削除',
        onConfirm: async () => {
          await state.runtime?.clearSupportsByCurrentStream();
        }
      });
    });

    els.clearAllSupports?.addEventListener('click', () => {
      openDangerPanel({
        title: 'supports を全削除',
        subtitle: '保存済みの支援履歴をすべて削除します。',
        message: 'supports を全削除します。users は削除されません。この操作は元に戻せません。',
        confirmLabel: 'supports を全削除',
        onConfirm: async () => {
          await state.runtime?.clearAllSupports();
        }
      });
    });

    els.clearAllUsers?.addEventListener('click', () => {
      openDangerPanel({
        title: 'users を全削除',
        subtitle: '保存済みのユーザー現在値をすべて削除します。',
        message: 'users を全削除します。supports は削除されません。この操作は元に戻せません。',
        confirmLabel: 'users を全削除',
        onConfirm: async () => {
          await state.runtime?.clearAllUsers();
        }
      });
    });

    els.dangerClose?.addEventListener('click', closeDangerPanel);
    els.dangerCancel?.addEventListener('click', closeDangerPanel);

    els.dangerOverlay?.addEventListener('click', (event) => {
      if (event.target === els.dangerOverlay) {
        closeDangerPanel();
      }
    });

    els.dangerUnlock?.addEventListener('change', () => {
      if (els.dangerConfirmButton) {
        els.dangerConfirmButton.disabled = !els.dangerUnlock.checked;
      }
    });

    els.dangerConfirmButton?.addEventListener('click', async () => {
      if (!state.dangerAction || !els.dangerUnlock?.checked) {
        return;
      }

      const action = state.dangerAction;
      closeDangerPanel();
      try {
        await action();
      } catch (err) {
        state.logger?.error(`danger action failed: ${err?.message || err}`);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.dangerOverlay?.classList.contains('is-open')) {
        closeDangerPanel();
      }
    });
  }

  function init(options = {}) {
    state.runtime = options.runtime || global.VCT_RUNTIME || null;
    state.logger = options.logger || global.VCT_LOGGER || null;

    initElements();
    bindControlEvents();

    state.runtime?.on('status', render);
    state.logger?.subscribe(renderLog);

    return api;
  }

  const api = {
    init,
    render,
    renderLog,
    openDangerPanel,
    closeDangerPanel
  };

  global.VCT_UI = api;
})(window);
