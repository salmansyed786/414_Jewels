(() => {
  const cfg = window.JEWELS_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = useSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const storageKey = "414_jewels_products_v2";

  const seed = [
    {
      id:"demo-1",name:"Gold Rope Chain",category:"Chains",sku:"RP-G-001",price:35,compare_at_price:null,
      description:"Classic rope chain with a polished gold-tone finish.",image_url:"",
      stock_qty:5,active:true,featured:true,sort_order:1,
      finishes:["Gold"],lengths:['18"','20"','22"','24"'],widths:["3 mm","4 mm"],sizes:[]
    },
    {
      id:"demo-2",name:"Classic Bangle",category:"Bangles",sku:"BG-001",price:40,compare_at_price:null,
      description:"Polished bangle made for stacking or wearing on its own.",image_url:"",
      stock_qty:4,active:true,featured:true,sort_order:2,
      finishes:["Gold","Silver"],lengths:[],widths:[],sizes:["Small","Medium","Large"]
    },
    {
      id:"demo-3",name:"Rimless Fashion Glasses",category:"Glasses",sku:"GL-001",price:45,compare_at_price:55,
      description:"Statement rimless fashion frame with a clean luxury look.",image_url:"",
      stock_qty:3,active:true,featured:true,sort_order:3,
      finishes:["Gold","Silver"],lengths:[],widths:[],sizes:[]
    }
  ];

  let allProducts = [];
  let currentCategory = "All";

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

  async function loadProducts() {
    $("#loading").classList.remove("hidden");
    try {
      if (useSupabase) {
        const { data, error } = await client
          .from("products")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        allProducts = data || [];
      } else {
        allProducts = localProducts()
          .filter(p => p.active)
          .sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
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

  function optionSummary(p) {
    const bits = [];
    if (p.finishes?.length) bits.push(p.finishes.join(" / "));
    if (p.lengths?.length) bits.push(p.lengths.slice(0,3).join(", ") + (p.lengths.length>3?"…":""));
    if (p.sizes?.length) bits.push("Sizes: " + p.sizes.slice(0,3).join(", "));
    return bits.join(" • ");
  }

  function renderProducts() {
    const visible = allProducts.filter(p => currentCategory==="All" || p.category===currentCategory);
    $("#emptyState").classList.toggle("hidden", visible.length>0);
    $("#productGrid").innerHTML = visible.map(p => {
      const photoStyle = p.image_url ? `style="background-image:url('${esc(p.image_url)}')"` : "";
      const badges = [];
      if (p.stock_qty != null) badges.push(`<span class="badge">${Number(p.stock_qty)>0 ? `${p.stock_qty} in stock` : "Sold out"}</span>`);
      if (p.featured) badges.push(`<span class="badge">Featured</span>`);
      return `
        <article class="product">
          <div class="photo ${p.image_url?"":"placeholder"}" ${photoStyle}></div>
          <div class="product-body">
            <div class="product-title">${esc(p.name)}</div>
            <div class="price-line">
              <span class="price">${money(p.price)}</span>
              ${p.compare_at_price ? `<span class="compare">${money(p.compare_at_price)}</span>` : ""}
            </div>
            <div class="details">${esc(optionSummary(p) || p.description || "")}</div>
            <div class="badges">${badges.join("")}</div>
            <button class="btn btn-dark product-view" data-id="${esc(p.id)}" ${Number(p.stock_qty)===0?"disabled":""}>
              ${Number(p.stock_qty)===0 ? "Sold Out" : "View Options"}
            </button>
          </div>
        </article>`;
    }).join("");

    document.querySelectorAll(".product-view").forEach(btn=>{
      btn.addEventListener("click",()=>openProduct(btn.dataset.id));
    });
  }

  function optionRow(label, arr) {
    if (!Array.isArray(arr) || !arr.length) return "";
    return `<div class="option-row"><strong>${esc(label)}</strong><div class="option-values">${arr.map(x=>`<span class="option-pill">${esc(x)}</span>`).join("")}</div></div>`;
  }

  function openProduct(id) {
    const p = allProducts.find(x => String(x.id)===String(id));
    if (!p) return;
    $("#modalCategory").textContent = p.category || "";
    $("#modalName").textContent = p.name || "";
    $("#modalPrice").innerHTML = `${money(p.price)} ${p.compare_at_price?`<span class="compare">${money(p.compare_at_price)}</span>`:""}`;
    $("#modalDescription").textContent = p.description || "";
    $("#modalOptions").innerHTML =
      optionRow("Finish / color", p.finishes) +
      optionRow("Length", p.lengths) +
      optionRow("Width", p.widths) +
      optionRow("Size", p.sizes);
    $("#modalStock").textContent = p.stock_qty == null ? "" : `${p.stock_qty} currently in stock`;
    $("#modalImage").style.backgroundImage = p.image_url ? `url("${p.image_url}")` : "";
    $("#modalOrderBtn").onclick = () => {
      $("#productModal").classList.add("hidden");
      $("#productModal").setAttribute("aria-hidden","true");
      $("#selectedProduct").classList.remove("hidden");
      $("#selectedProduct").innerHTML = `<strong>Selected:</strong> ${esc(p.name)}${p.sku?` <span style="opacity:.7">(${esc(p.sku)})</span>`:""}<br><small>Enter this product name/item code in the order form.</small>`;
      document.querySelector("#order").scrollIntoView({behavior:"smooth"});
    };
    $("#productModal").classList.remove("hidden");
    $("#productModal").setAttribute("aria-hidden","false");
  }

  document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click",()=>{
    $("#productModal").classList.add("hidden");
    $("#productModal").setAttribute("aria-hidden","true");
  }));

  document.getElementById("year").textContent = new Date().getFullYear();
  loadProducts();
})();