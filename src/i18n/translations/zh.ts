export const zh = {
  app: {
    brand: 'CHOYEON · EXERCISES',
    title: 'Choyeon Exercises',
    poweredBy: '基于 exercises-dataset · 1,324 个标准动作',
  },
  common: {
    search: '搜索',
    cancel: '取消',
    confirm: '确定',
    delete: '删除',
    save: '保存',
    edit: '编辑',
    clear: '清空',
    reset: '重置',
    close: '关闭',
    back: '返回',
    loadMore: '加载更多',
    retry: '重试',
    offline: '网络不可用，请检查网络',
    noData: '暂无数据',
  },
  home: {
    greetingIdle: '今天练什么？',
    greetingActive: '训练进行中',
    startWorkout: '开始训练',
    resumeWorkout: '继续训练',
    searchPlaceholder: '搜索动作、肌肉群、器械…',
    bodySectionTitle: '按肌群筛选',
    bodySectionNote: '10 个标准肌群，共 1,324 个动作。点击任一肌群查看全部动作。',
    bodySectionDoc:
      '分类依据与 exercises-dataset 一致：上臂 292 / 大腿 227 / 背 203 / 核心 169 / 胸 163 / 肩 143 / 小腿 59 / 前臂 37 / 有氧 29 / 颈 2。',
    equipmentSectionTitle: '按器械筛选',
    equipmentSectionNote: '涵盖自重、哑铃、绳索机、杠铃等 12 大类标准器械。',
    previewAll: '全部动作',
    previewFiltered: '匹配结果',
    seeAll: '查看全部',
    emptyTitle: '没有匹配的动作',
    emptyDesc: '切换肌群、器械条件或清空关键词再试试看。',
  },
  library: {
    title: '动作库',
    tabAll: '全部动作',
    tabFavorites: '我的收藏',
    tabHistory: '最近使用',
    noFavorites: '还没有收藏任何动作',
    noFavoritesDesc: '在任一动作卡片右上角点击 ♡ 即可加入收藏。',
    noHistory: '还没有训练记录',
    noHistoryDesc: '完成一次训练后，已使用的动作会自动记录到这里。',
    filterAll: '全部',
    sortBy: '排序',
    sortByName: '按名称',
    sortByEquipment: '按器械',
  },
  workout: {
    title: '训练',
    titleActive: '训练中',
    start: '开始今天的训练',
    defaultSessionName: '今日训练',
    heroLabelStreak: '连续',
    heroLabelWorkouts: '训练次数',
    heroLabelVolume: '总容量',
    heroUnitStreak: '天',
    heroUnitWorkouts: '次',
    heroUnitVolume: 'kg',
    startCustom: '自定义训练',
    quickTemplates: '快速模板',
    templatePush: '推日：胸/肩/肱三',
    templatePull: '拉日：背/肱二/后束',
    templateLegs: '腿日：股四/膕绳/臀/小腿',
    templateFull: '全身训练 A',
    historyTitle: '训练历史',
    // Delete-session Alert uses a semantic title instead of reusing
    // historyTitle (which was previously concatenated with a colon and
    // looked broken in EN where "History" isn't a valid dialog heading).
    deleteOneTitle: '删除训练记录',
    deleteOneConfirm: '确认删除这条训练记录？该操作不可撤销。',
    // Localized format tokens for month/day of History card — previously
    // formatDate() hardcoded "月" and "日" regardless of locale.
    dateMonthDay: '{{month}}月{{day}}日',
    // Active-workout card meta line — formerly a garbled concatenation of
    // compact.* labels which rendered "训练 3 概览 · 返" (nonsense copy).
    activeCardMeta: '{{count}} 个动作 · 点击继续',
    historyEmpty: '暂无训练记录',
    historyEmptyDesc:
      '点"开始训练"→添加动作→每组记录重量×次数→完成，即可生成首条记录。',
    statsTitle: '训练概览',
    statsStreak: '连续天数',
    statsWorkouts: '总训练数',
    statsVolume: '累计容量',
    unitVolumeKg: 'kg·次',
    unitVolumeLb: 'lb·次',
    unitDays: '天',
    unitTimes: '次',
    restNext: '下一组',
  },
  workoutSession: {
    newSession: '开始训练',
    addExercise: '添加动作',
    addSet: '+ 加一组',
    removeSet: '移除该组',
    restSeconds: '休息 (秒)',
    completedAt: '完成于',
    done: '完成训练',
    // Finish-session Alert uses a proper result title instead of
    // reusing the CTA button label "done" as a dialog header.
    doneTitle: '训练已完成',
    doneDesc: '累计容量',
    cancel: '放弃训练',
    cancelConfirm: '确定放弃这次训练？进度不会保存。',
    finishConfirm: '是否记录本次训练？',
    // Empty-session (no sets logged) Alert — semantic title instead of
    // reusing common.confirm ("确定") which made no sense as a dialog
    // header when the user tapped "Finish" with zero exercises.
    emptyFinishTitle: '还没有训练内容',
    emptyFinishDesc: '当前训练课表还没有任何有效组数，确认放弃本次训练？',
    emptyTitle: '还没有动作',
    emptyDesc: '先添加几个动作，再按重量×次数记录每一组。',
    setPlaceholderWeight: '重量',
    setPlaceholderReps: '次数',
    timerDone: '休息结束 · 下一组走起',
    restTitle: '组间休息',
    restSkip: '跳过休息',
    restNext: '下一组',
    // Remove-exercise dialog (used in start.tsx ExerciseBlock header
    // delete button — previously the title was removeSet which was
    // semantically wrong — removing an exercise removes all of its sets).
    removeExerciseTitle: '移除该动作',
  },
  profile: {
    title: '我的',
    sectionGeneral: '通用',
    language: '界面语言',
    languageZh: '简体中文',
    languageEn: 'English',
    // OptionPicker modal titles (used with the new OptionPicker UIKit component)
    pickerTitleLanguage: '选择界面语言',
    pickerTitleUnits: '选择重量单位',
    pickerTitleTheme: '选择主题外观',
    pickerTitleRest: '选择默认组间休息时长',
    pickerCancel: '关闭',
    // Language picker option labels (semantic arrays — never string.slice)
    optionLangZh: '简体中文',
    optionLangZhSublabel: '默认语言，中文界面 + 中文动作要领',
    optionLangEn: 'English',
    optionLangEnSublabel: 'English UI · English instructions',
    // Units picker option labels
    optionUnitsKg: '千克 (kg)',
    optionUnitsKgSublabel: '国际单位制，适用于大多数亚洲与欧洲地区',
    optionUnitsLb: '磅 (lb)',
    optionUnitsLbSublabel: '英制单位，适用于北美地区',
    // Theme picker option labels
    optionThemeDark: '深色模式',
    optionThemeDarkSublabel: '降低屏幕亮度，适合低光环境训练',
    optionThemeLight: '浅色模式',
    optionThemeLightSublabel: '高对比度白色背景，适合户外强光环境',
    optionThemeSystem: '跟随系统',
    optionThemeSystemSublabel: '与系统外观设置保持同步',
    // RestSeconds picker option labels (5 options: 60, 75, 90, 120, 180)
    optionRest60: '60 秒',
    optionRest60Sublabel: '短组间休息 · 适合超级组/耐力训练',
    optionRest75: '75 秒',
    optionRest75Sublabel: '标准短休息 · 适合肌肥大训练',
    optionRest90: '90 秒',
    optionRest90Sublabel: '默认推荐值 · 平衡强度与恢复',
    optionRest120: '120 秒',
    optionRest120Sublabel: '中等休息 · 适合复合动作训练',
    optionRest180: '180 秒',
    optionRest180Sublabel: '长休息 · 适合大重量力量训练',
    unitRestSeconds: '秒',
    units: '重量单位',
    unitsKg: '千克 (kg)',
    unitsLb: '磅 (lb)',
    sectionTraining: '训练设置',
    defaultRestSeconds: '默认组间休息',
    restTimerEnabled: '启用休息计时',
    autoRest: '完成一组后自动倒计时',
    saveHistory: '保存训练历史',
    hapticFeedback: '触觉反馈',
    sectionData: '数据管理',
    clearHistory: '清空训练历史',
    clearHistoryConfirm: '确认清空全部训练历史？该操作不可撤销。',
    resetAll: '重置所有数据',
    resetAllConfirm:
      '确认重置为初始状态？历史、收藏、设置都将清空，且不可撤销。',
    about: '关于',
    aboutBody: 'Choyeon Exercises 是一款无商业化内容的离线训练工具：分类浏览动作要领、收藏动作、记录重量×次数、训练历史统计。',
    version: '版本',
    themeDark: '深色模式',
    themeLight: '浅色模式',
    themeSystem: '跟随系统',
    // SettingRow label for the appearance/theme picker.  Previously this row
    // rendered 训练概览 (workout.statsTitle) by mistake.
    appearance: '主题外观',
    // Setting row semantic descriptions (used as sub-labels, do NOT use
    // string.slice() copies — they produce nonsensical copy when the
    // surrounding locale changes length or wording).
    languageDesc: '切换界面显示语言，当前修改立即生效',
    unitsDesc: '统计、卡片与计时器使用的重量单位',
    themeDesc: '切换深色、浅色或跟随系统外观',
    restTimerDesc: '完成一组后可触发倒计时提示',
    autoRestDesc: '勾选完成动作后自动启动倒计时',
    saveHistoryDesc: '完成训练后自动写入历史记录存储',
    hapticDesc: '点击、滑动操作时触发震动反馈',
    defaultRestDesc: '计时器默认秒数，训练页可单独覆盖',
    // Section heading for the stats grid (previously missing → rendered raw key)
    statsTitle: '训练概览',
    // MiniStat compact labels (2-4 glyphs, semantic, not arbitrary slices)
    statSessions: '训练',
    statExercises: '动作',
    statSets: '组数',
    statFavorites: '收藏',
    statStreak: '连续',
    statVolume: '总容量',
    statUnits: '项',
    statUnitReps: '组',
    statUnitFav: '个',
    // Info card titles (data section)
    dataStorage: '本地数据存储',
    datasetCredits: '动作数据集来源',
    dataResetInfo: '重置操作说明',
    // Hero subtitle
    athleteTagline: '离线优先 · 无广告 · 专注训练',
  },
  exercise: {
    overview: '动作概要',
    equipment: '器械',
    bodyPart: '肌群',
    target: '目标肌肉',
    muscleGroup: '主肌',
    secondaryMuscles: '协同肌',
    instructions: '动作要领',
    instructionsEmpty: '暂无要领说明。',
    showAnimation: '播放动画',
    hideAnimation: '停止动画',
    imageLoadFailed: '图片加载失败，点击重试',
    // Static thumbnail fallback hero caption — shown when the animation GIF
    // fails (404 / offline / CORS) so the user understands what they see.
    animFallbackNote: '动画暂时无法加载，已切换为静态缩略图',
    addToWorkout: '加入当前训练',
    // Added-to-workout Alert: title + desc are SEMANTICALLY different.
    // Previously both slots mapped to addedToWorkout producing the same
    // text twice ("已加入 已加入 XXX 已加入") which was nonsense copy.
    addedTitle: '已加入训练',
    addedDesc: '「{{name}}」已加入当前训练课表',
    addedToWorkout: '已加入',
    goToWorkout: '前往训练',
    favorite: '收藏',
    favorited: '已收藏',
    unfavorite: '取消收藏',
  },
  settings: {
    updated: '设置已更新',
    restored: '设置已恢复默认',
  },
  chips: {
    allExercises: '所有动作',
    favorites: '收藏',
    recent: '最近',
  },
  // ==========================================================================
  // UI compact labels.  NEVER produce these via string.slice(N) on long
  // locale text — the surrounding sentence length and character classes
  // change between zh/en/ja and produce nonsense glyph soup.  Every compact
  // label below is hand-authored for the exact target surface.
  // ==========================================================================
  tabs: {
    home: '首页',
    library: '动作库',
    workout: '训练',
    profile: '我的',
  },
  compact: {
    // MiniStat / StatsHero column / list-row labels (≤ 4 glyphs in ZH,
    // ≤ 6 chars in EN, semantic, never auto-sliced)
    sessions: '训练',
    moves: '动作',
    sets: '组数',
    completed: '完成',
    rest: '休息',
    exercises: '动作',
    favorites: '收藏',
    favoritePins: '收藏项',
    // Post-numeric units / value suffixes (appear after a number, e.g. "8组")
    unitSets: '组',
    unitReps: '次',
    unitItems: '项',
    unitPins: '个',
    unitKg: 'kg',
    unitLb: 'lb',
    unitSessions: '次',
    // Stat row left-edge compact labels (2 glyphs, Chinese headers)
    headerStreak: '连续',
    headerWorkouts: '训练',
    headerVolume: '容量',
    headerDone: '完成',
    headerOverview: '概览',
    // Button / CTA compact labels (tight width)
    playAnim: '演示中',
    addToSession: '加入训练',
    startPlus: '开始·加入',
    // Library top-tab short headers (2 glyphs — tight chip width)
    libraryBody: '部位',
    libraryEquip: '器械',
    // Exercise-instructions section header (2 glyphs, inline note block)
    instrHeader: '要领',
    // Tight column header used inside History cards (1-2 glyphs, fits 3-digit count)
    setsHeader: '组',
    // Mini button labels (used after slice in workout history card + cancel confirm)
    backLabel: '返',
    favoritesShort: '藏',
    // 7-day calendar headers (1 CJK glyph each) used by the weekly bar
    // chart strip on the Workout tab. Previously these were hardcoded
    // CJK and rendered as "日一二三四五六" even when the UI was EN.
    daySun: '日',
    dayMon: '一',
    dayTue: '二',
    dayWed: '三',
    dayThu: '四',
    dayFri: '五',
    daySat: '六',
    // Workout hero row caption (≤ 12 glyphs — displayed under streak row)
    historyEmptyNote: '还没有任何训练内容，立即开始第一次吧',
  },
  session: {
    // Cancel-alert button labels (previously resetAllConfirm was sliced to 12
    // chars which is semantically broken)
    cancelProgressWarn: '未完成的进度将丢弃，是否确认取消？',
    removeExerciseWarn: '移除此动作后，其下所有组数记录将被删除且不可恢复。',
  },
} as const;
