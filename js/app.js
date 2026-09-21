/* 数据来自 js/data.js。内部按 lead/core/watch 分档排序，页面不展示名次。 */
const CATEGORIES = CATALOG.CATEGORIES;
const TRACKS = CATALOG.TRACKS;
const PRODUCTS = CATALOG.PRODUCTS;
const TIMELINES = CATALOG.TIMELINES;
const TIER_RANK = { lead: 0, core: 1, watch: 2 };
function catalogSort(a, b) {
  const ta = TIER_RANK[a.tier] ?? 1;
  const tb = TIER_RANK[b.tier] ?? 1;
  if (ta !== tb) return ta - tb;
  return (a.seed ?? 0) - (b.seed ?? 0);
}
function productsIn(pred) {
  return PRODUCTS.filter(pred).sort(catalogSort);
}

const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const reduceMotion=window.matchMedia("(prefers-reduced-motion:reduce)").matches;
const NEWS = CATALOG.NEWS || { items: {} };
const catMap=Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));
/* ===== 中英文双语：界面 / 分类 / 赛道（产品定位与介绍保持中文）===== */
let lang='zh';
const I18N={
 zh:{brand:'AI100<span>P</span> · 2026', searchPh:'搜索 AI 产品…', eyebrow:'2026 年度精选 · 持续更新',
   heroH1:'2026 全球热门<br><span class="grad">100 款 AI 产品</span>',
   heroSub:'一份克制而完整的智能工具地图——从对话大模型到图像、视频、音频生成，从编程智能体到垂直行业应用，覆盖当下最值得关注的 AI 产品。',
   ctaBrowse:'开始浏览', ctaRandom:'随机发现一款', drawerAll:'全部分类',
   trackH2:'按任务赛道快速进入', trackP:'把 100 款产品按「你想做什么」归并为 6 条赛道，点击直达',
   tbGroup:'分组', tbCat:'分类', tbPrice:'定价', mode12:'12 细分', mode6:'6 大赛道', priceAll:'全部',
   emptyHtml:'没有找到匹配的产品。<br>试试更换关键词，或点击 <b>全部</b> 重置筛选。',
   mPricing:'定价模式', mCat:'所属分类', mCompany:'开发公司', mVisit:'访问官网', mClose:'关闭',
   tlHead:'版本与里程碑', tlSub:'关键节点 · 精确日期以官网为准',
   newsHead:'本周资讯', newsSub:'每周更新 · 点击查看原文', newsG:'Google 资讯 · 近一周', newsB:'Bing 资讯', newsO:'官方动态',
   newsLoading:'正在加载本周资讯…', newsEmpty:'本周暂无聚合头条，点上方入口查看更多资讯。',
   newsFail:'实时头条需联网加载（部分预览窗口会拦截外部请求）。点上方入口即可查看本周最新资讯。',
   footHot:'热门分类', footMore:'更多分类',
   footDesc:'精选 2026 年市场上最热门的 100 款 AI 产品，按 12 大分类组织，帮助你快速建立对当下 AI 应用生态的整体认知。',
   footB1:'© 2026 AI100P · 仅供学习与信息展示之用，不构成任何投资或购买建议。',
   footB2:'各产品 Logo、名称与商标归各自公司所有，图标经第三方服务按官网域名加载，仅用于介绍展示；加载失败时自动以字母徽标占位。',
   statProducts:'精选 AI 产品', statCats:'热门赛道分类', statGen:'生成式 AI 占比', statFree:'可免费体验',
   uItem:'款', uCat:'类', secProducts:'款产品', secN:'款', total(n){return `共 <b>${n}</b> 款 · 12 大分类`;}, match(n){return `匹配 <b>${n}</b> 款产品`;},
   badges:[['12','大分类'],['100','款产品'],['52%','生成式'],['持续','更新']]},
 en:{brand:'AI100<span>P</span> · 2026', searchPh:'Search AI products…', eyebrow:'2026 Selection · Updated regularly',
   heroH1:'2026&rsquo;s Most Popular<br><span class="grad">100 AI Products</span>',
   heroSub:'A restrained yet complete map of today&rsquo;s smartest tools — from chat LLMs to image, video and audio generation, from coding agents to vertical-industry apps.',
   ctaBrowse:'Browse', ctaRandom:'Surprise me', drawerAll:'All categories',
   trackH2:'Jump in by task track', trackP:'100 products grouped into 6 tracks by what you want to do — click to jump in',
   tbGroup:'Group', tbCat:'Category', tbPrice:'Pricing', mode12:'12 Categories', mode6:'6 Tracks', priceAll:'All',
   emptyHtml:'No matching products.<br>Try a different keyword, or click <b>All</b> to reset.',
   mPricing:'Pricing', mCat:'Category', mCompany:'Company', mVisit:'Visit site', mClose:'Close',
   tlHead:'Versions & milestones', tlSub:'Key milestones — verify exact dates on the official site',
   newsHead:'Weekly news', newsSub:'Updated weekly — click to read the source', newsG:'Google News · Past week', newsB:'Bing News', newsO:'Official updates',
   newsLoading:'Loading this week’s headlines…', newsEmpty:'No aggregated headlines this week — use the links above for more.',
   newsFail:'Live headlines need a connection (some preview windows block external requests). Use the links above for the latest.',
   footHot:'Popular categories', footMore:'More categories',
   footDesc:'A curated set of 2026&rsquo;s 100 hottest AI products, organized into 12 categories to help you grasp today&rsquo;s AI landscape at a glance.',
   footB1:'© 2026 AI100P · For learning and information display only; not investment or purchase advice.',
   footB2:'All logos, names and trademarks belong to their owners; icons load via a third-party service by domain, for display only, with a letter-badge fallback.',
   statProducts:'AI products', statCats:'hot categories', statGen:'generative share', statFree:'free to try',
   uItem:'', uCat:'', secProducts:'products', secN:'', total(n){return `<b>${n}</b> products · 12 categories`;}, match(n){return `<b>${n}</b> matches`;},
   badges:[['12','Categories'],['100','Products'],['52%','Generative'],['Live','Updates']]}
};
function t(k){const v=I18N[lang]&&I18N[lang][k];return v!==undefined?v:I18N.zh[k];}
function L(zh,en){return lang==='en'?(en||zh):zh;}
function gName(g){return L(g.name,g.name_en);}
function gShort(g){return L(g.short,g.short_en);}
function gDesc(g){return L(g.desc,g.desc_en);}
function priceLabel(s){return lang==='en'?s.replace('免费','Free').replace('开源','Open source').replace('企业','Enterprise').replace('订阅','Subscription'):s;}
const trCache=new Map();
async function translateText(text,target){if(!text)return text;const key=target+':'+text;if(trCache.has(key))return trCache.get(key);
  try{const u='https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair=en|'+(target==='zh'?'zh-CN':'en');
    const r=await fetch(u);const d=await r.json();const out=(d&&d.responseData&&d.responseData.translatedText)||text;trCache.set(key,out);return out;}catch(e){return text;}}
function esc(s){return(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function hexRgb(h){h=(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h||'888888',16);return [(n>>16)&255,(n>>8)&255,n&255];}
function rgba(hex,a){const [r,g,b]=hexRgb(hex);return `rgba(${r},${g},${b},${a})`;}
/* logo：字母兜底 + 真实图标覆盖。优先用构建期自托管的本地头像（assets/logos/<id>.ico，
   国内网络零外部依赖），缺失时逐级回退远程源，全失败才显示字母 */
function hostOf(u){try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return'';}}
function rootOf(h){const p=(h||'').split('.');return p.length>2?p.slice(-2).join('.'):h;}
function logoChain(p){const h=p.logo||hostOf(p.url);const r=rootOf(h);const c=[
  'assets/logos/'+p.id+'.ico',                         // 0) 本地自托管（构建期抓取）
  'https://icons.duckduckgo.com/ip3/'+h+'.ico',        // 1) 产品站点图标（缺失即 404 回退）
  'https://www.google.com/s2/favicons?sz=128&domain='+h, // 2) 产品站点图标（覆盖最广）
  'https://logo.clearbit.com/'+r+'?size=128'];          // 3) 公司品牌 logo
  return [...new Set(c)];}
function logoOk(img){const b=img.closest('.badge,.modal-badge,.star-tile');if(b)b.classList.add('has-logo');}
function logoErr(img){const s=+(img.dataset.step||0)+1;const chain=(img.dataset.chain||'').split('|').filter(Boolean);
  if(s<chain.length){img.dataset.step=s;img.src=chain[s];return;}img.remove();}
function logoTag(p){const chain=logoChain(p);
  return `<span class="abbr" aria-hidden="true">${esc(p.abbr)}</span><img class="logo" src="${chain[0]}" alt="" decoding="async" data-step="0" data-chain="${chain.join('|')}" onload="logoOk(this)" onerror="logoErr(this)">`;}
const SVG_ICONS={
  chat:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  coding:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L4 22"/>',
  video:'<path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  audio:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  writing:'<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  office:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  design:'<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="15" cy="16" r="2.5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 10 10 0 0 0-9-10z"/>',
  agent:'<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 2h6"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="14" r="1.2"/><path d="M2 13v3M22 13v3"/>',
  companion:'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  vertical:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
function icon(id,stroke){return `<svg viewBox="0 0 24 24" fill="none" stroke="${stroke||'currentColor'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${SVG_ICONS[id]||''}</svg>`;}
function priceClass(p){if(/开源/.test(p))return'open';if(/企业/.test(p))return'ent';if(/免费/.test(p))return'free';return'';}
function timelineHTML(id){const tl=TIMELINES[id];if(!tl||!tl.length)return'';
  return `<div class="modal-tl"><div class="tl-head">${t('tlHead')}<span>${t('tlSub')}</span></div>
    <ul class="tl">${tl.map(([a,v])=>`<li><span class="tl-t">${esc(a)}</span><span class="tl-v">${esc(v)}</span></li>`).join('')}</ul></div>`;}
/* 本周资讯：上方为「近一周」实时资讯入口（始终可用）；下方优先渲染周更缓存的头条 */
function newsItemHTML(h){
  return '<a class="news-item" href="'+esc(h.url)+'" target="_blank" rel="noopener noreferrer"><span class="ni-d">'+esc(h.date)+'</span><span class="ni-t">'+esc(h.title)+'</span></a>';
}
function cachedNews(p){
  const list=(NEWS.items&&NEWS.items[p.id])||[];
  return list.filter(x=>x&&x.title&&x.url);
}
function newsHTML(p){
  const q=encodeURIComponent(p.name+' AI');
  const links=[[t('newsG'),'https://www.google.com/search?q='+q+'&tbm=nws&tbs=qdr:w'],[t('newsB'),'https://www.bing.com/news/search?q='+q],[t('newsO'),p.url]];
  const cached=cachedNews(p);
  const body=cached.length
    ? cached.map(newsItemHTML).join('')
    : `<div class="news-empty">${t('newsLoading')}</div>`;
  const sub=NEWS.updatedAt?`${t('newsSub')} · ${NEWS.updatedAt}`:t('newsSub');
  return `<div class="modal-news"><div class="tl-head">${t('newsHead')}<span>${sub}</span></div>
    <div class="news-links">${links.map(([lab,u])=>`<a class="news-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(lab)}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`).join('')}</div>
    <div class="news-list" id="newsList">${body}</div></div>`;
}
async function loadNews(p){
  const box=$('#newsList');if(!box)return;
  if(cachedNews(p).length)return;
  const curLang=lang;const reqId=p.id;
  try{
    const since=Math.floor(Date.now()/1000)-14*86400;
    const url='https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(p.name)+'&tags=story&numericFilters=created_at_i>'+since+'&hitsPerPage=8';
    const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),6500);
    const r=await fetch(url,{signal:ctrl.signal});clearTimeout(to);
    const d=await r.json();
    let hits=(d.hits||[]).filter(h=>h.title).slice(0,5).map(h=>({title:h.title,url:h.url||('https://news.ycombinator.com/item?id='+h.objectID),created:h.created_at}));
    if(reqId!==curModalId||lang!==curLang)return;
    if(!hits.length){box.innerHTML='<div class="news-empty">'+t('newsEmpty')+'</div>';return;}
    if(curLang==='zh'){
      for(const h of hits){h.title=await translateText(h.title,'zh');if(reqId!==curModalId||lang!==curLang)return;}
    }
    if(lang!==curLang)return;
    box.innerHTML=hits.map(h=>{const dt=new Date(h.created);const ds=dt.getFullYear()+'.'+String(dt.getMonth()+1).padStart(2,'0')+'.'+String(dt.getDate()).padStart(2,'0');
      return newsItemHTML({url:h.url,date:ds,title:h.title});}).join('');
  }catch(e){box.innerHTML='<div class="news-empty">'+t('newsFail')+'</div>';}
}

/* ===== 分组引擎：支持「12 细分分类」与「6 大任务赛道」两种视角 ===== */
function normGroups(){
  return state.mode==='6'
    ? TRACKS.map(x=>({id:x.id,name:x.name,name_en:x.name_en,short:x.short,short_en:x.short_en,accent:x.accent,desc:x.desc,desc_en:x.desc_en,icon:x.icon,members:x.members.slice()}))
    : CATEGORIES.map(c=>({id:c.id,name:c.name,name_en:c.name_en,short:c.short,short_en:c.short_en,accent:c.accent,desc:c.desc,desc_en:c.desc_en,icon:c.id,members:[c.id]}));
}
function buildNav(){
  const nav=$('#navLinks'),drawer=$('#drawerLinks');nav.innerHTML='';drawer.innerHTML='';
  GROUPS.forEach(g=>{
    const a=document.createElement('a');a.href='#grp-'+g.id;a.textContent=gShort(g);nav.appendChild(a);
    const d=document.createElement('a');d.href='#grp-'+g.id;d.innerHTML=`<span class="dot" style="background:${g.accent}"></span>${esc(gName(g))}`;
    d.addEventListener('click',closeDrawer);drawer.appendChild(d);
  });
}
function buildCatChips(){
  const cc=$('#catChips');cc.innerHTML='';
  const all=document.createElement('button');all.className='chip'+(state.cat==='全部'?' active':'');all.dataset.cat='全部';all.textContent=t('priceAll');cc.appendChild(all);
  GROUPS.forEach(g=>{const b=document.createElement('button');b.className='chip'+(state.cat===g.id?' active':'');b.dataset.cat=g.id;b.textContent=gShort(g);cc.appendChild(b);});
}
function renderSections(){
  const root=$('#sections');root.innerHTML='';
  GROUPS.forEach(g=>{
    const list=productsIn(p=>groupMembers[g.id].has(p.cat));
    let body;
    if(state.mode==='6'&&g.members.length>1){
      body=g.members.map(cid=>{const sub=catMap[cid];const items=productsIn(p=>p.cat===cid);
        return `<div class="subhead"><span class="sh-dot" style="background:${sub.accent}"></span><h3>${esc(gName(sub))}</h3><span class="sh-n">${items.length} ${t('secN')}</span></div>
          <div class="grid">${items.map(cardHTML).join('')}</div>`;}).join('');
    }else{
      body=`<div class="grid">${list.map(cardHTML).join('')}</div>`;
    }
    const sec=document.createElement('section');sec.className='section';sec.id='grp-'+g.id;
    sec.innerHTML=`<div class="banner reveal">${bannerArt(g)}
        <div class="banner-ico" style="color:${g.accent}">${icon(g.icon,g.accent)}</div>
        <div class="banner-txt"><h2>${esc(gName(g))}</h2><p class="desc">${esc(gDesc(g))}</p>
          <span class="meta" style="background:${g.accent}">${list.length} ${t('secProducts')}</span></div></div>${body}`;
    root.appendChild(sec);
  });
}
function renderGrouping(){
  GROUPS=normGroups();groupMembers={};GROUPS.forEach(g=>groupMembers[g.id]=new Set(g.members));
  buildNav();buildCatChips();renderSections();observeReveals();
  const cta=$('#ctaBrowse');if(cta)cta.setAttribute('href','#grp-'+GROUPS[0].id);
}
function setMode(m){
  if(state.mode===m)return;state.mode=m;state.cat='全部';
  $$('#modeChips .chip').forEach(x=>x.classList.toggle('active',x.dataset.mode===m));
  renderGrouping();applyFilter();
  const tb=$('#toolbar');if(tb)window.scrollTo({top:tb.offsetTop-70,behavior:reduceMotion?'auto':'smooth'});
}
function navigateToCat(catId){
  if(state.mode!=='12')setMode('12');
  state.cat='全部';state.q='';state.price='全部';const si=$('#search');if(si)si.value='';
  buildCatChips();buildPriceChips();
  applyFilter();
  requestAnimationFrame(()=>{const el=document.getElementById('grp-'+catId);if(el)el.scrollIntoView({behavior:reduceMotion?'auto':'smooth'});});
}
function buildTrackNav(){
  const root=$('#trackNav');if(!root)return;
  root.innerHTML=TRACKS.map(tr=>{
    const n=PRODUCTS.filter(p=>tr.members.includes(p.cat)).length;
    const subs=tr.members.map(id=>gShort(catMap[id])).join(' · ');
    return `<button class="track-card" data-track="${tr.id}" style="--cc:${tr.accent}" aria-label="${esc(gName(tr))}">
      <span class="tc-ico">${icon(tr.icon,'#fff')}</span>
      <span class="tc-body"><b>${esc(gName(tr))}</b><span class="tc-sub">${esc(subs)}</span></span>
      <span class="tc-n">${n}</span></button>`;
  }).join('');
}
function gotoTrack(tid){
  if(state.mode!=='6')setMode('6');
  state.cat='全部';state.q='';state.price='全部';const si=$('#search');if(si)si.value='';
  buildCatChips();buildPriceChips();
  applyFilter();
  requestAnimationFrame(()=>{const el=document.getElementById('grp-'+tid);if(el)el.scrollIntoView({behavior:reduceMotion?'auto':'smooth'});});
}
function buildBadges(){const badges=$('#heroBadges');if(!badges)return;badges.innerHTML='';
  t('badges').forEach(([n,lab])=>{const s=document.createElement('span');s.className='hero-badge';s.innerHTML='<b>'+n+'</b> '+lab;badges.appendChild(s);});}
function buildHero(){
  const stars=$('#heroStars');const W=window.innerWidth;const pick=W<680?14:(W<1100?22:34);
  const sample=[...PRODUCTS].sort(()=>Math.random()-.5).slice(0,pick);
  sample.forEach(p=>{
    const el=document.createElement('div');el.className='star-tile';el.style.setProperty('--cc',p.accent);
    const sz=W<680?34:(38+Math.round(Math.random()*16));
    el.style.width=el.style.height=sz+'px';el.style.left=(Math.random()*96)+'%';el.style.top=(Math.random()*100)+'%';
    el.style.animationDuration=(9+Math.random()*9).toFixed(1)+'s';el.style.animationDelay=(-Math.random()*9).toFixed(1)+'s';
    el.innerHTML=logoTag(p);const ab=el.querySelector('.abbr');if(ab)ab.style.fontSize=Math.max(10,Math.round(sz*.32))+'px';
    stars.appendChild(el);
    requestAnimationFrame(()=>{el.style.transition='opacity 1.2s ease';el.style.opacity=reduceMotion?.55:(.45+Math.random()*.4);});
  });
}
function buildStats(immediate){
  const total=PRODUCTS.length;const free=PRODUCTS.filter(p=>/免费|开源/.test(p.pricing)).length;
  const genIds=new Set(CATEGORIES.filter(c=>c.gen).map(c=>c.id));
  const genPct=Math.round(PRODUCTS.filter(p=>genIds.has(p.cat)).length/total*100);
  const data=[{n:total,u:t('uItem'),l:t('statProducts')},{n:CATEGORIES.length,u:t('uCat'),l:t('statCats')},{n:genPct,u:'%',l:t('statGen')},{n:free,u:t('uItem'),l:t('statFree')}];
  const g=$('#statsGrid');g.innerHTML='';
  data.forEach(d=>{const el=document.createElement('div');el.className='stat';
    el.innerHTML=`<div class="num" data-to="${d.n}">${immediate?d.n:0}<span class="u">${d.u}</span></div><div class="lbl">${d.l}</div>`;g.appendChild(el);});
}
const PRICE_FILTERS=['全部','免费','订阅','开源','企业'];
let state={cat:'全部',price:'全部',q:'',mode:'12'};
let GROUPS=[],groupMembers={};
function priceChipLabel(p){return p==='全部'?t('priceAll'):priceLabel(p);}
function buildModeChips(){const mc=$('#modeChips');mc.innerHTML='';
  [['12',t('mode12')],['6',t('mode6')]].forEach(([m,label])=>{const b=document.createElement('button');b.className='chip'+(state.mode===m?' active':'');b.dataset.mode=m;b.textContent=label;mc.appendChild(b);});}
function buildPriceChips(){const pc=$('#priceChips');pc.innerHTML='';
  PRICE_FILTERS.forEach(p=>{const on=state.price===p;const b=document.createElement('button');b.className='chip'+(on?' active':'')+(on&&p!=='全部'?' acc':'');b.dataset.price=p;b.textContent=priceChipLabel(p);pc.appendChild(b);});}
function buildToolbar(){
  buildModeChips();buildPriceChips();
  $('#modeChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;setMode(b.dataset.mode);});
  $('#catChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;state.cat=b.dataset.cat;
    $$('#catChips .chip').forEach(x=>x.classList.toggle('active',x===b));applyFilter();});
  $('#priceChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;state.price=b.dataset.price;
    $$('#priceChips .chip').forEach(x=>{x.classList.toggle('active',x===b);x.classList.toggle('acc',x===b&&x.dataset.price!=='全部');});applyFilter();});
}
function cardHTML(p){const c=catMap[p.cat];
  return `<article class="card" tabindex="0" role="button" aria-label="${L('查看','View')} ${esc(p.name)} ${L('详情','details')}" data-id="${p.id}" style="--cc:${c.accent}">
    <div class="card-head"><div class="badge" style="--cc:${p.accent}">${logoTag(p)}</div>
      <div class="card-title"><h3>${esc(p.name)}</h3><div class="co">${esc(p.company)}</div></div></div>
    <p class="card-tagline">${esc(p.tagline)}</p>
    <div class="card-tags">${p.tags.slice(0,3).map(tag=>`<span class="tg">${esc(tag)}</span>`).join('')}</div>
    <div class="card-foot"><span class="pricing ${priceClass(p.pricing)}">${esc(priceLabel(p.pricing))}</span>
      <span class="card-cat"><span class="d" style="background:${c.accent}"></span>${esc(gShort(c))}</span></div>
  </article>`;
}
function bannerArt(c){const a=c.accent;
  return `<div class="banner-art" style="background:linear-gradient(120deg,${rgba(a,.14)} 0%,${rgba(a,.04)} 55%,#fff 100%)">
      <div class="glow" style="width:200px;height:200px;right:-30px;top:-70px;background:radial-gradient(circle,${rgba(a,.34)},transparent 70%)"></div>
      <div class="glow" style="width:150px;height:150px;right:120px;bottom:-90px;background:radial-gradient(circle,${rgba(a,.22)},transparent 70%)"></div>
      <svg width="100%" height="100%" style="position:absolute;inset:0;opacity:.5" aria-hidden="true">
        <defs><pattern id="dot-${c.id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${rgba(a,.4)}"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dot-${c.id})"/></svg></div>`;
}
const sectionsEl=$('#sections'),resultsEl=$('#results'),emptyEl=$('#empty');
function matches(p){
  if(state.cat!=='全部'){const mem=groupMembers[state.cat];if(mem){if(!mem.has(p.cat))return false;}else if(p.cat!==state.cat)return false;}
  if(state.price!=='全部'&&!p.pricing.includes(state.price))return false;
  if(state.q){const q=state.q.toLowerCase();
    const hay=(p.name+' '+p.company+' '+p.tagline+' '+p.intro+' '+(p.aliases||[]).join(' ')+' '+p.tags.join(' ')+' '+gShort(catMap[p.cat])).toLowerCase();
    if(!hay.includes(q))return false;}
  return true;
}
function filterActive(){return state.cat!=='全部'||state.price!=='全部'||state.q.trim()!=='';}
function applyFilter(){
  const tbCount=$('#tbCount');
  if(!filterActive()){sectionsEl.style.display='';resultsEl.style.display='none';emptyEl.classList.remove('show');
    tbCount.innerHTML=t('total')(PRODUCTS.length);return;}
  const list=productsIn(matches);tbCount.innerHTML=t('match')(list.length);
  sectionsEl.style.display='none';resultsEl.style.display='';
  const old=new Map();$$('.card',resultsEl).forEach(el=>old.set(el.dataset.id,el.getBoundingClientRect()));
  if(list.length===0){resultsEl.innerHTML='';emptyEl.classList.add('show');return;}
  emptyEl.classList.remove('show');
  resultsEl.innerHTML=`<div class="grid">${list.map(cardHTML).join('')}</div>`;
  if(reduceMotion)return;
  $$('.card',resultsEl).forEach(el=>{const o=old.get(el.dataset.id),n=el.getBoundingClientRect();
    if(o){const dx=o.left-n.left,dy=o.top-n.top;if(dx||dy){el.style.transform=`translate(${dx}px,${dy}px)`;el.style.transition='none';
      requestAnimationFrame(()=>{el.style.transition='transform .45s var(--ease)';el.style.transform='';});}}
    else{el.style.opacity='0';el.style.transform='translateY(14px)';
      requestAnimationFrame(()=>{el.style.transition='opacity .4s var(--ease),transform .4s var(--ease)';el.style.opacity='';el.style.transform='';});}});
}
let searchT;
$('#search').addEventListener('input',e=>{clearTimeout(searchT);searchT=setTimeout(()=>{state.q=e.target.value.trim();applyFilter();
  if(filterActive())window.scrollTo({top:$('#toolbar').offsetTop-70,behavior:reduceMotion?'auto':'smooth'});},180);});

const modalMask=$('#modalMask'),modalEl=$('#modal');let lastFocus=null;let curModalId=null;
function openModal(id){const p=PRODUCTS.find(x=>x.id===id);if(!p)return;const c=catMap[p.cat];lastFocus=document.activeElement;curModalId=id;
  modalEl.innerHTML=`<div class="modal-hero" style="background:linear-gradient(130deg,${rgba(p.accent,.13)},#fff)">
      <div class="modal-hero-bg" style="background:radial-gradient(circle at 80% 0%,${p.accent},transparent 60%)"></div>
      <button class="modal-x" id="modalX" aria-label="${t('mClose')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="modal-head"><div class="modal-badge" style="--cc:${p.accent}">${logoTag(p)}</div>
        <div><h3 id="modalName">${esc(p.name)}</h3><div class="mco">${esc(p.company)}</div>
          <span class="modal-cat"><span class="d" style="background:${c.accent}"></span>${esc(gName(c))}</span></div></div></div>
    <div class="modal-body"><p class="modal-tagline">${esc(p.tagline)}</p><p class="modal-intro">${esc(p.intro)}</p>
      <div class="modal-tags">${p.tags.map(tag=>`<span class="tg">${esc(tag)}</span>`).join('')}</div>
      ${timelineHTML(p.id)}
      ${newsHTML(p)}
      <div class="modal-info"><div class="ii"><div class="k">${t('mPricing')}</div><div class="v">${esc(priceLabel(p.pricing))}</div></div>
        <div class="ii"><div class="k">${t('mCat')}</div><div class="v">${esc(gShort(c))}</div></div>
        <div class="ii"><div class="k">${t('mCompany')}</div><div class="v">${esc(p.company)}</div></div></div>
      <div class="modal-actions"><a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${t('mVisit')}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
        <button class="btn btn-ghost" id="modalClose2">${t('mClose')}</button></div></div>`;
  modalMask.classList.add('open');document.body.style.overflow='hidden';
  $('#modalX').addEventListener('click',closeModal);$('#modalClose2').addEventListener('click',closeModal);$('#modalX').focus();
  loadNews(p);
}
function closeModal(){modalMask.classList.remove('open');document.body.style.overflow='';curModalId=null;if(lastFocus)lastFocus.focus();}
modalMask.addEventListener('click',e=>{if(e.target===modalMask)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modalMask.classList.contains('open'))closeModal();else closeDrawer();}});
function cardClick(e){const card=e.target.closest('.card');if(card)openModal(card.dataset.id);}
function cardKey(e){if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('.card')){e.preventDefault();openModal(e.target.closest('.card').dataset.id);}}
[sectionsEl,resultsEl].forEach(el=>{el.addEventListener('click',cardClick);el.addEventListener('keydown',cardKey);});
$('#ctaRandom').addEventListener('click',()=>openModal(PRODUCTS[Math.floor(Math.random()*PRODUCTS.length)].id));

const drawer=$('#drawer'),drawerMask=$('#drawerMask');
function openDrawer(){drawer.classList.add('open');drawerMask.classList.add('open');$('#navToggle').setAttribute('aria-expanded','true');}
function closeDrawer(){drawer.classList.remove('open');drawerMask.classList.remove('open');$('#navToggle').setAttribute('aria-expanded','false');}
$('#navToggle').addEventListener('click',openDrawer);$('#drawerClose').addEventListener('click',closeDrawer);drawerMask.addEventListener('click',closeDrawer);

const nav=$('#nav'),toTop=$('#toTop'),progress=$('#progress');let ticking=false;
function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{
  const y=window.scrollY,h=document.documentElement.scrollHeight-window.innerHeight;
  progress.style.width=(h>0?(y/h*100):0)+'%';nav.classList.toggle('solid',y>40);toTop.classList.toggle('show',y>600);
  let cur='';for(const g of GROUPS){const el=document.getElementById('grp-'+g.id);if(el&&el.getBoundingClientRect().top<160)cur=g.id;}
  $$('#navLinks a').forEach(a=>a.style.color=(a.getAttribute('href')==='#grp-'+cur)?'var(--primary-d)':'');ticking=false;});}
window.addEventListener('scroll',onScroll,{passive:true});
$('#toTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'}));

function countUp(el){const to=+el.dataset.to,u=$('.u',el)?.outerHTML||'';const dur=1400;const t0=performance.now();
  if(reduceMotion){el.innerHTML=to+u;return;}
  function step(t){const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);el.innerHTML=Math.round(to*e)+u;if(k<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);}
let revealIO=null;
function observeReveals(){
  if(revealIO)revealIO.disconnect();
  revealIO=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');revealIO.unobserve(en.target);}});},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  $$('.reveal').forEach(el=>revealIO.observe(el));
}
function observeStats(){
  const sio=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){$$('.num',en.target).forEach(countUp);sio.unobserve(en.target);}});},{threshold:.4});
  sio.observe($('#statsGrid'));
}
function buildFooter(){
  const cols=$('#footCols');cols.innerHTML='';const groups=[CATEGORIES.slice(0,6),CATEGORIES.slice(6)];
  groups.forEach((g,i)=>{const col=document.createElement('div');col.className='foot-col';
    col.innerHTML=`<h5>${i===0?t('footHot'):t('footMore')}</h5>`+g.map(c=>`<a href="#grp-${c.id}" data-cat="${c.id}">${esc(gShort(c))}</a>`).join('');cols.appendChild(col);});
  const today=new Date();
  $('#footNote').innerHTML= lang==='en'
    ? `Updated ${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}. Curated by category in rough tiers — no public ranking. Scale signals from AICPB and QuestMobile; news from official sites. Confirm details on each product site.`
    : `数据更新于 ${today.getFullYear()} 年 ${today.getMonth()+1} 月。按分类精选、分档陈列，不展示名次。规模参考 AICPB、QuestMobile 等公开榜单；资讯来自各产品官网与公开新闻。具体能力与定价请以官网为准。`;
}
function applyLang(){
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  $$('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  $$('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.dataset.i18nHtml);});
  const sp=$('#search');if(sp)sp.placeholder=t('searchPh');
  const lt=$('#langToggle');if(lt)lt.textContent=lang==='zh'?'EN':'中';
  buildBadges();buildStats(true);buildModeChips();buildPriceChips();buildTrackNav();buildFooter();
  renderGrouping();applyFilter();
  if(curModalId&&modalMask.classList.contains('open'))openModal(curModalId);
}
function toggleLang(){lang=lang==='zh'?'en':'zh';applyLang();}
buildHero();buildBadges();buildStats(false);buildTrackNav();buildToolbar();buildFooter();renderGrouping();applyFilter();observeStats();onScroll();
$('#trackNav').addEventListener('click',e=>{const b=e.target.closest('.track-card');if(b)gotoTrack(b.dataset.track);});
$('#footCols').addEventListener('click',e=>{const a=e.target.closest('a[data-cat]');if(a){e.preventDefault();navigateToCat(a.dataset.cat);}});
const _lt=$('#langToggle');if(_lt)_lt.addEventListener('click',toggleLang);
