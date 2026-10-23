const CONTAINER = document.getElementById('dy-pulse-${dyVariationId}');
const CURRENCY_CODE = '${Currency}'.trim().toUpperCase();
const PRODUCT_SHAPE = '${Product Shape}'.trim().toLowerCase();
const MUSE_API_KEY = '${Client-Side API Key}'.trim();
const SIMILAR_STRATEGY_ID = Number('${Similar Strategy ID}'.trim()) || 0;
const CONFIG = {
  strategyId: 475206,
  similarStrategyId: SIMILAR_STRATEGY_ID,
  showSimilar: true,
  groupBy: 'category',
  showGroupControls: true,
  showPriceControl: true,
  showPrices: true,
  autoRotate: true,
  rotationDurationMs: Number("${Rotation speed (in ms)}"),
  showShuffle: true,
  showSearch: Boolean(MUSE_API_KEY),
  showSocialProof: true,
  socialProofTimeframe: 'daily',
  showCompare: true,
  currency: /^[A-Z]{3}$/.test(CURRENCY_CODE) ? CURRENCY_CODE : 'EUR',
  isSquare: PRODUCT_SHAPE === 'square',
};
const SELECTORS = {
  stage: '.dy-pulse__stage',
  canvas: '.dy-pulse__canvas',
  topControls: '.dy-pulse__tr',
  shuffle: '.dy-pulse__shuffle',
  hint: '.dy-pulse__hint',
  side: '.dy-pulse__side',
  groups: '.dy-pulse__groups',
  colorGroup: '[data-dy-group="color"]',
  chipsSection: '.dy-pulse__chips-sec',
  chips: '.dy-pulse__chips',
  range: '.dy-pulse__range',
  rangeValue: '.dy-pulse__val',
  priceMin: '.dy-pulse__min',
  priceMax: '.dy-pulse__max',
  pin: '.dy-pulse__pin',
  pinClose: '.dy-pulse__pin-x',
  pinName: '.dy-pulse__pin-name',
  pinPrice: '.dy-pulse__pin-price',
  pinProof: '.dy-pulse__pin-proof',
  viewButton: '.dy-pulse__view',
  similar: '.dy-pulse__similar',
  compareToggle: '.dy-pulse__compare-toggle',
  tray: '.dy-pulse__tray',
  trayItems: '.dy-pulse__tray-items',
  trayOpen: '.dy-pulse__tray-open',
  compare: '.dy-pulse__compare',
  compareGrid: '.dy-pulse__compare-grid',
  compareSub: '.dy-pulse__compare-sub',
  compareClose: '.dy-pulse__compare-close',
  items: '.dy-pulse__items',
  search: '.dy-pulse__search',
  searchInput: '.dy-pulse__input',
  searchSubmit: '.dy-pulse__submit',
  searchStatus: '.dy-pulse__status',
  searchMeta: '.dy-pulse__search-meta',
  resetResults: '.dy-pulse__reset',
};
const LIST_SELECTORS = {
  zoomButtons: '.dy-pulse__zoom',
  groupButtons: '[data-dy-group]',
  chipButtons: '.dy-pulse__chips button',
  compareColumns: '.dy-pulse__compare-col',
  compareMarkers: '.dy-pulse__compare-vs',
  items: '.dy-pulse__item',
  itemName: '.dy-pulse__name',
};
const COLOR_GROUPS = [
  { key: 'neutral', label: 'Neutrals' },
  { key: 'dark', label: 'Darks' },
  { key: 'warm', label: 'Warm tones' },
  { key: 'pink', label: 'Pinks & purples' },
  { key: 'green', label: 'Greens' },
  { key: 'blue', label: 'Blues' },
  { key: 'other', label: 'Other' },
];
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;
const BUBBLE_SIZE = 160;
const MIN_PRODUCTS = 3;
const MAX_PRICE_LABELS = 12;
const NARROW_WIDTH = 640;
const SLIDER_MAX = 1000;
const SLIDER_MIN_GAP = 20;
const HOME_PITCH = 0.12;
const SQUARE_CORNER_RATIO = 0.18;
const ZOOM_LIMITS = { min: 240, max: 2200 };
const MUSE_ENDPOINT = 'https://direct.dy-api.com/v2/serve/user/agent';
const ENGAGEMENT_ENDPOINT = 'https://direct-collect.dy-api.com/v2/collect/user/engagement';
const MAX_QUERY_LENGTH = 250;
const MAX_SEARCH_PRODUCTS = 36;
const MAX_SIMILAR_PRODUCTS = 24;
const SEARCH_SPIN_SPEED = 6;
const MAX_COMPARE = 3;
const COMPARE_CLOSE_DELAY = 380;
const TRENDING_KEY = 'trending';
const TRENDING_SHARE = 0.25;
const MIN_TRENDING = 2;
const PURCHASE_WEIGHT = 4;
const SOCIAL_PROOF_LABELS = { daily: 'today', weekly: 'this week', monthly: 'this month' };
const LOCALE = document.documentElement.lang || window.navigator.language || 'en';
const REDUCED_MOTION = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const ELEMENTS = {};
const PRODUCTS = new Map();
const POINTERS = new Map();
const STATE = {
  width: 0,
  height: 0,
  dpr: 1,
  padTop: 56,
  padBottom: 12,
  padLeft: 0,
  font: '',
  accent: '',
  background: '',
  heatRgb: '',
  items: [],
  view: [],
  groups: [],
  trending: [],
  compare: [],
  compareCount: 0,
  compareTimer: 0,
  backdrop: 0,
  isCompareOpen: false,
  projected: [],
  groupBy: CONFIG.groupBy,
  filter: null,
  selected: null,
  hovered: null,
  categoryLevel: 0,
  priceMin: 0,
  priceMax: Infinity,
  priceLow: 1,
  priceHigh: 2,
  priceBands: [],
  bubbleScale: 1,
  homeDistance: 800,
  camera: { yaw: 0.5, pitch: HOME_PITCH, distance: 800 },
  cameraAnimation: null,
  inertia: null,
  spin: null,
  isBusy: false,
  isSearching: false,
  resultsLabel: '',
  requestId: 0,
  baseItems: [],
  baseTracking: new Map(),
  isVisible: true,
  colorSupported: false,
  colorApplied: false,
  imagesSettled: false,
  relayoutTimer: 0,
  relayoutPending: false,
};

let context = null;
let drag = null;
let pinch = null;
let frameId = 0;
let lastFrameTime = 0;

const DY_HELPER = {
  clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  },
  easeInOut(progress) {
    if (progress < 0.5) return 4 * progress * progress * progress;
    return 1 - ((-2 * progress + 2) ** 3) / 2;
  },
  wrapAngle(angle) {
    return ((((angle + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  },
  fibonacciPoint(index, count, radius) {
    if (count <= 1) return [0, 0, 0];
    const y = 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta = index * GOLDEN_ANGLE;
    return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius];
  },
  parsePrice(value) {
    if (typeof value === 'number') return value;
    const digits = String(value || '').replace(/[^\d.,-]/g, '');
    if (!digits) return NaN;
    const isCommaDecimal = digits.lastIndexOf(',') > digits.lastIndexOf('.');
    return parseFloat(isCommaDecimal ? digits.replace(/\./g, '').replace(',', '.') : digits.replace(/,/g, ''));
  },
  parseCategories(value) {
    const path = Array.isArray(value) ? value.join('|') : String(value || '');
    const parts = path.split(/[|>/,]/).map((part) => part.trim()).filter(Boolean);
    return parts.length ? parts : ['Other'];
  },
  hue(r, g, b, max, delta) {
    if (!delta) return 0;
    let hue;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    return (hue * 60 + 360) % 360;
  },
  colorKey(rgb) {
    if (!rgb) return 'other';
    const [r, g, b] = rgb.map((channel) => channel / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    const delta = max - min;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    if (lightness < 0.3) return 'dark';
    if (saturation < 0.18) return 'neutral';
    const hue = DY_HELPER.hue(r, g, b, max, delta);
    if (hue >= 330) return 'pink';
    if (hue < 70) return 'warm';
    if (hue < 170) return 'green';
    if (hue < 260) return 'blue';
    return 'pink';
  },
  niceNumber(value) {
    if (value <= 0) return 0;
    const power = 10 ** Math.floor(Math.log10(value));
    const step = [[1.5, 1], [3.5, 2], [7.5, 5]].find(([limit]) => value / power < limit);
    return (step ? step[1] : 10) * power;
  },
  overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  },
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  },
  createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return { canvas, ctx: canvas.getContext('2d') };
  },
  createPriceFormatter() {
    try {
      const formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 });
      return (value) => formatter.format(value);
    } catch (error) {
      return (value) => Math.round(value) + ' ' + CONFIG.currency;
    }
  },
  createCountFormatter() {
    try {
      const formatter = new Intl.NumberFormat(LOCALE);
      return (value) => formatter.format(value);
    } catch (error) {
      return (value) => String(value);
    }
  },
  createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  },
};

const { clamp } = DY_HELPER;
const priceFormatter = DY_HELPER.createPriceFormatter();
const formatCount = DY_HELPER.createCountFormatter();

const formatPrice = (value) => (Number.isFinite(value) ? priceFormatter(value) : '');

const traceShape = (ctx, x, y, half) => {
  if (CONFIG.isSquare) {
    DY_HELPER.roundRect(ctx, x - half, y - half, half * 2, half * 2, half * SQUARE_CORNER_RATIO);
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, half, 0, TAU);
};

const createBlankBubble = () => {
  const { canvas, ctx } = DY_HELPER.createCanvas(BUBBLE_SIZE);
  ctx.fillStyle = '#F3F1EC';
  traceShape(ctx, 80, 74, 62);
  ctx.fill();
  return canvas;
};

const drawBubbleShadow = (ctx) => {
  const shadow = ctx.createRadialGradient(80, 146, 2, 80, 146, 52);
  shadow.addColorStop(0, 'rgba(0,0,0,.18)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(80, 146);
  ctx.scale(1, 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, TAU);
  ctx.restore();
  ctx.fillStyle = shadow;
  ctx.fill();
};

const drawBubbleImage = (ctx, image) => {
  if (!image?.naturalWidth) return;
  const scale = Math.min(96 / image.naturalWidth, 92 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, 80 - width / 2, 76 - height / 2, width, height);
};

const createImageBubble = (image) => {
  const { canvas, ctx } = DY_HELPER.createCanvas(BUBBLE_SIZE);
  drawBubbleShadow(ctx);
  ctx.save();
  traceShape(ctx, 80, 74, 62);
  ctx.clip();
  const background = ctx.createLinearGradient(0, 12, 0, 136);
  background.addColorStop(0, '#FFFFFF');
  background.addColorStop(1, '#EFECE6');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, BUBBLE_SIZE, BUBBLE_SIZE);
  drawBubbleImage(ctx, image);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.08)';
  ctx.lineWidth = 2;
  traceShape(ctx, 80, 74, 62);
  ctx.stroke();
  return canvas;
};

const averageColor = (image) => {
  try {
    const { ctx } = DY_HELPER.createCanvas(24);
    ctx.drawImage(image, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    const sum = [0, 0, 0];
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const isOpaque = data[i + 3] >= 128;
      const isNearWhite = data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
      if (isOpaque && !isNearWhite) {
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        count += 1;
      }
    }
    return count > 8 ? sum.map((channel) => channel / count) : null;
  } catch (error) {
    return null;
  }
};

class Product {
  constructor(sku, phase) {
    this.sku = sku;
    this.phase = phase;
    this.name = '';
    this.url = '';
    this.imageUrl = '';
    this.price = NaN;
    this.categories = ['Other'];
    this.element = null;
    this.slotId = null;
    this.decisionId = null;
    this.purchases = 0;
    this.views = 0;
    this.isInterestRequested = false;
    this.heat = 0;
    this.targetHeat = 0;
    this.compareMix = 0;
    this.compareSlot = 0;
    this.hero = null;
    this.rgb = null;
    this.bubble = createBlankBubble();
    this.rank = -1;
    this.scale = 0;
    this.targetScale = 0;
    this.highlight = 0;
    this.priceAlpha = 0;
    this.rangeAlpha = 1;
    this.position = null;
    this.target = [0, 0, 0];
  }

  update({
    name, url, price, categories, element, slotId = null, decisionId = null,
  }) {
    this.name = name || this.name;
    this.url = url || this.url;
    if (Number.isFinite(price)) this.price = price;
    this.categories = categories || this.categories;
    if (!element) return;
    this.element = element;
    this.slotId = slotId;
    this.decisionId = decisionId;
  }

  getTracking() {
    return { element: this.element, slotId: this.slotId, decisionId: this.decisionId };
  }

  setInterest(purchases, views) {
    this.purchases = purchases;
    this.views = views;
  }

  markInterestRequested() {
    this.isInterestRequested = true;
  }

  get interestScore() {
    return this.purchases * PURCHASE_WEIGHT + this.views;
  }

  setHeat(value) {
    this.targetHeat = value;
  }

  setCompareSlot(index) {
    this.compareSlot = index;
  }

  easeHero(slot, rate) {
    const hero = this.hero ?? slot;
    this.hero = {
      x: hero.x + (slot.x - hero.x) * rate,
      y: hero.y + (slot.y - hero.y) * rate,
      r: hero.r + (slot.r - hero.r) * rate,
    };
    return this.hero;
  }

  loadImage(src, onLoad, isTainted = false) {
    if (!src) return;
    this.imageUrl = this.imageUrl || src;
    const image = new window.Image();
    if (!isTainted) image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => {
      this.bubble = createImageBubble(image);
      if (!isTainted) this.rgb = averageColor(image);
      onLoad(!isTainted);
    });
    image.addEventListener('error', () => {
      if (!isTainted) this.loadImage(src, onLoad, true);
    });
    image.src = src;
  }

  categoryAt(level) {
    return this.categories[Math.min(level, this.categories.length - 1)];
  }

  hide() {
    this.rank = -1;
    this.targetScale = 0;
  }

  placeOnSphere(index, count, radius, isFirstLayout) {
    this.rank = index;
    this.targetScale = clamp(1 - 0.55 * (index / Math.max(1, count - 1)) ** 0.85, 0.35, 1);
    this.target = DY_HELPER.fibonacciPoint(index, count, count === 1 ? 0 : radius);
    if (this.position && this.scale > 0.01) return;
    const spread = isFirstLayout ? 1 : 0.6;
    this.position = this.target.map((value) => value * spread);
  }

  showInstantly() {
    this.scale = this.targetScale;
  }

  step(rates, isInRange, isSelected, isHero) {
    if (this.rank >= 0) this.position = this.position.map((value, axis) => value + (this.target[axis] - value) * rates.move);
    this.scale += (this.targetScale - this.scale) * rates.move;
    if (Math.abs(this.targetScale - this.scale) < 0.002) this.scale = this.targetScale;
    this.rangeAlpha += ((isInRange ? 1 : 0) - this.rangeAlpha) * rates.fade;
    this.highlight += ((isSelected ? 1 : 0) - this.highlight) * rates.highlight;
    this.heat += (this.targetHeat - this.heat) * rates.heat;
    this.compareMix = clamp(this.compareMix + (isHero ? rates.compare : -rates.compare), 0, 1);
    if (!this.compareMix) this.hero = null;
  }

  fadePriceLabel(isShown, rate) {
    this.priceAlpha += ((isShown ? 1 : 0) - this.priceAlpha) * rate;
  }

  releaseIfHidden() {
    if (this.rank < 0 && this.scale <= 0.01) this.position = null;
  }
}

const cacheElements = () => {
  Object.entries(SELECTORS).forEach(([key, selector]) => {
    ELEMENTS[key] = CONTAINER.querySelector(selector);
  });
};

const queryAll = (selector) => Array.from(CONTAINER.querySelectorAll(selector));

const setVisible = (element, isVisible) => {
  element.setAttribute('data-dy-visible', isVisible ? '1' : '0');
};

const setPressed = (element, isPressed) => {
  element.setAttribute('aria-pressed', String(isPressed));
};

const isInPriceRange = ({ price }) => !CONFIG.showPriceControl
  || !Number.isFinite(price)
  || (price >= STATE.priceMin && price <= STATE.priceMax);

const onProductImageLoad = (hasColor) => {
  if (hasColor && STATE.groupBy === 'color') {
    clearTimeout(STATE.relayoutTimer);
    STATE.relayoutTimer = setTimeout(() => {
      STATE.relayoutPending = true;
    }, 400);
  }
  checkColorSupport();
};

const registerProduct = ({ sku, image, ...fields }) => {
  let product = PRODUCTS.get(sku);
  if (!product) {
    product = new Product(sku, (PRODUCTS.size * GOLDEN_ANGLE) % TAU);
    PRODUCTS.set(sku, product);
    product.loadImage(image, onProductImageLoad);
  }
  product.update(fields);
  return product;
};

const readTemplateProducts = () => queryAll(LIST_SELECTORS.items).map((link, index) => {
  const image = link.querySelector('img');
  return registerProduct({
    sku: link.dataset.sku || 'item-' + index,
    name: link.querySelector(LIST_SELECTORS.itemName)?.textContent.trim() ?? '',
    url: link.href,
    image: image ? image.currentSrc || image.getAttribute('src') : '',
    price: DY_HELPER.parsePrice(link.dataset.price),
    categories: DY_HELPER.parseCategories(link.dataset.cat),
    element: link,
  });
});

const createTrackedLink = (item, sku, strategyId) => {
  const link = document.createElement('a');
  link.href = item.url || item.product_url || '#';
  link.textContent = item.name || item.title || '';
  link.setAttribute('data-dy-product-id', sku);
  link.setAttribute('data-dy-strategy-id', strategyId);
  return link;
};

const getSlotItem = (slot) => slot.item ?? slot.productData ?? {};

const getSlotSku = (slot) => String(getSlotItem(slot).sku ?? slot.sku);

const productsFromWidget = ({ wId, fId, slots = [] }, decisionId = null) => {
  const box = document.createElement('div');
  if (wId != null) box.setAttribute('data-dy-widget-id', wId);
  if (fId != null) box.setAttribute('data-dy-feed-id', fId);
  const products = slots.map((slot) => {
    const item = getSlotItem(slot);
    const sku = getSlotSku(slot);
    const link = createTrackedLink(item, sku, slot.strId);
    box.appendChild(link);
    return registerProduct({
      sku,
      name: item.name || item.title,
      url: link.href,
      image: item.image_url || item.thumbnail_url,
      price: DY_HELPER.parsePrice(item.dy_display_price || item.price),
      categories: DY_HELPER.parseCategories(item.categories || item.category),
      element: link,
      slotId: slot.slotId ?? null,
      decisionId,
    });
  });
  ELEMENTS.items.appendChild(box);
  if (wId != null) DYO.recommendations.registerElements(box);
  return products;
};

const fetchRecommendations = (strategyId, options) => new Promise((resolve, reject) => {
  if (!strategyId || typeof window.DYO?.recommendationWidgetData !== 'function') {
    reject(new Error('Recommendations API unavailable'));
    return;
  }
  DYO.recommendationWidgetData(strategyId, options, (error, data) => {
    if (error || !data?.slots?.length) {
      reject(error || new Error('Empty recommendations response'));
      return;
    }
    resolve(data);
  });
});

const getDyIdentity = () => ({
  user: {
    dyid: window.DY?.dyid ?? '',
    dyid_server: window.DY?.dyid ?? '',
    active_consent_accepted: !window.DYO?.ActiveConsent?.isUserOptOut?.(),
  },
  session: { dy: window.DY?.jsession ?? '' },
});

const postToDyApi = (url, body, options = {}) => window.fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'DY-API-Key': MUSE_API_KEY },
  body: JSON.stringify(body),
  ...options,
});

const buildMusePayload = (text) => {
  const recommendationContext = window.DY?.recommendationContext ?? {};
  return {
    ...getDyIdentity(),
    query: { text },
    context: {
      page: {
        type: recommendationContext.type || 'HOMEPAGE',
        data: recommendationContext.data || [],
        location: window.location.href,
        locale: recommendationContext.lng || '',
        referrer: document.referrer,
      },
      device: { userAgent: window.navigator.userAgent },
    },
    selector: { name: 'Shopping Muse' },
    options: { productData: { skusOnly: false } },
  };
};

const getMuseWidgets = ({ blocks, widgets }) => {
  if (!Array.isArray(blocks)) return Array.isArray(widgets) ? widgets : [];
  return blocks
    .filter((block) => String(block?.type).toLowerCase() === 'recommendation')
    .flatMap((block) => (Array.isArray(block.data) ? block.data : []));
};

const fetchMuseResults = async (text) => {
  const response = await postToDyApi(MUSE_ENDPOINT, buildMusePayload(text), { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error('Shopping Muse request failed: ' + response.status);
  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    widgets: getMuseWidgets(choice?.variations?.[0]?.payload?.data ?? {}),
    decisionId: choice?.decisionId ?? null,
  };
};

const productsFromMuse = ({ widgets, decisionId }) => {
  try {
    const products = widgets.flatMap((widget) => productsFromWidget(widget, decisionId));
    return [...new Set(products)].slice(0, MAX_SEARCH_PRODUCTS);
  } catch (error) {
    return null;
  }
};

const reportSlotClick = ({ slotId, decisionId }) => {
  if (!slotId || !decisionId) return;
  postToDyApi(ENGAGEMENT_ENDPOINT, {
    ...getDyIdentity(),
    engagements: [{ type: 'SLOT_CLICK', slotId, decisionId }],
  }, { keepalive: true }).catch(() => {});
};

const whenDyReady = () => new Promise((resolve) => {
  if (typeof window.DY?.API !== 'function') {
    resolve();
    return;
  }
  DY.API('callback', resolve);
});

const fetchInterest = (skus, metric) => new Promise((resolve) => {
  if (typeof window.DY?.ServerUtil?.getProductsData !== 'function') {
    resolve({});
    return;
  }
  // eslint-disable-next-line eslint-dy-cse-code/get-products-data
  DY.ServerUtil.getProductsData(skus, [CONFIG.socialProofTimeframe], metric, true, (error, response) => {
    resolve(error ? {} : response || {});
  });
});

const readInterest = (response, sku, metric) => Number(response?.[sku]?.productInterest?.[metric]?.[CONFIG.socialProofTimeframe]) || 0;

const describeInterest = ({ purchases, views }) => {
  const period = SOCIAL_PROOF_LABELS[CONFIG.socialProofTimeframe] ?? '';
  if (purchases > 0) return formatCount(purchases) + ' bought ' + period;
  if (views > 0) return formatCount(views) + ' viewed ' + period;
  return '';
};

const computePriceBands = () => {
  const prices = STATE.items.map(({ price }) => price).filter(Number.isFinite).sort((a, b) => a - b);
  if (prices.length < 4) return [];
  const thresholds = [0.25, 0.5, 0.75].map((quantile) => DY_HELPER.niceNumber(prices[Math.floor(quantile * (prices.length - 1))]));
  return thresholds.filter((value, index) => value > 0 && thresholds.indexOf(value) === index);
};

const pickCategoryLevel = () => {
  const depth = Math.max(...STATE.items.map(({ categories }) => categories.length));
  let best = -1;
  let firstSplit = -1;
  for (let level = 0; level < depth; level += 1) {
    const count = new Set(STATE.items.map((product) => product.categoryAt(level))).size;
    if (count >= 2 && firstSplit < 0) firstSplit = level;
    if (count >= 2 && count <= 7) best = level;
  }
  return best >= 0 ? best : Math.max(firstSplit, 0);
};

const priceBandLabel = (index) => {
  const bands = STATE.priceBands;
  if (!bands.length) return 'All prices';
  if (index === 0) return 'Under ' + formatPrice(bands[0]);
  if (index === bands.length) return formatPrice(bands[bands.length - 1]) + ' and up';
  return formatPrice(bands[index - 1]) + ' to ' + formatPrice(bands[index]);
};

const describePriceGroup = (price) => {
  if (!Number.isFinite(price)) return { key: 'p?', label: 'Other', order: 99 };
  const bands = STATE.priceBands;
  let index = 0;
  while (index < bands.length && price >= bands[index]) index += 1;
  return { key: 'p' + index, label: priceBandLabel(index), order: index };
};

const describeColorGroup = (rgb) => {
  const key = DY_HELPER.colorKey(rgb);
  const order = COLOR_GROUPS.findIndex((group) => group.key === key);
  return { key: 'c' + key, label: COLOR_GROUPS[order].label, order };
};

const describeGroup = (product) => {
  if (STATE.groupBy === 'price') return describePriceGroup(product.price);
  if (STATE.groupBy === 'color') return describeColorGroup(product.rgb);
  const category = product.categoryAt(STATE.categoryLevel);
  return { key: 't' + category, label: category, order: 0 };
};

const buildGroups = () => {
  const groups = new Map();
  STATE.items.forEach((product) => {
    const { key, label, order } = describeGroup(product);
    if (!groups.has(key)) {
      groups.set(key, {
        key, label, order, members: [],
      });
    }
    groups.get(key).members.push(product);
  });
  return [...groups.values()].sort((a, b) => a.order - b.order);
};

const pickTrending = () => {
  const ranked = STATE.items
    .filter(({ interestScore }) => interestScore > 0)
    .sort((a, b) => b.interestScore - a.interestScore);
  const trending = ranked.slice(0, Math.max(MIN_TRENDING, Math.ceil(STATE.items.length * TRENDING_SHARE)));
  return trending.length >= MIN_TRENDING && trending.length < STATE.items.length ? trending : [];
};

const refreshHeat = () => {
  const maxScore = Math.max(0, ...STATE.items.map(({ interestScore }) => interestScore));
  const scale = Math.log1p(maxScore);
  PRODUCTS.forEach((product) => product.setHeat(0));
  if (!CONFIG.showSocialProof || !scale) {
    STATE.trending = [];
    return;
  }
  STATE.items.forEach((product) => product.setHeat(Math.log1p(product.interestScore) / scale));
  STATE.trending = pickTrending();
};

const getActiveGroup = () => {
  if (STATE.filter === TRENDING_KEY) return STATE.trending.length ? { members: STATE.trending } : null;
  return STATE.groups.find(({ key }) => key === STATE.filter) ?? null;
};

const measureControls = () => {
  const { side, topControls } = ELEMENTS;
  const hasSide = CONFIG.showGroupControls || CONFIG.showPriceControl || CONFIG.showSearch || canShowSimilar();
  setVisible(side, hasSide);
  STATE.padTop = topControls.offsetTop + topControls.offsetHeight + 8;
  STATE.padLeft = 0;
  STATE.padBottom = 12;
  if (!hasSide) return;
  if (STATE.width <= NARROW_WIDTH) STATE.padBottom = STATE.height - side.offsetTop + 8;
  else STATE.padLeft = side.offsetWidth + 20;
};

const syncChips = () => {
  queryAll(LIST_SELECTORS.chipButtons).forEach((button) => {
    setPressed(button, (button.dataset.dyFilter || null) === STATE.filter);
  });
};

const syncGroupButtons = () => {
  queryAll(LIST_SELECTORS.groupButtons).forEach((button) => {
    setPressed(button, button.dataset.dyGroup === STATE.groupBy);
  });
};

const createChip = (key, label, count) => {
  const button = document.createElement('button');
  const badge = document.createElement('span');
  button.type = 'button';
  button.dataset.dyFilter = key ?? '';
  setPressed(button, STATE.filter === key);
  if (key === TRENDING_KEY) button.classList.add('dy-pulse__chip--trending');
  badge.textContent = count;
  button.append(label + ' ', badge);
  button.addEventListener('click', () => setFilter(key));
  return button;
};

const renderChips = () => {
  const trendingChips = STATE.trending.length ? [createChip(TRENDING_KEY, 'Trending', STATE.trending.length)] : [];
  setVisible(ELEMENTS.chipsSection, CONFIG.showGroupControls && (STATE.groups.length >= 2 || trendingChips.length > 0));
  ELEMENTS.chips.textContent = '';
  ELEMENTS.chips.append(
    createChip(null, 'All', STATE.items.length),
    ...trendingChips,
    ...STATE.groups.map(({ key, label, members }) => createChip(key, label, members.length)),
  );
  measureControls();
};

const updateHint = () => {
  ELEMENTS.hint.textContent = STATE.selected ? '' : 'Drag to turn · tap a product';
};

const toSliderValue = (price) => {
  const low = Math.log(STATE.priceLow);
  const span = Math.max(1e-6, Math.log(STATE.priceHigh) - low);
  return Math.round((SLIDER_MAX * (Math.log(price) - low)) / span);
};

const fromSliderValue = (value) => {
  const low = Math.log(STATE.priceLow);
  return Math.round(Math.exp(low + ((Math.log(STATE.priceHigh) - low) * value) / SLIDER_MAX));
};

const updatePriceUI = () => {
  const from = STATE.priceMin <= STATE.priceLow ? 0 : toSliderValue(STATE.priceMin);
  const to = STATE.priceMax >= STATE.priceHigh ? SLIDER_MAX : toSliderValue(STATE.priceMax);
  ELEMENTS.priceMin.value = from;
  ELEMENTS.priceMax.value = to;
  ELEMENTS.range.style.setProperty('--dy-range-from', (from * 100) / SLIDER_MAX + '%');
  ELEMENTS.range.style.setProperty('--dy-range-to', 100 - (to * 100) / SLIDER_MAX + '%');
  ELEMENTS.rangeValue.textContent = formatPrice(STATE.priceMin) + ' – ' + formatPrice(STATE.priceMax);
};

const updatePriceBounds = () => {
  const prices = STATE.view.map(({ price }) => price).filter(Number.isFinite);
  setVisible(ELEMENTS.range, CONFIG.showPriceControl && prices.length > 0);
  if (!prices.length) return;
  STATE.priceLow = Math.max(1, Math.min(...prices));
  STATE.priceHigh = Math.max(STATE.priceLow + 1, Math.max(...prices));
  STATE.priceMin = Math.max(STATE.priceMin, STATE.priceLow);
  STATE.priceMax = Math.min(STATE.priceMax, STATE.priceHigh);
  const isFullRange = STATE.priceMin <= STATE.priceLow && STATE.priceMax >= STATE.priceHigh;
  if (STATE.priceMin >= STATE.priceMax || isFullRange) {
    STATE.priceMin = STATE.priceLow;
    STATE.priceMax = STATE.priceHigh;
  }
  updatePriceUI();
};

const flyToDistance = (distance) => {
  STATE.inertia = null;
  STATE.cameraAnimation = {
    start: window.performance.now(),
    duration: REDUCED_MOTION ? 1 : 1100,
    from: STATE.camera.distance,
    to: distance,
  };
};

const spinCamera = (onMidway) => {
  if (STATE.spin && !STATE.spin.isApplied) STATE.spin.onMidway();
  if (REDUCED_MOTION) {
    onMidway();
    return;
  }
  STATE.spin = {
    start: window.performance.now(),
    duration: 1500,
    onMidway,
    isApplied: false,
  };
};

const zoomBy = (factor) => {
  STATE.cameraAnimation = null;
  STATE.camera.distance = clamp(STATE.camera.distance / factor, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
};

const renderPinProof = () => {
  ELEMENTS.pinProof.textContent = CONFIG.showSocialProof && STATE.selected ? describeInterest(STATE.selected) : '';
};

const select = (product) => {
  STATE.selected = product;
  STATE.hovered = null;
  ELEMENTS.pinName.textContent = product.name;
  ELEMENTS.pinPrice.textContent = CONFIG.showPrices ? formatPrice(product.price) : '';
  renderPinProof();
  syncCompareToggle();
  setVisible(ELEMENTS.pin, true);
  ELEMENTS.pin.setAttribute('data-dy-placed', '0');
  updateHint();
};

const deselect = () => {
  if (!STATE.selected) return;
  STATE.selected = null;
  setVisible(ELEMENTS.pin, false);
  updateHint();
};

const openProduct = (product) => {
  reportSlotClick(product);
  if (product.element) product.element.click();
  else if (product.url) window.location.href = product.url;
};

const arrangeSphere = (isFirstLayout) => {
  const count = STATE.view.length;
  const radius = 70 + Math.sqrt(count) * 32;
  STATE.bubbleScale = clamp(Math.sqrt(36 / Math.max(1, count)) * 0.7, 1, 2);
  PRODUCTS.forEach((product) => product.hide());
  STATE.view.forEach((product, index) => product.placeOnSphere(index, count, radius, isFirstLayout));
  STATE.homeDistance = clamp(radius * 2.4 + 200, 520, ZOOM_LIMITS.max);
  if (isFirstLayout) {
    STATE.camera.distance = STATE.homeDistance;
    STATE.camera.pitch = HOME_PITCH;
    PRODUCTS.forEach((product) => product.showInstantly());
    return;
  }
  if (!STATE.selected) flyToDistance(STATE.homeDistance);
};

const layout = (isFirstLayout) => {
  STATE.categoryLevel = pickCategoryLevel();
  STATE.priceBands = computePriceBands();
  STATE.groups = buildGroups();
  refreshHeat();
  const isFullRange = STATE.priceMin <= STATE.priceLow && STATE.priceMax >= STATE.priceHigh;
  const activeGroup = getActiveGroup();
  if (!activeGroup) STATE.filter = null;
  STATE.view = activeGroup ? activeGroup.members : STATE.items;
  arrangeSphere(isFirstLayout);
  if (isFullRange) {
    STATE.priceMin = 0;
    STATE.priceMax = Infinity;
  }
  renderChips();
  updatePriceBounds();
  updateHint();
};

const setFilter = (key) => {
  if (key === STATE.filter || STATE.spin) return;
  deselect();
  STATE.filter = key;
  syncChips();
  spinCamera(() => layout(false));
};

const setGroup = (groupBy) => {
  STATE.filter = null;
  deselect();
  STATE.groupBy = groupBy;
  syncGroupButtons();
  layout(false);
};

const checkColorSupport = () => {
  const withColor = STATE.items.filter(({ rgb }) => rgb).length;
  const isSupported = withColor >= STATE.items.length * 0.6;
  if (isSupported !== STATE.colorSupported) {
    STATE.colorSupported = isSupported;
    setVisible(ELEMENTS.colorGroup, isSupported);
  }
  if (!isSupported && STATE.groupBy === 'color' && withColor === 0 && STATE.imagesSettled) setGroup('category');
  if (isSupported && CONFIG.groupBy === 'color' && !STATE.colorApplied && STATE.groupBy !== 'color') {
    STATE.colorApplied = true;
    setGroup('color');
  }
};

const setItems = (products) => {
  STATE.items = [...new Set(products)];
  layout(false);
  loadSocialProof(STATE.items);
};

const setBusy = (isBusy) => {
  STATE.isBusy = isBusy;
  ELEMENTS.shuffle.disabled = isBusy;
  ELEMENTS.searchSubmit.disabled = isBusy;
  ELEMENTS.similar.disabled = isBusy;
  CONTAINER.setAttribute('aria-busy', String(isBusy));
};

const reshuffle = async () => {
  if (STATE.isBusy || STATE.spin) return;
  deselect();
  setBusy(true);
  const fetched = await fetchRecommendations(CONFIG.strategyId, {
    maxProducts: STATE.items.length,
    exclude: { sku: STATE.items.map(({ sku }) => sku) },
  }).then((data) => productsFromWidget(data)).catch(() => []);
  setBusy(false);
  const next = fetched.length >= MIN_PRODUCTS ? fetched : [...STATE.items].sort(() => Math.random() - 0.5);
  spinCamera(() => setItems(next));
};

const canShuffle = () => CONFIG.showShuffle && Boolean(CONFIG.strategyId);

const canShowSimilar = () => CONFIG.showSimilar && Boolean(CONFIG.similarStrategyId);

const setSearching = (isSearching) => {
  STATE.isSearching = isSearching;
  ELEMENTS.search.setAttribute('data-dy-searching', isSearching ? '1' : '0');
  ELEMENTS.searchInput.readOnly = isSearching;
  setBusy(isSearching);
};

const updateSearchMeta = () => {
  setVisible(ELEMENTS.searchMeta, Boolean(ELEMENTS.searchStatus.textContent || STATE.resultsLabel));
};

const setSearchStatus = (text) => {
  ELEMENTS.searchStatus.textContent = text;
  updateSearchMeta();
};

const setResultsMode = (label) => {
  STATE.resultsLabel = label;
  setVisible(ELEMENTS.resetResults, Boolean(label));
  setVisible(ELEMENTS.shuffle, !label && canShuffle());
  updateSearchMeta();
};

const saveBaseItems = () => {
  STATE.baseItems = STATE.items;
  STATE.baseTracking = new Map(STATE.items.map((product) => [product, product.getTracking()]));
};

const restoreBaseItems = () => {
  STATE.baseTracking.forEach((tracking, product) => product.update(tracking));
  spinCamera(() => setItems(STATE.baseItems));
};

const applyResults = (label, status, products) => {
  STATE.filter = null;
  setResultsMode(label);
  setSearchStatus(status);
  spinCamera(() => setItems(products));
};

const startResultsRequest = (status) => {
  STATE.requestId += 1;
  if (!STATE.resultsLabel) saveBaseItems();
  deselect();
  setSearching(true);
  setSearchStatus(status);
  return STATE.requestId;
};

const showSearchResults = (text, products) => {
  if (!products) {
    setSearchStatus('Search is unavailable right now. Please try again.');
    return;
  }
  if (!products.length) {
    setSearchStatus('No matches for “' + text + '”. Try different words.');
    return;
  }
  applyResults(text, products.length + (products.length === 1 ? ' result' : ' results') + ' for “' + text + '”', products);
};

const searchProducts = async (query) => {
  const text = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!text || STATE.isBusy) return;
  const requestId = startResultsRequest('Finding products for “' + text + '”…');
  const results = await fetchMuseResults(text).catch(() => null);
  if (requestId !== STATE.requestId) return;
  setSearching(false);
  showSearchResults(text, results && productsFromMuse(results));
};

const fetchSimilar = (product) => fetchRecommendations(CONFIG.similarStrategyId, {
  maxProducts: MAX_SIMILAR_PRODUCTS,
  context: { ...(window.DY?.recommendationContext ?? {}), type: 'PRODUCT', data: [product.sku] },
}).then(({ slots, ...widget }) => productsFromWidget({
  ...widget,
  slots: slots.filter((slot) => getSlotSku(slot) !== product.sku),
})).catch(() => []);

const showSimilar = async () => {
  const anchor = STATE.selected;
  if (!anchor || STATE.isBusy || STATE.spin) return;
  const requestId = startResultsRequest('Finding products similar to “' + anchor.name + '”…');
  const similar = await fetchSimilar(anchor);
  if (requestId !== STATE.requestId) return;
  setSearching(false);
  if (!similar.length) {
    setSearchStatus('No similar products found for “' + anchor.name + '”.');
    return;
  }
  ELEMENTS.searchInput.value = '';
  applyResults(anchor.name, 'Similar to “' + anchor.name + '”', [anchor, ...similar]);
};

const resetResults = () => {
  STATE.requestId += 1;
  setSearching(false);
  deselect();
  ELEMENTS.searchInput.value = '';
  setSearchStatus('');
  if (!STATE.resultsLabel) return;
  setResultsMode('');
  STATE.filter = null;
  restoreBaseItems();
};

const isCompared = (product) => STATE.compare.includes(product);

const syncCompareToggle = () => {
  const { compareToggle } = ELEMENTS;
  const isOn = Boolean(STATE.selected) && isCompared(STATE.selected);
  const isFull = !isOn && STATE.compare.length >= MAX_COMPARE;
  setPressed(compareToggle, isOn);
  compareToggle.disabled = isFull;
  compareToggle.textContent = isOn ? 'Comparing' : 'Compare';
  compareToggle.title = isFull ? 'You can compare up to ' + MAX_COMPARE + ' products' : '';
};

const createTrayItem = (product) => {
  const button = DY_HELPER.createElement('button', 'dy-pulse__tray-item');
  button.type = 'button';
  button.setAttribute('aria-label', 'Remove ' + product.name + ' from compare');
  if (product.imageUrl) {
    const image = DY_HELPER.createElement('img');
    image.src = product.imageUrl;
    image.alt = '';
    button.appendChild(image);
  }
  const remove = DY_HELPER.createElement('span', '', '×');
  remove.setAttribute('aria-hidden', 'true');
  button.appendChild(remove);
  button.addEventListener('click', () => toggleCompare(product));
  return button;
};

const renderTray = () => {
  const count = STATE.compare.length;
  const emptySlots = Array.from({ length: MAX_COMPARE - count }, () => DY_HELPER.createElement('span', 'dy-pulse__tray-slot'));
  setVisible(ELEMENTS.tray, count > 0);
  ELEMENTS.stage.setAttribute('data-dy-comparing', count ? '1' : '0');
  ELEMENTS.trayItems.textContent = '';
  ELEMENTS.trayItems.append(...STATE.compare.map(createTrayItem), ...emptySlots);
  ELEMENTS.trayOpen.disabled = count < 2;
  ELEMENTS.trayOpen.textContent = 'Compare (' + count + ')';
};

const getCompareHighlights = () => {
  const priced = STATE.compare.filter(({ price }) => Number.isFinite(price));
  const cheapest = priced.reduce((best, product) => (!best || product.price < best.price ? product : best), null);
  const hasPriceSpread = priced.some(({ price }) => price !== cheapest?.price);
  const popular = STATE.compare.reduce((best, product) => (product.interestScore > (best?.interestScore ?? 0) ? product : best), null);
  return {
    cheapest: hasPriceSpread ? cheapest : null,
    popular: CONFIG.showSocialProof ? popular : null,
    maxPrice: Math.max(0, ...priced.map(({ price }) => price)),
    maxScore: Math.max(0, ...STATE.compare.map(({ interestScore }) => interestScore)),
  };
};

const getCompareSlot = (index, count) => {
  const isNarrow = STATE.width <= NARROW_WIDTH;
  const column = STATE.width / Math.max(1, count);
  return {
    x: column * (index + 0.5),
    y: STATE.height * (isNarrow ? 0.29 : 0.32),
    r: Math.min(column * (isNarrow ? 0.34 : 0.24), STATE.height * (isNarrow ? 0.09 : 0.13)),
    width: column,
  };
};

const createCompareBar = (label, value, ratio, modifier) => {
  const bar = DY_HELPER.createElement('div', 'dy-pulse__bar' + (modifier ? ' dy-pulse__bar--' + modifier : ''));
  const head = DY_HELPER.createElement('div', 'dy-pulse__bar-head');
  const track = DY_HELPER.createElement('div', 'dy-pulse__bar-track');
  const fill = DY_HELPER.createElement('i');
  fill.style.setProperty('--dy-bar', Math.round(clamp(ratio, 0.04, 1) * 100) + '%');
  head.append(DY_HELPER.createElement('span', '', label), DY_HELPER.createElement('b', '', value || '—'));
  track.appendChild(fill);
  bar.append(head, track);
  return bar;
};

const createCompareTags = (product, { cheapest, popular }) => {
  const tags = DY_HELPER.createElement('div', 'dy-pulse__compare-tags');
  if (product === cheapest) tags.appendChild(DY_HELPER.createElement('span', 'dy-pulse__compare-tag dy-pulse__compare-tag--best', 'Best price'));
  if (product === popular) tags.appendChild(DY_HELPER.createElement('span', 'dy-pulse__compare-tag dy-pulse__compare-tag--heat', 'Most popular'));
  return tags;
};

const createCompareCard = (product, highlights) => {
  const card = DY_HELPER.createElement('article', 'dy-pulse__compare-card');
  const remove = DY_HELPER.createElement('button', 'dy-pulse__compare-remove', '×');
  const view = DY_HELPER.createElement('button', 'dy-pulse__compare-view', 'View product');
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Remove ' + product.name + ' from compare');
  remove.addEventListener('click', () => {
    toggleCompare(product);
    if (STATE.isCompareOpen) ELEMENTS.compareClose.focus();
  });
  view.type = 'button';
  view.addEventListener('click', () => openProduct(product));
  const priceRatio = highlights.maxPrice ? product.price / highlights.maxPrice : 0;
  card.append(
    remove,
    DY_HELPER.createElement('b', 'dy-pulse__compare-name', product.name),
    DY_HELPER.createElement('span', 'dy-pulse__compare-meta', product.categories[product.categories.length - 1]),
    DY_HELPER.createElement('span', 'dy-pulse__compare-price', formatPrice(product.price) || '—'),
    createCompareBar('Price', formatPrice(product.price), priceRatio, product === highlights.cheapest ? 'best' : ''),
  );
  if (CONFIG.showSocialProof) {
    const ratio = highlights.maxScore ? product.interestScore / highlights.maxScore : 0;
    card.appendChild(createCompareBar('Popularity', describeInterest(product) || 'No data yet', ratio, 'heat'));
  }
  card.appendChild(view);
  return card;
};

const createCompareColumn = (product, index, highlights) => {
  const column = DY_HELPER.createElement('section', 'dy-pulse__compare-col');
  const hero = DY_HELPER.createElement('button', 'dy-pulse__compare-hero');
  hero.type = 'button';
  hero.setAttribute('aria-label', 'View ' + product.name);
  hero.addEventListener('click', () => openProduct(product));
  column.style.setProperty('--dy-delay', index * 90 + 'ms');
  column.append(createCompareTags(product, highlights), hero, createCompareCard(product, highlights));
  return column;
};

const positionCompareStage = () => {
  const count = STATE.compareCount;
  queryAll(LIST_SELECTORS.compareColumns).forEach((column, index) => {
    const slot = getCompareSlot(index, count);
    column.style.setProperty('--dy-x', slot.x + 'px');
    column.style.setProperty('--dy-y', slot.y + 'px');
    column.style.setProperty('--dy-r', slot.r + 'px');
    column.style.setProperty('--dy-w', slot.width + 'px');
  });
  queryAll(LIST_SELECTORS.compareMarkers).forEach((marker, index) => {
    const slot = getCompareSlot(index, count);
    marker.style.setProperty('--dy-x', slot.x + slot.width / 2 + 'px');
    marker.style.setProperty('--dy-y', slot.y + 'px');
  });
};

const renderCompareStage = () => {
  const highlights = getCompareHighlights();
  const markers = STATE.compare.slice(1).map(() => DY_HELPER.createElement('span', 'dy-pulse__compare-vs', 'vs'));
  STATE.compareCount = STATE.compare.length;
  STATE.compare.forEach((product, index) => product.setCompareSlot(index));
  ELEMENTS.compareSub.textContent = 'Comparing ' + STATE.compareCount + ' products';
  ELEMENTS.compareGrid.textContent = '';
  ELEMENTS.compareGrid.append(
    ...STATE.compare.map((product, index) => createCompareColumn(product, index, highlights)),
    ...markers,
  );
  positionCompareStage();
};

const closeCompare = () => {
  if (!STATE.isCompareOpen) return;
  STATE.isCompareOpen = false;
  ELEMENTS.compare.setAttribute('data-dy-animate', '0');
  ELEMENTS.stage.setAttribute('data-dy-compare-open', '0');
  clearTimeout(STATE.compareTimer);
  STATE.compareTimer = setTimeout(() => setVisible(ELEMENTS.compare, false), REDUCED_MOTION ? 0 : COMPARE_CLOSE_DELAY);
};

const openCompare = () => {
  if (STATE.compare.length < 2) return;
  clearTimeout(STATE.compareTimer);
  deselect();
  STATE.isCompareOpen = true;
  renderCompareStage();
  setVisible(ELEMENTS.compare, true);
  ELEMENTS.stage.setAttribute('data-dy-compare-open', '1');
  ELEMENTS.compare.getBoundingClientRect();
  ELEMENTS.compare.setAttribute('data-dy-animate', '1');
  ELEMENTS.compareClose.focus();
};

const renderCompare = () => {
  renderTray();
  syncCompareToggle();
  if (!STATE.isCompareOpen) return;
  if (STATE.compare.length < 2) closeCompare();
  else renderCompareStage();
};

const toggleCompare = (product) => {
  if (isCompared(product)) STATE.compare = STATE.compare.filter((item) => item !== product);
  else if (STATE.compare.length < MAX_COMPARE) STATE.compare = [...STATE.compare, product];
  renderCompare();
};

const loadSocialProof = async (products) => {
  if (!CONFIG.showSocialProof) return;
  const pending = products.filter(({ isInterestRequested }) => !isInterestRequested);
  if (!pending.length) return;
  pending.forEach((product) => product.markInterestRequested());
  await whenDyReady();
  const skus = pending.map(({ sku }) => sku);
  const [purchases, views] = await Promise.all([fetchInterest(skus, 'purchase'), fetchInterest(skus, 'view')]);
  pending.forEach((product) => product.setInterest(readInterest(purchases, product.sku, 'purchase'), readInterest(views, product.sku, 'view')));
  refreshHeat();
  renderChips();
  renderPinProof();
  if (STATE.isCompareOpen) renderCompareStage();
};

const onPriceInput = (event) => {
  let from = Number(ELEMENTS.priceMin.value);
  let to = Number(ELEMENTS.priceMax.value);
  if (from > to - SLIDER_MIN_GAP) {
    if (event.target === ELEMENTS.priceMin) from = to - SLIDER_MIN_GAP;
    else to = from + SLIDER_MIN_GAP;
  }
  STATE.priceMin = from <= 0 ? STATE.priceLow : fromSliderValue(from);
  STATE.priceMax = to >= SLIDER_MAX ? STATE.priceHigh : fromSliderValue(to);
  if (STATE.selected && !isInPriceRange(STATE.selected)) deselect();
  updatePriceUI();
};

const placePin = (item) => {
  const { pin } = ELEMENTS;
  if (!item) {
    pin.setAttribute('data-dy-placed', '0');
    return;
  }
  const pinWidth = pin.offsetWidth;
  const pinHeight = pin.offsetHeight;
  const offset = item.r * 1.45 + 12;
  const minX = STATE.padLeft + 8;
  let x = item.x - pinWidth / 2;
  let y = item.y - pinHeight / 2;
  if (item.x + offset + pinWidth <= STATE.width - 8) {
    x = item.x + offset;
  } else if (item.x - offset - pinWidth >= minX) {
    x = item.x - offset - pinWidth;
  } else {
    y = item.y + offset;
    if (y + pinHeight > STATE.height - 8) y = item.y - offset - pinHeight;
  }
  x = clamp(x, minX, Math.max(minX, STATE.width - pinWidth - 8));
  y = clamp(y, 8, STATE.height - STATE.padBottom - pinHeight - 8);
  pin.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  pin.setAttribute('data-dy-placed', '1');
};

const stepCameraAnimation = (time) => {
  const animation = STATE.cameraAnimation;
  if (!animation) return;
  const progress = Math.min(1, (time - animation.start) / animation.duration);
  STATE.camera.distance = animation.from + (animation.to - animation.from) * DY_HELPER.easeInOut(progress);
  if (progress >= 1) STATE.cameraAnimation = null;
};

const stepSpin = (time, dt) => {
  const { spin } = STATE;
  if (!spin) return;
  const progress = (time - spin.start) / spin.duration;
  if (progress >= 1) {
    STATE.spin = null;
    return;
  }
  STATE.camera.yaw += dt * 0.011 * Math.sin(Math.PI * progress);
  if (spin.isApplied || progress <= 0.32) return;
  spin.isApplied = true;
  spin.onMidway();
};

const stepInertia = (dt) => {
  const { inertia, camera } = STATE;
  if (!inertia || drag || STATE.cameraAnimation) return;
  const frames = dt / 16;
  const damping = 0.92 ** frames;
  camera.yaw += inertia.yaw * frames;
  camera.pitch = DY_HELPER.wrapAngle(camera.pitch + inertia.pitch * frames);
  inertia.yaw *= damping;
  inertia.pitch *= damping;
  if (Math.abs(inertia.yaw) + Math.abs(inertia.pitch) < 0.0004) STATE.inertia = null;
};

const stepAutoRotate = (dt) => {
  const isEnabled = CONFIG.autoRotate || STATE.isSearching;
  if (!isEnabled || REDUCED_MOTION || STATE.selected || drag || pinch || STATE.inertia) return;
  const speed = STATE.isSearching ? SEARCH_SPIN_SPEED : 1;
  STATE.camera.yaw += (TAU * dt / CONFIG.rotationDurationMs) * speed * (Math.cos(STATE.camera.pitch) < 0 ? -1 : 1);
};

const getRates = (dt) => {
  if (REDUCED_MOTION) {
    return {
      move: 1, fade: 1, highlight: 1, heat: 1, compare: 1,
    };
  }
  return {
    move: 1 - 0.0015 ** (dt / 1000),
    fade: Math.min(1, dt / 160),
    highlight: Math.min(1, dt / 140),
    heat: Math.min(1, dt / 700),
    compare: Math.min(1, dt / 600),
  };
};

const getViewport = () => {
  const {
    width, height, padTop, padBottom, padLeft,
  } = STATE;
  const isNarrow = width <= NARROW_WIDTH;
  const usableHeight = isNarrow
    ? Math.max(140, height - padTop - padBottom)
    : Math.max(140, height - 2 * Math.max(padTop, padBottom));
  const usableWidth = Math.max(160, width - 2 * padLeft);
  return {
    centerX: width / 2,
    centerY: isNarrow ? (padTop + height - padBottom) / 2 : height / 2,
    size: Math.min(usableWidth, usableHeight * 1.15) * 1.1,
  };
};

const project = ([x, y, z], viewport) => {
  const { yaw, pitch, distance } = STATE.camera;
  const rotatedX = x * Math.cos(yaw) - z * Math.sin(yaw);
  const rotatedZ = x * Math.sin(yaw) + z * Math.cos(yaw);
  const tiltedY = y * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + rotatedZ * Math.cos(pitch) + distance;
  if (depth < 40) return null;
  const scale = viewport.size / depth;
  return {
    x: viewport.centerX + rotatedX * scale,
    y: viewport.centerY + tiltedY * scale,
    scale,
    depth,
  };
};

const projectProduct = (product, viewport) => {
  const point = project(product.position, viewport);
  if (!point) return null;
  const fog = clamp((point.depth - STATE.camera.distance) / 320, 0, 1);
  const appear = Math.min(1, product.scale / 0.18);
  const focus = STATE.selected && product !== STATE.selected ? 0.55 : 1;
  const alpha = appear * (1 - 0.55 * fog) * (0.16 + 0.84 * product.rangeAlpha) * focus;
  const grow = 1 + 0.22 * product.heat;
  return {
    product,
    x: point.x,
    y: point.y,
    r: (20 * appear + 18 * product.scale) * point.scale * (0.45 + 0.55 * product.rangeAlpha) * (1 + 0.45 * product.highlight) * STATE.bubbleScale * grow,
    depth: point.depth,
    alpha: alpha + (1 - alpha) * product.highlight,
    isDimmed: product.rangeAlpha < 0.5,
  };
};

const projectHero = (product, viewport, rate) => {
  const hero = product.easeHero(getCompareSlot(product.compareSlot, STATE.compareCount), rate);
  const base = product.position && product.scale > 0.01 ? projectProduct(product, viewport) : null;
  const from = base ?? {
    x: hero.x, y: hero.y, r: 0, alpha: 0,
  };
  const mix = DY_HELPER.easeInOut(product.compareMix);
  const blend = (start, end) => start + (end - start) * mix;
  return {
    product,
    x: blend(from.x, hero.x),
    y: blend(from.y, hero.y),
    r: blend(from.r, hero.r),
    alpha: blend(from.alpha, 1),
    depth: -Infinity,
    isDimmed: false,
    isHero: true,
    mix,
  };
};

const projectProducts = (rate) => {
  const viewport = getViewport();
  const projected = [];
  const heroes = [];
  PRODUCTS.forEach((product) => {
    if (product.compareMix > 0) {
      heroes.push(projectHero(product, viewport, rate));
      return;
    }
    if (product.scale <= 0.01 || !product.position) return;
    const item = projectProduct(product, viewport);
    if (item && item.alpha > 0.03) projected.push(item);
  });
  projected.sort((a, b) => b.depth - a.depth);
  const selectedIndex = projected.findIndex(({ product }) => product === STATE.selected);
  if (selectedIndex >= 0) projected.push(...projected.splice(selectedIndex, 1));
  return [...projected, ...heroes];
};

const canShowPriceLabel = ({
  product, depth, r, isDimmed, isHero,
}) => !isDimmed
  && !isHero
  && depth <= STATE.camera.distance + 10
  && r >= 10
  && product !== STATE.selected
  && Number.isFinite(product.price);

const choosePriceLabels = (projected) => {
  const shown = new Set();
  if (!CONFIG.showPrices || STATE.isCompareOpen) return shown;
  const boxes = [];
  [...projected].sort((a, b) => a.depth - b.depth).forEach((item) => {
    if (shown.size >= MAX_PRICE_LABELS || !canShowPriceLabel(item)) return;
    const box = {
      x: item.x - 30, y: item.y + item.r, width: 60, height: 24,
    };
    if (boxes.some((other) => DY_HELPER.overlaps(box, other))) return;
    boxes.push(box);
    shown.add(item.product);
  });
  return shown;
};

const drawPriceLabel = (text, x, y) => {
  context.font = '700 12px ' + STATE.font;
  const width = context.measureText(text).width + 22;
  const height = 22;
  context.fillStyle = 'rgba(255,255,255,.94)';
  DY_HELPER.roundRect(context, x - width / 2, y - height / 2, width, height, 11);
  context.fill();
  context.strokeStyle = 'rgba(21,24,26,.1)';
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = '#15181A';
  context.textAlign = 'left';
  context.fillText(text, x - width / 2 + 11, y + 4.5);
};

const drawHeatGlow = ({
  product, x, y, r, alpha,
}, time) => {
  if (product.heat < 0.05) return;
  const beat = REDUCED_MOTION ? 0.5 : (Math.sin(time / 380 + product.phase) + 1) / 2;
  const radius = r * (1.3 + 0.3 * product.heat + 0.12 * beat);
  const glow = context.createRadialGradient(x, y, r * 0.7, x, y, radius);
  glow.addColorStop(0, 'rgba(' + STATE.heatRgb + ',.55)');
  glow.addColorStop(1, 'rgba(' + STATE.heatRgb + ',0)');
  context.globalAlpha = alpha * product.heat * (0.6 + 0.4 * beat);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
};

const drawCompareBadge = (x, y, number, alpha) => {
  context.globalAlpha = alpha;
  context.fillStyle = STATE.accent;
  context.beginPath();
  context.arc(x, y, 9, 0, TAU);
  context.fill();
  context.font = '800 11px ' + STATE.font;
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.fillText(String(number), x, y + 4);
};

const drawHeroHalo = ({
  x, y, r, mix,
}) => {
  context.save();
  context.globalAlpha = mix;
  context.shadowColor = 'rgba(20,22,24,.22)';
  context.shadowBlur = 36;
  context.shadowOffsetY = 14;
  context.fillStyle = '#fff';
  traceShape(context, x, y - r * 0.03, r * 1.12);
  context.fill();
  context.restore();
};

const drawBackdrop = () => {
  if (STATE.backdrop <= 0) return;
  const centerX = STATE.width / 2;
  const centerY = STATE.height * 0.35;
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(STATE.width, STATE.height));
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.78, STATE.background);
  context.globalAlpha = 0.86 * DY_HELPER.easeInOut(STATE.backdrop);
  context.fillStyle = gradient;
  context.fillRect(0, 0, STATE.width, STATE.height);
};

const drawProduct = (item, time) => {
  const {
    product, x, y, r, alpha, isHero,
  } = item;
  drawHeatGlow(item, time);
  if (isHero) drawHeroHalo(item);
  context.globalAlpha = alpha;
  context.drawImage(product.bubble, x - 1.25 * r, y - 1.1875 * r, 2.5 * r, 2.5 * r);
  const compareIndex = STATE.compare.indexOf(product);
  if (compareIndex >= 0 && !isHero) drawCompareBadge(x + r * 0.72, y - r * 0.72, compareIndex + 1, alpha);
  const labelAlpha = product.priceAlpha * alpha;
  if (labelAlpha <= 0.02) return;
  context.globalAlpha = labelAlpha;
  drawPriceLabel(formatPrice(product.price), x, y + r + 12);
};

const strokeShape = (x, y, half) => {
  traceShape(context, x, y, half);
  context.stroke();
};

const drawSelectionRing = (item, time) => {
  const pulse = (Math.sin(time / 260) + 1) / 2;
  const { highlight } = item.product;
  context.strokeStyle = STATE.accent;
  context.lineWidth = 2.5;
  context.globalAlpha = highlight;
  strokeShape(item.x, item.y, item.r + 6);
  context.lineWidth = 1.5;
  context.globalAlpha = highlight * (0.45 - 0.4 * pulse);
  strokeShape(item.x, item.y, item.r + 10 + pulse * 9);
  context.globalAlpha = 1;
};

const drawScene = (time, rates) => {
  context.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
  context.clearRect(0, 0, STATE.width, STATE.height);
  STATE.projected = projectProducts(rates.move);
  const priceLabels = choosePriceLabels(STATE.projected);
  STATE.projected.forEach(({ product }) => product.fadePriceLabel(priceLabels.has(product), rates.fade));
  STATE.projected.filter(({ isHero }) => !isHero).forEach((item) => drawProduct(item, time));
  drawBackdrop();
  STATE.projected.filter(({ isHero }) => isHero).forEach((item) => drawProduct(item, time));
  context.globalAlpha = 1;
  const selected = STATE.projected.find(({ product }) => product === STATE.selected);
  if (selected) drawSelectionRing(selected, time);
  if (STATE.selected) placePin(selected);
  ELEMENTS.canvas.classList.toggle('is-pointer', Boolean(STATE.hovered) && !drag);
};

const renderFrame = (time) => {
  frameId = 0;
  const dt = Math.min(64, time - lastFrameTime);
  lastFrameTime = time;
  if (STATE.relayoutPending && !STATE.spin) {
    STATE.relayoutPending = false;
    layout(false);
  }
  stepCameraAnimation(time);
  stepSpin(time, dt);
  stepInertia(dt);
  stepAutoRotate(dt);
  const rates = getRates(dt);
  STATE.backdrop = clamp(STATE.backdrop + (STATE.isCompareOpen ? rates.compare : -rates.compare), 0, 1);
  PRODUCTS.forEach((product) => {
    product.step(rates, isInPriceRange(product), product === STATE.selected, STATE.isCompareOpen && isCompared(product));
  });
  drawScene(time, rates);
  if (!STATE.spin) PRODUCTS.forEach((product) => product.releaseIfHidden());
  if (STATE.isVisible) frameId = window.requestAnimationFrame(renderFrame);
};

const requestRender = () => {
  if (frameId || !STATE.isVisible) return;
  lastFrameTime = window.performance.now();
  frameId = window.requestAnimationFrame(renderFrame);
};

const getPointerPosition = (event) => {
  const rect = ELEMENTS.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

const pickProduct = ({ x, y }) => {
  let picked = null;
  let pickedDistance = Infinity;
  if (STATE.isCompareOpen) return picked;
  STATE.projected.forEach((item) => {
    if (item.isDimmed) return;
    const dx = Math.abs(item.x - x);
    const dy = Math.abs(item.y - y);
    const distance = CONFIG.isSquare ? Math.max(dx, dy) : Math.hypot(dx, dy);
    if (distance >= Math.max(10, item.r + 3) || distance >= pickedDistance) return;
    pickedDistance = distance;
    picked = item.product;
  });
  return picked;
};

const getPinchDistance = () => {
  const [first, second] = [...POINTERS.values()];
  return Math.hypot(first.x - second.x, first.y - second.y);
};

const dragCamera = (event) => {
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (drag.moved <= 5) return;
  const { canvas } = ELEMENTS;
  const { camera } = STATE;
  if (!canvas.hasPointerCapture(event.pointerId)) canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('is-grabbing');
  const yawDelta = dx * 0.006 * (Math.cos(camera.pitch) < 0 ? -1 : 1);
  const pitchDelta = dy * 0.004;
  camera.yaw += yawDelta;
  camera.pitch = DY_HELPER.wrapAngle(camera.pitch + pitchDelta);
  STATE.cameraAnimation = null;
  STATE.inertia = {
    yaw: clamp(yawDelta, -0.08, 0.08),
    pitch: clamp(pitchDelta, -0.06, 0.06),
    time: window.performance.now(),
  };
};

const onPointerDown = (event) => {
  POINTERS.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (POINTERS.size === 2) {
    pinch = { last: getPinchDistance() };
    drag = null;
    return;
  }
  STATE.inertia = null;
  drag = { x: event.clientX, y: event.clientY, moved: 0 };
  ELEMENTS.hint.setAttribute('data-dy-dimmed', '1');
};

const onPointerMove = (event) => {
  if (POINTERS.has(event.pointerId)) POINTERS.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch) {
    if (POINTERS.size !== 2) return;
    const distance = Math.max(1, getPinchDistance());
    zoomBy(distance / pinch.last);
    pinch.last = distance;
    return;
  }
  if (drag) {
    dragCamera(event);
    return;
  }
  if (event.pointerType === 'mouse') STATE.hovered = pickProduct(getPointerPosition(event));
};

const onTap = (event) => {
  const product = pickProduct(getPointerPosition(event));
  if (!product) {
    deselect();
    return;
  }
  if (product === STATE.selected) openProduct(product);
  else select(product);
};

const onPointerEnd = (event) => {
  const endedDrag = drag;
  POINTERS.delete(event.pointerId);
  if (POINTERS.size < 2) pinch = null;
  ELEMENTS.canvas.classList.remove('is-grabbing');
  drag = null;
  if (!endedDrag || POINTERS.size) return;
  if (STATE.inertia && window.performance.now() - STATE.inertia.time > 90) STATE.inertia = null;
  if (endedDrag.moved >= 6 || event.type === 'pointercancel') return;
  onTap(event);
};

const onWheel = (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  zoomBy(Math.exp(-event.deltaY * 0.0015));
};

const bindPointerEvents = () => {
  const { canvas } = ELEMENTS;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('pointerleave', () => {
    STATE.hovered = null;
  });
  canvas.addEventListener('wheel', onWheel, { passive: false });
  CONTAINER.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (STATE.isCompareOpen) closeCompare();
    else deselect();
  });
};

const bindControls = () => {
  setVisible(ELEMENTS.shuffle, canShuffle());
  ELEMENTS.shuffle.addEventListener('click', reshuffle);
  queryAll(LIST_SELECTORS.zoomButtons).forEach((button) => {
    button.addEventListener('click', () => zoomBy(button.dataset.zoom === 'in' ? 1.25 : 0.8));
  });
  ELEMENTS.pinClose.addEventListener('click', deselect);
  ELEMENTS.viewButton.addEventListener('click', () => {
    if (STATE.selected) openProduct(STATE.selected);
  });
  setVisible(ELEMENTS.similar, canShowSimilar());
  ELEMENTS.similar.addEventListener('click', showSimilar);
  ELEMENTS.resetResults.addEventListener('click', resetResults);
  setVisible(ELEMENTS.groups, CONFIG.showGroupControls);
  queryAll(LIST_SELECTORS.groupButtons).forEach((button) => {
    button.addEventListener('click', () => setGroup(button.dataset.dyGroup));
  });
  setVisible(ELEMENTS.colorGroup, false);
  setVisible(ELEMENTS.range, CONFIG.showPriceControl);
  ELEMENTS.priceMin.addEventListener('input', onPriceInput);
  ELEMENTS.priceMax.addEventListener('input', onPriceInput);
};

const bindCompare = () => {
  setVisible(ELEMENTS.compareToggle, CONFIG.showCompare);
  if (!CONFIG.showCompare) return;
  ELEMENTS.compareToggle.addEventListener('click', () => {
    if (STATE.selected) toggleCompare(STATE.selected);
  });
  ELEMENTS.trayOpen.addEventListener('click', openCompare);
  ELEMENTS.compareClose.addEventListener('click', closeCompare);
  ELEMENTS.compare.addEventListener('click', (event) => {
    if (event.target === ELEMENTS.compare || event.target === ELEMENTS.compareGrid) closeCompare();
  });
};

const bindSearch = () => {
  setVisible(ELEMENTS.search, CONFIG.showSearch);
  if (!CONFIG.showSearch) return;
  ELEMENTS.search.addEventListener('submit', (event) => {
    event.preventDefault();
    searchProducts(ELEMENTS.searchInput.value);
  });
};

const resizeCanvas = () => {
  const { stage, canvas } = ELEMENTS;
  const rect = stage.getBoundingClientRect();
  STATE.width = Math.max(1, rect.width);
  STATE.height = Math.max(1, rect.height);
  STATE.dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(STATE.width * STATE.dpr);
  canvas.height = Math.round(STATE.height * STATE.dpr);
  measureControls();
  if (STATE.isCompareOpen) positionCompareStage();
};

const observeStage = () => {
  if (window.ResizeObserver) new window.ResizeObserver(resizeCanvas).observe(ELEMENTS.stage);
  else window.addEventListener('resize', resizeCanvas);
  if (!window.IntersectionObserver) return;
  new window.IntersectionObserver(([entry]) => {
    STATE.isVisible = entry.isIntersecting;
    requestRender();
  }).observe(ELEMENTS.stage);
};

const readTheme = () => {
  const styles = window.getComputedStyle(CONTAINER);
  STATE.font = styles.fontFamily || 'system-ui, sans-serif';
  STATE.accent = styles.getPropertyValue('--pulse-accent').trim() || '#15181A';
  STATE.background = styles.getPropertyValue('--pulse-bg').trim() || '#F1EEE8';
  STATE.heatRgb = styles.getPropertyValue('--pulse-heat-rgb').trim() || '232, 96, 44';
};

const init = () => {
  if (!CONTAINER) return;
  cacheElements();
  context = ELEMENTS.canvas.getContext?.('2d') ?? null;
  STATE.items = [...new Set(readTemplateProducts())];
  if (!context || STATE.items.length < MIN_PRODUCTS) {
    CONTAINER.classList.add('dy-pulse--fallback');
    return;
  }
  readTheme();
  bindPointerEvents();
  bindControls();
  bindCompare();
  bindSearch();
  resizeCanvas();
  observeStage();
  setTimeout(() => {
    STATE.imagesSettled = true;
    checkColorSupport();
  }, 6000);
  if (STATE.groupBy === 'color') STATE.groupBy = 'category';
  syncGroupButtons();
  layout(true);
  requestRender();
  loadSocialProof(STATE.items);
};

init();
