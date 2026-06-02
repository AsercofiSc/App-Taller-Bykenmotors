/* =========================
   ELEMENTOS PRINCIPALES
========================= */

const registerModal =
document.getElementById("registerModal");

const openRegister =
document.getElementById("openRegister");

const registerBtn =
document.getElementById("registerBtn");

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

openRegister.addEventListener("click", ()=>{
    registerModal.style.display="flex";
});

registerBtn.addEventListener("click", ()=>{

    const email =
    document.getElementById("registerEmail").value;

    const password =
    document.getElementById("registerPassword").value;

    let users =
    JSON.parse(localStorage.getItem("users")) || [];

    if(users.length >= 5){
        alert("Máximo 5 usuarios");
        return;
    }

    users.push({ email, password });

    localStorage.setItem("users", JSON.stringify(users));

    alert("Usuario registrado");

    registerModal.style.display="none";

});

/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit",(e)=>{

    e.preventDefault();

    const email =
    document.querySelector('.login-form input[type="email"]').value;

    const password =
    document.querySelector('.login-form input[type="password"]').value;

    let users =
    JSON.parse(localStorage.getItem("users")) || [];

    const validUser =
    users.find(user =>
        user.email === email &&
        user.password === password
    );

    if(validUser){
        document.querySelector(".login-page").style.display="none";
        dashboard.classList.remove("hidden");
    } else {
        alert("Datos incorrectos");
    }

});

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
   NAVIGATION
========================= */

navItems[0].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(0);
    vehiclesPage.classList.remove("hidden");
});

navItems[1].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(1);
    clientsPage.classList.remove("hidden");
});

navItems[2].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(2);
    inventoryPage.classList.remove("hidden");
});

navItems[3].addEventListener("click", ()=>{
    hideAllPages();
    setActiveNav(3);
    workshopPage.classList.remove("hidden");
});

/* =========================
   BACK BUTTONS
========================= */

document.getElementById("backDashboard").addEventListener("click", ()=>{
    hideAllPages();
    dashboard.classList.remove("hidden");
});

document.getElementById("backFromClients").addEventListener("click", ()=>{
    hideAllPages();
    dashboard.classList.remove("hidden");
});

document.getElementById("backFromInventory").addEventListener("click", ()=>{
    hideAllPages();
    dashboard.classList.remove("hidden");
});

document.getElementById("backFromWorkshop").addEventListener("click", ()=>{
    hideAllPages();
    dashboard.classList.remove("hidden");
});

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
        info.label, info.cls
    );

    // 2. Auto-registrar cliente si no existe
    if(owner){
        const clientsList = document.getElementById("clientsList");
        let clientExists  = false;

        clientsList.querySelectorAll(".cp-name").forEach(nameEl => {
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
        }
    }

    vehicleModal.classList.add("hidden");

    addNotification("vehicle", "Vehículo", `${brand} ${model} registrado en taller`);
    addActivity("vehicle", "Entrada de vehículo", `${brand} ${model} · ${plate || "Sin placa"}`);

});

/* =========================
   CREATE VEHICLE CARD
========================= */

function createVehicleCard(name, target, year, plate, color, owner, date, statusLabel, statusClass){

    const card = document.createElement("div");

    // ── Guardamos datos clave en el dataset para sincronización ──
    card.className           = "vp-card";
    card.dataset.vehicleName = name;        // ej: "Nissan Tsuru"
    card.dataset.owner       = owner || ""; // ej: "Juan Pérez"

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
            <span class="vp-card-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="vp-card-right">
            <button class="vp-delete">✕</button>
        </div>
    `;

    // Botón eliminar
    card.querySelector(".vp-delete").addEventListener("click", ()=>{
        card.remove();
        updateCounts();
    });

    // Botón "→ Servicio" — solo en lista "Ingresaron"
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

            autoAddWorkshopTask(name); // Abre modal de taller pre-llenado
            addNotification("vehicle", "En servicio", `${name} pasó a servicio`);
            addActivity("vehicle", "Vehículo a servicio", name);
        });

        card.querySelector(".vp-card-right").prepend(moveBtn);
    }

    target.appendChild(card);
    updateCounts();
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
    document.getElementById("incomingCount").textContent =
        document.getElementById("incomingList").children.length;
    document.getElementById("serviceCount").textContent =
        document.getElementById("serviceList").children.length;
    document.getElementById("readyCount").textContent =
        document.getElementById("readyList").children.length;
    document.getElementById("doneCount").textContent =
        document.getElementById("doneList").children.length;
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

let editingClientCard = null;
let editingTaskEl     = null;

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

    card.querySelector(".cp-contact-btn").addEventListener("click", ()=>{
        if(card.dataset.phone) window.open(`tel:${card.dataset.phone}`);
    });

    card.querySelector(".cp-delete-btn").addEventListener("click", ()=>{
        card.remove();
    });
}

function renderClientCardHTML(name, phone, email, vehicle, source){
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
    const sourceIcons = {
        directo:"🏠", whatsapp:"💬", correo:"📧",
        instagram:"📷", facebook:"👤"
    };
    return `
        <div class="cp-card-left">
            <div class="cp-avatar">${initials}</div>
            <div class="cp-info">
                <span class="cp-name">${name}</span>
                <span class="cp-detail">${phone}</span>
                <span class="cp-detail">${email}</span>
                ${vehicle ? `<span class="cp-vehicle">🚗 ${vehicle}</span>` : ""}
                <span class="cp-source">${sourceIcons[source] || "🏠"} ${source}</span>
            </div>
        </div>
        <div class="cp-actions">
            <button class="cp-edit-btn">✏️</button>
            <button class="cp-contact-btn" title="Contactar">📞</button>
            <button class="cp-delete-btn">✕</button>
        </div>
    `;
}

function createClientCard(name, phone, email, vehicle, source, target){
    const card = document.createElement("div");
    card.className       = "cp-card";
    card.dataset.name    = name;
    card.dataset.phone   = phone   || "";
    card.dataset.email   = email   || "";
    card.dataset.vehicle = vehicle || "";
    card.dataset.source  = source  || "directo";
    card.innerHTML = renderClientCardHTML(name, phone, email, vehicle, source);
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

/* ── Guardar tarea ── */

saveWorkshopTaskBtn.addEventListener("click", ()=>{

    const title           = document.getElementById("taskTitle").value.trim();
    const selectedVehicle = document.getElementById("taskVehicleSelect").value;
    const manualVehicle   = document.getElementById("taskVehicle").value.trim();
    const vehicle         = selectedVehicle || manualVehicle;
    const delivery        = document.getElementById("taskDelivery").value;
    const status          = document.getElementById("taskStatus").value;

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
            syncVehicleToReady(vehicle);
        }

        editingTaskEl = null;

    } else {
        createWorkshopTask(title, vehicle, delivery, status);
    }

    document.getElementById("taskTitle").value    = "";
    document.getElementById("taskVehicle").value  = "";
    document.getElementById("taskDelivery").value = "";
    workshopModal.classList.add("hidden");

    addNotification("task", "Taller", `Tarea "${title}" guardada`);
    addActivity("task", "Nueva tarea de taller", `${title} — ${vehicle}`);
});

/* ── Crear tarjeta de tarea ── */

function createWorkshopTask(title, vehicle, delivery, status){

    const task = document.createElement("div");
    task.className        = "workshop-task";
    task.dataset.title    = title;
    task.dataset.vehicle  = vehicle;
    task.dataset.delivery = delivery || "";
    task.dataset.status   = status;

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
        </div>
        <div class="task-actions">
            <select class="task-select">
                <option value="En proceso" ${status === "En proceso" ? "selected" : ""}>En proceso</option>
                <option value="Pendiente"  ${status === "Pendiente"  ? "selected" : ""}>Pendiente</option>
                <option value="Completado" ${status === "Completado" ? "selected" : ""}>Completado</option>
            </select>
            <button class="task-edit-btn">✏️</button>
            <button class="delete-task">✕</button>
        </div>
    `;

    const statusSelect = task.querySelector(".task-select");
    updateTaskStyle(statusSelect, status);

    statusSelect.addEventListener("change", ()=>{
        updateTaskStyle(statusSelect, statusSelect.value);
        updateWorkshopStats();

        if(statusSelect.value === "Completado"){
            // ── SINCRONIZACIÓN: mover vehículo a "Listos" en Bitácora ──
            syncVehicleToReady(task.dataset.vehicle);
            addNotification("task", "✅ Completado", `${task.dataset.title} — ${task.dataset.vehicle}`);
            addActivity("task", "Trabajo completado", `${task.dataset.title} · ${task.dataset.vehicle}`);
            showCompletedBanner(task.dataset.title, task.dataset.vehicle);
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
        task.remove();
        updateWorkshopStats();
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

function updateWorkshopStats(){
    const tasks = document.querySelectorAll(".workshop-task");

    const activeCars = document.getElementById("activeCars");
    if(activeCars) activeCars.textContent = tasks.length;

    let pending = 0;
    tasks.forEach(task=>{
        if(task.querySelector(".task-select").value === "Pendiente") pending++;
    });

    const pendingJobs = document.getElementById("pendingJobs");
    if(pendingJobs) pendingJobs.textContent = pending;
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

const EMAILJS_SERVICE_ID  = "TU_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "TU_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY  = "TU_PUBLIC_KEY";

function sendAlertEmail(productName, stock, toEmail){
    if(!toEmail){
        alert("Este producto no tiene correo de alerta configurado.");
        return;
    }
    if(typeof emailjs === "undefined"){
        const subject = encodeURIComponent(`⚠️ Stock bajo: ${productName}`);
        const body    = encodeURIComponent(`El producto "${productName}" tiene solo ${stock} unidades.\n\n— Taller App`);
        window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`);
        return;
    }
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:     toEmail,
        product_name: productName,
        stock_count:  stock
    }, EMAILJS_PUBLIC_KEY)
    .then(()=>{ alert(`✅ Alerta enviada a ${toEmail}`); })
    .catch(()=>{ alert("Error al enviar. Revisa tu configuración de EmailJS."); });
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

        createInventoryCard(name, category, stock, price, alertEmail);

        nameEl.value  = "";
        catEl.value   = "";
        stockEl.value = "";
        priceEl.value = "";
        if(emailEl) emailEl.value = "";

        inventoryModal.classList.add("hidden");

        addNotification("inventory", "Inventario", `${name} agregado (${stock} uds)`);
        addActivity("inventory", "Producto en stock", `${name} · $${price}`);
    });
}

function createInventoryCard(name, category, stock, price, alertEmail){
    const list  = document.getElementById("inventoryList");
    const isLow = stock < LOW_STOCK_THRESHOLD;
    const icon  = categoryIcons[category] || "📦";

    const card = document.createElement("div");
    card.className          = `inventory-card${isLow ? " low-stock-card" : ""}`;
    card.dataset.stock      = stock;
    card.dataset.name       = name.toLowerCase();
    card.dataset.alertEmail = alertEmail || "";

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
        card.remove();
        updateInventoryStats();
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
}

function updateInventoryStats(){
    const cards  = document.querySelectorAll(".inventory-card");
    let lowCount = 0;
    cards.forEach(c =>{ if(parseInt(c.dataset.stock) < LOW_STOCK_THRESHOLD) lowCount++; });

    document.getElementById("totalProducts").textContent = cards.length;
    document.getElementById("lowStockCount").textContent = lowCount;

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
}

const _invSearch = document.getElementById("inventorySearch");
if(_invSearch){
    _invSearch.addEventListener("input", (e)=>{
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll(".inventory-card").forEach(card =>{
            card.style.display = card.dataset.name.includes(query) ? "flex" : "none";
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
function syncVehicleToReady(vehicleName){
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

        // Quitar botón "→ Servicio" si aún existe
        const oldBtn = card.querySelector(".vp-move-service:not(.vp-deliver-btn)");
        if(oldBtn) oldBtn.remove();

        // Mover a "Listos para entrega"
        document.getElementById("readyList").appendChild(card);

        // Agregar botón "→ Entregar"
        addDeliverButton(card);

        updateCounts();
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

    if(existingCard){
        // Solo moverlo si no está ya en "Próximos a servicio"
        if(existingCard.parentElement?.id !== "serviceClientsList"){
            targetList.appendChild(existingCard);
        }
    } else {
        // Crear tarjeta nueva en "Próximos a servicio"
        createClientCard(ownerName, "", "", vehicleName, "directo", targetList);
    }

    addNotification("client", "Próximo servicio", `${ownerName} — agendar revisión`);
    addActivity("client", "Cliente → próximo servicio", `${ownerName} · ${vehicleName}`);
}