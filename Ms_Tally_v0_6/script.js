const app = Vue.createApp({
  setup() {
    document.body.removeAttribute('hidden')
  },
  data() {
    return {
      comments: [], // 表示しない（投票専用）
      poll: {
        // ===== mode =====
        mode: 'number',           // 'number' | 'text'

        // ===== common =====
        title: '',
        isRunning: false,
        uniquePerUser: true,      // 本番は推奨（テストではOFFでもOK）
        displayMode: 'realtime',  // 'realtime' | 'onStop'
        viewType: 'ranking',      // 'ranking' | 'barList' | 'stackedBar'
        topN: 3,                  // 上位を通常表示（3 or 5）
        showLimit: 20,            // 何位まで表示するか（1..99）
        chartTopLimit: 3,         // グラフ表示: 上位N + その他（1..10）
        stackedIncludeOthers: false, // 割合バーに「その他」を含めるか
        bg: { r: 255, g: 255, b: 255, a: 0.55 }, // パネル背景（RGB + 透明度）
        fg: { r: 0, g: 0, b: 0 }, // 文字色（RGB）
        autoSave: false,          // 設定を保存するかどうか

        // ===== number mode =====
        maxChoice: 99,                      // 1..99
        counts: Array(101).fill(0),         // index 1..100
        frozenCounts: Array(101).fill(0),   // Stopで表示用

        // ===== text mode =====
        textMaxLen: 20,                     // 投票語の最大文字数
        textCounts: {},                     // { "ラーメン": 3, ... }
        frozenTextCounts: {},               // Stopで表示用
      }
    }
  },
  watch: {
    poll: {
      handler(newVal) {
        // モード切替中に受付が動いていると事故るので安全側に倒す
        // （UIの“切替”は停止状態で行う運用を推奨）
        if (newVal.isRunning && (newVal.mode !== this._lastMode)) {
          this.$nextTick(() => this.resetPoll())
        }
        this._lastMode = newVal.mode

        if (newVal.autoSave) {
          // 保存対象の項目をピックアップ
          const settings = {
            title: newVal.title,
            mode: newVal.mode,
            maxChoice: newVal.maxChoice,
            textMaxLen: newVal.textMaxLen,
            uniquePerUser: newVal.uniquePerUser,
            displayMode: newVal.displayMode,
            viewType: newVal.viewType,
            topN: newVal.topN,
            showLimit: newVal.showLimit,
            chartTopLimit: newVal.chartTopLimit,
            stackedIncludeOthers: newVal.stackedIncludeOthers,
            bg: newVal.bg,
            fg: newVal.fg,
            autoSave: true
          }
          localStorage.setItem('ms_tally_settings', JSON.stringify(settings))
        } else {
          // OFF時は次回起動に設定を残さない運用にする
          localStorage.removeItem('ms_tally_settings')
        }
      },
      deep: true
    }
  },
  computed: {
    pollTotal() {
      if (this.poll.mode === 'text') {
        const source =
          (this.poll.displayMode === 'onStop')
            ? (this.poll.isRunning ? {} : (this.poll.frozenTextCounts || {}))
            : (this.poll.textCounts || {})
        let total = 0
        for (const k in source) total += Number(source[k] || 0)
        return total
      } else {
        const source =
          (this.poll.displayMode === 'onStop')
            ? (this.poll.isRunning ? Array(101).fill(0) : this.poll.frozenCounts)
            : this.poll.counts
        const max = Math.min(100, Math.max(1, this.poll.maxChoice || 99))
        let total = 0
        for (let i = 1; i <= max; i++) total += (source[i] || 0)
        return total
      }
    },
    pollAllRows() {
      if (this.poll.mode === 'text') {
        const source =
          (this.poll.displayMode === 'onStop')
            ? (this.poll.isRunning ? {} : (this.poll.frozenTextCounts || {}))
            : (this.poll.textCounts || {})

        const rows = []
        for (const key in source) {
          const c = Number(source[key] || 0)
          if (c > 0) rows.push({ choice: key, count: c })
        }
        rows.sort((a, b) => (b.count - a.count) || String(a.choice).localeCompare(String(b.choice), 'ja'))
        return rows
      } else {
        const max = Math.min(100, Math.max(1, this.poll.maxChoice || 99))
        const source =
          (this.poll.displayMode === 'onStop')
            ? (this.poll.isRunning ? Array(101).fill(0) : this.poll.frozenCounts)
            : this.poll.counts

        const rows = []
        for (let i = 1; i <= max; i++) {
          const c = source[i] || 0
          if (c > 0) rows.push({ choice: i, count: c })
        }
        rows.sort((a, b) => (b.count - a.count) || (a.choice - b.choice))
        return rows
      }
    },
    pollDisplayRows() {
      const limit = Math.min(100, Math.max(1, this.poll.showLimit || 20))
      const rows = this.pollAllRows
      const visibleRows = rows.slice(0, limit).map(row => ({ ...row }))
      const remainingRows = rows.slice(limit)
      const otherCount = remainingRows.reduce((sum, row) => sum + Number(row.count || 0), 0)

      if (otherCount > 0) {
        visibleRows.push({
          choice: 'その他...',
          count: otherCount,
          isOther: true
        })
      }

      return visibleRows
    },
    pollChartRows() {
      const limit = Math.min(10, Math.max(1, Number(this.poll.chartTopLimit || 3)))
      const rows = this.pollAllRows
      const visibleRows = rows.slice(0, limit)
      const remainingRows = rows.slice(limit)
      const otherCount = remainingRows.reduce((sum, row) => sum + Number(row.count || 0), 0)
      const chartRows = visibleRows.map(row => ({ ...row }))

      if (otherCount > 0) {
        chartRows.push({
          choice: 'その他',
          count: otherCount,
          isOther: true
        })
      }

      const total = chartRows.reduce((sum, row) => sum + Number(row.count || 0), 0)
      const globalTotal = this.pollTotal
      return chartRows.map((row, idx) => {
        const percent = total > 0 ? (Number(row.count || 0) / total) * 100 : 0
        const globalPercent = globalTotal > 0 ? (Number(row.count || 0) / globalTotal) * 100 : 0
        return {
          ...row,
          percent,
          percentText: `${Math.round(percent)}%`,
          globalPercent,
          globalPercentText: `${Math.round(globalPercent)}%`,
          color: this.getChoiceColor(row.choice, row.isOther)
        }
      })
    },
    pollStackedRows() {
      if (this.poll.stackedIncludeOthers) {
        return this.pollChartRows.map(row => ({
          ...row,
          segmentPercent: row.percent,
          segmentPercentText: row.percentText
        }))
      }

      const limit = Math.min(10, Math.max(1, Number(this.poll.chartTopLimit || 3)))
      const rows = this.pollAllRows.slice(0, limit)
      const visibleTotal = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
      const total = this.pollTotal

      return rows.map((row, idx) => {
        const segmentPercent = visibleTotal > 0 ? (Number(row.count || 0) / visibleTotal) * 100 : 0
        const globalPercent = total > 0 ? (Number(row.count || 0) / total) * 100 : 0
        return {
          ...row,
          segmentPercent,
          segmentPercentText: `${Math.round(segmentPercent)}%`,
          globalPercent,
          globalPercentText: `${Math.round(globalPercent)}%`,
          color: this.getChoiceColor(row.choice, row.isOther)
        }
      })
    },
    pollStackedLegendRows() {
      if (this.poll.stackedIncludeOthers) return this.pollStackedRows

      const limit = Math.min(10, Math.max(1, Number(this.poll.chartTopLimit || 3)))
      const total = this.pollTotal
      const otherCount = this.pollAllRows
        .slice(limit)
        .reduce((sum, row) => sum + Number(row.count || 0), 0)

      const rows = this.pollStackedRows.map(row => ({ ...row }))
      if (otherCount > 0) {
        const globalPercent = total > 0 ? (otherCount / total) * 100 : 0
        rows.push({
          choice: 'その他',
          count: otherCount,
          isOther: true,
          segmentPercent: 0,
          segmentPercentText: '0%',
          globalPercent,
          globalPercentText: `${Math.round(globalPercent)}%`,
          color: this.getChoiceColor('その他', true)
        })
      }
      return rows
    },
    pollPanelStyle() {
      const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v)))
      const r = clamp(this.poll.bg?.r ?? 0, 0, 255)
      const g = clamp(this.poll.bg?.g ?? 0, 0, 255)
      const b = clamp(this.poll.bg?.b ?? 0, 0, 255)
      const a = clamp(this.poll.bg?.a ?? 0.55, 0, 1)
      const fr = clamp(this.poll.fg?.r ?? 0, 0, 255)
      const fg = clamp(this.poll.fg?.g ?? 0, 0, 255)
      const fb = clamp(this.poll.fg?.b ?? 0, 0, 255)
      return { background: `rgba(${r}, ${g}, ${b}, ${a})`, color: `rgb(${fr}, ${fg}, ${fb})` }
    },
    pollTitle() {
      const title = String(this.poll.title || '').trim()
      return title || '投票'
    },
    pollHint() {
      if (this.poll.mode === 'text') {
        return 'コメントは <strong>形式付き</strong> のみ。例: <code>「ラーメン」</code> / <code>[ラーメン]</code> / <code>【ラーメン】</code> / <code>#ラーメン</code>'
      }
      return 'コメントは <strong>数字のみ</strong>（半角/全角OK）。例: <code>1</code>, <code>１２</code>'
    },
    pollHasRows() {
      return this.pollDisplayRows.length > 0
    }
  },
  methods: {
    // ==== Poll controls ====
    startPoll() {
      this.poll.isRunning = true
      if (this.poll.mode === 'text') {
        this.poll.frozenTextCounts = {} // Stop表示モード時は空から
      } else {
        this.poll.frozenCounts = Array(101).fill(0) // Stop表示モード時は空から
      }
    },
    stopPoll() {
      this.poll.isRunning = false
      if (this.poll.mode === 'text') {
        this.poll.frozenTextCounts = { ...(this.poll.textCounts || {}) }
      } else {
        this.poll.frozenCounts = this.poll.counts.slice()
      }
    },
    resetPoll() {
      this.poll.isRunning = false

      // number
      this.poll.counts = Array(101).fill(0)
      this.poll.frozenCounts = Array(101).fill(0)

      // text
      this.poll.textCounts = {}
      this.poll.frozenTextCounts = {}

      this._votedBy = new Map()
    },

    // ==== Vote parsing (common) ====
    normalizeDigits(s) {
      // 全角数字(０-９)を半角(0-9)に
      return String(s).replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    },
    stripHtml(html) {
      // comment.data.comment が HTML のことがあるのでテキスト化
      const div = document.createElement('div')
      div.innerHTML = String(html ?? '')
      return (div.textContent || '').trim()
    },
    hashString(str) {
      let hash = 0
      const s = String(str ?? '')
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i)
        hash |= 0
      }
      return hash
    },
    getChoiceColor(choice, isOther = false) {
      if (isOther) return 'rgba(120, 120, 120, 0.75)'

      if (this.poll.mode === 'number') {
        const n = Number(choice)
        const palette = [
          '#ff3b30', '#007aff', '#ffcc00', '#34c759',
          '#af52de', '#00c7be', '#ff9500', '#5856d6',
          '#ff2d55', '#5ac8fa', '#a2845e', '#8e8e93'
        ]
        if (Number.isInteger(n) && n >= 1 && n <= palette.length) {
          return palette[n - 1]
        }
      }

      const hash = Math.abs(this.hashString(String(choice)))
      const hue = hash % 360
      return `hsl(${hue}, 75%, 55%)`
    },
    // ==== Vote parsing (number) ====
    parseNumberVote(rawText) {
      if (rawText == null) return null
      const t = this.normalizeDigits(String(rawText).trim())
      if (!/^\d+$/.test(t)) return null // 数字のみ
      const n = Number(t)
      if (!Number.isInteger(n)) return null
      const max = Math.min(100, Math.max(1, this.poll.maxChoice || 99))
      if (n < 1 || n > max) return null
      return n
    },

    // ==== Vote parsing (text) ====
    parseTextVote(rawText) {
      if (rawText == null) return null
      // HTML除去 → trim（全角スペースも軽く統一）
      let t = this.stripHtml(rawText)
      t = t.replace(/\u3000/g, ' ').trim()

      // 固定仕様：すべて“完全一致”のみカウント（混入を防ぐ）
      // 優先順位：囲み系 → #
      let m = t.match(/^「(.+?)」$/)
      if (m) return this._cleanTextVote(m[1])

      m = t.match(/^\[(.+?)\]$/)
      if (m) return this._cleanTextVote(m[1])

      m = t.match(/^【(.+?)】$/)
      if (m) return this._cleanTextVote(m[1])

      m = t.match(/^[#＃](.+)$/)
      if (m) return this._cleanTextVote(m[1])

      return null
    },
    _cleanTextVote(s) {
      let v = String(s ?? '')
      v = v.replace(/\u3000/g, ' ').trim()
      if (!v) return null

      const maxLen = Math.min(50, Math.max(1, Number(this.poll.textMaxLen || 20)))
      if (v.length > maxLen) return null

      return v
    },

    // ==== user key ====
    getUserKey(comment) {
      // 取れる範囲でユニークに（環境差があるので複数候補）
      const service = comment?.service || ''
      const userId = comment?.data?.userId || comment?.data?.name || ''
      const display = comment?.data?.displayName || comment?.data?.name || ''
      const screenName = comment?.data?.screenName || ''
      const commentId = comment?.data?.id || ''
      return [service, userId || display || screenName || commentId || 'unknown'].join(':')
    },

    // ==== vote handler ====
    onNewCommentForPoll(comment) {
      if (!this.poll.isRunning) return

      const raw = comment?.data?.comment

      // モード別パース
      const vote =
        (this.poll.mode === 'text')
          ? this.parseTextVote(raw)
          : this.parseNumberVote(this.stripHtml(raw))

      if (vote == null) return

      if (!this._votedBy) this._votedBy = new Map()

      if (this.poll.uniquePerUser) {
        const key = this.getUserKey(comment)
        if (this._votedBy.has(key)) return
        this._votedBy.set(key, vote)
      }

      if (this.poll.mode === 'text') {
        const next = { ...(this.poll.textCounts || {}) }
        const k = String(vote)
        next[k] = Number(next[k] || 0) + 1
        this.poll.textCounts = next
      } else {
        const next = this.poll.counts.slice()
        next[vote] = (next[vote] || 0) + 1
        this.poll.counts = next
      }
    }
  },
  mounted() {
    // 保存された設定の読み込み
    const saved = localStorage.getItem('ms_tally_settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        Object.assign(this.poll, settings)
      } catch (e) {
        console.error("Failed to load saved settings", e)
      }
    }
    this._lastMode = this.poll.mode

    let cache = new Map()
    let commentIndex = 0
    this._votedBy = new Map()

    OneSDK.setup({
      permissions: OneSDK.usePermission([OneSDK.PERM.COMMENT])
    })

    OneSDK.subscribe({
      action: 'comments',
      callback: (comments) => {
        const newCache = new Map()

        // 新着コメントのみ投票として解析
        comments.forEach(comment => {
          const data = comment?.data || {}
          const commentId = data.id ?? [
            comment?.service || 'unknown',
            data.userId || data.name || data.displayName || 'unknown',
            data.comment || '',
            data.timestamp || data.createdAt || data.date || ''
          ].join(':')
          if (!cache.has(commentId)) {
            comment.commentIndex = commentIndex
            newCache.set(commentId, commentIndex)
            ++commentIndex
            this.onNewCommentForPoll(comment)
          } else {
            const index = cache.get(commentId)
            comment.commentIndex = index
            newCache.set(commentId, index)
          }
        })

        cache = newCache
        // コメント表示はしない（投票専用）
        this.comments = []
      }
    })

    OneSDK.connect()
  },
})

OneSDK.ready().then(() => {
  app.mount("#container");
})
