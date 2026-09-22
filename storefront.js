(() => {
  const cfg = window.JEWELS_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = useSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const storageKey = "414_jewels_products_v3";

  const seed = [{
    id:"demo-rope", name:"Rope Chain", category:"Chains", sku:"ROPE", description:"Classic rope chain.", image_url:"",
    active:true, featured:true, sort_order:1,
    option_groups:[
      {name:"Finish",values:["Gold","Silver"]},
      {name:"Width",values:["3 mm","4 mm"]},
      {name:"Length",values:['20"','22"']}
    ],
    product_variants:[
      {id:"v1",sku:"ROPE-G-3-20",price:35,compare_at_price:null,stock_qty:2,active:true,sort_order:1,option_values:{Finish:"Gold",Width:"3 mm",Length:'20"'}},
      {id:"v2",sku:"ROPE-G-3-22",price:37,compare_at_price:null,stock_qty:1,active:true,sort_order:2,option_values:{Finish:"Gold",Width:"3 mm",Length:'22"'}},
      {id:"v3",sku:"ROPE-S-4-20",price:36,compare_at_price:null,stock_qty:1,active:true,sort_order:3,option_values:{Finish:"Silver",Width:"4 mm",Length:'20"'}}
    ]
  }];

  let allProducts = [];
  let currentCategory = "All";
  let modalProduct = null;
  let selectedValues = {};
  let selectedVariant = null;

  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(value||0));

  function localProducts() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return seed;
    }
    try { return JSON.parse(raw); } catch { return seed; }
  }

  function activeVariants(p) {
    return (p.product_variants || []).filter(v => v.active !== false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  }

  function inStockVariants(p) {
    return activeVariants(p).filter(v => Number(v.stock_qty || 0) > 0);
  }

  function legacyProduct(p) {
    return !Array.isArray(p.product_variants) || p.product_variants.length === 0;
  }

  function priceInfo(p) {
    const variants = activeVariants(p);
    if (!variants.length) return {label:money(p.price||0)};
    const prices = variants.map(v=>Number(v.price||0));
    const min = Math.min(...prices), max = Math.max(...prices);
    return {label:min===max ? money(min) : `From ${money(min)}`};
  }

  function totalStock(p) {
    const variants = activeVariants(p);
    return variants.length ? variants.reduce((n,v)=>n+Number(v.stock_qty||0),0) : Number(p.stock_qty||0);
  }

  async function loadProducts() {
    $("#loading").classList.remove("hidden");
    try {
      if (useSupabase) {
        const { data, error } = await client
          .from("products")
          .select("*, product_variants(*)")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        allProducts = data || [];
      } else {
        allProducts = localProducts().filter(p=>p.active).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      }
      renderFilters();
      renderProducts();
    } catch (err) {
      console.error(err);
      $("#loading").textContent = "Could not load the collection.";
    } finally {
      $("#loading").classList.add("hidden");
    }
  }

  function renderFilters() {
    const cats = ["All", ...new Set(allProducts.map(p=>p.category).filter(Boolean))];
    $("#categoryFilters").innerHTML = cats.map(cat =>
      `<button class="filter-btn ${cat===currentCategory?"active":""}" data-cat="${esc(cat)}">${esc(cat)}</button>`
    ).join("");
    document.querySelectorAll(".filter-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        currentCategory = btn.dataset.cat;
        renderFilters();
        renderProducts();
      });
    });
  }

  function productOptionSummary(p) {
    if (Array.isArray(p.option_groups) && p.option_groups.length) {
      return p.option_groups.slice(0,3).map(g=>{
        const vals = Array.isArray(g.values) ? g.values : [];
        const shown = vals.slice(0,3).join(", ");
        return `${g.name}: ${shown}${vals.length>3?"…":""}`;
      }).join(" • ");
    }
    const bits = [];
    if (p.finishes?.length) bits.push(p.finishes.join(" / "));
    if (p.widths?.length) bits.push(p.widths.slice(0,3).join(", "));
    if (p.lengths?.length) bits.push(p.lengths.slice(0,3).join(", "));
    if (p.sizes?.length) bits.push("Sizes: " + p.sizes.slice(0,3).join(", "));
    return bits.join(" • ");
  }

  function renderProducts() {
    const visible = allProducts.filter(p => currentCategory==="All" || p.category===currentCategory);
    $("#emptyState").classList.toggle("hidden", visible.length>0);
    $("#productGrid").innerHTML = visible.map(p => {
      const stock = totalStock(p);
      const photoStyle = p.image_url ? `style="background-image:url('${esc(p.image_url)}')"` : "";
      return `
        <article class="product">
          <div class="photo ${p.image_url?"":"placeholder"}" ${photoStyle}></div>
          <div class="product-body">
            <div class="product-title">${esc(p.name)}</div>
            <div class="price-line"><span class="price">${priceInfo(p).label}</span></div>
            <div class="details">${esc(productOptionSummary(p) || p.description || "")}</div>
            <div class="badges">
              <span class="badge">${stock>0 ? "In stock" : "Sold out"}</span>
              ${p.featured ? `<span class="badge">Featured</span>` : ""}
            </div>
            <button class="btn btn-dark product-view" data-id="${esc(p.id)}" ${stock===0?"disabled":""}>
              ${stock===0 ? "Sold Out" : "Choose Options"}
            </button>
          </div>
        </article>`;
    }).join("");

    document.querySelectorAll(".product-view").forEach(btn=>{
      btn.addEventListener("click",()=>openProduct(btn.dataset.id));
    });
  }

  function normalizeGroups(p) {
    if (Array.isArray(p.option_groups) && p.option_groups.length) {
      return p.option_groups
        .filter(g=>g && g.name)
        .map(g=>({name:String(g.name),values:Array.isArray(g.values)?g.values.map(String):[]}));
    }
    const groups = [];
    if (p.finishes?.length) groups.push({name:"Finish",values:p.finishes});
    if (p.widths?.length) groups.push({name:"Width",values:p.widths});
    if (p.lengths?.length) groups.push({name:"Length",values:p.lengths});
    if (p.sizes?.length) groups.push({name:"Size",values:p.sizes});
    return groups;
  }

  function exactVariant(p) {
    const groups = normalizeGroups(p);
    return activeVariants(p).find(v => groups.every(g => String(v.option_values?.[g.name] ?? "") === String(selectedValues[g.name] ?? ""))) || null;
  }

  function optionAvailable(p, groups, groupIndex, value) {
    return inStockVariants(p).some(v => {
      if (String(v.option_values?.[groups[groupIndex].name] ?? "") !== String(value)) return false;
      for (let i=0;i<groupIndex;i++) {
        const g = groups[i];
        if (selectedValues[g.name] && String(v.option_values?.[g.name] ?? "") !== String(selectedValues[g.name])) return false;
      }
      return true;
    });
  }

  function repairSelectionsFrom(p, groups, changedIndex) {
    const candidates = inStockVariants(p).filter(v => {
      for (let i=0;i<=changedIndex;i++) {
        const g = groups[i];
        if (selectedValues[g.name] && String(v.option_values?.[g.name] ?? "") !== String(selectedValues[g.name])) return false;
      }
      return true;
    });
    const chosen = candidates[0];
    if (!chosen) return;
    for (let i=changedIndex+1;i<groups.length;i++) {
      selectedValues[groups[i].name] = chosen.option_values?.[groups[i].name] ?? "";
    }
  }

  function renderLegacyOptions(p) {
    const groups = normalizeGroups(p);
    $("#modalOptions").innerHTML = groups.map(g=>`
      <div class="option-row"><strong>${esc(g.name)}</strong><div class="option-values">
        ${g.values.map(v=>`<span class="option-pill">${esc(v)}</span>`).join("")}
      </div></div>`).join("");
    $("#modalPrice").textContent = money(p.price||0);
    $("#modalStock").textContent = Number(p.stock_qty||0)>0 ? `${p.stock_qty} currently in stock` : "Sold out";
    $("#modalOrderBtn").disabled = Number(p.stock_qty||0)===0;
    selectedVariant = null;
  }

  function renderModalOptions() {
    const p = modalProduct;
    if (legacyProduct(p)) return renderLegacyOptions(p);

    const groups = normalizeGroups(p);
    $("#modalOptions").innerHTML = groups.map((g,groupIndex)=>`
      <div class="option-row">
        <strong>${esc(g.name)}</strong>
        <div class="option-values">
          ${g.values.map(v=>{
            const selected = String(selectedValues[g.name] ?? "")===String(v);
            const available = optionAvailable(p,groups,groupIndex,v);
            return `<button class="option-pill ${selected?"selected":""}" type="button" data-group-index="${groupIndex}" data-group="${esc(g.name)}" data-value="${esc(v)}" ${available?"":"disabled"}>${esc(v)}</button>`;
          }).join("")}
        </div>
      </div>`).join("");

    document.querySelectorAll("#modalOptions .option-pill").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const index = Number(btn.dataset.groupIndex);
        selectedValues[btn.dataset.group] = btn.dataset.value;
        repairSelectionsFrom(p,groups,index);
        renderModalOptions();
      });
    });

    selectedVariant = exactVariant(p);
    if (selectedVariant && Number(selectedVariant.stock_qty||0)>0) {
      $("#modalPrice").innerHTML = `${money(selectedVariant.price)}${selectedVariant.compare_at_price?` <span class="compare">${money(selectedVariant.compare_at_price)}</span>`:""}`;
      $("#modalStock").innerHTML = `${selectedVariant.stock_qty} in stock${selectedVariant.sku?` <span class="variant-meta">• ${esc(selectedVariant.sku)}</span>`:""}`;
      $("#modalOrderBtn").disabled = false;
    } else {
      $("#modalPrice").textContent = priceInfo(p).label;
      $("#modalStock").textContent = "This combination is sold out.";
      $("#modalOrderBtn").disabled = true;
    }
  }

  function openProduct(id) {
    const p = allProducts.find(x => String(x.id)===String(id));
    if (!p) return;
    modalProduct = p;

    const first = inStockVariants(p)[0] || activeVariants(p)[0] || null;
    selectedValues = first?.option_values ? {...first.option_values} : {};
    selectedVariant = first;

    $("#modalCategory").textContent = p.category || "";
    $("#modalName").textContent = p.name || "";
    $("#modalDescription").textContent = p.description || "";
    $("#modalImage").style.backgroundImage = p.image_url ? `url("${p.image_url}")` : "";
    renderModalOptions();

    $("#modalOrderBtn").onclick = () => {
      const groups = normalizeGroups(p);
      const selectedText = selectedVariant
        ? groups.map(g=>`${g.name}: ${selectedVariant.option_values?.[g.name] ?? ""}`).filter(x=>!x.endsWith(": ")).join(" • ")
        : "";
      const sku = selectedVariant?.sku || p.sku || "";
      $("#productModal").classList.add("hidden");
      $("#productModal").setAttribute("aria-hidden","true");
      $("#selectedProduct").classList.remove("hidden");
      $("#selectedProduct").innerHTML = `<strong>Selected:</strong> ${esc(p.name)}${selectedText?`<br>${esc(selectedText)}`:""}${sku?`<br><small>Item code: ${esc(sku)}</small>`:""}<br><small>Enter this selection in the order form below.</small>`;
      document.querySelector("#order").scrollIntoView({behavior:"smooth"});
    };

    $("#productModal").classList.remove("hidden");
    $("#productModal").setAttribute("aria-hidden","false");
  }

  document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click",()=>{
    $("#productModal").classList.add("hidden");
    $("#productModal").setAttribute("aria-hidden","true");
  }));

  $("#year").textContent = new Date().getFullYear();
  loadProducts();
})();
