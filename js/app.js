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
            workshopTasks: "workshop_tasks"
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

    const sheet = document.createElement("div");
    sheet.className = "history-sheet";
    sheet.innerHTML = `
        <div class="history-sheet-header">
            <span class="history-sheet-title">Historial — ${name}</span>
            <button class="history-sheet-close">✕</button>
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
}

document.getElementById("backDashboard").addEventListener("click", goBackToDashboard);
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

function createVehicleCard(name, target, year, plate, color, owner, date, statusLabel, statusClass, notes = ""){

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
        createWorkshopTask(title, vehicle, delivery, status, parts);
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

function createWorkshopTask(title, vehicle, delivery, status, parts = []){

    const task = document.createElement("div");
    task.className        = "workshop-task";
    task.dataset.title    = title;
    task.dataset.vehicle  = vehicle;
    task.dataset.delivery = delivery || "";
    task.dataset.status   = status;
    task.dataset.parts    = JSON.stringify(parts);

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
            ${parts.length > 0 ? `<div class="parts-saved-list">${parts.map(p => `<span class="part-saved-row">${p.name} × ${p.qty}</span>`).join("")}</div>` : ""}
        </div>
        <div class="task-actions">
            <select class="task-select">
                <option value="En proceso" ${status === "En proceso" ? "selected" : ""}>En proceso</option>
                <option value="Pendiente"  ${status === "Pendiente"  ? "selected" : ""}>Pendiente</option>
                <option value="Completado" ${status === "Completado" ? "selected" : ""}>Completado</option>
            </select>
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

    workshopTasks.appendChild(task);
    updateWorkshopStats();
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
    const tasks       = document.querySelectorAll(".workshop-task");
    const serviceList = document.getElementById("serviceList");
    const activeVehicles = serviceList
        ? Array.from(serviceList.children).filter(c => !c.classList.contains("empty-state")).length
        : 0;

    const activeCars = document.getElementById("activeCars");
    if(activeCars) activeCars.textContent = activeVehicles;

    let pending = 0;
    tasks.forEach(task => {
        if(task.querySelector(".task-select").value === "Pendiente") pending++;
    });

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
    }
    if(stock === 0){
        showAlertBanner(`${name} — SIN STOCK`, 0, alertEmail);
        fireNotification(`${name} — SIN STOCK`, 0);
        addNotification("inventory", "🚨 Sin stock", `${name} — agotado`);
        addActivity("inventory", "Producto agotado", name);
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
        // Actualizar estado en la tarjeta
        const statusEl = card.querySelector(".vp-card-status");
        if(statusEl){
            statusEl.className   = "vp-card-status status-entregado";
            statusEl.textContent = "Entregado";
        }

        btn.remove();
        document.getElementById("doneList").appendChild(card);
        updateCounts();
        refreshClientVehicleStatuses();

        // Email al cliente: vehículo entregado
        const oCard = [...document.querySelectorAll(".cp-card")]
            .find(c => (c.dataset.name||"").toLowerCase() === (card.dataset.owner||"").toLowerCase());
        if(oCard?.dataset.email){
            sendDeliveryEmail(oCard.dataset.email, card.dataset.owner, card.dataset.vehicleName||"");
        }

        // Sincronizar cliente a "Próximos a servicio"
        syncClientToNextService(card);

        const vName = card.dataset.vehicleName || "";
        addNotification("vehicle", "Entregado", `${vName} entregado al cliente`);
        addActivity("vehicle", "Vehículo entregado", vName);
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
    document.querySelectorAll(".workshop-task").forEach(task => {
        data.push({
            title:    task.dataset.title    || "",
            vehicle:  task.dataset.vehicle  || "",
            delivery: task.dataset.delivery || "",
            status:   task.querySelector(".task-select")?.value || task.dataset.status || "En proceso",
            parts:    JSON.parse(task.dataset.parts || "[]")
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
            v.statusLabel, v.statusClass, v.notes
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
    data.forEach(t => createWorkshopTask(t.title, t.vehicle, t.delivery, t.status, t.parts || []));
}

/* ========================================
   FLUJO DE INICIALIZACIÓN DE DATOS
======================================== */
function limpiarDOM(){
    [
        "incomingList","serviceList","readyList","doneList",
        "clientsList","serviceClientsList","externalClientsList",
        "inventoryList","workshopTasks",
        "dashVehiclesList","dashLowStockList"
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

    // Ejecuta las descargas una tras otra esperando que terminen
    await loadVehicles();
    await loadClients();
    await loadInventory();
    await loadWorkshopTasks();

    _isLoading = false;
    initEmptyStates();
    updateDashboardStats();
    updateDashVehicles();
    updateDashLowStock();

    // Restaurar notificaciones y actividad desde localStorage
    if(_currentUserId){
        loadPersistedNotifications(_currentUserId);
        loadPersistedActivity(_currentUserId);
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
// --- CONFIGURACIÓN DE NOTIFICACIONES ---
window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
    OneSignal.init({
        // AQUÍ ES DONDE DEBES PONER TU ID REAL. 
        // Ejemplo: "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"
        appId: "5cd9a6bc-bfc4-4253-94a5-3f68a82ef53a", 
        allowLocalhostAsSecureOrigin: true
    });
});

// --- EL "MENSAJERO" ---
function avisar(mensaje) {
    if (window.OneSignal) {
        OneSignal.push(function() {
            OneSignal.sendSelfHostedNotification({
                heading: "Taller App",
                contents: { en: mensaje }
            });
        });
    }
}

