// js/list.js
(async function(){
  const $ = (id) => document.getElementById(id);
  const cardsEl = $("cards");
  const emptyEl = $("empty");
  const searchEl = $("search");
  const sortEl = $("sort");
  const resetEl = $("reset");

  const catalog = await DataAPI.loadCatalog();
  const user = DataAPI.loadUserTokens();
  let tokens = DataAPI.mergeTokens(catalog, user);

  function render(list){
    cardsEl.innerHTML = "";
    if (!list.length){ emptyEl.style.display = "block"; return; }
    emptyEl.style.display = "none";

    for (const t of list){
      const card = document.createElement("article");
      card.className = "card token";
      card.innerHTML = `
        <div class="row gap">
          <img class="avatar" src="${t.imageDataUrl || t.image || ''}" alt="${t.name || ''}" />
          <div class="stack grow">
            <div class="row between center">
              <h3 class="title">${(t.name || 'Без имени')}</h3>
              <span class="badge ${t.source === 'user' ? 'user' : 'sample'}">
                ${t.source === 'user' ? 'user' : 'sample'}
              </span>
            </div>
            <div class="muted">${t.symbol ? t.symbol + ' • ' : ''}${t.mint ? DataAPI.short(t.mint, 20) : 'mint: —'}</div>
            <p class="desc">${DataAPI.short(t.description || '', 160)}</p>
            <div class="row wrap gap">
              <div class="pill">Цена: <b>${DataAPI.formatPrice(t.price)}</b></div>
              <div class="pill">Кол-во: <b>${t.quantity ?? '—'}</b></div>
            </div>
          </div>
        </div>`;
      cardsEl.appendChild(card);
    }
  }

  function applyFilters(){
    const q = searchEl.value.trim().toLowerCase();
    let list = tokens.filter(t => {
      const hay = `${t.name||''} ${t.symbol||''} ${t.mint||''}`.toLowerCase();
      return !q || hay.includes(q);
    });

    switch (sortEl.value){
      case 'priceDesc': list.sort((a,b)=> (Number(b.price)||0)-(Number(a.price)||0)); break;
      case 'priceAsc': list.sort((a,b)=> (Number(a.price)||0)-(Number(b.price)||0)); break;
      case 'qtyDesc': list.sort((a,b)=> (Number(b.quantity)||0)-(Number(a.quantity)||0)); break;
      case 'qtyAsc': list.sort((a,b)=> (Number(a.quantity)||0)-(Number(b.quantity)||0)); break;
      case 'newest': list.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0)); break;
      default: list.sort((a,b)=> String(a.name||'').localeCompare(b.name||'')); 
    }

    render(list);
  }

  applyFilters();

  searchEl.addEventListener('input', applyFilters);
  sortEl.addEventListener('change', applyFilters);
  resetEl.addEventListener('click', ()=>{
    searchEl.value=''; sortEl.value='name'; applyFilters();
  });
})();
