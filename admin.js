(() => {
  const cfg = window.JEWELS_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = useSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const storageKey = "414_jewels_products_v2";
  let products = [];
  let demoMode = false;

  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(value||0));
  const parseList = value => String(value||"").split(",").map(x=>x.trim()).filter(Boolean);
  const seed = [
    {id:"demo-1",name:"Gold Rope Chain",category:"Chains",sku:"RP-G-001",price:35,compare_at_price:null,description:"Classic rope chain with a polished gold-tone finish.",image_url:"",stock_qty:5,active:true,featured:true,sort_order:1,finishes:["Gold"],lengths:['18"','20"','22"','24"'],widths:["3 mm","4 mm"],sizes:[]},
    {id:"demo-2",name:"Classic Bangle",category:"Bangles",sku:"BG-001",price:40,compare_at_price:null,description:"Polished bangle made for stacking or wearing on its own.",image_url:"",stock_qty:4,active:true,featured:true,sort_order:2,finishes:["Gold","Silver"],lengths:[],widths:[],sizes:["Small","Medium","Large"]},
    {id:"demo-3",name:"Rimless Fashion Glasses",category:"Glasses",sku:"GL-001",price:45,compare_at_price:55,description:"Statement rimless fashion frame with a clean luxury look.",image_url:"",stock_qty:3,active:true,featured:true,sort_order:3,finishes:["Gold","Silver"],lengths:[],widths:[],sizes:[]}
  ];

  function getLocal() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return [...seed];
    }
    try { return JSON.parse(raw); } catch { return [...seed]; }
  }
  function setLocal(data){ localStorage.setItem(storageKey, JSON.stringify(data)); }

  async function init() {
    if (!useSupabase) {
      $("#backendWarning").classList.remove("hidden");
      $("#loginForm").classList.add("hidden");
      $("#demoBtn").classList.remove("hidden");
      $("#loginHelp").textContent = "Connect Supabase for a secure real admin account, or preview the dashboard locally.";
      $("#demoBtn").addEventListener("click",()=>enterDemo());
      return;
    }

    const { data: { session } } = await client.auth.getSession();
    if (session) {
      await showDashboard(false);
    }

    client.auth.onAuthStateChange(async (event, session)=>{
      if (event === "SIGNED_IN" && session) await showDashboard(false);
      if (event === "SIGNED_OUT") showLogin();
    });
  }

  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault();
    $("#loginMessage").textContent = "Signing in…";
    const { error } = await client.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });
    $("#loginMessage").textContent = error ? error.message : "";
  });

  $("#logoutBtn").addEventListener("click", async ()=>{
    if (demoMode) return showLogin();
    await client.auth.signOut();
  });

  function enterDemo() {
    demoMode = true;
    showDashboard(true);
  }

  async function showDashboard(isDemo) {
    demoMode = isDemo;
    $("#loginCard").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    if (isDemo) {
      $("#modeNotice").className = "notice warning";
      $("#modeNotice").classList.remove("hidden");
      $("#modeNotice").textContent = "LOCAL DEMO MODE — edits only affect this browser/device. Connect Supabase before publishing if you want changes to update the live store for everyone.";
    } else {
      $("#modeNotice").className = "notice success";
      $("#modeNotice").classList.remove("hidden");
      $("#modeNotice").textContent = "LIVE ADMIN MODE — changes save to the database and appear on the storefront.";
    }
    await loadProducts();
  }

  function showLogin() {
    $("#dashboard").classList.add("hidden");
    $("#loginCard").classList.remove("hidden");
    demoMode = !useSupabase ? true : false;
  }

  async function loadProducts() {
    if (demoMode) {
      products = getLocal();
    } else {
      const { data, error } = await client.from("products").select("*").order("sort_order", {ascending:true}).order("created_at",{ascending:false});
      if (error) return showMessage(error.message, true);
      products = data || [];
    }
    renderProducts();
  }

  function renderProducts() {
    const q = $("#searchInput").value.trim().toLowerCase();
    const list = products.filter(p => !q || [p.name,p.category,p.sku].some(v=>String(v||"").toLowerCase().includes(q)));
    $("#adminProducts").innerHTML = list.length ? list.map(p=>`
      <article class="admin-product">
        <div class="admin-thumb" ${p.image_url?`style="background-image:url('${esc(p.image_url)}')"`:""}></div>
        <div>
          <h3>${esc(p.name)} ${p.active?"":"<span class='badge'>Hidden</span>"}</h3>
          <p>${esc(p.category||"")} • ${money(p.price)} • Stock: ${p.stock_qty ?? "—"} ${p.sku?`• ${esc(p.sku)}`:""}</p>
          <p>${summary(p)}</p>
        </div>
        <div class="admin-actions">
          <button class="mini-btn" data-edit="${esc(p.id)}">Edit</button>
          <button class="mini-btn danger" data-delete="${esc(p.id)}">Delete</button>
        </div>
      </article>`).join("") : `<div class="empty">No products found.</div>`;

    document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
  }

  function summary(p) {
    const parts = [];
    if (p.finishes?.length) parts.push(p.finishes.join("/"));
    if (p.lengths?.length) parts.push(p.lengths.join(", "));
    if (p.widths?.length) parts.push(p.widths.join(", "));
    if (p.sizes?.length) parts.push("Sizes: "+p.sizes.join(", "));
    return parts.join(" • ");
  }

  $("#searchInput").addEventListener("input", renderProducts);

  $("#productForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const id = $("#productId").value;
    const item = {
      name: $("#name").value.trim(),
      category: $("#category").value,
      sku: $("#sku").value.trim() || null,
      price: Number($("#price").value || 0),
      compare_at_price: $("#comparePrice").value ? Number($("#comparePrice").value) : null,
      description: $("#description").value.trim() || null,
      image_url: $("#imageUrl").value.trim() || null,
      stock_qty: Number($("#stockQty").value || 0),
      sort_order: Number($("#sortOrder").value || 0),
      finishes: parseList($("#finishes").value),
      lengths: parseList($("#lengths").value),
      widths: parseList($("#widths").value),
      sizes: parseList($("#sizes").value),
      active: $("#active").checked,
      featured: $("#featured").checked
    };

    $("#saveBtn").disabled = true;
    $("#productMessage").textContent = "Saving…";
    try {
      if (demoMode) {
        if (id) {
          products = products.map(p=>String(p.id)===String(id)?{...p,...item}:p);
        } else {
          products.unshift({...item,id:"local-"+Date.now()});
        }
        setLocal(products);
      } else {
        if (id) {
          const { error } = await client.from("products").update(item).eq("id", id);
          if (error) throw error;
        } else {
          const { error } = await client.from("products").insert(item);
          if (error) throw error;
        }
      }
      $("#productMessage").textContent = "Saved.";
      resetEditor();
      await loadProducts();
    } catch (err) {
      $("#productMessage").textContent = err.message || String(err);
    } finally {
      $("#saveBtn").disabled = false;
    }
  });

  function editProduct(id) {
    const p = products.find(x=>String(x.id)===String(id));
    if (!p) return;
    $("#productId").value = p.id;
    $("#name").value = p.name || "";
    $("#category").value = p.category || "Other";
    $("#sku").value = p.sku || "";
    $("#price").value = p.price ?? "";
    $("#comparePrice").value = p.compare_at_price ?? "";
    $("#description").value = p.description || "";
    $("#imageUrl").value = p.image_url || "";
    $("#stockQty").value = p.stock_qty ?? 0;
    $("#sortOrder").value = p.sort_order ?? 0;
    $("#finishes").value = (p.finishes||[]).join(", ");
    $("#lengths").value = (p.lengths||[]).join(", ");
    $("#widths").value = (p.widths||[]).join(", ");
    $("#sizes").value = (p.sizes||[]).join(", ");
    $("#active").checked = !!p.active;
    $("#featured").checked = !!p.featured;
    $("#editorTitle").textContent = "Edit Product";
    $("#cancelEditBtn").classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  $("#cancelEditBtn").addEventListener("click", resetEditor);

  function resetEditor() {
    $("#productForm").reset();
    $("#productId").value = "";
    $("#stockQty").value = 1;
    $("#sortOrder").value = 0;
    $("#active").checked = true;
    $("#editorTitle").textContent = "Add Product";
    $("#cancelEditBtn").classList.add("hidden");
  }

  async function deleteProduct(id) {
    const p = products.find(x=>String(x.id)===String(id));
    if (!p || !confirm(`Delete "${p.name}"?`)) return;
    try {
      if (demoMode) {
        products = products.filter(x=>String(x.id)!==String(id));
        setLocal(products);
      } else {
        const { error } = await client.from("products").delete().eq("id", id);
        if (error) throw error;
      }
      await loadProducts();
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  function showMessage(msg, error=false) {
    $("#modeNotice").className = "notice " + (error ? "warning":"success");
    $("#modeNotice").textContent = msg;
    $("#modeNotice").classList.remove("hidden");
  }

  init();
})();