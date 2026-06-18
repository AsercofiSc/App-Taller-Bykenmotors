// Traduce objetos de JavaScript (camelCase) al formato de Base de Datos (snake_case)
function camelToSnake(obj) {
    if (Array.isArray(obj)) return obj.map(camelToSnake);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = camelToSnake(obj[key]);
            return acc;
        }, {});
    }
    return obj;
}

// Traduce objetos de Base de Datos (snake_case) al formato de JavaScript (camelCase)
function snakeToCamel(obj) {
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelKey] = snakeToCamel(obj[key]);
            return acc;
        }, {});
    }
    return obj;
}
/* ========================================
   CAPA DE DATOS
   — swap DB.save/load por fetch() cuando
     conectes tu backend
======================================== */
let _isLoading     = false;
let _currentUserId = null;
let _notifData     = [];   // store persistente de notificaciones
let _activityData  = [];   // store persistente de actividad

/* ── CONFIGURACIÓN DEL TALLER — edita aquí tu nombre y logo ── */
const TALLER_CONFIG = {
    name:    "Mi Taller Mecánico",              // Nombre que aparece en los PDFs
    tagline: "Servicio automotriz profesional", // Subtítulo (puede quedar vacío "")
    logoUrl: ""                                 // URL de imagen del logo (puede quedar vacío "")
};
/* ── TOAST DE GUARDADO ── */
let _saveCount = 0;
let _toastTimer = null;

function showSaveToast(state){
    let el = document.getElementById("saveToast");
    if(!el){
        el = document.createElement("div");
        el.id = "saveToast";
        el.className = "save-toast";
        document.body.appendChild(el);
    }
    clearTimeout(_toastTimer);
    el.classList.remove("toast-ok","toast-error");

    if(state === "saving"){
        el.textContent = "Guardando...";
        el.classList.add("visible");
    } else if(state === "ok"){
        el.textContent = "✓ Guardado";
        el.classList.add("visible","toast-ok");
        _toastTimer = setTimeout(() => el.classList.remove("visible","toast-ok"), 1800);
    } else if(state === "error"){
        el.textContent = "❌ Error al guardar";
        el.classList.add("visible","toast-error");
        _toastTimer = setTimeout(() => el.classList.remove("visible","toast-error"), 3500);
    }
}

const DB = {
    tableName(key) {
        const map = {
            vehicles: "vehicles",
            clients: "clients",
            inventory: "inventory",
            workshopTasks: "workshop_tasks",
            suppliers: "suppliers",
            technicians: "technicians"
        };
        return map[key] || key;
    },

    async load(key, defaultData = []) {
        try {
            const { data: { session }, error: authError } = await _supabase.auth.getSession();
            if (authError) throw authError;
            if (!session) return defaultData;

            const table = this.tableName(key);
            
            const { data, error } = await _supabase
                .from(table)
                .select('*')
                .eq('user_id', session.user.id);

            if (error) throw error;
            
            return data && data.length > 0 ? snakeToCamel(data) : defaultData;
            
        } catch (error) {
            console.error(`Error al cargar ${key} desde Supabase:`, error);
            return defaultData;
        }
    },

    async save(key, dataArray) {
        _saveCount++;
        showSaveToast("saving");
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session){ _saveCount = Math.max(0, _saveCount - 1); return; }

            const table = this.tableName(key);

            const formattedData = camelToSnake(dataArray).map(item => {
                const row = { ...item, user_id: session.user.id };
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (row.id && !uuidRegex.test(row.id)) {
                    delete row.id;
                }
                return row;
            });

            await _supabase.from(table).delete().eq('user_id', session.user.id);

            if (formattedData.length > 0) {
                const { error } = await _supabase.from(table).insert(formattedData);
                if (error) throw error;
            }

            _saveCount = Math.max(0, _saveCount - 1);
            if(_saveCount === 0) showSaveToast("ok");

        } catch (error) {
            _saveCount = Math.max(0, _saveCount - 1);
            showSaveToast("error");
            console.error(`Error al guardar ${key} en Supabase:`, error);
        }
    }
};
/* ========================================
   SISTEMA DE CARGA ASÍNCRONA (LOADER)
======================================== */
function _tryHideLoader(){
    if(window._loaderAnimDone && window._loaderDataDone){
        const loader = document.getElementById("appLoader");
        if(loader) loader.classList.add("loaded");
    }
}
(function() {
    document.addEventListener("DOMContentLoaded", () => {
        const fill = document.getElementById("loaderFill");
        const status = document.getElementById("loaderStatus");
        const loader = document.getElementById("appLoader");
        
        if (!fill || !status || !loader) return;

        // Fases secuenciales de carga simulada de módulos
        const stages = [
            { percentage: 25, text: "Cargando módulos principales..." },
            { percentage: 60, text: "Estableciendo conexión local..." },
            { percentage: 85, text: "Sincronizando base de datos..." },
            { percentage: 100, text: "Sistema listo" }
        ];

        let currentStage = 0;

        function processLoading() {
            if (currentStage >= stages.length) {
                // Desvanecimiento controlado con clases de CSS
              // Desvanecimiento cuando animación Y datos están listos
        setTimeout(() => {
            window._loaderAnimDone = true;
            _tryHideLoader();
        }, 250);
                return;
            }

            const stage = stages[currentStage];
            fill.style.width = `${stage.percentage}%`;
            status.textContent = stage.text;

            currentStage++;
            // Genera variaciones de tiempo realistas entre pasos
            setTimeout(processLoading, 350 + Math.random() * 200);
        }

        // Retraso inicial mínimo antes de arrancar la animación de barra
        setTimeout(processLoading, 150);
    });
})();
/* =========================
   ELEMENTOS PRINCIPALES
========================= */


const dashboard =
document.getElementById("dashboard");

const loginForm =
document.querySelector(".login-form");

const navItems =
document.querySelectorAll(".nav-item");

const vehiclesPage =
document.getElementById("vehiclesPage");

const clientsPage =
document.getElementById("clientsPage");

const inventoryPage =
document.getElementById("inventoryPage");

const workshopPage =
document.getElementById("workshopPage");

/* =========================
   REGISTER MODAL
========================= */


/* =========================
   LOGIN
========================= */

/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.querySelector('.login-form input[type="email"]').value.trim();
    const password = document.querySelector('.login-form input[type="password"]').value;
    const btn      = loginForm.querySelector("button[type='submit']");

    btn.textContent = "Ingresando...";
    btn.disabled    = true;

    // CORRECCIÓN: Se agrega 'data' a la desestructuración para evitar el ReferenceError
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    console.log("RESULTADO:", { data, error }); 

   if(error){
    const errorEl = document.getElementById("loginError");
    if(errorEl){
        errorEl.textContent = "Correo o contraseña incorrectos";
        errorEl.classList.remove("hidden");
        setTimeout(() => errorEl.classList.add("hidden"), 4000);
    }
    btn.textContent = "Ingresar";
    btn.disabled    = false;
} else {
        _currentUserId = data.user?.id || null;
        document.querySelector(".login-page").style.display = "none";
        dashboard.classList.remove("hidden");

        // NUEVO: Descarga la información de Supabase cuando el usuario inicia sesión
        await inicializarEstructurasDeUsuario();
        solicitarPermisoNotificaciones();
    }
});
/* =========================
   TOGGLE CONTRASEÑA
========================= */
const togglePwd = document.getElementById("togglePassword");
if(togglePwd){
    togglePwd.addEventListener("click", () => {
        const input = document.getElementById("loginPassword");
        const icon  = document.getElementById("eyeIcon");
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        icon.innerHTML = isHidden
            ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
               <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
               <line x1="1" y1="1" x2="23" y2="23"/>`
            : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
               <circle cx="12" cy="12" r="3"/>`;
    });
}
/* =========================
   ACTIVE NAV
========================= */

function setActiveNav(index){
    navItems.forEach(item=>{
        item.classList.remove("active-nav");
    });
    navItems[index].classList.add("active-nav");
}

/* =========================
   HIDE ALL PAGES
========================= */

function hideAllPages(){
    dashboard.classList.add("hidden");
    vehiclesPage.classList.add("hidden");
    clientsPage.classList.add("hidden");
    inventoryPage.classList.add("hidden");
    workshopPage.classList.add("hidden");
    document.getElementById("comprasPage")?.classList.add("hidden");
    document.getElementById("proveedoresPage")?.classList.add("hidden");
    document.getElementById("ordenesCompraPage")?.classList.add("hidden");
    document.getElementById("recepcionesPage")?.classList.add("hidden");
    document.getElementById("facturasPage")?.classList.add("hidden");
    document.getElementById("tecnicosPage")?.classList.add("hidden");
}

/* =========================
   DASHBOARD HEADER DINÁMICO
========================= */
function updateDashboardHeader(){
    const greetEl = document.getElementById("dashGreeting");
    const dateEl  = document.getElementById("dashDate");
    const userEl  = document.getElementById("dashUser");

    if(greetEl) greetEl.textContent = "Excelente día";

    if(dateEl){
        const today = new Date();
        const opts  = { weekday:"long", year:"numeric", month:"long", day:"numeric" };
        const str   = today.toLocaleDateString("es-MX", opts);
        dateEl.textContent = str.charAt(0).toUpperCase() + str.slice(1);
    }

    if(userEl){
        _supabase.auth.getSession().then(({ data: { session } }) => {
            if(session?.user?.email) userEl.textContent = session.user.email;
        });
    }
}

/* "Ver todos" del dashboard → navegan a la sección */
document.getElementById("dashGoVehicles")?.addEventListener("click", ()=>{
    dashboard.classList.add("hidden");
    vehiclesPage.classList.remove("hidden");
    setActiveNav(0);
});
document.getElementById("dashGoInventory")?.addEventListener("click", ()=>{
    dashboard.classList.add("hidden");
    inventoryPage.classList.remove("hidden");
    setActiveNav(2);
});
/* =========================
   EMPTY STATES
========================= */

const EMPTY_MSGS = {
    incomingList:        "Sin vehículos ingresados",
    serviceList:         "Sin vehículos en servicio",
    readyList:           "Sin vehículos listos",
    doneList:            "Sin vehículos entregados",
    clientsList:         "Sin clientes recientes",
    serviceClientsList:  "Sin próximos a servicio",
    externalClientsList: "Sin contactos externos",
    inventoryList:       "Sin productos en inventario",
    workshopTasks:       "Sin tareas del día"
};

function checkEmptyState(containerId){
    const container = document.getElementById(containerId);
    if(!container) return;
    const old = container.querySelector(".empty-state");
    if(old) old.remove();
    const real = Array.from(container.children).filter(c => !c.classList.contains("empty-state"));
    if(real.length === 0){
        const el = document.createElement("div");
        el.className = "empty-state";
        el.innerHTML = `<p>${EMPTY_MSGS[containerId] || "Sin registros"}</p>`;
        container.appendChild(el);
    }
}

function initEmptyStates(){
    Object.keys(EMPTY_MSGS).forEach(id => checkEmptyState(id));
}

/* =========================
   CONTACT SHEET — BITÁCORA
========================= */

function getClientPhone(ownerName){
    if(!ownerName) return "";
    let phone = "";
    document.querySelectorAll(".cp-card").forEach(card => {
        if((card.dataset.name || "").toLowerCase() === ownerName.toLowerCase())
            phone = card.dataset.phone || "";
    });
    return phone;
}

function showContactSheet(ownerName, anchorEl){
    const existing = document.querySelector(".contact-sheet");
    if(existing){ existing.remove(); return; }

    const phone = getClientPhone(ownerName);
    const sheet = document.createElement("div");
    sheet.className = "contact-sheet";

    const rect = anchorEl.getBoundingClientRect();
    sheet.style.top   = (rect.bottom + 8) + "px";
    sheet.style.right = (window.innerWidth - rect.right) + "px";

    sheet.innerHTML = `
        <span class="contact-sheet-name">${ownerName}</span>
        ${phone
            ? `<button class="contact-sheet-btn" id="csCall">📞 Llamar</button>
               <button class="contact-sheet-btn" id="csWA">💬 WhatsApp</button>`
            : `<div style="padding:8px 14px;font-size:.78rem;color:#aaa;">Sin teléfono registrado</div>`
        }
    `;

    if(phone){
        sheet.querySelector("#csCall").addEventListener("click", ()=>{
            window.open(`tel:${phone}`);
            sheet.remove();
        });
        sheet.querySelector("#csWA").addEventListener("click", ()=>{
            const msg = encodeURIComponent(`Hola ${ownerName}, le contactamos del taller con información sobre su vehículo.`);
            window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`);
            sheet.remove();
        });
    }

    document.body.appendChild(sheet);
    setTimeout(()=>{
        document.addEventListener("click", function close(e){
            if(!e.target.closest(".contact-sheet") && !e.target.closest(".vp-contact-btn")){
                sheet.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 100);
}
/* =========================
   CONTACT SHEET — CLIENTES
========================= */
function showClientContactSheet(card, anchorEl){
    const existing = document.querySelector(".contact-sheet");
    if(existing){ existing.remove(); return; }

    const name  = card.dataset.name  || "Cliente";
    const phone = card.dataset.phone || "";
    const email = card.dataset.email || "";

    if(!phone && !email){
        alert("Sin teléfono ni correo registrado para este cliente.");
        return;
    }

    const sheet = document.createElement("div");
    sheet.className = "contact-sheet";

    const rect = anchorEl.getBoundingClientRect();
    sheet.style.top   = (rect.bottom + 8) + "px";
    sheet.style.right = (window.innerWidth - rect.right) + "px";

    sheet.innerHTML = `
        <span class="contact-sheet-name">${name}</span>
        ${phone ? `
            <button class="contact-sheet-btn" id="csClientCall">📞 Llamar</button>
            <button class="contact-sheet-btn" id="csClientWA">💬 WhatsApp</button>
        ` : ""}
        ${email ? `
            <button class="contact-sheet-btn" id="csClientEmail">✉️ Enviar correo</button>
        ` : ""}
        ${!phone ? `<div style="padding:8px 14px;font-size:.78rem;color:#aaa;">Sin teléfono registrado</div>` : ""}
    `;

    if(phone){
        sheet.querySelector("#csClientCall").addEventListener("click", ()=>{
            window.open(`tel:${phone}`);
            sheet.remove();
        });
        sheet.querySelector("#csClientWA").addEventListener("click", ()=>{
            const msg = encodeURIComponent(`Hola ${name}, le contactamos del taller con información sobre su vehículo.`);
            window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`);
            sheet.remove();
        });
    }

    if(email){
        sheet.querySelector("#csClientEmail").addEventListener("click", ()=>{
            window.open(`mailto:${email}?subject=Información sobre su vehículo&body=Hola ${name},%0A%0ADesde el taller nos comunicamos con usted.`);
            sheet.remove();
        });
    }

    document.body.appendChild(sheet);
    setTimeout(()=>{
        document.addEventListener("click", function close(e){
            if(!e.target.closest(".contact-sheet") && !e.target.closest(".cp-contact-btn")){
                sheet.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 100);
}
function showVehicleHistory(card){
    const existing = document.querySelector(".history-sheet");
    if(existing){ existing.remove(); return; }

    const history = JSON.parse(card.dataset.history || "[]");
    const name    = card.dataset.vehicleName || "Vehículo";
    const uid     = card.dataset.uid || "";
    const owner   = card.dataset.owner || "";

    const sheet = document.createElement("div");
    sheet.className = "history-sheet";
    sheet.dataset.owner = owner;
    sheet.innerHTML = `
        <div class="history-sheet-header">
            <span class="history-sheet-title">Historial — ${name}</span>
            <button class="history-sheet-close">✕</button>
        </div>
        <div class="history-photos-section">
            <div class="history-photos-header">
                <span>Fotos</span>
                <button type="button" class="history-photos-add-btn">+ Agregar foto</button>
            </div>
            <input type="file" accept="image/*" class="history-photo-input" hidden>
            <div class="history-photos-grid"><p class="history-photos-loading">Cargando fotos...</p></div>
        </div>
        <div class="history-sheet-body">
            ${history.length === 0
                ? `<p class="history-empty">Sin historial de servicios aún</p>`
                : history.slice().reverse().map(h => `
                    <div class="history-item">
                        <div class="history-item-icon">🔧</div>
                        <div class="history-item-info">
                            <span class="history-item-service">${h.service}</span>
                            <span class="history-item-date">${h.date}</span>
                        </div>
                    </div>
                `).join("")
            }
        </div>
    `;

    document.body.appendChild(sheet);
    sheet.querySelector(".history-sheet-close").addEventListener("click", () => sheet.remove());

    setTimeout(()=>{
        document.addEventListener("click", function close(e){
            if(!e.target.closest(".history-sheet") && !e.target.closest(".vp-history-btn")){
                sheet.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 100);

    const fileInput = sheet.querySelector(".history-photo-input");
    sheet.querySelector(".history-photos-add-btn").addEventListener("click", () => {
        if(!uid){ alert("No se pudo identificar el vehículo."); return; }
        fileInput.click();
    });
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if(!file) return;
        const ok = await uploadVehiclePhoto(uid, file, sheet, "general");
        if(ok) renderVehiclePhotos(uid, sheet);
        fileInput.value = "";
    });

    renderVehiclePhotos(uid, sheet);
}

function findVehicleCardByName(name){
    const search = (name || "").toLowerCase().trim();
    if(!search) return null;
    let exact = null, fuzzy = null;
    document.querySelectorAll(".vp-card").forEach(card => {
        const cardName = (card.dataset.vehicleName || "").toLowerCase().trim();
        if(!cardName) return;
        if(cardName === search) exact = card;
        else if(!fuzzy && (cardName.includes(search) || search.includes(cardName))) fuzzy = card;
    });
    return exact || fuzzy;
}

function showTaskEvidence(task){
    const existing = document.querySelector(".evidence-sheet");
    if(existing){ existing.remove(); return; }

    const vehicleCard = findVehicleCardByName(task.dataset.vehicle || "");
    if(!vehicleCard){
        alert("No se encontró el vehículo vinculado a esta tarea.");
        return;
    }
    const uid       = vehicleCard.dataset.uid || "";
    const taskTitle = task.dataset.title || "";

    const sheet = document.createElement("div");
    sheet.className = "history-sheet evidence-sheet";
    sheet.innerHTML = `
        <div class="history-sheet-header">
            <span class="history-sheet-title">Evidencia — ${taskTitle}</span>
            <button class="history-sheet-close">✕</button>
        </div>
        <div class="history-photos-section" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
            <div class="history-photos-header">
                <span>Fotos del trabajo</span>
                <button type="button" class="history-photos-add-btn">+ Agregar foto</button>
            </div>
            <input type="file" accept="image/*" class="history-photo-input" hidden>
            <div class="history-photos-grid"><p class="history-photos-loading">Cargando fotos...</p></div>
        </div>
    `;

    document.body.appendChild(sheet);
    sheet.querySelector(".history-sheet-close").addEventListener("click", () => sheet.remove());
    setTimeout(()=>{
        document.addEventListener("click", function close(e){
            if(!e.target.closest(".evidence-sheet") && !e.target.closest(".task-evidence-btn")){
                sheet.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 100);

    const fileInput = sheet.querySelector(".history-photo-input");
    sheet.querySelector(".history-photos-add-btn").addEventListener("click", () => {
        if(!uid){ alert("Guarda el vehículo primero."); return; }
        fileInput.click();
    });
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if(!file) return;
        const ok = await uploadVehiclePhoto(uid, file, sheet, "evidencia", taskTitle);
        if(ok){
            renderVehiclePhotos(uid, sheet, "evidencia", taskTitle);
            updateTaskEvidenceCount(task, uid);
        }
        fileInput.value = "";
    });

    renderVehiclePhotos(uid, sheet, "evidencia", taskTitle);
}

async function updateTaskEvidenceCount(task, uid){
    const btn = task.querySelector(".task-evidence-btn");
    if(!btn || !uid) return;
    const { count } = await _supabase
        .from("vehicle_photos")
        .select("id", { count: "exact", head: true })
        .eq("vehicle_uid", uid)
        .eq("kind", "evidencia")
        .eq("caption", task.dataset.title || "");
    btn.textContent = count > 0 ? `📷 ${count}` : "📷";
}

async function uploadVehiclePhoto(vehicleUid, file, sheet, kind = "general", caption = ""){
    const grid = sheet.querySelector(".history-photos-grid");
    const status = document.createElement("p");
    status.className = "history-photos-loading";
    status.textContent = "Subiendo foto...";
    grid.prepend(status);

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if(!session) throw new Error("Sin sesión activa");

        const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${session.user.id}/${vehicleUid}/${Date.now()}.${ext}`;

        const { error: uploadError } = await _supabase.storage.from("vehicle-photos").upload(path, file);
        if(uploadError) throw uploadError;

        const { data: urlData } = _supabase.storage.from("vehicle-photos").getPublicUrl(path);

        const { error: insertError } = await _supabase.from("vehicle_photos").insert({
            user_id: session.user.id,
            vehicle_uid: vehicleUid,
            url: urlData.publicUrl,
            path,
            kind,
            caption
        });
        if(insertError) throw insertError;

        status.remove();
        return true;
    } catch(err){
        console.error("Error al subir foto:", err);
        status.textContent = "Error al subir la foto";
        setTimeout(()=>status.remove(), 2500);
        return false;
    }
}

async function renderVehiclePhotos(vehicleUid, sheet, kindFilter = null, captionFilter = null){
    const grid = sheet.querySelector(".history-photos-grid");
    if(!vehicleUid){
        grid.innerHTML = `<p class="history-empty">Vehículo sin identificador, guarda y vuelve a abrir</p>`;
        return;
    }
    grid.innerHTML = `<p class="history-photos-loading">Cargando fotos...</p>`;

    let query = _supabase.from("vehicle_photos").select("*").eq("vehicle_uid", vehicleUid);
    if(kindFilter)    query = query.eq("kind", kindFilter);
    if(captionFilter) query = query.eq("caption", captionFilter);

    const { data, error } = await query.order("created_at", { ascending: false });

    if(error){
        grid.innerHTML = `<p class="history-empty">No se pudieron cargar las fotos</p>`;
        return;
    }
    if(!data || data.length === 0){
        grid.innerHTML = `<p class="history-empty">Sin fotos aún</p>`;
        return;
    }

    grid.innerHTML = data.map(p => `
        <div class="history-photo-card" data-photo-id="${p.id}" data-path="${p.path}" data-url="${p.url}">
            <img src="${p.url}" alt="Foto del vehículo" loading="lazy">
            ${p.caption ? `<span class="history-photo-caption">${p.caption}</span>` : ""}
            <div class="history-photo-actions">
                <button class="history-photo-wa-btn" title="Enviar por WhatsApp">💬</button>
                <button class="history-photo-del-btn" title="Eliminar">✕</button>
            </div>
        </div>
    `).join("");

    grid.querySelectorAll(".history-photo-wa-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const photoCard = e.target.closest(".history-photo-card");
            sendPhotoWhatsApp(photoCard.dataset.url, sheet.dataset.owner || "");
        });
    });

    grid.querySelectorAll(".history-photo-del-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const photoCard = e.target.closest(".history-photo-card");
            if(!confirm("¿Eliminar esta foto?")) return;
            await _supabase.storage.from("vehicle-photos").remove([photoCard.dataset.path]);
            await _supabase.from("vehicle_photos").delete().eq("id", photoCard.dataset.photoId);
            photoCard.remove();
        });
    });
}

function sendPhotoWhatsApp(photoUrl, ownerName){
    const ownerCard = [...document.querySelectorAll(".cp-card")]
        .find(c => (c.dataset.name||"").toLowerCase() === (ownerName||"").toLowerCase());
    const phone = ownerCard?.dataset.phone || "";
    if(!phone){
        alert("Este cliente no tiene teléfono registrado.");
        return;
    }
    const msg = encodeURIComponent(`Hola, le compartimos una foto de su vehículo: ${photoUrl}`);
    window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`);
}

/* =========================
   NAVIGATION
========================= */

navItems[0].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(0);
    vehiclesPage.classList.remove("hidden");
    updateCounts();
});

navItems[1].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(1);
    clientsPage.classList.remove("hidden");
    refreshClientVehicleStatuses();
    ["clientsList","serviceClientsList","externalClientsList"].forEach(id => checkEmptyState(id));
});

navItems[2].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(2);
    inventoryPage.classList.remove("hidden");
    updateInventoryStats();
});

navItems[3].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(3);
    workshopPage.classList.remove("hidden");
    updateWorkshopStats();
    refreshTechnicianSelect();
});

/* =========================
   BACK BUTTONS
========================= */

document.getElementById("dashGoInventory")?.addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(2);
    inventoryPage.classList.remove("hidden");
    updateInventoryStats();
});
document.getElementById("dashGoVehicles")?.addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(0);
    vehiclesPage.classList.remove("hidden");
    updateCounts();
});
function goBackToDashboard(){
    hideAllPages();
    dashboard.classList.remove("hidden");
    updateDashboardStats();
    updateDashVehicles();
    updateDashLowStock();
    updateComprasHubStats();
    updateComprasNavDot();
}

document.getElementById("backDashboard").addEventListener("click", goBackToDashboard);

function updateComprasNavDot(){
    const nav = navItems[4];
    if(!nav) return;

    const hayOrdenPendiente = [...document.querySelectorAll("#ordenesList .workshop-task")]
        .some(c => c.dataset.status !== "Recibida" && c.dataset.status !== "Cancelada");

    let pendingFacturas = 0;
    document.querySelectorAll("#facturasList .workshop-task").forEach(c => {
        if(c.dataset.status === "Pagada" || c.dataset.status === "Cancelada") return;
        const items = JSON.parse(c.dataset.items || "[]");
        pendingFacturas += items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
    });

    const dot = nav.querySelector(".nav-compras-dot");
    if(hayOrdenPendiente || pendingFacturas > 0){
        nav.classList.add("compras-alert");
        if(!dot){
            const d = document.createElement("span");
            d.className = "nav-compras-dot";
            nav.appendChild(d);
        }
    } else {
        nav.classList.remove("compras-alert");
        if(dot) dot.remove();
    }
}
document.getElementById("backFromClients").addEventListener("click", goBackToDashboard);
document.getElementById("backFromInventory").addEventListener("click", goBackToDashboard);
document.getElementById("backFromWorkshop").addEventListener("click", goBackToDashboard);

/* =========================
   VEHICLE MODAL
========================= */

const addButtons       = document.querySelectorAll(".add-btn");
const vehicleModal     = document.getElementById("vehicleModal");
const saveVehicleBtn   = document.getElementById("saveVehicleBtn");
const closeVehicleModal = document.getElementById("closeVehicleModal");

let currentTarget = null;

addButtons.forEach(button=>{
    button.addEventListener("click", ()=>{

        currentTarget = document.getElementById(button.dataset.target);
        vehicleModal.classList.remove("hidden");

        document.getElementById("vehicleBrand").value = "";
        document.getElementById("vehicleModel").value = "";
        document.getElementById("vehicleYear").value  = "";
        document.getElementById("vehiclePlate").value = "";
        document.getElementById("vehicleColor").value = "";
        document.getElementById("vehicleOwner").value = "";
        document.getElementById("vehicleNotes").value = "";

    });
});

closeVehicleModal.addEventListener("click", ()=>{
    vehicleModal.classList.add("hidden");
});

/* =========================
   SAVE VEHICLE
========================= */

saveVehicleBtn.addEventListener("click", ()=>{

    const brand = document.getElementById("vehicleBrand").value.trim();
    const model = document.getElementById("vehicleModel").value.trim();
    const year  = document.getElementById("vehicleYear").value.trim();
    const plate = document.getElementById("vehiclePlate").value.trim();
    const color = document.getElementById("vehicleColor").value.trim();
    const owner = document.getElementById("vehicleOwner").value.trim();
    // ---> AÑADE ESTA LÍNEA AQUÍ:
    const notes = document.getElementById("vehicleNotes").value.trim();

    if(!brand || !model) return;

    const today = new Date().toLocaleDateString("es-MX");

    const targets = {
        incomingList: { label: "Ingresado",   cls: "status-ingresado" },
        serviceList:  { label: "En servicio", cls: "status-servicio"  },
        readyList:    { label: "Listo",        cls: "status-listo"     },
        doneList:     { label: "Entregado",    cls: "status-entregado" }
    };

    const info = targets[currentTarget.id] || { label: "Ingresado", cls: "status-ingresado" };

    // 1. Crear tarjeta del vehículo
    createVehicleCard(
        `${brand} ${model}`,
        currentTarget,
        year, plate, color, owner, today,
        info.label, info.cls,
        notes // <--- NUEVO PARÁMETRO
    );

    // 2. Auto-registrar cliente si no existe
    if(owner){
        const clientsList = document.getElementById("clientsList");
        let clientExists  = false;

        document.querySelectorAll(".cp-card .cp-name").forEach(nameEl => {
            if(nameEl.textContent.toLowerCase() === owner.toLowerCase()){
                clientExists = true;
            }
        });

        if(!clientExists){
            createClientCard(
                owner,
                "",
                "",
                `${brand} ${model} (${plate || "Sin placa"})`,
                "directo",
                clientsList
              
    
            );
            saveClients(); // <-- AÑADIR AQUÍ
        }
    }

   vehicleModal.classList.add("hidden");

    addNotification("vehicle", "Vehículo", `${brand} ${model} registrado en taller`);
    addActivity("vehicle", "Entrada de vehículo", `${brand} ${model} · ${plate || "Sin placa"}`);

    // Invitar a completar teléfono si no tiene
    if(owner) setTimeout(() => showContactPrompt(owner), 400);

});

/* =========================
   CREATE VEHICLE CARD
========================= */

function createVehicleCard(name, target, year, plate, color, owner, date, statusLabel, statusClass, notes = "", uid = null){
    const card = document.createElement("div");
    card.className           = "vp-card";
    card.dataset.vehicleName = name;
    card.dataset.owner       = owner  || "";
    card.dataset.year        = year   || "";
    card.dataset.plate       = plate  || "";
    card.dataset.color       = color  || "";
    card.dataset.notes       = notes  || "";
    card.dataset.date        = date   || "";
    card.dataset.history = "[]";
    card.dataset.uid = uid || (window.crypto?.randomUUID ? crypto.randomUUID() : ("uid_" + Date.now() + "_" + Math.random().toString(36).slice(2)));

    card.innerHTML = `
        <div class="vp-card-left">
            <span class="vp-card-name">${name} &nbsp;·&nbsp; ${plate || "Sin placa"}</span>
            <span class="vp-card-plate">${owner || "Sin dueño"}</span>
            <span class="vp-card-detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg>
                ${color || "—"} &nbsp;·&nbsp;
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${year || "—"}
            </span>
            ${notes ? `<span class="vp-card-notes"><strong>Notas:</strong> ${notes}</span>` : ""}
            <span class="vp-card-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="vp-card-right">
    <button class="vp-history-btn" title="Historial">🕐</button>
    ${owner ? `<button class="vp-contact-btn" title="Contactar a ${owner}">📞</button>` : ""}
    <button class="vp-delete" title="Eliminar">✕</button>
</div>
    `;

    const contactBtn = card.querySelector(".vp-contact-btn");
    if(contactBtn){
        contactBtn.addEventListener("click", (e)=>{
            e.stopPropagation();
            showContactSheet(owner, contactBtn);
            
        });
    }
    card.querySelector(".vp-history-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    showVehicleHistory(card);
});

    card.querySelector(".vp-delete").addEventListener("click", ()=>{
        if(!confirm(`¿Eliminar ${name}?`)) return;
        card.remove();
        updateCounts();
        updateWorkshopStats();
    });

    if(target.id === "incomingList"){
        const moveBtn = document.createElement("button");
        moveBtn.className   = "vp-move-service";
        moveBtn.textContent = "→ Servicio";
        moveBtn.addEventListener("click", ()=>{
            const statusEl       = card.querySelector(".vp-card-status");
            statusEl.className   = "vp-card-status status-servicio";
            statusEl.textContent = "En servicio";
            document.getElementById("serviceList").appendChild(card);
            moveBtn.remove();
            updateCounts();
            updateWorkshopStats();
            autoAddWorkshopTask(name);
            addNotification("vehicle", "En servicio", `${name} pasó a servicio`);
            addActivity("vehicle", "Vehículo a servicio", name);
            avisar(`🔧 ${name} entró a servicio`);
        });
        card.querySelector(".vp-card-right").prepend(moveBtn);
    }

    target.appendChild(card);
    updateCounts();
    updateWorkshopStats();

    return card; // ← necesario para la persistencia
}
/* =========================
   AUTO ABRIR MODAL TALLER
========================= */

function autoAddWorkshopTask(vehicleName){

    const entregaEstimada = new Date();
    entregaEstimada.setDate(entregaEstimada.getDate() + 2);
    const isoDate = entregaEstimada.toISOString().split("T")[0];

    editingTaskEl = null;

    document.getElementById("taskTitle").value    = "Diagnóstico y Servicio Técnico";
    document.getElementById("taskVehicle").value  = vehicleName;
    document.getElementById("taskDelivery").value = isoDate;

    loadWorkshopVehicles();

    // ── Buscar la opción que empiece con el nombre del vehículo ──
    const sel     = document.getElementById("taskVehicleSelect");
    const matchOp = Array.from(sel.options).find(o =>
        o.value.toLowerCase().startsWith(vehicleName.toLowerCase())
    );
    if(matchOp) sel.value = matchOp.value;

    taskStatusInput.value = "En proceso";
    taskStatusBtn.textContent = "En proceso";
    taskStatusBtn.classList.remove("pending-status", "completed-status");
    taskStatusBtn.classList.add("active-status");

    workshopModal.classList.remove("hidden");
}

/* =========================
   UPDATE COUNTS (Bitácora)
========================= */

function updateCounts(){
    const map = {
        incomingList: "incomingCount",
        serviceList:  "serviceCount",
        readyList:    "readyCount",
        doneList:     "doneCount"
    };
    Object.entries(map).forEach(([listId, countId]) => {
        const list  = document.getElementById(listId);
        const count = Array.from(list.children)
            .filter(c => !c.classList.contains("empty-state")).length;
        document.getElementById(countId).textContent = count;
        checkEmptyState(listId);
    });
    updateDashboardStats();
    updateDashVehicles();
    saveVehicles(); // ← AÑADIR
}
/* =========================
   CONTACT PROMPT
========================= */

function showContactPrompt(ownerName){
    let targetCard = null;
    document.querySelectorAll(".cp-card").forEach(card => {
        if((card.dataset.name || "").toLowerCase() === ownerName.toLowerCase())
            targetCard = card;
    });

    if(targetCard && targetCard.dataset.phone) return;

    const existing = document.getElementById("contactPrompt");
    if(existing) existing.remove();

    const prompt = document.createElement("div");
    prompt.id        = "contactPrompt";
    prompt.className = "contact-prompt";

    prompt.innerHTML = `
        <p class="contact-prompt-title">Agregar contacto — ${ownerName}</p>
        <p class="contact-prompt-sub">Con el teléfono podrás llamar y enviar WhatsApp directo desde la Bitácora</p>
        <input type="tel"   id="promptPhone" placeholder="Teléfono">
        <input type="email" id="promptEmail" placeholder="Correo electrónico (opcional)">
        <div class="contact-prompt-actions">
            <button class="contact-prompt-save" id="promptSave">Guardar contacto</button>
            <button class="contact-prompt-skip" id="promptSkip">Ahora no</button>
        </div>
    `;

    document.body.appendChild(prompt);

    // ── Auto-dismiss si el usuario lo ignora ──
    let autoClose = setTimeout(()=>{
        const p = document.getElementById("contactPrompt");
        if(p) p.remove();
    }, 15000);

    // ── Cancelar auto-dismiss en cuanto el usuario interactúa ──
    prompt.addEventListener("click",   () => clearTimeout(autoClose));
    prompt.addEventListener("focusin", () => clearTimeout(autoClose));

    document.getElementById("promptSkip").addEventListener("click", ()=>{
        clearTimeout(autoClose);
        prompt.remove();
    });

    document.getElementById("promptSave").addEventListener("click", ()=>{
        const phone = document.getElementById("promptPhone").value.trim();
        const email = document.getElementById("promptEmail").value.trim();

        if(!phone){
            document.getElementById("promptPhone").style.boxShadow =
                "0 0 0 3px rgba(255,59,48,.25)";
            return;
        }

        if(targetCard){
            targetCard.dataset.phone = phone;
            targetCard.dataset.email = email;
            targetCard.innerHTML     = renderClientCardHTML(
                targetCard.dataset.name,
                phone,
                email,
                targetCard.dataset.vehicle,
                targetCard.dataset.source
            );
            attachClientCardListeners(targetCard);
        }

        clearTimeout(autoClose);
        prompt.remove();
        updateDashboardStats();
        saveClients();
    });
}
/* =========================
   VEHICLE STATUS EN CLIENTE
========================= */

function getVehicleStatus(vehicleField){
    if(!vehicleField) return null;
    const name = vehicleField.toLowerCase().trim();

    const lists = [
        { id: "incomingList", label: "Ingresado",   cls: "status-ingresado" },
        { id: "serviceList",  label: "En servicio", cls: "status-servicio"  },
        { id: "readyList",    label: "Listo",        cls: "status-listo"     },
        { id: "doneList",     label: "Entregado",    cls: "status-entregado" }
    ];

    for(const list of lists){
        const container = document.getElementById(list.id);
        if(!container) continue;
        for(const card of container.querySelectorAll(".vp-card")){
            const cardName = (card.dataset.vehicleName || "").toLowerCase().trim();
            if(cardName && (name.includes(cardName) || cardName.includes(name.split("(")[0].trim()))){
                return { label: list.label, cls: list.cls };
            }
        }
    }
    return null;
}

function refreshClientVehicleStatuses(){
    document.querySelectorAll(".cp-card").forEach(card => {
        const vehicle  = card.dataset.vehicle;
        const statusEl = card.querySelector(".cp-vehicle-status");
        if(!statusEl || !vehicle) return;

        const status = getVehicleStatus(vehicle);
        if(status){
            statusEl.className   = `cp-vehicle-status vp-card-status ${status.cls}`;
            statusEl.textContent = status.label;
            statusEl.style.display = "";
        } else {
            statusEl.style.display = "none";
        }
    });
}
/* =========================
   CLIENTES
========================= */

const clientModal          = document.getElementById("clientModal");
const closeClientModal     = document.getElementById("closeClientModal");
const saveClientBtn        = document.getElementById("saveClientBtn");
const clientsList          = document.getElementById("clientsList");
const serviceClientsList   = document.getElementById("serviceClientsList");
const externalClientsList  = document.getElementById("externalClientsList");

let editingClientCard    = null;
let editingTaskEl        = null;
let editingInventoryCard = null;

function openClientModalForNew(section = "recent"){
    editingClientCard = null;
    document.querySelector("#clientModal h2").textContent = "Nuevo cliente";
    document.getElementById("clientName").value    = "";
    document.getElementById("clientPhone").value   = "";
    document.getElementById("clientEmail").value   = "";
    document.getElementById("clientVehicle").value = "";
    document.getElementById("clientSection").value = section;
    clientModal.classList.remove("hidden");
}

document.getElementById("openClientModal")
    .addEventListener("click", ()=> openClientModalForNew("recent"));

document.getElementById("openServiceClientModal")
    .addEventListener("click", ()=> openClientModalForNew("service"));

document.getElementById("openExternalClientModal")
    .addEventListener("click", ()=> openClientModalForNew("external"));

closeClientModal.addEventListener("click", ()=>{
    clientModal.classList.add("hidden");
    editingClientCard = null;
    document.querySelector("#clientModal h2").textContent = "Nuevo cliente";
});

function attachClientCardListeners(card){
    const sectionMap = {
        clientsList:        "recent",
        serviceClientsList: "service",
        externalClientsList:"external"
    };

    card.querySelector(".cp-edit-btn").addEventListener("click", ()=>{
        editingClientCard = card;
        document.getElementById("clientName").value    = card.dataset.name;
        document.getElementById("clientPhone").value   = card.dataset.phone;
        document.getElementById("clientEmail").value   = card.dataset.email;
        document.getElementById("clientVehicle").value = card.dataset.vehicle;
        document.getElementById("clientSource").value  = card.dataset.source;
        const parentId = card.parentElement ? card.parentElement.id : "clientsList";
        document.getElementById("clientSection").value = sectionMap[parentId] || "recent";
        document.querySelector("#clientModal h2").textContent = "Editar cliente";
        clientModal.classList.remove("hidden");
    });

    card.querySelector(".cp-contact-btn").addEventListener("click", (e)=>{
    e.stopPropagation();
    showClientContactSheet(card, card.querySelector(".cp-contact-btn"));
});

   card.querySelector(".cp-delete-btn").addEventListener("click", ()=>{
    if(!confirm(`¿Eliminar a ${card.dataset.name}?`)) return;
    const parentId = card.parentElement?.id || "clientsList";
    card.remove();
    checkEmptyState(parentId);
    updateDashboardStats();
    saveClients(); // <-- AÑADIR AQUÍ
});
}

function renderClientCardHTML(name, phone, email, vehicle, source, lastService, lastServiceDate){
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
    const sourceIcons = {
        directo:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        whatsapp:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        correo:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
        instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
        facebook:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    };
    const svgCar    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
    const svgEdit   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const svgPhone  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.86-1.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    const svgX      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const srcIcon   = sourceIcons[source] || sourceIcons.directo;
    return `
        <div class="cp-card-left">
            <div class="cp-avatar">${initials}</div>
            <div class="cp-info">
                <span class="cp-name">${name}</span>
                <span class="cp-detail">${phone}</span>
                <span class="cp-detail">${email}</span>
               ${vehicle ? `
    <span class="cp-vehicle">${svgCar} ${vehicle}</span>
    <span class="cp-vehicle-status vp-card-status" style="display:none;"></span>
` : ""}
                ${lastService ? `<span class="cp-last-service">🔧 ${lastService} — ${lastServiceDate}</span>` : ""}
                <span class="cp-source">${srcIcon} ${source}</span>
            </div>
        </div>
        <div class="cp-actions">
            <button class="cp-edit-btn" title="Editar">${svgEdit}</button>
            <button class="cp-contact-btn" title="Contactar">${svgPhone}</button>
            <button class="cp-delete-btn" title="Eliminar">${svgX}</button>
        </div>
    `;
}

function createClientCard(name, phone, email, vehicle, source, target, lastService, lastServiceDate){
    const card = document.createElement("div");
    card.className               = "cp-card";
    card.dataset.name            = name;
    card.dataset.phone           = phone           || "";
    card.dataset.email           = email           || "";
    card.dataset.vehicle         = vehicle         || "";
    card.dataset.source          = source          || "directo";
    card.dataset.lastService     = lastService     || "";
    card.dataset.lastServiceDate = lastServiceDate || "";
    card.innerHTML = renderClientCardHTML(name, phone, email, vehicle, source, lastService, lastServiceDate);
    attachClientCardListeners(card);
    target.appendChild(card);
}

saveClientBtn.addEventListener("click", ()=>{
    const name    = document.getElementById("clientName").value.trim();
    const phone   = document.getElementById("clientPhone").value.trim();
    const email   = document.getElementById("clientEmail").value.trim();
    const vehicle = document.getElementById("clientVehicle").value.trim();
    const section = document.getElementById("clientSection").value;
    const source  = document.getElementById("clientSource").value;

    if(!name) return;

    const targets = {
        recent:   clientsList,
        service:  serviceClientsList,
        external: externalClientsList
    };

    if(editingClientCard !== null){
        const card = editingClientCard;
        card.dataset.name    = name;
        card.dataset.phone   = phone;
        card.dataset.email   = email;
        card.dataset.vehicle = vehicle;
        card.dataset.source  = source;
        card.innerHTML = renderClientCardHTML(name, phone, email, vehicle, source);
        attachClientCardListeners(card);
        targets[section].appendChild(card);
        editingClientCard = null;
        document.querySelector("#clientModal h2").textContent = "Nuevo cliente";
    } else {
        createClientCard(name, phone, email, vehicle, source, targets[section]);
    }

    clientModal.classList.add("hidden");
    addNotification("client", "Cliente", `${name} registrado en taller`);
    addActivity("client", "Nuevo cliente", name);
    saveClients(); // <-- AÑADIR AQUÍ
});

/* =========================
   INVENTARIO
========================= */

const inventoryModal    = document.getElementById("inventoryModal");
const openInventoryModal  = document.getElementById("openInventoryModal");
const closeInventoryModal = document.getElementById("closeInventoryModal");

openInventoryModal.addEventListener("click", ()=>{
    inventoryModal.classList.remove("hidden");
});

closeInventoryModal.addEventListener("click", ()=>{
    inventoryModal.classList.add("hidden");
});

/* ========================================
   WORKSHOP TASK SYSTEM
======================================== */

const workshopTasks      = document.getElementById("workshopTasks");
const addWorkshopTaskBtn = document.getElementById("addWorkshopTaskBtn");
const workshopModal      = document.getElementById("workshopModal");
const closeWorkshopModal = document.getElementById("closeWorkshopModal");
const saveWorkshopTaskBtn = document.getElementById("saveWorkshopTaskBtn");

/* ── Custom Status Select ── */

const taskStatusBtn     = document.getElementById("taskStatusBtn");
const taskStatusOptions = document.getElementById("taskStatusOptions");
const taskStatusInput   = document.getElementById("taskStatus");
const statusOptions     = document.querySelectorAll(".status-option");

taskStatusBtn.addEventListener("click", ()=>{
    taskStatusOptions.classList.toggle("hidden");
});

statusOptions.forEach(option=>{
    option.addEventListener("click", ()=>{
        const value = option.textContent.trim();
        taskStatusBtn.textContent = value;
        taskStatusInput.value     = value;

        taskStatusBtn.classList.remove("active-status","pending-status","completed-status");
        if(value === "En proceso") taskStatusBtn.classList.add("active-status");
        if(value === "Pendiente")  taskStatusBtn.classList.add("pending-status");
        if(value === "Completado") taskStatusBtn.classList.add("completed-status");

        taskStatusOptions.classList.add("hidden");
    });
});

document.addEventListener("click", (e)=>{
    if(!e.target.closest(".custom-status-select")){
        taskStatusOptions.classList.add("hidden");
    }
});

/* ── Abrir modal nueva tarea ── */

addWorkshopTaskBtn.addEventListener("click", ()=>{
    document.getElementById("taskTitle").value    = "";
    document.getElementById("taskVehicle").value  = "";
    document.getElementById("taskDelivery").value = "";

    loadWorkshopVehicles();

    taskStatusInput.value = "En proceso";
    taskStatusBtn.textContent = "En proceso";
    taskStatusBtn.classList.remove("pending-status","completed-status");
    taskStatusBtn.classList.add("active-status");

    refreshTechnicianSelect();
    document.getElementById("taskTechnicianSelect").value = "";
    editingTaskEl = null;
    workshopModal.classList.remove("hidden");
});

/* ── Cerrar modal ── */

closeWorkshopModal.addEventListener("click", ()=>{
    workshopModal.classList.add("hidden");
    editingTaskEl = null;
});
/* ── Toggle sección de piezas ── */
document.getElementById("partsToggleBtn")?.addEventListener("click", ()=>{
    const body  = document.getElementById("partsBody");
    const arrow = document.getElementById("partsArrow");
    body.classList.toggle("open");
    arrow.classList.toggle("open");
});

/* ── Construir fila de pieza ── */
function buildPartRow(){
    const row = document.createElement("div");
    row.className = "part-row";

    let optionsHTML = `<option value="">Seleccionar del inventario</option>`;
    document.querySelectorAll(".inventory-card").forEach(card => {
        const name  = card.dataset.fullName || "";
        const stock = parseInt(card.dataset.stock) || 0;
        optionsHTML += `<option value="${name}">${name} (${stock} en stock)</option>`;
    });
    optionsHTML += `<option value="__manual__">✏️ Otra pieza...</option>`;

    row.innerHTML = `
        <select class="part-select">${optionsHTML}</select>
        <input type="text" class="part-custom" placeholder="Nombre de pieza" style="display:none;flex:1;min-width:0;">
        <input type="number" class="part-qty" value="1" min="1">
        <button type="button" class="part-remove">✕</button>
    `;

    row.querySelector(".part-select").addEventListener("change", function(){
        const custom = row.querySelector(".part-custom");
        if(this.value === "__manual__"){
            custom.style.display = "block";
            this.style.width = "130px";
            this.style.flex  = "0 0 auto";
        } else {
            custom.style.display = "none";
            this.style.width = "";
            this.style.flex  = "1";
        }
    });

    row.querySelector(".part-remove").addEventListener("click", ()=> row.remove());
    return row;
}

/* ── Agregar fila de pieza ── */
document.getElementById("addPartBtn")?.addEventListener("click", ()=>{
    document.getElementById("partsList").appendChild(buildPartRow());
});

/* ── Descontar stock de inventario ── */
function deductInventoryStock(partName, qty){
    if(!partName) return;
    document.querySelectorAll(".inventory-card").forEach(card => {
        if((card.dataset.fullName || "").toLowerCase() === partName.toLowerCase()){
            const newStock = Math.max(0, (parseInt(card.dataset.stock) || 0) - qty);
            card.dataset.stock = newStock;
            refreshCardStock(card, newStock);
        }
    });
}

/* ── Guardar tarea ── */

saveWorkshopTaskBtn.addEventListener("click", ()=>{

    const title           = document.getElementById("taskTitle").value.trim();
    const selectedVehicle = document.getElementById("taskVehicleSelect").value;
    const manualVehicle   = document.getElementById("taskVehicle").value.trim();
    const vehicle         = selectedVehicle || manualVehicle;
    const delivery        = document.getElementById("taskDelivery").value;
    const status          = document.getElementById("taskStatus").value;
    const technicianName  = document.getElementById("taskTechnicianSelect")?.value || "";
    // Recopilar piezas del modal
    const parts = [];
    document.querySelectorAll("#partsList .part-row").forEach(row => {
        const sel  = row.querySelector(".part-select");
        const cust = row.querySelector(".part-custom");
        const qty  = parseInt(row.querySelector(".part-qty").value) || 1;
        const name = sel.value === "__manual__" ? cust.value.trim() : sel.value;
        if(name) parts.push({ name, qty });
    });

    if(!title || !vehicle){
        alert("Completa los datos");
        return;
    }

    if(editingTaskEl !== null){

        const task = editingTaskEl;

        let displayDate = "Sin fecha";
        if(delivery){
            const d = new Date(delivery + "T00:00:00");
            displayDate = d.toLocaleDateString("es-MX");
        }

        task.dataset.title    = title;
        task.dataset.vehicle  = vehicle;
        task.dataset.delivery = delivery;
        task.dataset.status   = status;

        task.querySelector("strong").textContent  = title;
        task.querySelectorAll("p")[0].textContent = vehicle;
        task.querySelectorAll("p")[1].textContent = `📅 Entrega: ${displayDate}`;

        const sel = task.querySelector(".task-select");
        sel.value = status;
        updateTaskStyle(sel, status);
        updateWorkshopStats();

        const vCardEdit = findVehicleCardByName(vehicle);
        if (vCardEdit) updateTaskEvidenceCount(task, vCardEdit.dataset.uid || "");

        // ── Si se edita y se marca Completado → sincronizar vehículo ──
       if(status === "Completado"){
    syncVehicleToReady(vehicle, title);
    task.style.transition = "opacity .6s ease, transform .6s ease";
    task.style.background = "rgba(52,199,89,.12)";
    task.style.borderColor = "rgba(52,199,89,.3)";
     setTimeout(()=>{
        task.style.opacity = "0";
        task.style.transform = "translateX(30px)";
        setTimeout(()=>{ task.remove(); updateWorkshopStats(); saveWorkshopTasks(); }, 600);
    }, 2000);
}

        editingTaskEl = null;

    } else {
        parts.forEach(p => deductInventoryStock(p.name, p.qty));
        createWorkshopTask(title, vehicle, delivery, status, parts, technicianName);
    }
   document.getElementById("taskTitle").value    = "";
    document.getElementById("taskVehicle").value  = "";
    document.getElementById("taskDelivery").value = "";
    document.getElementById("partsList").innerHTML = "";
    document.getElementById("partsBody")?.classList.remove("open");
    document.getElementById("partsArrow")?.classList.remove("open");
    workshopModal.classList.add("hidden");

    addNotification("task", "Taller", `Tarea "${title}" guardada`);
    addActivity("task", "Nueva tarea de taller", `${title} — ${vehicle}`);
    saveWorkshopTasks(); // <-- AÑADIR AQUÍ
});

/* ── Crear tarjeta de tarea ── */

function createWorkshopTask(title, vehicle, delivery, status, parts = [], technicianName = ""){
    const task = document.createElement("div");
    task.className        = "workshop-task";
    task.dataset.title    = title;
    task.dataset.vehicle  = vehicle;
    task.dataset.delivery = delivery || "";
    task.dataset.status   = status;
    task.dataset.parts          = JSON.stringify(parts);
    task.dataset.technicianName = technicianName;

    let displayDate = "Sin fecha";
    if(delivery){
        const d = new Date(delivery + "T00:00:00");
        displayDate = d.toLocaleDateString("es-MX");
    }

    task.innerHTML = `
        <div>
            <strong>${title}</strong>
            <p>${vehicle}</p>
            <p>📅 Entrega: ${displayDate}</p>
            ${technicianName ? `<p style="font-size:.78rem;color:#f5820d;font-weight:600;">👨‍🔧 ${technicianName}</p>` : ""}
            ${parts.length > 0 ? `<div class="parts-saved-list">${parts.map(p => `<span class="part-saved-row">${p.name} × ${p.qty}</span>`).join("")}</div>` : ""}
        </div>
        <div class="task-actions">
            <select class="task-select">
                <option value="En proceso" ${status === "En proceso" ? "selected" : ""}>En proceso</option>
                <option value="Pendiente"  ${status === "Pendiente"  ? "selected" : ""}>Pendiente</option>
                <option value="Completado" ${status === "Completado" ? "selected" : ""}>Completado</option>
            </select>
            <button class="task-evidence-btn" title="Evidencia fotográfica">📷</button>
            <button class="task-edit-btn" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="delete-task" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
    `;

    const statusSelect = task.querySelector(".task-select");
    updateTaskStyle(statusSelect, status);

    statusSelect.addEventListener("change", ()=>{
    updateTaskStyle(statusSelect, statusSelect.value);
    task.dataset.status = statusSelect.value; // ← actualizar dataset
    updateWorkshopStats();
    saveWorkshopTasks(); // ← guardar en CUALQUIER cambio de estado

    if(statusSelect.value === "Completado"){
        syncVehicleToReady(task.dataset.vehicle, task.dataset.title);
        addNotification("task", "✅ Completado", `${task.dataset.title} — ${task.dataset.vehicle}`);
        addActivity("task", "Trabajo completado", `${task.dataset.title} · ${task.dataset.vehicle}`);
        avisar(`✅ Trabajo listo: ${task.dataset.title} — ${task.dataset.vehicle}`);
        showCompletedBanner(task.dataset.title, task.dataset.vehicle);
        task.style.transition = "opacity .6s ease, transform .6s ease";
        task.style.background = "rgba(52,199,89,.12)";
        task.style.borderColor = "rgba(52,199,89,.3)";
        setTimeout(()=>{
            task.style.opacity = "0";
            task.style.transform = "translateX(30px)";
            setTimeout(()=>{ task.remove(); updateWorkshopStats(); saveWorkshopTasks(); }, 600);
        }, 2000);
    }
});

    task.querySelector(".task-edit-btn").addEventListener("click", ()=>{
        editingTaskEl = task;
        document.getElementById("taskTitle").value    = task.dataset.title;
        document.getElementById("taskVehicle").value  = task.dataset.vehicle;
        document.getElementById("taskDelivery").value = task.dataset.delivery;
        loadWorkshopVehicles();
        document.getElementById("taskVehicleSelect").value = task.dataset.vehicle;
        refreshTechnicianSelect();
        document.getElementById("taskTechnicianSelect").value = task.dataset.technicianName || "";

        const s = task.dataset.status;
        taskStatusInput.value = s;
        taskStatusBtn.textContent = s;
        taskStatusBtn.classList.remove("active-status","pending-status","completed-status");
        if(s === "En proceso") taskStatusBtn.classList.add("active-status");
        if(s === "Pendiente")  taskStatusBtn.classList.add("pending-status");
        if(s === "Completado") taskStatusBtn.classList.add("completed-status");

        workshopModal.classList.remove("hidden");
    });

    task.querySelector(".delete-task").addEventListener("click", ()=>{
    if(!confirm(`¿Eliminar tarea "${task.dataset.title}"?`)) return;
    task.remove();
    updateWorkshopStats();
    saveWorkshopTasks(); // <-- AÑADIR AQUÍ
});

    task.querySelector(".task-evidence-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        showTaskEvidence(task);
    });

    workshopTasks.appendChild(task);
    updateWorkshopStats();

    const linkedVehicle = findVehicleCardByName(vehicle);
    if(linkedVehicle) updateTaskEvidenceCount(task, linkedVehicle.dataset.uid || "");
}

/* ── Cargar vehículos en el select del modal ── */

function loadWorkshopVehicles(){
    const select = document.getElementById("taskVehicleSelect");
    select.innerHTML = `<option value="">Seleccionar vehículo</option>`;

    document.querySelectorAll(".vp-card").forEach(card => {
        // Usamos dataset.vehicleName guardado al crear la tarjeta
        const name  = card.dataset.vehicleName
            || card.querySelector(".vp-card-name").textContent.split("·")[0].trim();
        const owner = card.dataset.owner || "";

        const option = document.createElement("option");
        option.value       = name;
        option.textContent = owner ? `${name}  ·  ${owner}` : name;
        select.appendChild(option);
    });
}

/* ── Aplicar estilo al select de estado ── */

function updateTaskStyle(element, status){
    element.classList.remove("active-status","pending-status","completed-status");
    if(status === "En proceso") element.classList.add("active-status");
    if(status === "Pendiente")  element.classList.add("pending-status");
    if(status === "Completado") element.classList.add("completed-status");
}

/* ── Actualizar contadores del taller ── */
/* =========================
   DASHBOARD STATS
========================= */

function updateDashboardStats(){
    const serviceList = document.getElementById("serviceList");
    const activeCars  = serviceList
        ? Array.from(serviceList.children).filter(c => !c.classList.contains("empty-state")).length
        : 0;

    const readyListEl = document.getElementById("readyList");
    const readyCars   = readyListEl
        ? Array.from(readyListEl.children).filter(c => !c.classList.contains("empty-state")).length
        : 0;

    let pending = 0;
    document.querySelectorAll(".workshop-task").forEach(task => {
        if(task.querySelector(".task-select")?.value === "Pendiente") pending++;
    });

    const lowStock     = parseInt(document.getElementById("lowStockCount")?.textContent) || 0;
    const totalClients = document.querySelectorAll(".cp-card").length;

    const el = {
        cars:      document.getElementById("dashActiveCars"),
        tasks:     document.getElementById("dashPendingTasks"),
        stock:     document.getElementById("dashLowStock"),
        clients:   document.getElementById("dashClients"),
        card:      document.getElementById("dashLowStockCard"),
        ready:     document.getElementById("dashReadyCars"),
        readyCard: document.getElementById("dashReadyCard")
    };

    if(el.cars)    el.cars.textContent    = activeCars;
    if(el.tasks)   el.tasks.textContent   = pending;
    if(el.stock)   el.stock.textContent   = lowStock;
    if(el.clients) el.clients.textContent = totalClients;
    if(el.ready)   el.ready.textContent   = readyCars;

    if(el.card){
        if(lowStock > 0) el.card.classList.add("dash-stat-alert");
        else             el.card.classList.remove("dash-stat-alert");
    }
    if(el.readyCard){
        if(readyCars > 0) el.readyCard.classList.add("dash-ready-active");
        else              el.readyCard.classList.remove("dash-ready-active");
    }
}
function updateWorkshopStats(){
    const tasks       = document.querySelectorAll("#workshopTasks .workshop-task");
    const serviceList = document.getElementById("serviceList");
    const activeVehicles = serviceList
        ? Array.from(serviceList.children).filter(c => !c.classList.contains("empty-state")).length
        : 0;

    const activeCars = document.getElementById("activeCars");
    if(activeCars) activeCars.textContent = activeVehicles;

    let pending = 0;
    tasks.forEach(task => {
    if(task.querySelector(".task-select")?.value === "Pendiente") pending++;    });

    const pendingJobs = document.getElementById("pendingJobs");
    if(pendingJobs) pendingJobs.textContent = pending;

    checkEmptyState("workshopTasks");
    updateDashboardStats();
    refreshClientVehicleStatuses();
}

/* ========================================
   INVENTARIO — SISTEMA COMPLETO
======================================== */

const LOW_STOCK_THRESHOLD = 5;

const categoryIcons = {
    "Filtros"    : "🔧",
    "Aceites"    : "🛢️",
    "Frenos"     : "⚙️",
    "Suspensión" : "🔩",
    "Eléctrico"  : "⚡",
    "Motor"      : "🔥",
    "Transmisión": "🔄",
    "Carrocería" : "🚗",
    "Otro"       : "📦"
};

function requestNotifPermission(){
    if("Notification" in window && Notification.permission === "default"){
        Notification.requestPermission();
    }
}
requestNotifPermission();

function fireNotification(productName, stock){
    if("Notification" in window && Notification.permission === "granted"){
        new Notification("⚠️ Stock bajo — Taller App", {
            body: `"${productName}" tiene solo ${stock} unidades.`
        });
    }
}

function showAlertBanner(productName, stock, alertEmail){
    const existing = document.getElementById("stockAlertBanner");
    if(existing) existing.remove();

    const banner = document.createElement("div");
    banner.id        = "stockAlertBanner";
    banner.className = "stock-alert-banner";
    banner.innerHTML = `
        <span class="banner-text">
            ⚠️ <strong>${productName}</strong> — solo ${stock} uds en stock
        </span>
        <div class="banner-actions">
            <button class="banner-email-btn" onclick="sendAlertEmail('${productName}',${stock},'${alertEmail||''}')">📧 Avisar</button>
            <button class="banner-close-btn" onclick="document.getElementById('stockAlertBanner').remove()">✕</button>
        </div>
    `;
    document.body.appendChild(banner);
    setTimeout(()=>{ const b=document.getElementById("stockAlertBanner"); if(b) b.remove(); }, 8000);
}

/* =========================
   EMAILJS — CONFIGURACIÓN
========================= */

const EMAILJS_SERVICE_ID  = "service_pq9ccih";
const EMAILJS_TEMPLATE_ID = "template_b4js047";
const EMAILJS_PUBLIC_KEY  = "AUzjdb6klscSyYLht";
const TALLER_EMAIL        = "vectralumina@outlook.com";

(function initEmailJS(){
    if(typeof emailjs !== "undefined"){
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }
})();

function enviarEmail(toEmail, subject, message){
    if(!toEmail) return;
    if(typeof emailjs === "undefined"){
        const s = encodeURIComponent(subject);
        const b = encodeURIComponent(message + "\n\n— Taller App");
        window.open(`mailto:${toEmail}?subject=${s}&body=${b}`);
        return;
    }
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email : toEmail,
        subject  : subject,
        message  : message
    })
    .then(()=> console.log(`✅ Email enviado a ${toEmail}`))
    .catch(e => console.error("EmailJS error:", e));
}

function sendAlertEmail(productName, stock, alertEmail){
    const subject = `⚠️ Stock bajo: ${productName}`;
    const message = `El producto "${productName}" tiene solo ${stock} unidades en stock.\n\nRevisa tu inventario lo antes posible.`;
    enviarEmail(TALLER_EMAIL, subject, message);
    if(alertEmail && alertEmail !== TALLER_EMAIL){
        enviarEmail(alertEmail, subject, message);
    }
}

function sendVehicleReadyEmail(clientEmail, clientName, vehicleName){
    if(!clientEmail) return;
    const subject = `🚗 Tu vehículo está listo — ${vehicleName}`;
    const message = `Hola ${clientName},\n\nTu vehículo ${vehicleName} ya está listo para entrega en el taller.\n\nPuedes pasar a recogerlo en horario de atención.`;
    enviarEmail(clientEmail, subject, message);
    enviarEmail(TALLER_EMAIL, `✅ Listo para entrega: ${vehicleName}`, `${vehicleName} (${clientName}) marcado como listo.`);
}

function sendDeliveryEmail(clientEmail, clientName, vehicleName){
    if(!clientEmail) return;
    const subject = `✅ Vehículo entregado — ${vehicleName}`;
    const message = `Hola ${clientName},\n\nConfirmamos la entrega de tu vehículo ${vehicleName}.\n\n¡Gracias por tu preferencia!`;
    enviarEmail(clientEmail, subject, message);
    enviarEmail(TALLER_EMAIL, `🏁 Entregado: ${vehicleName}`, `${vehicleName} entregado a ${clientName}.`);
}

const _saveInvBtn = document.getElementById("saveInventoryBtn");
if(_saveInvBtn){
    _saveInvBtn.addEventListener("click", ()=>{
        const nameEl  = document.getElementById("inventoryName");
        const catEl   = document.getElementById("inventoryCategory");
        const stockEl = document.getElementById("inventoryStock");
        const priceEl = document.getElementById("inventoryPrice");
        const emailEl = document.getElementById("inventoryAlertEmail");

        if(!nameEl || !catEl || !stockEl || !priceEl){
            alert("Error: faltan campos en el HTML del modal.");
            return;
        }

        const name       = nameEl.value.trim();
        const category   = catEl.value;
        const stock      = parseInt(stockEl.value) || 0;
        const price      = parseFloat(priceEl.value) || 0;
        const alertEmail = emailEl ? emailEl.value.trim() : "";

        if(!name || !category){
            alert("Completa nombre y categoría");
            return;
        }

        if(editingInventoryCard !== null){
            const c   = editingInventoryCard;
            const icon = categoryIcons[category] || "📦";
            c.dataset.fullName   = name;
            c.dataset.name       = name.toLowerCase();
            c.dataset.category   = category;
            c.dataset.price      = price;
            c.dataset.alertEmail = alertEmail;
            c.querySelector(".inv-name").textContent         = name;
            c.querySelector(".inv-category-tag").textContent = category;
            c.querySelector(".inv-price").textContent        = `$${price.toLocaleString("es-MX")}`;
            c.querySelector(".inv-icon").textContent         = icon;
            editingInventoryCard = null;
            document.querySelector("#inventoryModal h2").textContent = "Nuevo producto";
        } else {
            createInventoryCard(name, category, stock, price, alertEmail);
        }

        nameEl.value  = "";
        catEl.value   = "";
        stockEl.value = "";
        priceEl.value = "";
        if(emailEl) emailEl.value = "";

        inventoryModal.classList.add("hidden");

        addNotification("inventory", "Inventario", `${name} agregado (${stock} uds)`);
        addActivity("inventory", "Producto en stock", `${name} · $${price}`);
        saveInventory(); // <-- AÑADIR AQUÍ
    });
}

function getStockColorClass(stock){
    if(stock === 0)                 return "inv-stock-red";
    if(stock < LOW_STOCK_THRESHOLD) return "inv-stock-orange";
    return "inv-stock-green";
}
function createInventoryCard(name, category, stock, price, alertEmail){
    const list  = document.getElementById("inventoryList");
    const isLow = stock < LOW_STOCK_THRESHOLD;
    const icon  = categoryIcons[category] || "📦";

    const card = document.createElement("div");
    card.className          = `inventory-card${isLow ? " low-stock-card" : ""} ${getStockColorClass(stock)}`;
    card.dataset.stock      = stock;
    card.dataset.name       = name.toLowerCase();
    card.dataset.alertEmail = alertEmail || "";
    card.dataset.fullName   = name;
    card.dataset.category   = category;
    card.dataset.price      = price;
    card.innerHTML = `
        <div class="inv-card-top">
            <div class="inv-icon">${icon}</div>
            <div class="inv-info">
                <div class="inv-name">${name}</div>
                <span class="inv-category-tag">${category}</span>
            </div>
            <span class="inv-price">$${price.toLocaleString("es-MX")}</span>
        </div>
        <div class="inv-card-bottom">
            <span class="inv-badge ${isLow ? "low" : ""}">
                ${isLow ? "⚠️" : "✓"} ${stock} uds
            </span>
            <div class="inv-controls">
                <button class="stock-minus">−</button>
                <span class="stock-display">${stock}</span>
                <button class="stock-plus">+</button>
            </div>
           <button class="inv-edit">✏</button>
           <button class="inv-delete">✕</button>
        </div>
    `;

    card.querySelector(".stock-minus").addEventListener("click", ()=>{
        let s = parseInt(card.dataset.stock);
        if(s > 0) s--;
        card.dataset.stock = s;
        refreshCardStock(card, s);
    });

    card.querySelector(".stock-plus").addEventListener("click", ()=>{
        let s = parseInt(card.dataset.stock);
        s++;
        card.dataset.stock = s;
        refreshCardStock(card, s);
    });

    card.querySelector(".inv-delete").addEventListener("click", ()=>{
    const nombre = card.querySelector(".inv-name").textContent;
    if(!confirm(`¿Eliminar "${nombre}"?`)) return;
    card.remove();
    updateInventoryStats();
    checkEmptyState("inventoryList");
    // ...todo lo existente...
    saveInventory(); // ← AÑADIR al final
});
card.querySelector(".inv-edit").addEventListener("click", ()=>{
        editingInventoryCard = card;
        document.getElementById("inventoryName").value       = card.dataset.fullName;
        document.getElementById("inventoryCategory").value   = card.dataset.category;
        document.getElementById("inventoryStock").value      = card.dataset.stock;
        document.getElementById("inventoryPrice").value      = card.dataset.price;
        document.getElementById("inventoryAlertEmail").value = card.dataset.alertEmail;
        document.querySelector("#inventoryModal h2").textContent = "Editar producto";
        inventoryModal.classList.remove("hidden");
    });

    list.appendChild(card);

    if(isLow){
        fireNotification(name, stock);
        showAlertBanner(name, stock, alertEmail);
        addNotification("inventory", "⚠️ Stock bajo", `${name} — solo ${stock} uds`);
        addActivity("inventory", "Alerta de stock bajo", `${name} · ${stock} unidades`);
    }

    updateInventoryStats();
}

function refreshCardStock(card, stock){
    const isLow      = stock < LOW_STOCK_THRESHOLD;
    const alertEmail = card.dataset.alertEmail || "";
    const name       = card.querySelector(".inv-name").textContent;

    card.querySelector(".stock-display").textContent = stock;

    const badge       = card.querySelector(".inv-badge");
    badge.className   = `inv-badge ${isLow ? "low" : ""}`;
    badge.textContent = `${isLow ? "⚠️" : "✓"} ${stock} uds`;

    if(isLow) card.classList.add("low-stock-card");
    else      card.classList.remove("low-stock-card");

    card.classList.remove("inv-stock-green", "inv-stock-orange", "inv-stock-red");
    card.classList.add(getStockColorClass(stock));

    if(stock === LOW_STOCK_THRESHOLD - 1){
        fireNotification(name, stock);
        showAlertBanner(name, stock, alertEmail);
        addNotification("inventory", "⚠️ Stock bajo", `${name} — solo ${stock} uds`);
        addActivity("inventory", "Alerta de stock bajo", `${name} · ${stock} unidades`);
        avisar(`⚠️ Stock bajo: ${name} — solo ${stock} unidades`);
    }
    if(stock === 0){
        showAlertBanner(`${name} — SIN STOCK`, 0, alertEmail);
        fireNotification(`${name} — SIN STOCK`, 0);
        addNotification("inventory", "🚨 Sin stock", `${name} — agotado`);
        addActivity("inventory", "Producto agotado", name);
        avisar(`🚨 SIN STOCK: ${name} — agotado`);
    }

    updateInventoryStats();
    updateDashLowStock();
    saveInventory(); // <-- AÑADIR AQUÍ
}


/* ========================================
   VEHÍCULOS EN PROCESO — DASHBOARD
======================================== */
function updateDashVehicles(){
    const container = document.getElementById("dashVehiclesList");
    if(!container) return;

    const rows = [];
    ["incomingList","serviceList"].forEach(listId => {
        document.querySelectorAll(`#${listId} .vp-card`).forEach(card => {
            const statusEl = card.querySelector(".vp-card-status");
            rows.push({
                plate:       card.dataset.plate  || "Sin placa",
                owner:       card.dataset.owner  || "Sin dueño",
                date:        card.dataset.date   || "",
                statusLabel: statusEl?.textContent.trim() || "Ingresado",
                statusClass: Array.from(statusEl?.classList || []).find(c => c.startsWith("status-")) || "status-ingresado"
            });
        });
    });

    if(rows.length === 0){
        container.innerHTML = `<p class="dash-empty-msg">Sin vehículos activos</p>`;
        return;
    }

    container.innerHTML = rows.map(r => `
        <div class="dash-vehicle-row">
            <span class="dash-veh-plate">${r.plate}</span>
            <span class="vp-card-status ${r.statusClass}" style="font-size:.68rem;padding:3px 8px;">${r.statusLabel}</span>
            <span class="dash-veh-owner">${r.owner}</span>
            <span class="dash-veh-date">${r.date}</span>
        </div>
    `).join("");
}
/* ========================================
   INVENTARIO BAJO — DASHBOARD
======================================== */
function updateDashLowStock(){
    const container = document.getElementById("dashLowStockList");
    if(!container) return;

    const lowCards = [];
    document.querySelectorAll(".inventory-card").forEach(card => {
        const stock = parseInt(card.dataset.stock) || 0;
        if(stock < LOW_STOCK_THRESHOLD){
            lowCards.push({
                name:     card.dataset.fullName || card.dataset.name || "Producto",
                category: card.dataset.category || "",
                stock:    stock
            });
        }
    });

    if(lowCards.length === 0){
        container.innerHTML = `<p class="dash-empty-msg">Sin productos en stock bajo</p>`;
        return;
    }

    container.innerHTML = lowCards.map(p => `
        <div class="dash-vehicle-row dash-stock-row">
            <div class="dash-stock-dot ${p.stock === 0 ? 'dot-red' : 'dot-orange'}"></div>
            <span class="dash-veh-plate" style="min-width:auto;flex:1;">${p.name}</span>
            <span class="dash-veh-owner" style="flex:none;color:#999;font-size:.72rem;">${p.category}</span>
            <span class="dash-stock-badge ${p.stock === 0 ? 'badge-red' : 'badge-orange'}">${p.stock} uds</span>
        </div>
    `).join("");
}
function updateInventoryStats(){
    const cards  = document.querySelectorAll(".inventory-card");
    let lowCount  = 0;
    let totalValue = 0;
    const categories = new Set();

    cards.forEach(c =>{
        if(parseInt(c.dataset.stock) < LOW_STOCK_THRESHOLD) lowCount++;
        const price = parseFloat(c.dataset.price) || 0;
        const stock = parseInt(c.dataset.stock)  || 0;
        totalValue += price * stock;
        if(c.dataset.category) categories.add(c.dataset.category);
    });

    document.getElementById("totalProducts").textContent      = cards.length;
    document.getElementById("lowStockCount").textContent      = lowCount;
    document.getElementById("totalCategories").textContent    = categories.size;
    document.getElementById("totalInventoryValue").textContent = "$" + totalValue.toLocaleString("es-MX");

    const navInv = navItems[2];
    const dot    = navInv.querySelector(".nav-low-stock-dot");
    if(lowCount > 0){
        navInv.classList.add("inventory-alert");
        if(!dot){
            const d = document.createElement("span");
            d.className = "nav-low-stock-dot";
            navInv.appendChild(d);
        }
    } else {
        navInv.classList.remove("inventory-alert");
        if(dot) dot.remove();
    }
    updateDashboardStats();
}

/* ── Limpiar lista de Entregados ── */
document.getElementById("clearDoneList")?.addEventListener("click", ()=>{
    const list  = document.getElementById("doneList");
    const count = Array.from(list.children).filter(c => !c.classList.contains("empty-state")).length;
    if(count === 0) return;
    if(!confirm(`¿Limpiar ${count} vehículo${count > 1 ? "s" : ""} entregado${count > 1 ? "s" : ""}?\nEsta acción no se puede deshacer.`)) return;
    list.innerHTML = "";
    checkEmptyState("doneList");
    updateCounts();
    saveVehicles();
});

/* ── Ordenar inventario por stock ── */
document.getElementById("sortInventoryBtn")?.addEventListener("click", ()=>{
    const list  = document.getElementById("inventoryList");
    const cards = Array.from(list.querySelectorAll(".inventory-card"));
    if(cards.length === 0) return;
    cards.sort((a, b) => (parseInt(a.dataset.stock) || 0) - (parseInt(b.dataset.stock) || 0));
    cards.forEach(card => list.appendChild(card));
});
const _invSearch = document.getElementById("inventorySearch");
if(_invSearch){
    _invSearch.addEventListener("input", (e)=>{
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll(".inventory-card").forEach(card =>{
            const cardText = card.textContent.toLowerCase();
            
            // Usamos tu clase .hidden en lugar de modificar el style.display directamente
            if (cardText.includes(query)) {
    card.classList.remove("inv-hidden");
} else {
    card.classList.add("inv-hidden");
}
        });
    });
}

/* ========================================
   NOTIFICACIONES Y ACTIVIDAD
======================================== */

(function initDashboard(){
    const nc = document.querySelector(".notifications-container");
    const al = document.querySelector(".activity-list");
    if(nc) nc.innerHTML = "";
    if(al) al.innerHTML = "";
})();

const APP_ICONS = {
    vehicle:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h10"/></svg>`,
    client:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    inventory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.52a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4A2 2 0 0 1 2 16.76V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/></svg>`,
    task:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
};

function getTimeAgo(ts){
    const s = Math.floor((Date.now() - ts) / 1000);
    if(s < 60)    return "ahora";
    if(s < 3600)  return Math.floor(s/60)   + "m";
    if(s < 86400) return Math.floor(s/3600) + "h";
    return Math.floor(s/86400) + "d";
}

const MAX_NOTIF    = 3;
const MAX_ACTIVITY = 4;

function addNotification(iconKey, title, message){
    if(_isLoading) return; // no duplicar al cargar datos
    const container = document.querySelector(".notifications-container");
    if(!container) return;
    const card = document.createElement("div");
    card.className = "notification-card";
    card.innerHTML = `
        <div class="card-icon-minimal">${APP_ICONS[iconKey]}</div>
        <h3>${title}</h3>
        <p>${message}</p>
    `;
    container.prepend(card);
    refreshNotifVisibility();
    if("Notification" in window && Notification.permission === "granted"){
        new Notification("🔔 " + title + " — Taller App", { body: message });
    }
    // ── Persistir en localStorage ──
    if(_currentUserId){
        _notifData.unshift({ iconKey, title, message });
        if(_notifData.length > 20) _notifData = _notifData.slice(0, 20);
        localStorage.setItem(`taller_notifs_${_currentUserId}`, JSON.stringify(_notifData));
    }
}

function refreshNotifVisibility(){
    const container = document.querySelector(".notifications-container");
    if(!container) return;
    const cards   = container.querySelectorAll(".notification-card");
    const showAll = container.dataset.showAll === "true";
    cards.forEach((c, i) => { c.style.display = (showAll || i < MAX_NOTIF) ? "" : "none"; });
    const seeAll = document.querySelector(".see-all");
    if(!seeAll) return;
    if(cards.length <= MAX_NOTIF){ seeAll.style.visibility = "hidden"; return; }
    seeAll.style.visibility = "visible";
    seeAll.textContent = showAll ? "Ver menos" : "Ver todas";
}

document.querySelector(".see-all")?.addEventListener("click", ()=>{
    const container = document.querySelector(".notifications-container");
    container.dataset.showAll = container.dataset.showAll === "true" ? "false" : "true";
    refreshNotifVisibility();
});

function addActivity(iconKey, title, subtitle){
    if(_isLoading) return; // no duplicar al cargar datos
    const list = document.querySelector(".activity-list");
    if(!list) return;
    const ts   = Date.now();
    const item = document.createElement("div");
    item.className    = "activity-item grouped-item";
    item.dataset.time = ts;
    item.innerHTML = `
        <div class="activity-icon-minimal">${APP_ICONS[iconKey]}</div>
        <div class="info">
            <p class="title">${title}</p>
            <p class="subtitle">${subtitle}</p>
        </div>
        <span class="time grouped-time">ahora</span>
    `;
    list.prepend(item);
    refreshActivityVisibility();
    // ── Persistir en localStorage ──
    if(_currentUserId){
        _activityData.unshift({ iconKey, title, subtitle, time: ts });
        if(_activityData.length > 20) _activityData = _activityData.slice(0, 20);
        localStorage.setItem(`taller_activity_${_currentUserId}`, JSON.stringify(_activityData));
    }
}

function refreshActivityVisibility(){
    const list = document.querySelector(".activity-list");
    if(!list) return;
    const items   = list.querySelectorAll(".activity-item");
    const showAll = list.dataset.showAll === "true";
    items.forEach((it, i) => { it.style.display = (showAll || i < MAX_ACTIVITY) ? "" : "none"; });

    let btn           = document.getElementById("activityVerMas");
    const section     = document.querySelector(".activity-section");
    if(items.length <= MAX_ACTIVITY){ if(btn) btn.style.display = "none"; return; }
    if(!btn && section){
        btn = document.createElement("button");
        btn.id = "activityVerMas";
        btn.style.cssText = `
            display:block; width:calc(100% - 48px); margin:8px 24px 0;
            background:rgba(255,255,255,.45); backdrop-filter:blur(10px);
            border:1px solid rgba(255,255,255,.5); border-radius:14px;
            color:#0a84ff; font-size:.85rem; font-weight:600; padding:12px;
            cursor:pointer; box-shadow:none;
        `;
        btn.addEventListener("click", ()=>{
            list.dataset.showAll = list.dataset.showAll === "true" ? "false" : "true";
            refreshActivityVisibility();
        });
        section.appendChild(btn);
    }
    if(btn){
        btn.style.display = "block";
        btn.textContent   = showAll
            ? "Ver menos ↑"
            : `Ver más (${items.length - MAX_ACTIVITY} más) ↓`;
    }
}

setInterval(()=>{
    document.querySelectorAll(".activity-item[data-time]").forEach(item => {
        const t = item.querySelector(".time");
        if(t) t.textContent = getTimeAgo(parseInt(item.dataset.time));
    });
}, 30000);

/* ========================================
   CARGAR NOTIFICACIONES PERSISTIDAS
======================================== */
function loadPersistedNotifications(userId){
    const stored = JSON.parse(localStorage.getItem(`taller_notifs_${userId}`) || "[]");
    _notifData   = stored;
    const container = document.querySelector(".notifications-container");
    if(!container || stored.length === 0) return;
    stored.forEach(n => {
        const card = document.createElement("div");
        card.className = "notification-card";
        card.innerHTML = `
            <div class="card-icon-minimal">${APP_ICONS[n.iconKey] || APP_ICONS.vehicle}</div>
            <h3>${n.title}</h3>
            <p>${n.message}</p>
        `;
        container.appendChild(card);
    });
    refreshNotifVisibility();
}

function loadPersistedActivity(userId){
    const stored  = JSON.parse(localStorage.getItem(`taller_activity_${userId}`) || "[]");
    _activityData = stored;
    const list = document.querySelector(".activity-list");
    if(!list || stored.length === 0) return;
    stored.forEach(a => {
        const item = document.createElement("div");
        item.className    = "activity-item grouped-item";
        item.dataset.time = a.time;
        item.innerHTML = `
            <div class="activity-icon-minimal">${APP_ICONS[a.iconKey] || APP_ICONS.vehicle}</div>
            <div class="info">
                <p class="title">${a.title}</p>
                <p class="subtitle">${a.subtitle}</p>
            </div>
            <span class="time grouped-time">${getTimeAgo(a.time)}</span>
        `;
        list.appendChild(item);
    });
    refreshActivityVisibility();
}

/* ========================================
   BUSCADOR DE VEHÍCULOS — BITÁCORA
======================================== */
const _vpSearch = document.getElementById("vehicleSearch");
if(_vpSearch){
    _vpSearch.addEventListener("input", (e)=>{
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll(".vp-card").forEach(card =>{
            const text = [
                card.dataset.vehicleName || "",
                card.dataset.plate       || "",
                card.dataset.owner       || "",
                card.dataset.color       || ""
            ].join(" ").toLowerCase();
            card.style.display = text.includes(query) ? "" : "none";
        });
    });
}

/* ========================================
   BANNER: TRABAJO COMPLETADO
======================================== */

function showCompletedBanner(taskTitle, vehicleName){
    const existing = document.getElementById("completedBanner");
    if(existing) existing.remove();

    let clientPhone = "";
    document.querySelectorAll(".cp-card").forEach(card => {
        const v = (card.dataset.vehicle || "").toLowerCase();
        if(v.includes(vehicleName.split(" ")[0].toLowerCase())){
            clientPhone = card.dataset.phone || "";
        }
    });

    const banner = document.createElement("div");
    banner.id        = "completedBanner";
    banner.className = "stock-alert-banner";
    banner.style.cssText = "background:linear-gradient(135deg,#34c759,#30d158);box-shadow:0 6px 24px rgba(52,199,89,.35);";
    banner.innerHTML = `
        <span class="banner-text">✅ <strong>${taskTitle}</strong> — ${vehicleName} listo para entrega</span>
        <div class="banner-actions">
            ${clientPhone ? `<button class="banner-email-btn" onclick="window.open('tel:${clientPhone}')">📞 Llamar</button>` : ""}
            <button class="banner-email-btn" onclick="notifyWhatsApp('${vehicleName}','${clientPhone}')">💬 WhatsApp</button>
            <button class="banner-close-btn" onclick="document.getElementById('completedBanner').remove()">✕</button>
        </div>
    `;
    document.body.appendChild(banner);
    setTimeout(()=>{ const b=document.getElementById("completedBanner"); if(b) b.remove(); }, 12000);
}

function notifyWhatsApp(vehicleName, phone){
    const msg = encodeURIComponent(`¡Hola! Su vehículo ${vehicleName} ya está listo para entrega en el taller. Puede pasar a recogerlo. 🚗✅`);
    window.open(phone
        ? `https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`
        : `https://wa.me/?text=${msg}`
    );
}

/* ========================================
   SINCRONIZACIÓN ENTRE SECCIONES
   ─────────────────────────────────────
   Estas 3 funciones conectan Taller,
   Bitácora y Clientes entre sí.
======================================== */

/*
 * 1. syncVehicleToReady(vehicleName)
 *    Se llama cuando una tarea de Taller
 *    se marca como "Completado".
 *    Mueve el vehículo a "Listos para entrega"
 *    en Bitácora y añade el botón "→ Entregar".
 */
function syncVehicleToReady(vehicleName, taskTitle){
    if(!vehicleName) return;

    const searchName = vehicleName.toLowerCase().trim();

    document.querySelectorAll(".vp-card").forEach(card => {
        const cardName = (card.dataset.vehicleName || "").toLowerCase().trim();
        if(!cardName) return;

        // Coincidencia: el nombre del vehículo en la tarea está dentro del nombre de la tarjeta o viceversa
        if(!cardName.includes(searchName) && !searchName.includes(cardName)) return;

        // Actualizar badge de estado
        const statusEl = card.querySelector(".vp-card-status");
        if(statusEl){
            statusEl.className   = "vp-card-status status-listo";
            statusEl.textContent = "Listo";
        }
        // Guardar último servicio
        card.dataset.lastService     = taskTitle || "Servicio realizado";
        card.dataset.lastServiceDate = new Date().toLocaleDateString("es-MX");
        const hist = JSON.parse(card.dataset.history || "[]");
        hist.push({
            service: taskTitle || "Servicio realizado",
            date:    new Date().toLocaleDateString("es-MX")
        });
        card.dataset.history = JSON.stringify(hist);

        // Quitar botón "→ Servicio" si aún existe
        const oldBtn = card.querySelector(".vp-move-service:not(.vp-deliver-btn)");
        if(oldBtn) oldBtn.remove();

        // Mover a "Listos para entrega"
        document.getElementById("readyList").appendChild(card);

        // Agregar botón "→ Entregar"
      addDeliverButton(card);

        // Email al cliente: vehículo listo
        const ownerCard = [...document.querySelectorAll(".cp-card")]
            .find(c => (c.dataset.name||"").toLowerCase() === (card.dataset.owner||"").toLowerCase());
        if(ownerCard?.dataset.email){
            sendVehicleReadyEmail(ownerCard.dataset.email, card.dataset.owner, card.dataset.vehicleName||"");
        }

        avisar(`✅ ${card.dataset.vehicleName || vehicleName} está listo para entrega`);
        updateCounts();
        refreshClientVehicleStatuses();
    });
}

/*
 * 2. addDeliverButton(card)
 *    Agrega el botón "→ Entregar" a una
 *    tarjeta de vehículo en "Listos".
 *    Al pulsarlo mueve el vehículo a
 *    "Entregados" y sincroniza el cliente.
 */
function addDeliverButton(card){
    // Evitar duplicados
    if(card.querySelector(".vp-deliver-btn")) return;

    const btn = document.createElement("button");
    btn.className   = "vp-move-service vp-deliver-btn";
    btn.textContent = "→ Entregar";

    btn.addEventListener("click", ()=>{
        const vName = card.dataset.vehicleName || "";

        // Actualizar estado en la tarjeta
        const statusEl = card.querySelector(".vp-card-status");
        if(statusEl){
            statusEl.className   = "vp-card-status status-entregado";
            statusEl.textContent = "Entregado";
        }

        btn.remove();
        document.getElementById("doneList").appendChild(card);
        addNotification("vehicle", "Entregado", `${vName} entregado al cliente`);
        addActivity("vehicle", "Vehículo entregado", vName);
        avisar(`🏁 ${vName} fue entregado al cliente`);
        refreshClientVehicleStatuses();
        updateCounts();

        // Email al cliente: vehículo entregado
        const oCard = [...document.querySelectorAll(".cp-card")]
            .find(c => (c.dataset.name||"").toLowerCase() === (card.dataset.owner||"").toLowerCase());
        if(oCard?.dataset.email){
            sendDeliveryEmail(oCard.dataset.email, card.dataset.owner, card.dataset.vehicleName||"");
        }

        // Sincronizar cliente a "Próximos a servicio"
        syncClientToNextService(card);
    });

    card.querySelector(".vp-card-right").prepend(btn);
}

/*
 * 3. syncClientToNextService(vehicleCard)
 *    Se llama cuando un vehículo es entregado.
 *    Busca al dueño en la lista de clientes y
 *    lo mueve (o crea) en "Próximos a servicio".
 */
function syncClientToNextService(card){
    const ownerName   = (card.dataset.owner || "").trim();
    const vehicleName = card.dataset.vehicleName || "";

    if(!ownerName || ownerName === "Sin dueño") return;

    const targetList = document.getElementById("serviceClientsList");

    // Buscar si el cliente ya existe en cualquier lista
    let existingCard = null;
    document.querySelectorAll(".cp-card").forEach(c => {
        if((c.dataset.name || "").toLowerCase() === ownerName.toLowerCase()){
            existingCard = c;
        }
    });

    const lastService     = card.dataset.lastService     || "";
    const lastServiceDate = card.dataset.lastServiceDate || "";

    if(existingCard){
        existingCard.dataset.lastService     = lastService;
        existingCard.dataset.lastServiceDate = lastServiceDate;
        existingCard.innerHTML = renderClientCardHTML(
            existingCard.dataset.name,
            existingCard.dataset.phone,
            existingCard.dataset.email,
            existingCard.dataset.vehicle,
            existingCard.dataset.source,
            lastService,
            lastServiceDate
        );
        attachClientCardListeners(existingCard);
        if(existingCard.parentElement?.id !== "serviceClientsList"){
            targetList.appendChild(existingCard);
        }
    } else {
        createClientCard(ownerName, "", "", vehicleName, "directo", targetList, lastService, lastServiceDate);
    }

    addNotification("client", "Próximo servicio", `${ownerName} — agendar revisión`);
    addActivity("client", "Cliente → próximo servicio", `${ownerName} · ${vehicleName}`);
    saveClients(); // <-- AÑADIR AQUÍ
}
/* ========================================
   SISTEMA DE BÚSQUEDA — CLIENTES
======================================== */
const clientSearchInput = document.getElementById("clientSearch");
if(clientSearchInput){
    clientSearchInput.addEventListener("input", (e)=>{
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll(".cp-card").forEach(card => {
            // Lee todo el contenido de la tarjeta (nombre, teléfono, placa, etc.)
            const cardText = card.textContent.toLowerCase();
            card.style.display = cardText.includes(query) ? "flex" : "none";
        });
    });
}
/* =========================
   LOGOUT
========================= */
document.getElementById("logoutBtn")?.addEventListener("click", async ()=>{
    if(!confirm("¿Cerrar sesión?")) return;
    _notifData     = [];
    _activityData  = [];
    _currentUserId = null;
    await _supabase.auth.signOut();
    limpiarDOM();
    hideAllPages();
    dashboard.classList.add("hidden");
    document.querySelector(".login-page").style.display = "flex";
    document.querySelector('.login-form input[type="email"]').value    = "";
    document.querySelector('.login-form input[type="password"]').value = "";
});
/* ========================================
   GUARDAR ESTADO
======================================== */

function saveVehicles(){
    if(_isLoading) return;
    const data = [];
    ["incomingList","serviceList","readyList","doneList"].forEach(listId => {
        document.querySelectorAll(`#${listId} .vp-card`).forEach(card => {
            const statusEl = card.querySelector(".vp-card-status");
            data.push({
                name:            card.dataset.vehicleName || "",
                owner:           card.dataset.owner       || "",
                year:            card.dataset.year        || "",
                plate:           card.dataset.plate       || "",
                color:           card.dataset.color       || "",
                notes:           card.dataset.notes       || "",
                date:            card.dataset.date        || "",
                uid:             card.dataset.uid          || "",
                lastService:     card.dataset.lastService     || "",
                lastServiceDate: card.dataset.lastServiceDate || "",
                history: JSON.parse(card.dataset.history || "[]"),
                statusLabel: statusEl ? statusEl.textContent.trim() : "Ingresado",
                statusClass: statusEl
                    ? (Array.from(statusEl.classList).find(c => c.startsWith("status-")) || "status-ingresado")
                    : "status-ingresado",
                listId
            });
        });
    });
    DB.save("vehicles", data);
}

function saveClients(){
    if(_isLoading) return;
    const data = [];
    ["clientsList","serviceClientsList","externalClientsList"].forEach(listId => {
        document.querySelectorAll(`#${listId} .cp-card`).forEach(card => {
            data.push({
                name:            card.dataset.name            || "",
                phone:           card.dataset.phone           || "",
                email:           card.dataset.email           || "",
                vehicle:         card.dataset.vehicle         || "",
                source:          card.dataset.source          || "directo",
                lastService:     card.dataset.lastService     || "",
                lastServiceDate: card.dataset.lastServiceDate || "",
                listId
            });
        });
    });
    DB.save("clients", data);
}

let _invSaveTimer = null;
function saveInventory(){
    if(_isLoading) return;
    clearTimeout(_invSaveTimer);
    _invSaveTimer = setTimeout(() => {
        const data = [];
        document.querySelectorAll(".inventory-card").forEach(card => {
            data.push({
                name:       card.dataset.fullName   || "",
                category:   card.dataset.category   || "",
                stock:      parseInt(card.dataset.stock) || 0,
                price:      parseFloat(card.dataset.price) || 0,
                alertEmail: card.dataset.alertEmail || ""
            });
        });
        DB.save("inventory", data);
    }, 600);
}

function saveWorkshopTasks(){
    if(_isLoading) return;
    const data = [];
    document.querySelectorAll("#workshopTasks .workshop-task").forEach(task => {
        data.push({
            title:    task.dataset.title    || "",
            vehicle:  task.dataset.vehicle  || "",
            delivery: task.dataset.delivery || "",
            status:   task.querySelector(".task-select")?.value || task.dataset.status || "En proceso",
            parts:          JSON.parse(task.dataset.parts || "[]"),
            technicianName: task.dataset.technicianName || ""
        });
    });
    DB.save("workshopTasks", data);
}

/* ========================================
   CARGAR ESTADO
======================================== */

/* ========================================
   FUNCIONES DE CARGA ASÍNCRONAS (SUPABASE)
======================================== */
async function loadVehicles(){
    const data = await DB.load("vehicles", []);
    data.forEach(v => {
        const target = document.getElementById(v.listId);
        if(!target) return;
        const card = createVehicleCard(
            v.name, target, v.year, v.plate,
            v.color, v.owner, v.date,
            v.statusLabel, v.statusClass, v.notes,
            v.uid
        );
        if(card){
            // Restaurar historial y último servicio desde Supabase
            if(v.history && v.history.length > 0)
                card.dataset.history = JSON.stringify(v.history);
            if(v.lastService)
                card.dataset.lastService = v.lastService;
            if(v.lastServiceDate)
                card.dataset.lastServiceDate = v.lastServiceDate;

            if(v.listId === "readyList") {
                if(typeof addDeliverButton === "function") addDeliverButton(card);
            }
        }
    });
}

async function loadClients(){
    const data = await DB.load("clients", []);
    data.forEach(c => {
        const target = document.getElementById(c.listId);
        if(!target) return;
        createClientCard(
            c.name, c.phone, c.email, c.vehicle,
            c.source, target,
            c.lastService, c.lastServiceDate
        );
    });
}

async function loadInventory(){
    const data = await DB.load("inventory", []);
    data.forEach(item => {
        createInventoryCard(item.name, item.category, item.stock, item.price, item.alertEmail);
    });
}

async function loadWorkshopTasks(){
    const data = await DB.load("workshopTasks", []);
    data.forEach(t => createWorkshopTask(t.title, t.vehicle, t.delivery, t.status, t.parts || [], t.technicianName || ""));
}

/* ========================================
   FLUJO DE INICIALIZACIÓN DE DATOS
======================================== */
function limpiarDOM(){
    [
        "incomingList","serviceList","readyList","doneList",
        "clientsList","serviceClientsList","externalClientsList",
       "inventoryList","workshopTasks",
        "dashVehiclesList","dashLowStockList",
        "suppliersList","ordenesList","recepcionesList","facturasList","techniciansList"
    ].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = "";
    });
    const nc = document.querySelector(".notifications-container");
    const al = document.querySelector(".activity-list");
    if(nc) nc.innerHTML = "";
    if(al) al.innerHTML = "";
    ["incomingCount","serviceCount","readyCount","doneCount"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = "0";
    });
    ["dashActiveCars","dashPendingTasks","dashLowStock","dashClients"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = "0";
    });
}
async function inicializarEstructurasDeUsuario() {
    _isLoading = true;
    limpiarDOM();
    updateDashboardHeader();

    try {
        await loadVehicles();
        await loadClients();
        await loadInventory();
        await loadWorkshopTasks();
        await loadSuppliers();
        await loadTechnicians();
        await loadPurchaseOrders();
        await loadRecepciones();
        await loadInvoices();
        await loadTallerConfig();
    } catch(e) {
        console.error("Error durante la carga inicial:", e);
    } finally {
        _isLoading = false;
        initEmptyStates();
        updateDashboardStats();
        updateDashVehicles();
        updateDashLowStock();

        if(_currentUserId){
            loadPersistedNotifications(_currentUserId);
            loadPersistedActivity(_currentUserId);
        }
    }
}

/* ========================================
   VERIFICACIÓN DE SESIÓN AL INICIAR LA APP
======================================== */
(async function checkSession(){
    try {
        const { data: { session }, error } = await _supabase.auth.getSession();
        if (error) throw error;

        if (session) {
            _currentUserId = session.user.id;
            document.querySelector(".login-page").style.display = "none";
            dashboard.classList.remove("hidden");
            await inicializarEstructurasDeUsuario();
            solicitarPermisoNotificaciones();
        }
        // Marcar datos como listos (con o sin sesión)
        window._loaderDataDone = true;
        _tryHideLoader();
    } catch (e) {
        console.error("Error al comprobar sesión inicial:", e);
        window._loaderDataDone = true;
        _tryHideLoader();
    }
})();
// =============================================
//   NOTIFICACIONES PUSH — Web Push Nativo
//   Sin dependencias externas. Cada usuario
//   recibe solo sus propias notificaciones.
// =============================================

const VAPID_PUBLIC_KEY = "BMmTWPbMjETUOYEdoRtPc7VvPohAPY352ji1CK8ueibNRnXmjgeq65PIcUWfNkb9IYS6mGGcwQ9HB5VC_E1NXCM";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Pide permiso al usuario y guarda la suscripción en Supabase
async function solicitarPermisoNotificaciones() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly:      true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        await _supabase.from("push_subscriptions").upsert({
            user_id:      session.user.id,
            endpoint:     subscription.endpoint,
            subscription: subscription.toJSON()
        }, { onConflict: "user_id,endpoint" });

        console.log("✅ Notificaciones push activadas");
    } catch(e) {
        console.error("Error al activar notificaciones:", e);
    }
}

// Envía notificación push al usuario actual vía Netlify Function
async function avisar(mensaje, titulo = "Taller App") {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        await fetch("/.netlify/functions/send-notification", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                userId: session.user.id,
                title:  titulo,
                body:   mensaje
            })
        });
    } catch(e) {
        console.error("[Taller] Error al enviar notificación:", e);
    }
}

/* ========================================
   MÓDULO: TÉCNICOS
======================================== */

let _editingTechnicianCard = null;

const technicianModal      = document.getElementById("technicianModal");
const closeTechnicianModal = document.getElementById("closeTechnicianModal");
const saveTechnicianBtn    = document.getElementById("saveTechnicianBtn");

document.getElementById("addTechnicianBtn")?.addEventListener("click", () => {
    _editingTechnicianCard = null;
    document.querySelector("#technicianModal h2").textContent = "Nuevo técnico";
    document.getElementById("technicianName").value      = "";
    document.getElementById("technicianPhone").value     = "";
    document.getElementById("technicianEmail").value     = "";
    document.getElementById("technicianSpecialty").value = "";
    document.getElementById("technicianNotes").value     = "";
    technicianModal.classList.remove("hidden");
});

closeTechnicianModal?.addEventListener("click", () => {
    technicianModal.classList.add("hidden");
    _editingTechnicianCard = null;
});

saveTechnicianBtn?.addEventListener("click", () => {
    const name      = document.getElementById("technicianName").value.trim();
    const phone     = document.getElementById("technicianPhone").value.trim();
    const email     = document.getElementById("technicianEmail").value.trim();
    const specialty = document.getElementById("technicianSpecialty").value.trim();
    const notes     = document.getElementById("technicianNotes").value.trim();

    if (!name) { alert("Ingresa el nombre del técnico"); return; }

    if (_editingTechnicianCard) {
        const card = _editingTechnicianCard;
        card.dataset.name      = name;
        card.dataset.phone     = phone;
        card.dataset.email     = email;
        card.dataset.specialty = specialty;
        card.dataset.notes     = notes;
        card.querySelector(".tech-name").textContent      = name;
        card.querySelector(".tech-specialty").textContent = specialty || "Sin especialidad";
        if (card.querySelector(".tech-phone"))
            card.querySelector(".tech-phone").textContent = phone ? `📞 ${phone}` : "";
        _editingTechnicianCard = null;
        document.querySelector("#technicianModal h2").textContent = "Nuevo técnico";
    } else {
        createTechnicianCard(name, phone, email, specialty, notes);
    }

    document.getElementById("technicianName").value      = "";
    document.getElementById("technicianPhone").value     = "";
    document.getElementById("technicianEmail").value     = "";
    document.getElementById("technicianSpecialty").value = "";
    document.getElementById("technicianNotes").value     = "";
    technicianModal.classList.add("hidden");
    saveTechnicians();
});

function createTechnicianCard(name, phone, email, specialty, notes) {
    const list = document.getElementById("techniciansList");
    if (!list) return;

    const card = document.createElement("div");
    card.className        = "workshop-task";
    card.dataset.name      = name;
    card.dataset.phone     = phone     || "";
    card.dataset.email     = email     || "";
    card.dataset.specialty = specialty || "";
    card.dataset.notes     = notes     || "";

    card.innerHTML = `
        <div class="workshop-task-row">
            <div class="module-card-icon icon-tecnico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <div>
                <strong class="tech-name">${name}</strong>
                <p class="tech-specialty">🔧 ${specialty || "Sin especialidad"}</p>
                ${phone ? `<p class="tech-phone">📞 ${phone}</p>` : ""}
                ${email ? `<p>✉️ ${email}</p>` : ""}
                ${notes ? `<p style="font-size:.75rem;color:#888">${notes}</p>` : ""}
            </div>
        </div>
        <div class="task-actions">
            <button class="tech-edit-btn" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="tech-delete-btn" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;

    card.querySelector(".tech-edit-btn").addEventListener("click", () => {
        _editingTechnicianCard = card;
        document.querySelector("#technicianModal h2").textContent = "Editar técnico";
        document.getElementById("technicianName").value      = card.dataset.name;
        document.getElementById("technicianPhone").value     = card.dataset.phone;
        document.getElementById("technicianEmail").value     = card.dataset.email;
        document.getElementById("technicianSpecialty").value = card.dataset.specialty;
        document.getElementById("technicianNotes").value     = card.dataset.notes;
        technicianModal.classList.remove("hidden");
    });

    card.querySelector(".tech-delete-btn").addEventListener("click", () => {
        if (!confirm(`¿Eliminar a ${name}?`)) return;
        card.remove();
        checkEmptyState("techniciansList");
        saveTechnicians();
    });

    list.appendChild(card);
    checkEmptyState("techniciansList");
}

function saveTechnicians() {
    if (_isLoading) return;
    const data = [];
    document.querySelectorAll("#techniciansList .workshop-task").forEach(card => {
        data.push({
            name:      card.dataset.name      || "",
            phone:     card.dataset.phone     || "",
            email:     card.dataset.email     || "",
            specialty: card.dataset.specialty || "",
            notes:     card.dataset.notes     || ""
        });
    });
    DB.save("technicians", data);
}

async function loadTechnicians() {
    const data = await DB.load("technicians", []);
    data.forEach(t => createTechnicianCard(t.name, t.phone, t.email, t.specialty, t.notes));
}

/* ========================================
   MÓDULO: PROVEEDORES
======================================== */

let _editingSupplierCard = null;

const supplierModal      = document.getElementById("supplierModal");
const closeSupplierModal = document.getElementById("closeSupplierModal");
const saveSupplierBtn    = document.getElementById("saveSupplierBtn");

document.getElementById("addSupplierBtn")?.addEventListener("click", () => {
    _editingSupplierCard = null;
    document.querySelector("#supplierModal h2").textContent = "Nuevo proveedor";
    document.getElementById("supplierName").value    = "";
    document.getElementById("supplierContact").value = "";
    document.getElementById("supplierPhone").value   = "";
    document.getElementById("supplierEmail").value   = "";
    document.getElementById("supplierAddress").value = "";
    document.getElementById("supplierNotes").value   = "";
    supplierModal.classList.remove("hidden");
});

closeSupplierModal?.addEventListener("click", () => {
    supplierModal.classList.add("hidden");
    _editingSupplierCard = null;
});

saveSupplierBtn?.addEventListener("click", () => {
    const name    = document.getElementById("supplierName").value.trim();
    const contact = document.getElementById("supplierContact").value.trim();
    const phone   = document.getElementById("supplierPhone").value.trim();
    const email   = document.getElementById("supplierEmail").value.trim();
    const address = document.getElementById("supplierAddress").value.trim();
    const notes   = document.getElementById("supplierNotes").value.trim();

    if (!name) { alert("Ingresa el nombre del proveedor"); return; }

    if (_editingSupplierCard) {
        const card = _editingSupplierCard;
        card.dataset.name    = name;
        card.dataset.contact = contact;
        card.dataset.phone   = phone;
        card.dataset.email   = email;
        card.dataset.address = address;
        card.dataset.notes   = notes;
        card.querySelector(".supp-name").textContent    = name;
        card.querySelector(".supp-contact").textContent = contact || "Sin contacto";
        if (card.querySelector(".supp-phone"))
            card.querySelector(".supp-phone").textContent = phone ? `📞 ${phone}` : "";
        _editingSupplierCard = null;
        document.querySelector("#supplierModal h2").textContent = "Nuevo proveedor";
    } else {
        createSupplierCard(name, contact, phone, email, address, notes);
    }

    document.getElementById("supplierName").value    = "";
    document.getElementById("supplierContact").value = "";
    document.getElementById("supplierPhone").value   = "";
    document.getElementById("supplierEmail").value   = "";
    document.getElementById("supplierAddress").value = "";
    document.getElementById("supplierNotes").value   = "";
    supplierModal.classList.add("hidden");
    saveSuppliers();
    refreshSupplierSelect();
});

function createSupplierCard(name, contact, phone, email, address, notes) {
    const list = document.getElementById("suppliersList");
    if (!list) return;

    const card = document.createElement("div");
    card.className        = "workshop-task";
    card.dataset.name     = name;
    card.dataset.contact  = contact  || "";
    card.dataset.phone    = phone    || "";
    card.dataset.email    = email    || "";
    card.dataset.address  = address  || "";
    card.dataset.notes    = notes    || "";

    card.innerHTML = `
        <div class="workshop-task-row">
            <div class="module-card-icon icon-proveedor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
                <strong class="supp-name">${name}</strong>
                <p class="supp-contact">${contact || "Sin contacto"}</p>
                ${phone   ? `<p class="supp-phone">📞 ${phone}</p>` : ""}
                ${email   ? `<p>✉️ ${email}</p>`                    : ""}
                ${address ? `<p>📍 ${address}</p>`                   : ""}
                ${notes   ? `<p style="font-size:.75rem;color:#888">${notes}</p>` : ""}
            </div>
        </div>
        <div class="task-actions">
            <button class="supp-edit-btn" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="supp-delete-btn" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;

    card.querySelector(".supp-edit-btn").addEventListener("click", () => {
        _editingSupplierCard = card;
        document.querySelector("#supplierModal h2").textContent = "Editar proveedor";
        document.getElementById("supplierName").value    = card.dataset.name;
        document.getElementById("supplierContact").value = card.dataset.contact;
        document.getElementById("supplierPhone").value   = card.dataset.phone;
        document.getElementById("supplierEmail").value   = card.dataset.email;
        document.getElementById("supplierAddress").value = card.dataset.address;
        document.getElementById("supplierNotes").value   = card.dataset.notes;
        supplierModal.classList.remove("hidden");
    });

    card.querySelector(".supp-delete-btn").addEventListener("click", () => {
        if (!confirm(`¿Eliminar proveedor "${name}"?`)) return;
        card.remove();
        checkEmptyState("suppliersList");
        saveSuppliers();
        refreshSupplierSelect();
    });

    list.appendChild(card);
    checkEmptyState("suppliersList");
    refreshSupplierSelect();
}

function saveSuppliers() {
    if (_isLoading) return;
    const data = [];
    document.querySelectorAll("#suppliersList .workshop-task").forEach(card => {
        data.push({
            name:        card.dataset.name    || "",
            contactName: card.dataset.contact || "",
            phone:       card.dataset.phone   || "",
            email:       card.dataset.email   || "",
            address:     card.dataset.address || "",
            notes:       card.dataset.notes   || ""
        });
    });
    DB.save("suppliers", data);
}

async function loadSuppliers() {
    const data = await DB.load("suppliers", []);
    data.forEach(s => createSupplierCard(
        s.name, s.contactName, s.phone, s.email, s.address, s.notes
    ));
}

function refreshTechnicianSelect() {
    const sel = document.getElementById("taskTechnicianSelect");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">👨‍🔧 Asignar técnico (opcional)</option>`;
    document.querySelectorAll("#techniciansList .workshop-task").forEach(card => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = card.dataset.name || "";
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}
function refreshSupplierSelect() {
    const sel = document.getElementById("poSupplierSelect");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">Seleccionar proveedor</option>`;
    document.querySelectorAll("#suppliersList .workshop-task").forEach(card => {
        const opt = document.createElement("option");
        opt.value       = card.dataset.name;
        opt.textContent = card.dataset.name;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

/* ========================================
   MÓDULO: ÓRDENES DE COMPRA
======================================== */

let _editingPoCard   = null;

const poStatusBtn     = document.getElementById("poStatusBtn");
const poStatusOptions = document.getElementById("poStatusOptions");
const poStatusInput   = document.getElementById("poStatus");

poStatusBtn?.addEventListener("click", () => {
    poStatusOptions?.classList.toggle("hidden");
});

poStatusOptions?.querySelectorAll(".status-option").forEach(opt => {
    opt.addEventListener("click", () => {
        const val = opt.textContent.trim();
        if (poStatusBtn) poStatusBtn.textContent = val;
        if (poStatusInput) poStatusInput.value   = val;
        poStatusOptions.classList.add("hidden");
    });
});

document.getElementById("poItemsToggleBtn")?.addEventListener("click", () => {
    document.getElementById("poItemsBody")?.classList.toggle("open");
    document.getElementById("poItemsArrow")?.classList.toggle("open");
});

function buildPoItemRow(name = "", qty = 1, price = 0) {
    const row = document.createElement("div");
    row.className = "part-row";
    row.innerHTML = `
        <input type="text"   class="po-item-name"  placeholder="Producto"  value="${name}"  style="flex:1;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 10px;outline:none;box-sizing:border-box;">
        <input type="number" class="po-item-qty"   value="${qty}"   min="1" style="width:58px;text-align:center;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 4px;outline:none;box-sizing:border-box;">
        <input type="number" class="po-item-price" value="${price}" min="0" placeholder="$" style="width:72px;text-align:right;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 4px;outline:none;box-sizing:border-box;">
        <button type="button" class="part-remove">✕</button>
    `;
    row.querySelector(".part-remove").addEventListener("click", () => row.remove());
    return row;
}

document.getElementById("addPoItemBtn")?.addEventListener("click", () => {
    document.getElementById("poItemsList").appendChild(buildPoItemRow());
});

document.getElementById("addOrdenBtn")?.addEventListener("click", () => {
    _editingPoCard = null;
    document.querySelector("#purchaseOrderModal h2").textContent = "Nueva orden de compra";
    refreshSupplierSelect();
    document.getElementById("poSupplierSelect").value = "";
    if (poStatusBtn)   poStatusBtn.textContent = "Borrador";
    if (poStatusInput) poStatusInput.value     = "Borrador";
    document.getElementById("poItemsList").innerHTML = "";
    document.getElementById("poNotes").value         = "";
    document.getElementById("poItemsBody")?.classList.remove("open");
    document.getElementById("poItemsArrow")?.classList.remove("open");
    document.getElementById("purchaseOrderModal").classList.remove("hidden");
});

document.getElementById("closePurchaseOrderModal")?.addEventListener("click", () => {
    document.getElementById("purchaseOrderModal").classList.add("hidden");
    _editingPoCard = null;
});

document.getElementById("savePurchaseOrderBtn")?.addEventListener("click", () => {
    const supplier = document.getElementById("poSupplierSelect").value.trim();
    const status   = poStatusInput?.value || "Borrador";
    const notes    = document.getElementById("poNotes").value.trim();

    const items = [];
    document.querySelectorAll("#poItemsList .part-row").forEach(row => {
        const name  = row.querySelector(".po-item-name")?.value.trim();
        const qty   = parseInt(row.querySelector(".po-item-qty")?.value)   || 1;
        const price = parseFloat(row.querySelector(".po-item-price")?.value) || 0;
        if (name) items.push({ name, quantity: qty, unitPrice: price });
    });

    if (_editingPoCard) {
        const card = _editingPoCard;
        card.dataset.supplierName = supplier;
        card.dataset.status       = status;
        card.dataset.notes        = notes;
        card.dataset.items        = JSON.stringify(items);
        card.querySelector(".po-supplier").textContent    = supplier || "Sin proveedor";
        card.querySelector(".po-status-badge").textContent = status;
        card.querySelector(".po-status-badge").className   = `po-status-badge vp-card-status ${_getPoStatusClass(status)}`;
        card.querySelector(".po-items-count").textContent  = `${items.length} producto${items.length !== 1 ? "s" : ""}`;
        _editingPoCard = null;
        document.querySelector("#purchaseOrderModal h2").textContent = "Nueva orden de compra";
    } else {
        createPurchaseOrderCard({ supplierName: supplier, status, notes, items });
    }

    document.getElementById("purchaseOrderModal").classList.add("hidden");
    document.getElementById("poItemsList").innerHTML = "";
    savePurchaseOrders();
    refreshPoSelect();
});

function _getPoStatusClass(status) {
    if (status === "Recibida")  return "status-listo";
    if (status === "Enviada")   return "status-servicio";
    if (status === "Cancelada") return "status-entregado";
    return "status-ingresado";
}

function createPurchaseOrderCard({ supplierName = "", status = "Borrador", notes = "", items = [], createdAt = "", poUid = null }) {
    const list = document.getElementById("ordenesList");
    if (!list) return;

    const date = createdAt
        ? new Date(createdAt).toLocaleDateString("es-MX")
        : new Date().toLocaleDateString("es-MX");

    const card = document.createElement("div");
    card.className            = "workshop-task";
    card.dataset.supplierName = supplierName;
    card.dataset.status       = status;
    card.dataset.notes        = notes;
    card.dataset.items        = JSON.stringify(items);
    card.dataset.createdAt    = createdAt || new Date().toISOString();
    card.dataset.poUid        = poUid || (window.crypto?.randomUUID ? crypto.randomUUID() : ("po_" + Date.now() + "_" + Math.random().toString(36).slice(2)));

    card.innerHTML = `
        <div class="workshop-task-row">
            <div class="module-card-icon icon-orden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div>
                <strong class="po-supplier">${supplierName || "Sin proveedor"}</strong>
                <p><span class="po-status-badge vp-card-status ${_getPoStatusClass(status)}">${status}</span></p>
                <p class="po-items-count">${items.length} producto${items.length !== 1 ? "s" : ""}</p>
                ${notes ? `<p style="font-size:.75rem;color:#888">${notes}</p>` : ""}
                <p style="font-size:.72rem;color:#aaa;display:flex;align-items:center;gap:4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ${date}
                </p>
            </div>
        </div>
        <div class="task-actions">
            <button class="po-pdf-btn" title="Descargar PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </button>
            <button class="po-edit-btn" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="po-delete-btn" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;

    card.querySelector(".po-pdf-btn").addEventListener("click", () => generatePurchaseOrderPDF(card));

    card.querySelector(".po-edit-btn").addEventListener("click", () => {
        _editingPoCard = card;
        document.querySelector("#purchaseOrderModal h2").textContent = "Editar orden";
        refreshSupplierSelect();
        document.getElementById("poSupplierSelect").value = card.dataset.supplierName || "";
        if (poStatusBtn)   poStatusBtn.textContent = card.dataset.status || "Borrador";
        if (poStatusInput) poStatusInput.value     = card.dataset.status || "Borrador";
        document.getElementById("poNotes").value   = card.dataset.notes || "";

        const itemsData = JSON.parse(card.dataset.items || "[]");
        const itemsList = document.getElementById("poItemsList");
        itemsList.innerHTML = "";
        itemsData.forEach(i => itemsList.appendChild(buildPoItemRow(i.name, i.quantity, i.unitPrice)));
        if (itemsData.length > 0) {
            document.getElementById("poItemsBody")?.classList.add("open");
            document.getElementById("poItemsArrow")?.classList.add("open");
        }
        document.getElementById("purchaseOrderModal").classList.remove("hidden");
    });

    card.querySelector(".po-delete-btn").addEventListener("click", () => {
        if (!confirm("¿Eliminar esta orden de compra?")) return;
        card.remove();
        checkEmptyState("ordenesList");
        savePurchaseOrders();
        refreshPoSelect();
    });

    list.appendChild(card);
    checkEmptyState("ordenesList");
}

async function savePurchaseOrders() {
    if (_isLoading) return;
    showSaveToast("saving");
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) { showSaveToast("error"); return; }
        const uid = session.user.id;

        await _supabase.from("purchase_orders").delete().eq("user_id", uid);

        const cards = document.querySelectorAll("#ordenesList .workshop-task");
        for (const card of cards) {
            const { data: inserted, error } = await _supabase
                .from("purchase_orders")
                .insert({ user_id: uid, supplier_name: card.dataset.supplierName || "", status: card.dataset.status || "Borrador", notes: card.dataset.notes || "", po_uid: card.dataset.poUid || "" })
                .select();
            if (error) throw error;

            const poId  = inserted[0].id;
            const items = JSON.parse(card.dataset.items || "[]");
            if (items.length > 0) {
                await _supabase.from("purchase_order_items").insert(
                    items.map(i => ({
                        purchase_order_id: poId,
                        name:       i.name,
                        quantity:   i.quantity  || 1,
                        unit_price: i.unitPrice || 0
                    }))
                );
            }
        }
        showSaveToast("ok");
    } catch (e) {
        showSaveToast("error");
        console.error("Error guardando órdenes:", e);
    }
}

async function loadPurchaseOrders() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;

        const { data: orders, error } = await _supabase
            .from("purchase_orders").select("*").eq("user_id", uid);
        if (error || !orders?.length) return;

        const orderIds = orders.map(o => o.id);
        const { data: items } = await _supabase
            .from("purchase_order_items").select("*").in("purchase_order_id", orderIds);

        orders.forEach(order => {
            const orderItems = (items || [])
                .filter(i => i.purchase_order_id === order.id)
                .map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unit_price }));
            createPurchaseOrderCard({
                supplierName: order.supplier_name || "",
                status:    order.status,
                notes:     order.notes,
                items:     orderItems,
                createdAt: order.created_at,
                poUid:     order.po_uid || ""
            });
        });
    } catch (e) {
        console.error("Error cargando órdenes:", e);
    }
}
function refreshPoSelect() {
    const sel = document.getElementById("recepcionPoSelect");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">Vincular a orden de compra (opcional)</option>`;
    document.querySelectorAll("#ordenesList .workshop-task").forEach(card => {
        const opt = document.createElement("option");
        const supplier = card.dataset.supplierName || "Sin proveedor";
        opt.value       = card.dataset.poUid || "";
        opt.textContent = `${supplier} — ${card.dataset.status}`;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

document.getElementById("recepcionPoSelect")?.addEventListener("change", () => {
    const poUid = document.getElementById("recepcionPoSelect").value;
    if (!poUid) return;
    const poCard = [...document.querySelectorAll("#ordenesList .workshop-task")]
        .find(c => c.dataset.poUid === poUid);
    if (!poCard) return;

    const items = JSON.parse(poCard.dataset.items || "[]");
    if (items.length === 0) return;

    const itemsList = document.getElementById("recepcionItemsList");
    if (itemsList.children.length > 0 && !confirm("Esto reemplazará los productos capturados con los de la orden seleccionada. ¿Continuar?")) return;

    itemsList.innerHTML = "";
    items.forEach(i => itemsList.appendChild(buildRecepcionItemRow(i.name, i.quantity)));
    document.getElementById("recepcionItemsBody")?.classList.add("open");
    document.getElementById("recepcionItemsArrow")?.classList.add("open");
});

function markPurchaseOrderReceived(poUid) {
    const poCard = [...document.querySelectorAll("#ordenesList .workshop-task")]
        .find(c => c.dataset.poUid === poUid);
    if (!poCard || poCard.dataset.status === "Recibida") return;
    poCard.dataset.status = "Recibida";
    const badge = poCard.querySelector(".po-status-badge");
    if (badge) {
        badge.textContent = "Recibida";
        badge.className   = `po-status-badge vp-card-status ${_getPoStatusClass("Recibida")}`;
    }
    savePurchaseOrders();
}

/* ========================================
   MÓDULO: RECEPCIONES
======================================== */

let _editingRecepcionCard = null;

document.getElementById("recepcionItemsToggleBtn")?.addEventListener("click", () => {
    document.getElementById("recepcionItemsBody")?.classList.toggle("open");
    document.getElementById("recepcionItemsArrow")?.classList.toggle("open");
});

function buildRecepcionItemRow(name = "", qty = 1) {
    const row = document.createElement("div");
    row.className = "part-row";

    let optionsHTML = `<option value="">Seleccionar del inventario</option>`;
    document.querySelectorAll(".inventory-card").forEach(card => {
        const n = card.dataset.fullName || "";
        optionsHTML += `<option value="${n}" ${n === name ? "selected" : ""}>${n}</option>`;
    });
    optionsHTML += `<option value="__manual__" ${name && !document.querySelector(`.inventory-card[data-full-name="${name}"]`) ? "selected" : ""}>✏️ Otro producto...</option>`;

    row.innerHTML = `
        <select class="part-select recep-item-select" style="flex:1;">${optionsHTML}</select>
        <input type="text" class="recep-item-manual" placeholder="Nombre" value="${name}"
            style="display:none;flex:1;min-width:0;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 10px;outline:none;box-sizing:border-box;">
        <input type="number" class="recep-item-qty part-qty" value="${qty}" min="1">
        <button type="button" class="part-remove">✕</button>
    `;

    // Si el nombre no existe en inventario, mostrar campo manual
    const isManual = name && !Array.from(document.querySelectorAll(".inventory-card"))
        .some(c => (c.dataset.fullName || "") === name);
    if (isManual) {
        row.querySelector(".recep-item-select").value       = "__manual__";
        row.querySelector(".recep-item-manual").style.display = "block";
        row.querySelector(".recep-item-select").style.width = "130px";
        row.querySelector(".recep-item-select").style.flex  = "0 0 auto";
    }

    row.querySelector(".recep-item-select").addEventListener("change", function () {
        const manual = row.querySelector(".recep-item-manual");
        if (this.value === "__manual__") {
            manual.style.display    = "block";
            this.style.width = "130px";
            this.style.flex  = "0 0 auto";
        } else {
            manual.style.display = "none";
            this.style.width = "";
            this.style.flex  = "1";
        }
    });

    row.querySelector(".part-remove").addEventListener("click", () => row.remove());
    return row;
}

document.getElementById("addRecepcionItemBtn")?.addEventListener("click", () => {
    document.getElementById("recepcionItemsList").appendChild(buildRecepcionItemRow());
});

document.getElementById("addRecepcionBtn")?.addEventListener("click", () => {
    _editingRecepcionCard = null;
    document.querySelector("#recepcionModal h2").textContent = "Nueva recepción";
    refreshPoSelect();
    document.getElementById("recepcionPoSelect").value      = "";
    document.getElementById("recepcionItemsList").innerHTML  = "";
    document.getElementById("recepcionNotes").value          = "";
    document.getElementById("recepcionItemsBody")?.classList.remove("open");
    document.getElementById("recepcionItemsArrow")?.classList.remove("open");
    document.getElementById("recepcionModal").classList.remove("hidden");
});

document.getElementById("closeRecepcionModal")?.addEventListener("click", () => {
    document.getElementById("recepcionModal").classList.add("hidden");
    _editingRecepcionCard = null;
});

document.getElementById("saveRecepcionBtn")?.addEventListener("click", () => {
    const poSelectEl = document.getElementById("recepcionPoSelect");
    const poUid      = poSelectEl.value;
    const poRef      = poUid ? poSelectEl.options[poSelectEl.selectedIndex].textContent : "";
    const notes      = document.getElementById("recepcionNotes").value.trim();

    const items = [];
    document.querySelectorAll("#recepcionItemsList .part-row").forEach(row => {
        const sel    = row.querySelector(".recep-item-select");
        const manual = row.querySelector(".recep-item-manual");
        const name   = sel.value === "__manual__" ? manual.value.trim() : sel.value;
        const qty    = parseInt(row.querySelector(".recep-item-qty")?.value) || 1;
        if (name) {
            items.push({ name, quantity: qty });
            // Sumar stock al inventario si el producto existe
            document.querySelectorAll(".inventory-card").forEach(card => {
                if ((card.dataset.fullName || "").toLowerCase() === name.toLowerCase()) {
                    const newStock = (parseInt(card.dataset.stock) || 0) + qty;
                    card.dataset.stock = newStock;
                    refreshCardStock(card, newStock);
                }
            });
        }
    });

    if (_editingRecepcionCard) {
        const card = _editingRecepcionCard;
        card.dataset.poUid = poUid;
        card.dataset.poRef = poRef;
        card.dataset.notes = notes;
        card.dataset.items = JSON.stringify(items);
        card.querySelector(".recep-po").textContent    = poRef  || "Sin orden vinculada";
        card.querySelector(".recep-count").textContent = `${items.length} producto${items.length !== 1 ? "s" : ""} recibidos`;
        _editingRecepcionCard = null;
        document.querySelector("#recepcionModal h2").textContent = "Nueva recepción";
    } else {
        createRecepcionCard({ poUid, poRef, notes, items });
    }

    if (poUid) markPurchaseOrderReceived(poUid);

    document.getElementById("recepcionModal").classList.add("hidden");
    document.getElementById("recepcionItemsList").innerHTML = "";
    saveRecepciones();
    saveInventory();
});

function createRecepcionCard({ poUid = "", poRef = "", notes = "", items = [], createdAt = "" }) {
    const list = document.getElementById("recepcionesList");
    if (!list) return;

    const date = createdAt
        ? new Date(createdAt).toLocaleDateString("es-MX")
        : new Date().toLocaleDateString("es-MX");

    const card = document.createElement("div");
    card.className      = "workshop-task";
    card.dataset.poUid  = poUid;
    card.dataset.poRef  = poRef;
    card.dataset.notes  = notes;
    card.dataset.items  = JSON.stringify(items);
    card.dataset.createdAt = createdAt || new Date().toISOString();

    card.innerHTML = `
        <div class="workshop-task-row">
            <div class="module-card-icon icon-recepcion">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div>
                <strong>📦 Recepción de mercancía</strong>
                <p class="recep-po">${poRef || "Sin orden vinculada"}</p>
                <p class="recep-count">${items.length} producto${items.length !== 1 ? "s" : ""} recibidos</p>
                ${notes ? `<p style="font-size:.75rem;color:#888">${notes}</p>` : ""}
                <p style="font-size:.72rem;color:#aaa;">📅 ${date}</p>
            </div>
        </div>
        <div class="task-actions">
            <button class="recep-edit-btn" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="recep-delete-btn" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;

    card.querySelector(".recep-edit-btn").addEventListener("click", () => {
        _editingRecepcionCard = card;
        document.querySelector("#recepcionModal h2").textContent = "Editar recepción";
        refreshPoSelect();
        document.getElementById("recepcionPoSelect").value = card.dataset.poUid || "";        document.getElementById("recepcionNotes").value    = card.dataset.notes || "";
        const itemsData = JSON.parse(card.dataset.items || "[]");
        const itemsList = document.getElementById("recepcionItemsList");
        itemsList.innerHTML = "";
        itemsData.forEach(i => itemsList.appendChild(buildRecepcionItemRow(i.name, i.quantity)));
        if (itemsData.length > 0) {
            document.getElementById("recepcionItemsBody")?.classList.add("open");
            document.getElementById("recepcionItemsArrow")?.classList.add("open");
        }
        document.getElementById("recepcionModal").classList.remove("hidden");
    });

    card.querySelector(".recep-delete-btn").addEventListener("click", () => {
        if (!confirm("¿Eliminar esta recepción?")) return;
        card.remove();
        checkEmptyState("recepcionesList");
        saveRecepciones();
    });

    list.appendChild(card);
    checkEmptyState("recepcionesList");
}

async function saveRecepciones() {
    if (_isLoading) return;
    showSaveToast("saving");
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) { showSaveToast("error"); return; }
        const uid = session.user.id;

        await _supabase.from("receptions").delete().eq("user_id", uid);

        const cards = document.querySelectorAll("#recepcionesList .workshop-task");
        for (const card of cards) {
            const { data: inserted, error } = await _supabase
                .from("receptions")
                .insert({ user_id: uid, po_reference: card.dataset.poRef || "", po_uid: card.dataset.poUid || "", notes: card.dataset.notes || "" })
                .select();
            if (error) throw error;

            const recId = inserted[0].id;
            const items = JSON.parse(card.dataset.items || "[]");
            if (items.length > 0) {
                await _supabase.from("reception_items").insert(
                    items.map(i => ({
                        reception_id:      recId,
                        name:              i.name,
                        quantity_received: i.quantity || 1
                    }))
                );
            }
        }
        showSaveToast("ok");
    } catch (e) {
        showSaveToast("error");
        console.error("Error guardando recepciones:", e);
    }
}

async function loadRecepciones() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;

        const { data: recs, error } = await _supabase
            .from("receptions").select("*").eq("user_id", uid);
        if (error || !recs?.length) return;

        const recIds = recs.map(r => r.id);
        const { data: items } = await _supabase
            .from("reception_items").select("*").in("reception_id", recIds);

        recs.forEach(rec => {
            const recItems = (items || [])
                .filter(i => i.reception_id === rec.id)
                .map(i => ({ name: i.name, quantity: i.quantity_received }));
    createRecepcionCard({ poUid: rec.po_uid || "", poRef: rec.po_reference || "", notes: rec.notes, items: recItems, createdAt: rec.created_at });        });
    } catch (e) {
        console.error("Error cargando recepciones:", e);
    }
}

/* ========================================
   MÓDULO: FACTURAS
======================================== */

let _editingFacturaCard = null;

const facturaStatusBtn     = document.getElementById("facturaStatusBtn");
const facturaStatusOptions = document.getElementById("facturaStatusOptions");
const facturaStatusInput   = document.getElementById("facturaStatus");

facturaStatusBtn?.addEventListener("click", () => {
    facturaStatusOptions?.classList.toggle("hidden");
});

facturaStatusOptions?.querySelectorAll(".status-option").forEach(opt => {
    opt.addEventListener("click", () => {
        const val = opt.textContent.trim();
        if (facturaStatusBtn)   facturaStatusBtn.textContent = val;
        if (facturaStatusInput) facturaStatusInput.value     = val;
        facturaStatusOptions.classList.add("hidden");
    });
});

document.getElementById("facturaItemsToggleBtn")?.addEventListener("click", () => {
    document.getElementById("facturaItemsBody")?.classList.toggle("open");
    document.getElementById("facturaItemsArrow")?.classList.toggle("open");
});

function buildFacturaItemRow(desc = "", qty = 1, price = 0) {
    const row = document.createElement("div");
    row.className = "part-row";
    row.innerHTML = `
        <input type="text"   class="fact-item-desc"  placeholder="Servicio / concepto" value="${desc}"  style="flex:1;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 10px;outline:none;box-sizing:border-box;">
        <input type="number" class="fact-item-qty"   value="${qty}"   min="1" style="width:58px;text-align:center;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 4px;outline:none;box-sizing:border-box;">
        <input type="number" class="fact-item-price" value="${price}" min="0" placeholder="$" style="width:72px;text-align:right;border-radius:10px;border:1.5px solid rgba(0,0,0,.08);background:white;font-size:.82rem;padding:8px 4px;outline:none;box-sizing:border-box;">
        <button type="button" class="part-remove">✕</button>
    `;
    row.querySelector(".part-remove").addEventListener("click", () => row.remove());
    return row;
}

document.getElementById("addFacturaItemBtn")?.addEventListener("click", () => {
    document.getElementById("facturaItemsList").appendChild(buildFacturaItemRow());
});

function refreshClientSelect() {
    const sel = document.getElementById("facturaClientSelect");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">Seleccionar cliente (opcional)</option>`;
    document.querySelectorAll(".cp-card").forEach(card => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = card.dataset.name || "";
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

function refreshVehicleSelectFactura() {
    const sel = document.getElementById("facturaVehicleSelect");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">Seleccionar vehículo (opcional)</option>`;
    document.querySelectorAll(".vp-card").forEach(card => {
        const name  = card.dataset.vehicleName || "";
        const plate = card.dataset.plate || "";
        const opt   = document.createElement("option");
        opt.value       = name;
        opt.textContent = `${name}${plate ? ` (${plate})` : ""}`;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

document.getElementById("addFacturaBtn")?.addEventListener("click", () => {
    _editingFacturaCard = null;
    document.querySelector("#facturaModal h2").textContent = "Nueva factura";
    refreshClientSelect();
    refreshVehicleSelectFactura();
    document.getElementById("facturaClientSelect").value  = "";
    document.getElementById("facturaVehicleSelect").value = "";
    if (facturaStatusBtn)   facturaStatusBtn.textContent = "Borrador";
    if (facturaStatusInput) facturaStatusInput.value     = "Borrador";
    document.getElementById("facturaItemsList").innerHTML = "";
    document.getElementById("facturaNotes").value         = "";
    document.getElementById("facturaItemsBody")?.classList.remove("open");
    document.getElementById("facturaItemsArrow")?.classList.remove("open");
    document.getElementById("facturaModal").classList.remove("hidden");
});

document.getElementById("closeFacturaModal")?.addEventListener("click", () => {
    document.getElementById("facturaModal").classList.add("hidden");
    _editingFacturaCard = null;
});

document.getElementById("saveFacturaBtn")?.addEventListener("click", () => {
    const client  = document.getElementById("facturaClientSelect").value.trim();
    const vehicle = document.getElementById("facturaVehicleSelect").value.trim();
    const status  = facturaStatusInput?.value || "Borrador";
    const notes   = document.getElementById("facturaNotes").value.trim();

    const items = [];
    let total = 0;
    document.querySelectorAll("#facturaItemsList .part-row").forEach(row => {
        const desc  = row.querySelector(".fact-item-desc")?.value.trim();
        const qty   = parseInt(row.querySelector(".fact-item-qty")?.value)    || 1;
        const price = parseFloat(row.querySelector(".fact-item-price")?.value) || 0;
        if (desc) {
            items.push({ description: desc, quantity: qty, unitPrice: price });
            total += qty * price;
        }
    });

    if (_editingFacturaCard) {
        const card = _editingFacturaCard;
        const newTotal = items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
        card.dataset.client  = client;
        card.dataset.vehicle = vehicle;
        card.dataset.status  = status;
        card.dataset.notes   = notes;
        card.dataset.items   = JSON.stringify(items);
        card.querySelector(".fact-client").textContent  = client  || "Sin cliente";
        card.querySelector(".fact-vehicle").textContent = vehicle ? `🚗 ${vehicle}` : "";
        card.querySelector(".fact-status").className    = `fact-status vp-card-status ${_getFacturaStatusClass(status)}`;
        card.querySelector(".fact-status").textContent  = status;
        card.querySelector(".fact-total").textContent   = `$${newTotal.toLocaleString("es-MX")}`;
        _editingFacturaCard = null;
        document.querySelector("#facturaModal h2").textContent = "Nueva factura";
    } else {
        createFacturaCard({ client, vehicle, status, notes, items });
    }

    document.getElementById("facturaModal").classList.add("hidden");
    document.getElementById("facturaItemsList").innerHTML = "";
    saveFacturas();
});

function _getFacturaStatusClass(status) {
    if (status === "Pagada")    return "status-listo";
    if (status === "Emitida")   return "status-servicio";
    if (status === "Cancelada") return "status-entregado";
    return "status-ingresado";
}

function createFacturaCard({ client = "", vehicle = "", status = "Borrador", notes = "", items = [], createdAt = "" }) {
    const list = document.getElementById("facturasList");
    if (!list) return;

    const date  = createdAt ? new Date(createdAt).toLocaleDateString("es-MX") : new Date().toLocaleDateString("es-MX");
    const total = items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);

    const card = document.createElement("div");
    card.className       = "workshop-task";
    card.dataset.client  = client;
    card.dataset.vehicle = vehicle;
    card.dataset.status  = status;
    card.dataset.notes   = notes;
    card.dataset.items   = JSON.stringify(items);
    card.dataset.createdAt = createdAt || new Date().toISOString();

    card.innerHTML = `
        <div class="workshop-task-row">
            <div class="module-card-icon icon-factura">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="11" y2="16"/></svg>
            </div>
            <div>
                <strong class="fact-client">${client || "Sin cliente"}</strong>
                <p class="fact-vehicle" style="display:flex;align-items:center;gap:4px;">
                    ${vehicle ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> ${vehicle}` : ""}
                </p>
                <p><span class="fact-status vp-card-status ${_getFacturaStatusClass(status)}">${status}</span></p>
                <p class="fact-total" style="font-weight:700;color:#111;">$${total.toLocaleString("es-MX")}</p>
                <p style="font-size:.72rem;color:#aaa;display:flex;align-items:center;gap:4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ${date}
                </p>
                ${notes ? `<p style="font-size:.75rem;color:#888">${notes}</p>` : ""}
            </div>
        </div>
        <div class="task-actions">
            <button class="fact-pdf-btn" title="Descargar PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </button>
            <button class="fact-edit-btn" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="fact-delete-btn" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;

    card.querySelector(".fact-pdf-btn").addEventListener("click", () => generateFacturaPDF(card));

    card.querySelector(".fact-edit-btn").addEventListener("click", () => {
        _editingFacturaCard = card;
        document.querySelector("#facturaModal h2").textContent = "Editar factura";
        refreshClientSelect();
        refreshVehicleSelectFactura();
        document.getElementById("facturaClientSelect").value  = card.dataset.client  || "";
        document.getElementById("facturaVehicleSelect").value = card.dataset.vehicle || "";
        if (facturaStatusBtn)   facturaStatusBtn.textContent = card.dataset.status || "Borrador";
        if (facturaStatusInput) facturaStatusInput.value     = card.dataset.status || "Borrador";
        document.getElementById("facturaNotes").value = card.dataset.notes || "";
        const itemsData = JSON.parse(card.dataset.items || "[]");
        const itemsList = document.getElementById("facturaItemsList");
        itemsList.innerHTML = "";
        itemsData.forEach(i => itemsList.appendChild(buildFacturaItemRow(i.description, i.quantity, i.unitPrice)));
        if (itemsData.length > 0) {
            document.getElementById("facturaItemsBody")?.classList.add("open");
            document.getElementById("facturaItemsArrow")?.classList.add("open");
        }
        document.getElementById("facturaModal").classList.remove("hidden");
    });

    card.querySelector(".fact-delete-btn").addEventListener("click", () => {
        if (!confirm("¿Eliminar esta factura?")) return;
        card.remove();
        checkEmptyState("facturasList");
        saveFacturas();
    });

    list.appendChild(card);
    checkEmptyState("facturasList");
}

async function saveFacturas() {
    if (_isLoading) return;
    showSaveToast("saving");
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) { showSaveToast("error"); return; }
        const uid = session.user.id;

        await _supabase.from("invoices").delete().eq("user_id", uid);

        const cards = document.querySelectorAll("#facturasList .workshop-task");
        for (const card of cards) {
            const { data: inserted, error } = await _supabase
                .from("invoices")
                .insert({ user_id: uid, client_name: card.dataset.client || "", vehicle_name: card.dataset.vehicle || "", status: card.dataset.status || "Borrador", notes: card.dataset.notes || "" })
                .select();
            if (error) throw error;

            const invId = inserted[0].id;
            const items = JSON.parse(card.dataset.items || "[]");
            if (items.length > 0) {
                await _supabase.from("invoice_items").insert(
                    items.map(i => ({
                        invoice_id:  invId,
                        description: i.description || "",
                        quantity:    i.quantity    || 1,
                        unit_price:  i.unitPrice   || 0
                    }))
                );
            }
        }
        showSaveToast("ok");
    } catch (e) {
        showSaveToast("error");
        console.error("Error guardando facturas:", e);
    }
}

async function loadInvoices() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;

        const { data: invoices, error } = await _supabase
            .from("invoices").select("*").eq("user_id", uid);
        if (error || !invoices?.length) return;

        const invIds = invoices.map(i => i.id);
        const { data: items } = await _supabase
            .from("invoice_items").select("*").in("invoice_id", invIds);

        invoices.forEach(inv => {
            const invItems = (items || [])
                .filter(i => i.invoice_id === inv.id)
                .map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unit_price }));
createFacturaCard({ client: inv.client_name || "", vehicle: inv.vehicle_name || "", status: inv.status, notes: inv.notes, items: invItems, createdAt: inv.created_at });        });
    } catch (e) {
        console.error("Error cargando facturas:", e);
    }
}

/* ========================================
   EMPTY STATES — MÓDULOS NUEVOS
======================================== */
Object.assign(EMPTY_MSGS, {
    suppliersList:   "Sin proveedores registrados",
    ordenesList:     "Sin órdenes de compra",
    recepcionesList: "Sin recepciones registradas",
    facturasList:    "Sin facturas",
    techniciansList: "Sin técnicos registrados"
});

/* ========================================
   NAVEGACIÓN — COMPRAS Y TÉCNICOS
======================================== */

const comprasPage       = document.getElementById("comprasPage");
const proveedoresPage   = document.getElementById("proveedoresPage");
const ordenesCompraPage = document.getElementById("ordenesCompraPage");
const recepcionesPage   = document.getElementById("recepcionesPage");
const facturasPage      = document.getElementById("facturasPage");
const tecnicosPage      = document.getElementById("tecnicosPage");

function updateComprasHubStats() {
    const suppCount = document.querySelectorAll("#suppliersList .workshop-task").length;
    const statProveedores = document.getElementById("statProveedores");
    if (statProveedores) {
        statProveedores.textContent = suppCount === 0 ? "Sin proveedores" : `${suppCount} proveedor${suppCount !== 1 ? "es" : ""}`;
    }

    const poCards     = document.querySelectorAll("#ordenesList .workshop-task");
    const poPending    = [...poCards].filter(c => c.dataset.status !== "Recibida" && c.dataset.status !== "Cancelada").length;
    const statOrdenes = document.getElementById("statOrdenes");
    if (statOrdenes) {
        statOrdenes.textContent = poPending === 0 ? "Sin pendientes" : `${poPending} pendiente${poPending !== 1 ? "s" : ""}`;
    }

    const recepCount = document.querySelectorAll("#recepcionesList .workshop-task").length;
    const statRecepciones = document.getElementById("statRecepciones");
    if (statRecepciones) {
        statRecepciones.textContent = recepCount === 0 ? "Sin recepciones" : `${recepCount} registrada${recepCount !== 1 ? "s" : ""}`;
    }

    const factCards = document.querySelectorAll("#facturasList .workshop-task");
    let pendingTotal = 0;
    factCards.forEach(c => {
        if (c.dataset.status === "Pagada" || c.dataset.status === "Cancelada") return;
        const items = JSON.parse(c.dataset.items || "[]");
        pendingTotal += items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
    });
    const statFacturas = document.getElementById("statFacturas");
    if (statFacturas) {
        statFacturas.textContent = pendingTotal > 0 ? `$${pendingTotal.toLocaleString("es-MX")} por cobrar` : "Sin pendientes";
    }
}

navItems[4]?.addEventListener("click", () => {
    hideAllPages();
    comprasPage.classList.remove("hidden");
    setActiveNav(4);
    updateComprasHubStats();
});

document.getElementById("backFromCompras")?.addEventListener("click", goBackToDashboard);

document.getElementById("goProveedores")?.addEventListener("click", () => {
    comprasPage.classList.add("hidden");
    proveedoresPage.classList.remove("hidden");
    checkEmptyState("suppliersList");
});

document.getElementById("goOrdenesCompra")?.addEventListener("click", () => {
    comprasPage.classList.add("hidden");
    ordenesCompraPage.classList.remove("hidden");
    refreshSupplierSelect();
    checkEmptyState("ordenesList");
});

document.getElementById("goRecepciones")?.addEventListener("click", () => {
    comprasPage.classList.add("hidden");
    recepcionesPage.classList.remove("hidden");
    refreshPoSelect();
    checkEmptyState("recepcionesList");
});

document.getElementById("goFacturas")?.addEventListener("click", () => {
    comprasPage.classList.add("hidden");
    facturasPage.classList.remove("hidden");
    checkEmptyState("facturasList");
});

function goBackToCompras() {
    proveedoresPage?.classList.add("hidden");
    ordenesCompraPage?.classList.add("hidden");
    recepcionesPage?.classList.add("hidden");
    facturasPage?.classList.add("hidden");
    comprasPage.classList.remove("hidden");
    updateComprasHubStats();
}

document.getElementById("backFromProveedores")?.addEventListener("click", goBackToCompras);
document.getElementById("backFromOrdenes")?.addEventListener("click",     goBackToCompras);
document.getElementById("backFromRecepciones")?.addEventListener("click", goBackToCompras);
document.getElementById("backFromFacturas")?.addEventListener("click",    goBackToCompras);

// Técnicos: desde Taller
document.getElementById("goTecnicosBtn")?.addEventListener("click", () => {
    workshopPage.classList.add("hidden");
    tecnicosPage.classList.remove("hidden");
    checkEmptyState("techniciansList");
});

document.getElementById("backFromTecnicos")?.addEventListener("click", () => {
    tecnicosPage.classList.add("hidden");
    workshopPage.classList.remove("hidden");
});

// Cerrar dropdowns de status al hacer click fuera
document.addEventListener("click", (e) => {
    if (!e.target.closest("#purchaseOrderModal .custom-status-select"))
        poStatusOptions?.classList.add("hidden");
    if (!e.target.closest("#facturaModal .custom-status-select"))
        facturaStatusOptions?.classList.add("hidden");
});

/* ========================================
   CONFIGURACIÓN DEL TALLER (editable, para PDFs)
======================================== */

async function loadTallerConfig() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await _supabase
            .from("taller_config")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
        if (error || !data) return;
        TALLER_CONFIG.name    = data.name     || TALLER_CONFIG.name;
        TALLER_CONFIG.tagline = data.tagline  || TALLER_CONFIG.tagline;
        TALLER_CONFIG.logoUrl = data.logo_url || TALLER_CONFIG.logoUrl;
    } catch (e) {
        console.error("Error cargando configuración del taller:", e);
    }
}

async function saveTallerConfig(name, tagline, logoUrl) {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;
        await _supabase.from("taller_config").upsert(
            { user_id: uid, name, tagline, logo_url: logoUrl },
            { onConflict: "user_id" }
        );
        TALLER_CONFIG.name    = name;
        TALLER_CONFIG.tagline = tagline;
        TALLER_CONFIG.logoUrl = logoUrl;
    } catch (e) {
        console.error("Error guardando configuración del taller:", e);
    }
}

document.getElementById("openTallerConfigBtn")?.addEventListener("click", () => {
    document.getElementById("configTallerName").value    = TALLER_CONFIG.name    || "";
    document.getElementById("configTallerTagline").value = TALLER_CONFIG.tagline || "";
    document.getElementById("configTallerLogo").value    = TALLER_CONFIG.logoUrl || "";
    document.getElementById("tallerConfigModal").classList.remove("hidden");
});

document.getElementById("closeTallerConfigModal")?.addEventListener("click", () => {
    document.getElementById("tallerConfigModal").classList.add("hidden");
});

document.getElementById("saveTallerConfigBtn")?.addEventListener("click", async () => {
    const name    = document.getElementById("configTallerName").value.trim()    || "Mi Taller Mecánico";
    const tagline = document.getElementById("configTallerTagline").value.trim();
    const logoUrl = document.getElementById("configTallerLogo").value.trim();
    await saveTallerConfig(name, tagline, logoUrl);
    document.getElementById("tallerConfigModal").classList.add("hidden");
    showSaveToast("ok");
});

/* ========================================
   GENERACIÓN DE PDF — MÓDULO COMPRAS
======================================== */

function _pdfHeader(doc) {
    const pageWidth  = doc.internal.pageSize.getWidth();
    const leftMargin = 20;
    let y = 20;

    if (TALLER_CONFIG.logoUrl) {
        try {
            doc.addImage(TALLER_CONFIG.logoUrl, "PNG", leftMargin, y - 10, 30, 15);
        } catch(e) { /* logo inválido, se omite */ }
    }

    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(TALLER_CONFIG.name || "Taller Mecánico", TALLER_CONFIG.logoUrl ? leftMargin + 34 : leftMargin, y);
    y += 6;

    if (TALLER_CONFIG.tagline) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140);
        doc.text(TALLER_CONFIG.tagline, TALLER_CONFIG.logoUrl ? leftMargin + 34 : leftMargin, y);
        y += 5;
    }

    y += 6;
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
    return y + 10;
}

function _pdfItemsTable(doc, items, colHeaders, rowMapper, y) {
    const leftMargin = 20;
    const pageWidth  = doc.internal.pageSize.getWidth();
    const cols       = [leftMargin, leftMargin + 95, leftMargin + 128, leftMargin + 165];

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    colHeaders.forEach((h, i) => doc.text(h, cols[i], y, i > 0 ? { align: "right" } : {}));
    y += 4;
    doc.setDrawColor(220);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    let total = 0;

    if (items.length === 0) {
        doc.setTextColor(160);
        doc.text("Sin conceptos registrados", leftMargin, y);
        y += 7;
    } else {
        items.forEach(item => {
            const { cols: rowCols, subtotal } = rowMapper(item);
            total += subtotal;
            rowCols.forEach((val, i) => doc.text(String(val), cols[i], y, i > 0 ? { align: "right" } : {}));
            y += 7;
        });
    }

    y += 3;
    doc.setDrawColor(210);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text("Total:", cols[2], y, { align: "right" });
    doc.text(`$${total.toLocaleString("es-MX")}`, cols[3], y, { align: "right" });
    return y;
}

function generatePurchaseOrderPDF(card) {
    if (!window.jspdf) { alert("PDF no disponible. Recarga la página."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const supplier = card.dataset.supplierName || "Sin proveedor";
    const status   = card.dataset.status       || "Borrador";
    const notes    = card.dataset.notes        || "";
    const items    = JSON.parse(card.dataset.items || "[]");
    const date     = new Date(card.dataset.createdAt).toLocaleDateString("es-MX");
    const leftMargin = 20;

    let y = _pdfHeader(doc);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Orden de Compra", leftMargin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    [
        ["Proveedor", supplier],
        ["Estado",    status],
        ["Fecha",     date]
    ].forEach(([label, val]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, leftMargin, y);
        doc.setFont("helvetica", "normal");
        doc.text(val, leftMargin + 28, y);
        y += 6;
    });
    y += 6;

    y = _pdfItemsTable(doc, items,
        ["Producto", "Cant.", "Precio unit.", "Subtotal"],
        item => ({
            cols: [
                item.name || "",
                String(item.quantity || 1),
                `$${(item.unitPrice || 0).toLocaleString("es-MX")}`,
                `$${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString("es-MX")}`
            ],
            subtotal: (item.quantity || 1) * (item.unitPrice || 0)
        }),
        y
    );

    if (notes) {
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Notas: ${notes}`, leftMargin, y);
    }

    doc.save(`OC-${supplier.replace(/\s+/g, "-")}-${date}.pdf`);
}

function generateFacturaPDF(card) {
    if (!window.jspdf) { alert("PDF no disponible. Recarga la página."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const client  = card.dataset.client  || "Sin cliente";
    const vehicle = card.dataset.vehicle || "Sin vehículo";
    const status  = card.dataset.status  || "Borrador";
    const notes   = card.dataset.notes   || "";
    const items   = JSON.parse(card.dataset.items || "[]");
    const date    = new Date(card.dataset.createdAt || Date.now()).toLocaleDateString("es-MX");
    const leftMargin = 20;

    let y = _pdfHeader(doc);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Factura de Servicio", leftMargin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    [
        ["Cliente",   client],
        ["Vehículo",  vehicle],
        ["Estado",    status],
        ["Fecha",     date]
    ].forEach(([label, val]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, leftMargin, y);
        doc.setFont("helvetica", "normal");
        doc.text(val, leftMargin + 28, y);
        y += 6;
    });
    y += 6;

    y = _pdfItemsTable(doc, items,
        ["Concepto", "Cant.", "Precio unit.", "Subtotal"],
        item => ({
            cols: [
                item.description || "",
                String(item.quantity || 1),
                `$${(item.unitPrice || 0).toLocaleString("es-MX")}`,
                `$${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString("es-MX")}`
            ],
            subtotal: (item.quantity || 1) * (item.unitPrice || 0)
        }),
        y
    );

    if (notes) {
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Notas: ${notes}`, leftMargin, y);
    }

    doc.save(`Factura-${client.replace(/\s+/g, "-")}-${date}.pdf`);
}