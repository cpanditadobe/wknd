/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

function embedYoutube(url, replacePlaceholder, autoplay) {
    const usp = new URLSearchParams(url.search);
    let suffix = '';
    if (replacePlaceholder || autoplay) {
      const suffixParams = {
        autoplay: '1',
        mute: autoplay ? '1' : '0',
        controls: autoplay ? '0' : '1',
        disablekb: autoplay ? '1' : '0',
        loop: autoplay ? '1' : '0',
        playsinline: autoplay ? '1' : '0',
      };
      suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    }
    let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
    const embed = url.pathname;
    if (url.origin.includes('youtu.be')) {
      [, vid] = url.pathname.split('/');
    }
  
    const temp = document.createElement('div');
    temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
        <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
      </div>`;
    return temp.children.item(0);
  }
  
  function embedVimeo(url, replacePlaceholder, autoplay) {
    const [, video] = url.pathname.split('/');
    let suffix = '';
    if (replacePlaceholder || autoplay) {
      const suffixParams = {
        autoplay: '1',
        background: autoplay ? '1' : '0',
      };
      suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    }
    const temp = document.createElement('div');
    temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
        <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
        style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
        frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
        title="Content from Vimeo" loading="lazy"></iframe>
      </div>`;
    return temp.children.item(0);
  }
  
  function getVideoElement(source, replacePlaceholder, autoplay) {
    const video = document.createElement('video');
    video.setAttribute('controls', '');
    video.dataset.loading = 'true';
    video.addEventListener('loadedmetadata', () => delete video.dataset.loading);
    if (autoplay || replacePlaceholder) {
      video.setAttribute('autoplay', '');
      if (autoplay) {
        video.setAttribute('loop', '');
        video.setAttribute('playsinline', '');
        video.removeAttribute('controls');
        video.addEventListener('canplay', () => {
          video.muted = true;
          video.play();
        });
      }
    }
  
    const sourceEl = document.createElement('source');
    sourceEl.setAttribute('src', source);
    sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);
    video.append(sourceEl);
  
    return video;
  }
  
 /*const loadVideoEmbed = (block, link, replacePlaceholder, autoplay) => {
    if (block.dataset.embedIsLoaded) {
      return;
    }
    const url = new URL(link);
  
    const isYoutube = link.includes('youtube') || link.includes('youtu.be');
    const isVimeo = link.includes('vimeo');
    const isMp4 = link.includes('.mp4');
  
    let embedEl;
    if (isYoutube) {
      embedEl = embedYoutube(url, replacePlaceholder, autoplay);
    } else if (isVimeo) {
      embedEl = embedVimeo(url, replacePlaceholder, autoplay);
    } else if (isMp4) {
      embedEl = getVideoElement(link, replacePlaceholder, autoplay);
    }
    block.replaceChildren(embedEl);
  
    block.dataset.embedIsLoaded = true;
  };*/
  
  /*export default async function decorate(block) {
    const placeholder = block.querySelector('picture');
    const link = block.querySelector('a').href;
    block.textContent = '';
  
    if (placeholder) {
      const wrapper = document.createElement('div');
      wrapper.className = 'video-placeholder';
      wrapper.innerHTML = '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>';
      wrapper.prepend(placeholder);
      wrapper.addEventListener('click', () => {
        loadVideoEmbed(block, link, true, false);
      });
      block.append(wrapper);
    } else {
      block.classList.add('lazy-loading');
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadVideoEmbed(block, link, false, block.classList.contains('autoplay'));
          block.classList.remove('lazy-loading');
        }
      });
      observer.observe(block);
    }
  }*/

  export default async function decorate(block) {
      const placeholder = block.querySelector('picture');
      const link = block.querySelector('a').href;
      block.textContent = '';
    
      if (placeholder) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-placeholder';
        wrapper.innerHTML = '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>';
        wrapper.prepend(placeholder);
        wrapper.addEventListener('click', () => {
          loadVideoEmbed(block, link, true, false);
        });
        block.append(wrapper);
      } else {
        block.classList.add('lazy-loading');
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            loadVideoEmbed(block, link, false, block.classList.contains('autoplay'));
            block.classList.remove('lazy-loading');
          }
        });
        observer.observe(block);
      }
    }

  function getDivElement(source, replacePlaceholder, autoplay) {
    const s7div = document.createElement('div');
    // s7div.setAttribute('id','s7video_div');
    s7div.setAttribute('id','s7smartcropvideo_div');
    // s7div.setAttribute('class','msil');
    s7div.setAttribute('class','msil-smart');
    return s7div;
  }

  const loadVideoEmbed = (block, link, replacePlaceholder, autoplay) => {
    if (block.dataset.embedIsLoaded) {
      return;
    }
    const url = new URL(link);
  
    const isYoutube = link.includes('youtube') || link.includes('youtu.be');
    const isVimeo = link.includes('vimeo');
    const isMp4 = link.includes('.mp4');
    const isScene7 = link.includes('scene7');

    let embedEl;
    if (isYoutube) {
      embedEl = embedYoutube(url, replacePlaceholder, autoplay);
    } else if (isVimeo) {
      embedEl = embedVimeo(url, replacePlaceholder, autoplay);
    } else if (isMp4) {
      embedEl = getVideoElement(link, replacePlaceholder, autoplay);
    } else if (isScene7) {
      embedEl = getDivElement(link, replacePlaceholder, autoplay);
    }

    if(isScene7){

      /*var s7videoviewer = new s7viewers.VideoViewer({
        "containerId" : "s7video_div",
        "params" : { 
          "serverurl" : "https://s7ap1.scene7.com/is/image/",
          "contenturl" : "https://s7ap1.scene7.com/is/content/", 
          "config" : "nagarrosoftwarepvtltd/MSIL",
          "posterimage": "nagarrosoftwarepvtltd/marutibrezza-AVS",
          "videoserverurl": "https://s7ap1.scene7.com/is/content",
          "asset" : "nagarrosoftwarepvtltd/marutibrezza-AVS" }
      })
      s7videoviewer.init(); */

      var s7smartcropvideoviewer = new s7viewers.SmartCropVideoViewer({
        "containerId" : "s7smartcropvideo_div",
        "params" : { 
          "serverurl" : "https://s7ap1.scene7.com/is/image/",
          "contenturl" : "https://s7ap1.scene7.com/is/content/", 
          "config" : "nagarrosoftwarepvtltd/MSIL-Smart",
          "videoserverurl": "https://s7ap1.scene7.com/is/content",
          "asset" : "nagarrosoftwarepvtltd/marutibrezza-AVS" }
      })
    s7smartcropvideoviewer.init(); 

    }

    block.replaceChildren(embedEl);


    block.dataset.embedIsLoaded = true;

  };