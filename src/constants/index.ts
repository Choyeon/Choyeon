import type { LanguageCode, BodyPart } from '@/types';

// Use jsdelivr CDN for the exercise media (images and gifs)
export const MEDIA_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';

export const getImageUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  const clean = relativePath.replace(/^\.\//, '').replace(/^\//, '');
  return `${MEDIA_CDN_BASE}/${clean}`;
};

export const getGifUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  const clean = relativePath.replace(/^\.\//, '').replace(/^\//, '');
  return `${MEDIA_CDN_BASE}/${clean}`;
};

export const DEFAULT_LANGUAGE: LanguageCode = 'zh';

export const STORAGE_KEYS = {
  WORKOUTS: '@choyeon/workouts',
  SETTINGS: '@choyeon/settings',
  FAVORITES: '@choyeon/favorites',
};

// ============================================================================
// CATEGORY META — canonical mapping aligned with exercises-dataset README.
// Exercise counts are the official numbers from the Statistics section.
// `icon` values are MaterialCommunityIcons glyph names used through the app
// (no emoji fallbacks anywhere in the pipeline).
// ============================================================================

export interface CategoryMeta {
  zh: string;
  en: string;
  icon: string; // MaterialCommunityIcons glyph
  count?: number; // official count from README (if top-level)
  /** Brief explanation of how this category groups exercises (shown in help/tooltip). */
  note?: string;
}

// ---- BODY PARTS (10 canonical slugs from README) ----------------------------
//
// Official counts: Upper Arms 292 · Upper Legs 227 · Back 203 · Waist 169
//                  Chest 163 · Shoulders 143 · Lower Legs 59 · Lower Arms 37
//                  Cardio 29 · Neck 2
export const BODY_PART_LABELS: Record<BodyPart, CategoryMeta> = {
  back: {
    zh: '背部',
    en: 'Back',
    icon: 'arm-flex-outline',
    count: 203,
    note: '涵盖背阔肌、斜方肌、菱形肌、竖脊肌等背部肌群的水平/垂直拉类动作。',
  },
  cardio: {
    zh: '有氧',
    en: 'Cardio',
    icon: 'run-fast',
    count: 29,
    note: '以提升心肺耐力为目标的跑步、骑行、划船、跳绳等有氧训练。',
  },
  chest: {
    zh: '胸部',
    en: 'Chest',
    icon: 'weight-lifter',
    count: 163,
    note: '针对胸大肌的推、飞、夹胸类动作，涵盖平卧/上斜/下斜角度。',
  },
  'lower arms': {
    zh: '前臂',
    en: 'Forearms',
    icon: 'hand-front-left',
    count: 37,
    note: '腕屈伸、腕卷曲、 farmer carry 等针对前臂屈肌/伸肌/握力的训练。',
  },
  'lower legs': {
    zh: '小腿',
    en: 'Calves',
    icon: 'shoe-print',
    count: 59,
    note: '站姿/坐姿提踵、跳跃类动作，训练腓肠肌与比目鱼肌。',
  },
  neck: {
    zh: '颈部',
    en: 'Neck',
    icon: 'account-cowboy-hat-outline',
    count: 2,
    note: '针对胸锁乳突肌与斜方肌上部的颈屈伸与颈部强化动作。',
  },
  shoulders: {
    zh: '肩部',
    en: 'Shoulders',
    icon: 'human-handsup',
    count: 143,
    note: '推举、侧平举、前平举、反向飞鸟，覆盖三角肌前/中/后三束。',
  },
  'upper arms': {
    zh: '上臂',
    en: 'Upper Arms',
    icon: 'dumbbell',
    count: 292,
    note: '肱二头肌弯举类 + 肱三头肌屈伸类动作，是整个数据集最大的分类。',
  },
  'upper legs': {
    zh: '大腿',
    en: 'Upper Legs',
    icon: 'human-male-board-poll',
    count: 227,
    note: '深蹲、硬拉、箭步蹲、腿举、腿屈伸/腿弯举，覆盖股四头、膕绳、臀肌。',
  },
  waist: {
    zh: '核心',
    en: 'Waist (Core)',
    icon: 'weight-lifter',
    count: 169,
    note: '卷腹、平板支撑、俄罗斯转体、健腹轮等腹横肌/腹直肌/腹斜肌训练。',
  },
};

// ---- EQUIPMENT (canonical slugs from README + cardio types seen in JSON) -----
//
// Official counts: Body Weight 325 · Dumbbell 294 · Cable 157 · Barbell 154
//                  Leverage Machine 81 · Band 54 · Smith Machine 48 · Kettlebell 41
//                  Weighted 36 · Stability Ball 28 · EZ Barbell 23 · Other 83
//
// NOTE: The dataset uses "band" as the slug for resistance-band exercises,
// NOT "resistance band". Keep "resistance band" as alias mapped to same icon
// so old data / search terms still resolve visually.
export const EQUIPMENT_LABELS: Record<string, CategoryMeta> = {
  // --- Canonical (README top-12) set ---
  'body weight': {
    zh: '自重',
    en: 'Body Weight',
    icon: 'human-greeting-proximity',
    count: 325,
    note: '仅依靠自身重量完成，无需器械。占数据集约 25%，适合家庭训练。',
  },
  dumbbell: {
    zh: '哑铃',
    en: 'Dumbbell',
    icon: 'dumbbell',
    count: 294,
    note: '单手独立重量器械，支持单侧训练与更大活动度。',
  },
  cable: {
    zh: '绳索机',
    en: 'Cable',
    icon: 'link-variant',
    count: 157,
    note: '通过滑轮与配重提供持续张力，适合顶峰收缩与多角度动作。',
  },
  barbell: {
    zh: '杠铃',
    en: 'Barbell',
    icon: 'dumbbell',
    count: 154,
    note: '双侧平衡长杆，深蹲/卧推/硬拉三大项的标准器械。',
  },
  'leverage machine': {
    zh: '杠杆器械',
    en: 'Leverage Machine',
    icon: 'cog-transfer-outline',
    count: 81,
    note: '带固定轨迹的杠杆类力量器械，通常在商用健身房中出现。',
  },
  band: {
    zh: '弹力带',
    en: 'Band',
    icon: 'tape-measure',
    count: 54,
    note: '弹性阻力带，曲线阻力随伸长变大，适合热身与康复。',
  },
  'smith machine': {
    zh: '史密斯机',
    en: 'Smith Machine',
    icon: 'arrow-up-down-bold-outline',
    count: 48,
    note: '带固定垂直轨道的杠铃架，可独立进行深蹲/卧推等复合动作。',
  },
  kettlebell: {
    zh: '壶铃',
    en: 'Kettlebell',
    icon: 'kettlebell',
    count: 41,
    note: '重心偏移的壶形器械，常用于摇摆、抓举与爆发力训练。',
  },
  weighted: {
    zh: '负重附加',
    en: 'Weighted',
    icon: 'weight-kilogram',
    count: 36,
    note: '在自重动作基础上额外负重（负重背心、腰带挂片等）。',
  },
  'stability ball': {
    zh: '瑜伽球',
    en: 'Stability Ball',
    icon: 'circle-outline',
    count: 28,
    note: '瑞士球 / 健身球，不稳定平面强化核心与平衡能力。',
  },
  'ez barbell': {
    zh: 'EZ 曲杆',
    en: 'EZ Barbell',
    icon: 'curve',
    count: 23,
    note: '带弧度的短曲杆，用于降低腕关节压力的二头弯举与臂屈伸。',
  },
  other: {
    zh: '其他器械',
    en: 'Other',
    icon: 'dots-horizontal-circle-outline',
    count: 83,
    note: '无法归入标准分类或稀有器械（沙袋、雪橇、地雷管等）。',
  },

  // --- Alias: exercises.json also writes "resistance band" for a small subset.
  //     Map to identical semantics as plain "band" so icons stay consistent.
  'resistance band': {
    zh: '弹力带',
    en: 'Resistance Band',
    icon: 'tape-measure',
    note: '弹性阻力带（同 band 分类），数据集历史别名。',
  },

  // --- Cardio / auxiliary types that appear inside exercises.json ------------
  machine: { zh: '综合器械', en: 'Machine', icon: 'treadmill' },
  'elliptical machine': { zh: '椭圆机', en: 'Elliptical', icon: 'treadmill' },
  'stationary bike': { zh: '动感单车', en: 'Stationary Bike', icon: 'bike' },
  treadmill: { zh: '跑步机', en: 'Treadmill', icon: 'run-fast' },
  stairmaster: { zh: '登山机', en: 'Stairmaster', icon: 'stairs' },
  'medicine ball': { zh: '药球', en: 'Medicine Ball', icon: 'basketball' },
  'exercise ball': { zh: '瑜伽球', en: 'Exercise Ball', icon: 'circle-outline' },
  foam: { zh: '泡沫轴', en: 'Foam Roller', icon: 'rectangle-outline' },
  rope: { zh: '跳绳', en: 'Jump Rope', icon: 'arrow-horizontal-lock' },
  'olympic barbell': { zh: '奥杆', en: 'Olympic Barbell', icon: 'dumbbell' },
  hammer: { zh: '锤式', en: 'Hammer', icon: 'hammer' },
  tire: { zh: '轮胎', en: 'Tire', icon: 'tire' },
};

// ============================================================================
// CATEGORY-BASED EXERCISE HINTS
// Short explanation of what exercises in each category generally look like,
// rendered on section headers / info panels so the user learns "what counts
// as what".  Wording mirrors the dataset's README & browser semantics.
// ============================================================================

export const BODY_PART_NOTES: Record<BodyPart, string> = {
  back: '以「拉」为主的水平拉（划船）与垂直拉（引体/高位下拉），关注肩胛内收与脊柱中立。',
  cardio: '持续心律在最大心律 60%~85% 区间，时长 >15 分钟的训练形式。',
  chest: '以「推」为主，含平卧/上斜/下斜的卧推、飞鸟类，强调肘关节与躯干夹角。',
  'lower arms': '腕关节的屈伸与旋转，直接影响握力与大重量动作中的前臂耐力。',
  'lower legs': '踝关节跖屈/背屈类动作，腓肠肌注重爆发力，比目鱼肌注重静力耐力。',
  neck: '颈屈伸、颈侧屈与轻量抗阻训练，注意循序渐进避免颈部损伤。',
  shoulders: '推举（竖直面）+ 平举（水平面）动作，三角肌三束分别对应推、侧、后。',
  'upper arms': '肘部运动为主：肱二头肌「弯举」类（肘屈）+ 肱三头肌「屈伸」类（肘伸）。',
  'upper legs': '膝主导（股四头）、髋主导（膕绳/臀）、单腿稳定三类动作构成大腿训练主体。',
  waist: '躯干抗伸展、抗旋转、屈曲三类，平板与卷腹分别代表等长与动态两种训练逻辑。',
};

export const EQUIPMENT_USAGE_HINTS: Record<string, string> = {
  cable: '绳索机持续张力特性尤其适合肌肉顶峰收缩，训练中保持绳索不晃动。',
  'leverage machine': '杠杆器械固定轨迹适合新学员建立动作模式，注意不要过度依赖。',
  'smith machine': '史密斯轨道减少核心稳定需求，适合孤立训练或单人安全大重量。',
  'stability ball': '保持球上动作缓慢，注意核心预收紧，避免腰椎代偿。',
  band: '弹力带阻力随伸长递增，注意在动作末端控制离心阶段不回弹。',
  'ez barbell': 'EZ 杆有效降低腕部压力，适合弯举与窄距臂屈伸中的肘部健康。',
  kettlebell: '壶铃摇摆属于髋铰链模式，核心发力而非手臂，先掌握髋铰链再加重。',
  weighted: '附加负重需以动作质量优先，不要牺牲活动范围换取重量数字。',
};

// ============================================================================
// LANGUAGE UI LABELS (no flags/emoji — flag icons are emojis too).
// ============================================================================

export const LANGUAGE_LABELS: Record<
  LanguageCode,
  { zh: string; native: string; code: string; icon: string }
> = {
  zh: { zh: '简体中文', native: '中文', code: '简', icon: 'google-translate' },
  en: { zh: '英语', native: 'English', code: 'EN', icon: 'alphabet-latin' },
  es: { zh: '西班牙语', native: 'Español', code: 'ES', icon: 'alpha-e-circle-outline' },
  it: { zh: '意大利语', native: 'Italiano', code: 'IT', icon: 'alpha-i-circle-outline' },
  tr: { zh: '土耳其语', native: 'Türkçe', code: 'TR', icon: 'alpha-t-circle-outline' },
  ru: { zh: '俄语', native: 'Русский', code: 'RU', icon: 'alpha-r-circle-outline' },
  hi: { zh: '印地语', native: 'हिन्दी', code: 'HI', icon: 'alpha-h-circle-outline' },
  pl: { zh: '波兰语', native: 'Polski', code: 'PL', icon: 'alpha-p-circle-outline' },
  ko: { zh: '韩语', native: '한국어', code: '한', icon: 'alpha-k-circle-outline' },
  fr: { zh: '法语', native: 'Français', code: 'FR', icon: 'alpha-f-circle-outline' },
};

// ============================================================================
// ICON LOOKUP HELPERS
// ============================================================================

export function iconForBodyPart(bp: BodyPart | string | null | undefined): string {
  if (!bp) return 'help-circle-outline';
  return BODY_PART_LABELS[bp as BodyPart]?.icon || 'help-circle-outline';
}

export function labelForBodyPart(bp: BodyPart | string | null | undefined, lang?: LanguageCode): string {
  if (!bp) return '未知';
  const meta = BODY_PART_LABELS[bp as BodyPart];
  if (!meta) return String(bp);
  return lang === 'en' ? meta.en : meta.zh;
}

export function iconForEquipment(eq: string | null | undefined): string {
  if (!eq) return 'help-circle-outline';
  return EQUIPMENT_LABELS[eq]?.icon || 'dumbbell';
}

export function labelForEquipment(eq: string | null | undefined, lang?: LanguageCode): string {
  if (!eq) return '未知器械';
  const meta = EQUIPMENT_LABELS[eq];
  if (!meta) return String(eq);
  return lang === 'en' ? meta.en : meta.zh;
}

// Target is a free-form English muscle label (not a controlled slug).
// Returns a presentable title-case string.  There is no 1:1 canonical mapping
// because exercises-dataset target values are descriptive English phrases
// (e.g. "Biceps Brachii", "Quadriceps", "Upper Chest"), not slugs.
export function labelForTarget(target: string | null | undefined): string {
  if (!target) return '-';
  // Dataset uses title-cased English names already, so pass through.
  return String(target);
}

// Animations in exercises-dataset live under `gif_url` (legacy dataset key) or
// the newer semantic `animation` field.  Both are media-relative paths served
// from the same CDN prefix.
export function getAnimationUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  const clean = relativePath.replace(/^\.\//, '').replace(/^\//, '');
  return `${MEDIA_CDN_BASE}/${clean}`;
}

// Chinese display name for an Exercise with graceful fallback.
// Prioritizes dataset-provided `name_zh` when it exists and is meaningful
// (i.e. contains at least one Chinese character), otherwise falls back to the
// original English `name`.  We intentionally do NOT ship an in-app translator;
// translation is done offline by scripts/translate_names.py so bundle size
// stays small and terminology is gym-native Chinese.
export function displayNameZh(ex: { name: string; name_zh?: string | null } | null | undefined): string {
  if (!ex) return '';
  const zh = ex.name_zh;
  if (zh && typeof zh === 'string' && /[\u4e00-\u9fff]/.test(zh)) {
    return zh.trim();
  }
  return ex.name || '';
}
