(() => {
  const cfg = window.JEWELS_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = useSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const storageKey = "414_jewels_products_v3";

  let products = [];
  let demoMode = false;
  let editorVariants = [];
  let editingProduct = null;
  let saleProduct = null;

  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(value||0));
  const parseList = value => String(value||"").split(",").map(x=>x.trim()).filter(Boolean);

  const seed = [{
    id:"demo-rope",name:"Rope Chain",category:"Chains",sku:"ROPE",description:"Classic rope chain.",image_url:"",
    active:true,featured:true,sort_order:1,price:35,stock_qty:3,
    option_groups:[
      {name:"Finish",values:["Gold","Silver"]},
      {name:"Width",values:["3 mm","4 mm"]},
      {name:"Length",values:['20"','22"']}
    ],
    product_variants:[
      {id:"v1",product_id:"demo-rope",sku:"ROPE-G-3-20",price:35,compare_at_price:null,stock_qty:2,active:true,sort_order:1,option_values:{Finish:"Gold",Width:"3 mm",Length:'20"'}},
      {id:"v2",product_id:"demo-rope",sku:"ROPE-G-3-22",price:37,compare_at_price:null,stock_qty:1,active:true,sort_order:2,option_values:{Finish:"Gold",Width:"3 mm",Length:'22"'}}
    ]
  }];

  function getLocal() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return [...seed];
    }
    try { return JSON.parse(raw); } catch { return [...seed]; }
  }
  function setLocal(data){ localStorage.setItem(storageKey, JSON.stringify(data)); }
  function variantsOf(p) { return (p?.product_variants || []).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)); }
  function totalStock(p) {
    const vars = variantsOf(p);
    return vars.length ? vars.reduce((n,v)=>n+Number(v.stock_qty||0),0) : Number(p.stock_qty||0);
  }
  function variantLabel(v, groups=[]) {
    const values = v.option_values || {};
    const parts = groups.length ? groups.map(g=>values[g.name]).filter(Boolean) : Object.values(values).filter(Boolean);
    return parts.length ? parts.join(" / ") : "Default";
  }

  async function isCurrentUserAdmin() {
    if (!client) return false;
    const { data, error } = await client.rpc("is_admin");
    return !error && data === true;
  }

  async function init() {
    if (!useSupabase) {
      $("#backendWarning").classList.remove("hidden");
      $("#loginForm").classList.add("hidden");
      $("#demoBtn").classList.remove("hidden");
      $("#loginHelp").textContent = "Supabase is not connected. You can preview the dashboard locally.";
      $("#demoBtn").addEventListener("click",()=>showDashboard(true));
      return;
    }

    const { data: { session } } = await client.auth.getSession();
    if (session) {
      if (await isCurrentUserAdmin()) await showDashboard(false);
      else await client.auth.signOut();
    }

    client.auth.onAuthStateChange(async (event, session)=>{
      if (event === "SIGNED_IN" && session) {
        if (await isCurrentUserAdmin()) await showDashboard(false);
        else {
          $("#loginMessage").textContent = "This account is not an authorized 414 Jewels admin.";
          await client.auth.signOut();
        }
      }
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
    if (error) $("#loginMessage").textContent = error.message;
  });

  $("#logoutBtn").addEventListener("click", async ()=>{
    if (demoMode) return showLogin();
    await client.auth.signOut();
  });

  async function showDashboard(isDemo) {
    demoMode = isDemo;
    $("#loginCard").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    $("#modeNotice").className = "notice " + (isDemo ? "warning" : "success");
    $("#modeNotice").classList.remove("hidden");
    $("#modeNotice").textContent = isDemo
      ? "LOCAL DEMO MODE — edits only affect this browser/device."
      : "LIVE ADMIN MODE — products and exact variant stock save to Supabase.";
    resetEditor();
    await loadProducts();
  }

  function showLogin() {
    $("#dashboard").classList.add("hidden");
    $("#loginCard").classList.remove("hidden");
    demoMode = !useSupabase;
  }

  async function loadProducts() {
    if (demoMode) {
      products = getLocal();
    } else {
      const { data, error } = await client
        .from("products")
        .select("*, product_variants(*)")
        .order("sort_order", {ascending:true})
        .order("created_at",{ascending:false});
      if (error) return showMessage(error.message, true);
      products = data || [];
    }
    renderProducts();
  }

  function renderProducts() {
    const q = $("#searchInput").value.trim().toLowerCase();
    const list = products.filter(p => !q || [p.name,p.category,p.sku].some(v=>String(v||"").toLowerCase().includes(q)));
    $("#adminProducts").innerHTML = list.length ? list.map(p=>{
      const vars = variantsOf(p);
      const prices = vars.filter(v=>v.active!==false).map(v=>Number(v.price||0));
      const min = prices.length ? Math.min(...prices) : Number(p.price||0);
      const max = prices.length ? Math.max(...prices) : Number(p.price||0);
      const priceText = min===max ? money(min) : `${money(min)}–${money(max)}`;
      return `
        <article class="admin-product">
          <div class="admin-thumb" ${p.image_url?`style="background-image:url('${esc(p.image_url)}')"`:""}></div>
          <div>
            <h3>${esc(p.name)} ${p.active?"":"<span class='badge'>Hidden</span>"}</h3>
            <p>${esc(p.category||"")} • ${priceText} • ${totalStock(p)} total in stock</p>
            <p>${vars.length ? `${vars.length} variants` : "Legacy listing — edit to convert to variants"}${p.sku?` • ${esc(p.sku)}`:""}</p>
          </div>
          <div class="admin-actions">
            <button class="mini-btn" data-edit="${esc(p.id)}">Edit</button>
            <button class="mini-btn" data-sale="${esc(p.id)}" ${vars.length?"":"disabled"}>Record Sale</button>
            <button class="mini-btn danger" data-delete="${esc(p.id)}">Delete</button>
          </div>
        </article>`;
    }).join("") : `<div class="empty">No products found.</div>`;

    document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
    document.querySelectorAll("[data-sale]").forEach(b=>b.addEventListener("click",()=>openSale(b.dataset.sale)));
    document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
  }

  $("#searchInput").addEventListener("input", renderProducts);

  function createOptionGroupRow(name="", values=[]) {
    const row = document.createElement("div");
    row.className = "option-group-admin";
    row.innerHTML = `
      <label>Option name<input class="group-name" placeholder="Width" value="${esc(name)}"></label>
      <label>Choices, comma-separated<input class="group-values" placeholder="2 mm, 3 mm, 4 mm" value="${esc(values.join(", "))}"></label>
      <button class="mini-btn danger remove-group" type="button">Remove</button>`;
    row.querySelector(".remove-group").addEventListener("click",()=>row.remove());
    $("#optionGroups").appendChild(row);
  }

  $("#addOptionGroupBtn").addEventListener("click",()=>createOptionGroupRow());

  function readOptionGroups() {
    return [...document.querySelectorAll(".option-group-admin")].map(row=>({
      name: row.querySelector(".group-name").value.trim(),
      values: parseList(row.querySelector(".group-values").value)
    })).filter(g=>g.name && g.values.length);
  }

  function combos(groups) {
    if (!groups.length) return [{}];
    return groups.reduce((acc,g)=>{
      const next = [];
      acc.forEach(base => g.values.forEach(value => next.push({...base,[g.name]:value})));
      return next;
    },[{}]);
  }

  function valuesKey(values, groups) {
    return JSON.stringify(groups.map(g=>[g.name,String(values?.[g.name] ?? "")]));
  }

  function syncEditorFromTable() {
    document.querySelectorAll("#variantEditor [data-variant-index]").forEach(row=>{
      const i = Number(row.dataset.variantIndex);
      if (!editorVariants[i]) return;
      editorVariants[i].sku = row.querySelector(".variant-sku").value.trim();
      editorVariants[i].price = Number(row.querySelector(".variant-price").value || 0);
      editorVariants[i].compare_at_price = row.querySelector(".variant-compare").value ? Number(row.querySelector(".variant-compare").value) : null;
      editorVariants[i].stock_qty = Math.max(0, Number(row.querySelector(".variant-stock").value || 0));
      editorVariants[i].active = row.querySelector(".variant-active").checked;
    });
  }

  function generateVariants({preserve=true}={}) {
    syncEditorFromTable();
    const groups = readOptionGroups();
    const oldMap = new Map();
    if (preserve) editorVariants.forEach(v=>oldMap.set(valuesKey(v.option_values||{},groups),v));
    const defaultPrice = Number($("#defaultVariantPrice").value || 0);

    editorVariants = combos(groups).map((option_values,index)=>{
      const prior = oldMap.get(valuesKey(option_values,groups));
      return prior ? {...prior,option_values,sort_order:index} : {
        id:null, sku:"", price:defaultPrice, compare_at_price:null, stock_qty:0,
        active:true, sort_order:index, option_values
      };
    });
    renderVariantEditor();
  }

  $("#generateVariantsBtn").addEventListener("click",()=>generateVariants({preserve:true}));

  function renderVariantEditor() {
    const groups = readOptionGroups();
    if (!editorVariants.length) {
      $("#variantEditor").innerHTML = `<div class="variant-warning">Add your option groups, then click <strong>Generate / Refresh Variants</strong>. If the item has no options, remove the groups and click Generate to make one default variant.</div>`;
      return;
    }
    $("#variantEditor").innerHTML = `
      <div class="variant-table-wrap">
        <table class="variant-table">
          <thead><tr><th>Variant</th><th>SKU</th><th>Price</th><th>Old price</th><th>Stock</th><th>Active</th></tr></thead>
          <tbody>
            ${editorVariants.map((v,i)=>`
              <tr data-variant-index="${i}">
                <td class="variant-label">${esc(variantLabel(v,groups))}</td>
                <td><input class="variant-sku" value="${esc(v.sku||"")}" placeholder="SKU"></td>
                <td><input class="variant-price" type="number" min="0" step="0.01" value="${Number(v.price||0)}"></td>
                <td><input class="variant-compare" type="number" min="0" step="0.01" value="${v.compare_at_price ?? ""}" placeholder="Optional"></td>
                <td><input class="variant-stock" type="number" min="0" step="1" value="${Number(v.stock_qty||0)}"></td>
                <td><input class="variant-active" type="checkbox" ${v.active!==false?"checked":""}></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function legacyGroups(p) {
    const groups = [];
    if (p.finishes?.length) groups.push({name:"Finish",values:p.finishes});
    if (p.widths?.length) groups.push({name:"Width",values:p.widths});
    if (p.lengths?.length) groups.push({name:"Length",values:p.lengths});
    if (p.sizes?.length) groups.push({name:"Size",values:p.sizes});
    return groups;
  }

  function editProduct(id) {
    const p = products.find(x=>String(x.id)===String(id));
    if (!p) return;
    editingProduct = p;
    $("#productId").value = p.id;
    $("#name").value = p.name || "";
    $("#category").value = p.category || "Other";
    $("#sku").value = p.sku || "";
    $("#description").value = p.description || "";
    $("#imageUrl").value = p.image_url || "";
    $("#sortOrder").value = p.sort_order ?? 0;
    $("#active").checked = !!p.active;
    $("#featured").checked = !!p.featured;

    $("#optionGroups").innerHTML = "";
    const groups = Array.isArray(p.option_groups) && p.option_groups.length ? p.option_groups : legacyGroups(p);
    groups.forEach(g=>createOptionGroupRow(g.name,g.values||[]));

    editorVariants = variantsOf(p).map(v=>({...v,option_values:{...(v.option_values||{})}}));
    $("#defaultVariantPrice").value = editorVariants[0]?.price ?? p.price ?? 0;

    if (!editorVariants.length) {
      generateVariants({preserve:false});
      $("#productMessage").textContent = "Legacy listing loaded. Enter the real stock for each exact combination before saving.";
    } else {
      renderVariantEditor();
      $("#productMessage").textContent = "";
    }

    $("#editorTitle").textContent = "Edit Product";
    $("#cancelEditBtn").classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  $("#cancelEditBtn").addEventListener("click", resetEditor);

  function resetEditor() {
    editingProduct = null;
    editorVariants = [];
    $("#productForm").reset();
    $("#productId").value = "";
    $("#sortOrder").value = 0;
    $("#defaultVariantPrice").value = 0;
    $("#active").checked = true;
    $("#optionGroups").innerHTML = "";
    createOptionGroupRow("Finish",["Gold","Silver"]);
    createOptionGroupRow("Width",[]);
    createOptionGroupRow("Length",[]);
    $("#editorTitle").textContent = "Add Product";
    $("#cancelEditBtn").classList.add("hidden");
    $("#productMessage").textContent = "";
    renderVariantEditor();
  }

  function findGroupValues(groups, terms) {
    const g = groups.find(x=>terms.some(t=>x.name.toLowerCase().includes(t)));
    return g?.values || [];
  }

  $("#productForm").addEventListener("submit", async e=>{
    e.preventDefault();
    syncEditorFromTable();
    if (!editorVariants.length) generateVariants({preserve:true});
    syncEditorFromTable();

    if (!editorVariants.length) {
      $("#productMessage").textContent = "Generate at least one variant before saving.";
      return;
    }

    const groups = readOptionGroups();
    const activeVars = editorVariants.filter(v=>v.active!==false);
    const minPrice = activeVars.length ? Math.min(...activeVars.map(v=>Number(v.price||0))) : 0;
    const total = activeVars.reduce((n,v)=>n+Number(v.stock_qty||0),0);

    const item = {
      name: $("#name").value.trim(),
      category: $("#category").value,
      sku: $("#sku").value.trim() || null,
      price: minPrice,
      compare_at_price: null,
      description: $("#description").value.trim() || null,
      image_url: $("#imageUrl").value.trim() || null,
      stock_qty: total,
      sort_order: Number($("#sortOrder").value || 0),
      active: $("#active").checked,
      featured: $("#featured").checked,
      option_groups: groups,
      finishes: findGroupValues(groups,["finish","color"]),
      widths: findGroupValues(groups,["width"]),
      lengths: findGroupValues(groups,["length"]),
      sizes: findGroupValues(groups,["size"])
    };

    $("#saveBtn").disabled = true;
    $("#productMessage").textContent = "Saving…";

    try {
      if (demoMode) {
        const id = $("#productId").value || ("local-"+Date.now());
        const savedVariants = editorVariants.map((v,i)=>({...v,id:v.id||`local-v-${Date.now()}-${i}`,product_id:id}));
        const merged = {...(editingProduct||{}),...item,id,product_variants:savedVariants};
        products = editingProduct ? products.map(p=>String(p.id)===String(id)?merged:p) : [merged,...products];
        setLocal(products);
      } else {
        let productId = $("#productId").value;
        if (productId) {
          const { error } = await client.from("products").update(item).eq("id",productId);
          if (error) throw error;
        } else {
          const { data, error } = await client.from("products").insert(item).select("id").single();
          if (error) throw error;
          productId = data.id;
        }

        const oldIds = new Set(variantsOf(editingProduct).map(v=>String(v.id)));
        const keptIds = new Set(editorVariants.filter(v=>v.id).map(v=>String(v.id)));
        const removedIds = [...oldIds].filter(id=>!keptIds.has(id));

        if (removedIds.length) {
          const { error } = await client.from("product_variants").delete().in("id",removedIds);
          if (error) throw error;
        }

        const existing = editorVariants.filter(v=>v.id).map(v=>({
          id:v.id, product_id:productId, sku:v.sku||null, price:Number(v.price||0),
          compare_at_price:v.compare_at_price ?? null, stock_qty:Number(v.stock_qty||0),
          active:v.active!==false, sort_order:Number(v.sort_order||0), option_values:v.option_values||{}
        }));
        const fresh = editorVariants.filter(v=>!v.id).map(v=>({
          product_id:productId, sku:v.sku||null, price:Number(v.price||0),
          compare_at_price:v.compare_at_price ?? null, stock_qty:Number(v.stock_qty||0),
          active:v.active!==false, sort_order:Number(v.sort_order||0), option_values:v.option_values||{}
        }));

        if (existing.length) {
          const { error } = await client.from("product_variants").upsert(existing);
          if (error) throw error;
        }
        if (fresh.length) {
          const { error } = await client.from("product_variants").insert(fresh);
          if (error) throw error;
        }
      }

      resetEditor();
      await loadProducts();
      showMessage("Product saved.");
    } catch (err) {
      $("#productMessage").textContent = err.message || String(err);
    } finally {
      $("#saveBtn").disabled = false;
    }
  });

  async function deleteProduct(id) {
    const p = products.find(x=>String(x.id)===String(id));
    if (!p || !confirm(`Delete "${p.name}" and all of its variants?`)) return;
    try {
      if (demoMode) {
        products = products.filter(x=>String(x.id)!==String(id));
        setLocal(products);
      } else {
        const { error } = await client.from("products").delete().eq("id",id);
        if (error) throw error;
      }
      await loadProducts();
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  function openSale(id) {
    const p = products.find(x=>String(x.id)===String(id));
    if (!p) return;
    saleProduct = p;
    const groups = Array.isArray(p.option_groups) ? p.option_groups : [];
    const vars = variantsOf(p).filter(v=>v.active!==false && Number(v.stock_qty||0)>0);
    $("#saleProductName").textContent = `Record Sale — ${p.name}`;
    $("#saleVariant").innerHTML = vars.map(v=>
      `<option value="${esc(v.id)}">${esc(variantLabel(v,groups))} — ${money(v.price)} — ${v.stock_qty} in stock</option>`
    ).join("");
    $("#saleQuantity").value = 1;
    $("#saleNote").value = "";
    $("#saleMessage").textContent = vars.length ? "" : "No in-stock variants available.";
    $("#saleModal").classList.remove("hidden");
    $("#saleModal").setAttribute("aria-hidden","false");
  }

  document.querySelectorAll("[data-close-sale]").forEach(el=>el.addEventListener("click",()=>{
    $("#saleModal").classList.add("hidden");
    $("#saleModal").setAttribute("aria-hidden","true");
  }));

  $("#saleForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const variantId = $("#saleVariant").value;
    const qty = Number($("#saleQuantity").value||0);
    const note = $("#saleNote").value.trim() || null;
    if (!variantId || qty<1) return;

    $("#saleMessage").textContent = "Recording…";
    try {
      if (demoMode) {
        const p = saleProduct;
        const v = variantsOf(p).find(x=>String(x.id)===String(variantId));
        if (!v || Number(v.stock_qty)<qty) throw new Error("Not enough stock.");
        const liveV = p.product_variants.find(x=>String(x.id)===String(variantId));
        liveV.stock_qty = Number(liveV.stock_qty) - qty;
        p.stock_qty = totalStock(p);
        setLocal(products);
      } else {
        const { error } = await client.rpc("record_variant_sale", {
          p_variant_id: variantId,
          p_quantity: qty,
          p_note: note
        });
        if (error) throw error;
      }
      $("#saleMessage").textContent = "Sale recorded. Stock updated.";
      await loadProducts();
      setTimeout(()=>{
        $("#saleModal").classList.add("hidden");
        $("#saleModal").setAttribute("aria-hidden","true");
      },500);
    } catch (err) {
      $("#saleMessage").textContent = err.message || String(err);
    }
  });

  function showMessage(msg, error=false) {
    $("#modeNotice").className = "notice " + (error ? "warning":"success");
    $("#modeNotice").textContent = msg;
    $("#modeNotice").classList.remove("hidden");
  }

  init();
})();
