(function(){
  function detect(){
    try{
      var path=location.pathname||''; var search=location.search||''; var hash=(location.hash||'').replace('#','');
      if(/(^|\/)bn(\/|$)/.test(path) || /(^|[?&])lang=bn(&|$)/.test(search) || hash==='bn') return 'bn';
      if(/(^|\/)en(\/|$)/.test(path) || /(^|[?&])lang=en(&|$)/.test(search) || hash==='en') return 'en';
    }catch(e){}
    try{ var saved=localStorage.getItem('slms-lang'); if(saved==='bn'||saved==='en') return saved; }catch(e){}
    return 'en';
  }
  /* swap title / description / canonical so the /bn URL is indexed as its own Bangla page */
  var meta = {};
  function applyMeta(lang){
    var head = document.head; if(!head) return;
    var desc = head.querySelector('meta[name="description"]');
    var canon = head.querySelector('link[rel="canonical"]');
    var bnTitle = head.querySelector('meta[name="slms-bn-title"]');
    var bnDesc = head.querySelector('meta[name="slms-bn-description"]');
    if(!meta.title){ meta.title = document.title; meta.desc = desc && desc.content; meta.canon = canon && canon.href; }
    var bn = lang === 'bn';
    if(bnTitle) document.title = bn ? bnTitle.content : meta.title;
    if(desc && bnDesc) desc.content = bn ? bnDesc.content : meta.desc;
    if(canon && meta.canon) canon.href = bn ? meta.canon.replace(/\/$/, '') + '/bn' : meta.canon;
  }
  window.__slmsApplyLang = function(lang){
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    applyMeta(lang);
    try{ localStorage.setItem('slms-lang', lang); }catch(e){}
  };
  window.__slmsApplyLang(detect());

  document.addEventListener('DOMContentLoaded', function(){
    var btn=document.getElementById('langToggle');
    if(btn){
      btn.addEventListener('click', function(){
        var cur = document.documentElement.getAttribute('data-lang') === 'bn' ? 'en' : 'bn';
        window.__slmsApplyLang(cur);
        try{
          var url = new URL(location.href);
          var path = url.pathname.replace(/\/bn\/?$/, '').replace(/(\/index)?\.html$/, '').replace(/\/$/, '');
          url.pathname = cur === 'bn' ? (path + '/bn') : path;
          history.replaceState(null, '', url.pathname + url.search);
        }catch(e){}
      });
    }

    /* lightbox: click any button[data-lightbox] to enlarge its screenshot */
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.id = 'lightbox';
    lb.innerHTML =
      '<button class="lightbox-close" type="button" aria-label="Close">✕</button>' +
      '<div class="lightbox-inner">' +
        '<img id="lightboxImg" src="" alt="">' +
        '<div class="lightbox-caption" id="lightboxCaption"></div>' +
      '</div>';
    document.body.appendChild(lb);

    var lbImg = document.getElementById('lightboxImg');
    var lbCaption = document.getElementById('lightboxCaption');

    function openLightbox(trigger){
      var lang = document.documentElement.getAttribute('data-lang') || 'en';
      var caption = trigger.getAttribute('data-caption-' + lang) || trigger.getAttribute('data-caption-en') || '';
      lbImg.src = trigger.getAttribute('data-lightbox');
      lbImg.alt = caption;
      lbCaption.textContent = caption;
      lb.classList.add('open');
    }
    function closeLightbox(){
      lb.classList.remove('open');
      lbImg.src = '';
    }

    document.addEventListener('click', function(e){
      var trigger = e.target.closest('[data-lightbox]');
      if(trigger){
        openLightbox(trigger);
        return;
      }
      if(e.target === lb || e.target.closest('.lightbox-close')){
        closeLightbox();
      }
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeLightbox();
    });
  });
})();
