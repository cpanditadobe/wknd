import {
  sampleRUM,
  buildBlock,
  getAllMetadata,
  getMetadata,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
} from './lib-franklin.js';
import {
  analyticsTrack404,
  analyticsTrackConversion,
  analyticsTrackCWV,
  analyticsTrackError,
  initAnalyticsTrackingQueue,
  setupAnalyticsTrackingWithAlloy,
} from './analytics/lib-analytics.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
let externalAssetHost = "delivery-p131604-e1282152";

window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

// Define the custom audiences mapping for experience decisioning
const AUDIENCES = {
  mobile: () => window.innerWidth < 600,
  desktop: () => window.innerWidth >= 600,
  'new-visitor': () => !localStorage.getItem('franklin-visitor-returning'),
  'returning-visitor': () => !!localStorage.getItem('franklin-visitor-returning'),
};

window.hlx.plugins.add('rum-conversion', {
  url: '/plugins/rum-conversion/src/index.js',
  load: 'lazy',
});

window.hlx.plugins.add('experimentation', {
  condition: () => getMetadata('experiment')
    || Object.keys(getAllMetadata('campaign')).length
    || Object.keys(getAllMetadata('audience')).length,
  options: { audiences: AUDIENCES },
  load: 'eager',
  url: '/plugins/experimentation/src/index.js',
});

/**
 * Determine if we are serving content for the block-library, if so don't load the header or footer
 * @returns {boolean} True if we are loading block library content
 */
export function isBlockLibrary() {
  return window.location.pathname.includes('block-library');
}

/**
 * Convience method for creating tags in one line of code
 * @param {string} tag Tag to create
 * @param {object} attributes Key/value object of attributes
 * @param {HTMLElement | HTMLElement[] | string} children Child element
 * @returns {HTMLElement} The created tag
 */
export function createTag(tag, attributes, children) {
  const element = document.createElement(tag);
  if (children) {
    if (children instanceof HTMLElement
      || children instanceof SVGElement
      || children instanceof DocumentFragment) {
      element.append(children);
    } else if (Array.isArray(children)) {
      element.append(...children);
    } else {
      element.insertAdjacentHTML('beforeend', children);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      element.setAttribute(key, val);
    });
  }
  return element;
}

function buildHeroBlock(main) {
  const h1 = main.querySelector('main > div > h1');
  const picture = main.querySelector('main > div > p > picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

function patchDemoBlocks(config) {
  if (window.wknd.demoConfig.blocks && window.wknd.demoConfig.blocks[config.blockName]) {
    const url = window.wknd.demoConfig.blocks[config.blockName];
    const splits = new URL(url).pathname.split('/');
    const [, owner, repo, , branch] = splits;
    const path = splits.slice(5).join('/');

    const franklinPath = `https://little-forest-58aa.david8603.workers.dev/?url=https://${branch}--${repo}--${owner}.hlx.live/${path}`;
    return {
      ...config,
      jsPath: `${franklinPath}/${config.blockName}.js`,
      cssPath: `${franklinPath}/${config.blockName}.css`,
    };
  }
  return (config);
}

async function loadDemoConfig() {
  const demoConfig = {};
  const pathSegments = window.location.pathname.split('/');
  if (window.location.pathname.startsWith('/drafts/') && pathSegments.length > 4) {
    const demoBase = pathSegments.slice(0, 4).join('/');
    const resp = await fetch(`${demoBase}/theme.json?sheet=default&sheet=blocks&`);
    if (resp.status === 200) {
      const json = await resp.json();
      const tokens = json.data || json.default.data;
      const root = document.querySelector(':root');
      tokens.forEach((e) => {
        root.style.setProperty(`--${e.token}`, `${e.value}`);
        demoConfig[e.token] = e.value;
      });
      demoConfig.tokens = tokens;
      demoConfig.demoBase = demoBase;
      const blocks = json.blocks ? json.blocks.data : [];
      demoConfig.blocks = {};
      blocks.forEach((block) => {
        demoConfig.blocks[block.name] = block.url;
      });

      window.hlx.patchBlockConfig.push(patchDemoBlocks);
    }

    if (!demoConfig.demoBase) {
      const navCheck = await fetch(`${demoBase}/nav.plain.html`);
      if (navCheck.status === 200) {
        demoConfig.demoBase = demoBase;
      }
    }
  }
  window.wknd = window.wknd || {};
  window.wknd.demoConfig = demoConfig;
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {

    // decorate external images with explicit external image marker
    decorateExternalImages(main, '//External Image//');

    // decorate external images with implicit external image marker
    decorateExternalImages(main);

  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);

  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

function decorateExternalImages(ele, deliveryMarker) {
  const extImages = ele.querySelectorAll('a');
  extImages.forEach((extImage) => {
    if (isExternalImage(extImage, deliveryMarker)) {
      const extImageSrc = extImage.getAttribute('href');
      const extPicture = createOptimizedPicture(extImageSrc);

      /* copy query params from link to img */
      const extImageUrl = new URL(extImageSrc);
      const { searchParams } = extImageUrl;
      extPicture.querySelectorAll('source, img').forEach((child) => {
        if (child.tagName === 'SOURCE') {
          const srcset = child.getAttribute('srcset');
          if (srcset) {
              const queryParams = appendQueryParams(new URL(srcset, extImageSrc), searchParams);
              if (srcset.includes("/is/image/")) {
                child.setAttribute('srcset', queryParams.replaceAll("%24", "$"));
              } else {
                child.setAttribute('srcset', queryParams);
              }   
          }
        } else if (child.tagName === 'IMG') {
          const src = child.getAttribute('src');
          if (src) {
            const queryParams = appendQueryParams(new URL(src, extImageSrc), searchParams);
            if (src.includes("/is/image/")) {
              child.setAttribute('src', queryParams.replaceAll("%24", "$"));
            } else {
              child.setAttribute('src', queryParams);
            }  
          }
        }
      });
      extImage.parentNode.replaceChild(extPicture, extImage);
    }
  });
}

function isExternalImage(element, externalImageMarker) {
  // if the element is not an anchor, it's not an external image
  if (element.tagName !== 'A') return false;

  // if the element is an anchor with the external image marker as text content,
  // it's an external image
  if (element.textContent.trim() === externalImageMarker) {
    return true;
  }

  // if the element is an anchor with the href as text content and the href has
  // an image extension, it's an external image
  if ((element.textContent.trim() === element.getAttribute('href')) || element.getAttribute('href').includes(externalAssetHost)) {
    const ext = getUrlExtension(element.getAttribute('href'));
    return (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase()) || element.getAttribute('href').includes('/is/image/'));
  }

  return false;
}

/**
 * Gets the extension of a URL.
 * @param {string} url The URL
 * @returns {string} The extension
 * @private
 * @example
 * get_url_extension('https://example.com/foo.jpg');
 * // returns 'jpg'
 * get_url_extension('https://example.com/foo.jpg?bar=baz');
 * // returns 'jpg'
 * get_url_extension('https://example.com/foo');
 * // returns ''
 * get_url_extension('https://example.com/foo.jpg#qux');
 * // returns 'jpg'
 */
function getUrlExtension(url) {
  return url.split(/[#?]/)[0].split('.').pop().trim();
}

/*
  * Appends query params to a URL
  * @param {string} url The URL to append query params to
  * @param {object} params The query params to append
  * @returns {string} The URL with query params appended
  * @private
  * @example
  * appendQueryParams('https://example.com', { foo: 'bar' });
  * // returns 'https://example.com?foo=bar'
*/
function appendQueryParams(url, params) {
  const { searchParams } = url;
  params.forEach((value, key) => {
    searchParams.set(key, value);
  });
  url.search = searchParams.toString();
  return url.toString();
}

export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]) {
  const isAbsoluteUrl = /^https?:\/\//i.test(src);

  // Fallback to createOptimizedPicture if src is not an absolute URL
  if (!isAbsoluteUrl) return libCreateOptimizedPicture(src, alt, eager, breakpoints);

  const url = new URL(src);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    const searchParams = new URLSearchParams({ width: br.width, format: 'webply' });
    source.setAttribute('srcset', appendQueryParams(url, searchParams));
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    const searchParams = new URLSearchParams({ width: br.width, format: ext });

    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', appendQueryParams(url, searchParams));
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', appendQueryParams(url, searchParams));
    }
  });

  return picture;
}
/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  await window.hlx.plugins.run('loadEager');

  // load demo config
  await loadDemoConfig();

  const main = doc.querySelector('main');
  if (main) {
    await initAnalyticsTrackingQueue();
    decorateMain(main);
    await waitForLCP(LCP_BLOCKS);
  }

  const smartCrop = document.createElement('script');
  smartCrop.type = 'text/javascript'; 
  smartCrop.src = 'https://s7ap1.scene7.com/s7viewers/html5/js/SmartCropVideoViewer.js';
  if(document.getElementsByTagName('head')[0] != null)
    document.getElementsByTagName('head')[0].appendChild(smartCrop);

}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }


}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  if (!isBlockLibrary()) {
    loadHeader(doc.querySelector('header'));
    loadFooter(doc.querySelector('footer'));
  }

  if (window.wknd.demoConfig.fonts) {
    const fonts = window.wknd.demoConfig.fonts.split('\n');
    fonts.forEach(async (font) => {
      const [family, url] = font.split(': ');
      const ff = new FontFace(family, `url('${url}')`);
      await ff.load();
      document.fonts.add(ff);
    });
  } else {
    loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  }
  addFavIcon(`${window.wknd.demoConfig.demoBase || window.hlx.codeBasePath}/favicon.png`);
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));

  // Mark customer as having viewed the page once
  localStorage.setItem('franklin-visitor-returning', true);

  window.hlx.plugins.run('loadLazy');
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => {
    window.hlx.plugins.load('delayed');
    window.hlx.plugins.run('loadDelayed');
    return import('./delayed.js');
  }, 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await window.hlx.plugins.load('eager');
  await loadEager(document);
  await window.hlx.plugins.load('lazy');
  await loadLazy(document);
  const setupAnalytics = setupAnalyticsTrackingWithAlloy(document);
  loadDelayed();
  await setupAnalytics;
}

const cwv = {};

// Forward the RUM CWV cached measurements to edge using WebSDK before the page unloads
window.addEventListener('beforeunload', () => {
  if (!Object.keys(cwv).length) return;
  analyticsTrackCWV(cwv);
});

// Callback to RUM CWV checkpoint in order to cache the measurements
sampleRUM.always.on('cwv', async (data) => {
  if (!data.cwv) return;
  Object.assign(cwv, data.cwv);
});

sampleRUM.always.on('404', analyticsTrack404);
sampleRUM.always.on('error', analyticsTrackError);

// Declare conversionEvent, bufferTimeoutId and tempConversionEvent,
// outside the convert function to persist them for buffering between
// subsequent convert calls
const CONVERSION_EVENT_TIMEOUT_MS = 100;
let bufferTimeoutId;
let conversionEvent;
let tempConversionEvent;
sampleRUM.always.on('convert', (data) => {
  const { element } = data;
  // eslint-disable-next-line no-undef
  if (!element || !alloy) {
    return;
  }

  if (element.tagName === 'FORM') {
    conversionEvent = {
      ...data,
      event: 'Form Complete',
    };

    if (conversionEvent.event === 'Form Complete'
      // Check for undefined, since target can contain value 0 as well, which is falsy
      && (data.target === undefined || data.source === undefined)
    ) {
      // If a buffer has already been set and tempConversionEvent exists,
      // merge the two conversionEvent objects to send to alloy
      if (bufferTimeoutId && tempConversionEvent) {
        conversionEvent = { ...tempConversionEvent, ...conversionEvent };
      } else {
        // Temporarily hold the conversionEvent object until the timeout is complete
        tempConversionEvent = { ...conversionEvent };

        // If there is partial form conversion data,
        // set the timeout buffer to wait for additional data
        bufferTimeoutId = setTimeout(async () => {
          analyticsTrackConversion({ ...conversionEvent });
          tempConversionEvent = undefined;
          conversionEvent = undefined;
        }, CONVERSION_EVENT_TIMEOUT_MS);
      }
    }
    return;
  }

  analyticsTrackConversion({ ...data });
  tempConversionEvent = undefined;
  conversionEvent = undefined;
});

loadPage();
