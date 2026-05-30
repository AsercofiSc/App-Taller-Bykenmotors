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

    users.push({
        email,
        password
    });

    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

    alert("Usuario registrado");

    registerModal.style.display="none";

});

/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit",(e)=>{

    e.preventDefault();

    const email =
    document.querySelector(
        '.login-form input[type="email"]'
    ).value;

    const password =
    document.querySelector(
        '.login-form input[type="password"]'
    ).value;

    let users =
    JSON.parse(localStorage.getItem("users")) || [];

    const validUser =
    users.find(user =>

        user.email === email &&
        user.password === password

    );

    if(validUser){

        document.querySelector(
            ".login-page"
        ).style.display="none";

        dashboard.classList.remove("hidden");

    }else{

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

document
.getElementById("backDashboard")
.addEventListener("click", ()=>{

    hideAllPages();

    dashboard.classList.remove("hidden");

});

document
.getElementById("backFromClients")
.addEventListener("click", ()=>{

    hideAllPages();

    dashboard.classList.remove("hidden");

});

document
.getElementById("backFromInventory")
.addEventListener("click", ()=>{

    hideAllPages();

    dashboard.classList.remove("hidden");

});

document
.getElementById("backFromWorkshop")
.addEventListener("click", ()=>{

    hideAllPages();

    dashboard.classList.remove("hidden");

});

/* =========================
   VEHICLE MODAL
========================= */

const addButtons =
document.querySelectorAll(".add-btn");

const vehicleModal =
document.getElementById("vehicleModal");

const saveVehicleBtn =
document.getElementById("saveVehicleBtn");

const closeVehicleModal =
document.getElementById("closeVehicleModal");

let currentTarget = null;

addButtons.forEach(button=>{

    button.addEventListener("click", ()=>{

        currentTarget =
        document.getElementById(
            button.dataset.target
        );

      vehicleModal.classList.remove("hidden");
document.getElementById("vehicleBrand").value = "";
document.getElementById("vehicleModel").value = "";
document.getElementById("vehicleYear").value = "";
document.getElementById("vehiclePlate").value = "";
document.getElementById("vehicleColor").value = "";
document.getElementById("vehicleOwner").value = "";

    });

});

closeVehicleModal.addEventListener("click", ()=>{

    vehicleModal.classList.add("hidden");

});

/* =========================
   SAVE VEHICLE (CON AUTO-REGISTRO DE CLIENTE)
========================= */

saveVehicleBtn.addEventListener("click", ()=>{

    const brand = document.getElementById("vehicleBrand").value;
    const model = document.getElementById("vehicleModel").value;
    const year = document.getElementById("vehicleYear").value;
    const plate = document.getElementById("vehiclePlate").value;
    const color = document.getElementById("vehicleColor").value;
    const owner = document.getElementById("vehicleOwner").value.trim();

    if(!brand || !model) return;

    const today = new Date().toLocaleDateString("es-MX");

    const targets = {
        incomingList: { label: "Ingresado", cls: "status-ingresado" },
        serviceList:  { label: "En servicio", cls: "status-servicio" },
        readyList:    { label: "Listo", cls: "status-listo" },
        doneList:     { label: "Entregado", cls: "status-entregado" }
    };

    const info = targets[currentTarget.id] || { label: "Ingresado", cls: "status-ingresado" };

    // 1. Crear la tarjeta del vehículo
    createVehicleCard(
        `${brand} ${model}`,
        currentTarget,
        year, plate, color, owner, today,
        info.label, info.cls
    );

    // 2. AUTO-REGISTRO DE CLIENTE (Si es que no existe ya)
    if (owner) {
        const clientsList = document.getElementById("clientsList");
        
        // Verificar si el cliente ya existe en la lista buscando por texto
        let clientExists = false;
        const existingNames = clientsList.querySelectorAll(".cp-name");
        existingNames.forEach(nameEl => {
            if (nameEl.textContent.toLowerCase() === owner.toLowerCase()) {
                clientExists = true;
            }
        });

        // Si no existe, lo agregamos automáticamente a la lista de "Recientes"
        if (!clientExists) {
            // Pasamos: name, phone (vacio), email (vacio), vehicle, source, target
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
    card.className = "vp-card";

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

    card.querySelector(".vp-delete").addEventListener("click", ()=>{
        card.remove();
        updateCounts();
    });

    // Botón "→ Servicio" solo en tarjetas de Ingresaron
    if(target.id === "incomingList"){
        const moveBtn = document.createElement("button");
        moveBtn.className = "vp-move-service";
        moveBtn.textContent = "→ Servicio";
        moveBtn.addEventListener("click", ()=>{
            const statusEl = card.querySelector(".vp-card-status");
            statusEl.className = "vp-card-status status-servicio";
            statusEl.textContent = "En servicio";
            document.getElementById("serviceList").appendChild(card);
            moveBtn.remove();
            updateCounts();
            
            // Auto-crear tarea en Taller (Ahora sí funcional)
            autoAddWorkshopTask(name);
            addNotification("vehicle", "En servicio", `${name} pasó a servicio`);
            addActivity("vehicle", "Vehículo a servicio", name);
        });
        card.querySelector(".vp-card-right").prepend(moveBtn);
    }

    target.appendChild(card);
    updateCounts();
} // Aquí cierra tu función createVehicleCard original

/* ========================================
   FUNCIÓN COMPLEMENTARIA: AUTO ADD WORKSHOP TASK
======================================== */
function autoAddWorkshopTask(vehicleName) {
    const entregaEstimada = new Date();
    entregaEstimada.setDate(entregaEstimada.getDate() + 2);
    const isoDate = entregaEstimada.toISOString().split("T")[0];

    editingTaskEl = null;

    document.getElementById("taskTitle").value    = "Diagnóstico y Servicio Técnico";
    document.getElementById("taskVehicle").value  = vehicleName;
    document.getElementById("taskDelivery").value = isoDate;

    loadWorkshopVehicles();
    document.getElementById("taskVehicleSelect").value = vehicleName;

    taskStatusInput.value = "En proceso";
    taskStatusBtn.textContent = "En proceso";
    taskStatusBtn.classList.remove("pending-status", "completed-status");
    taskStatusBtn.classList.add("active-status");

    workshopModal.classList.remove("hidden");
}

/* =========================
   UPDATE COUNTS
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

const clientModal = document.getElementById("clientModal");
const closeClientModal = document.getElementById("closeClientModal");
const saveClientBtn = document.getElementById("saveClientBtn");
const clientsList = document.getElementById("clientsList");
const serviceClientsList = document.getElementById("serviceClientsList");
const externalClientsList = document.getElementById("externalClientsList");
let editingClientCard = null;
let editingTaskEl = null;

function openClientModalForNew(section = "recent") {
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
function attachClientCardListeners(card) {
    const sectionMap = {
        clientsList:         "recent",
        serviceClientsList:  "service",
        externalClientsList: "external"
    };
    const sourceIcons = {
        directo:"🏠", whatsapp:"💬", correo:"📧",
        instagram:"📷", facebook:"👤"
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
        if (card.dataset.phone) window.open(`tel:${card.dataset.phone}`);
    });
    card.querySelector(".cp-delete-btn").addEventListener("click", ()=>{
        card.remove();
    });
}

function renderClientCardHTML(name, phone, email, vehicle, source) {
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

function createClientCard(name, phone, email, vehicle, source, target) {
    const card = document.createElement("div");
    card.className = "cp-card";
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

    if (!name) return;

    const targets = {
        recent:   clientsList,
        service:  serviceClientsList,
        external: externalClientsList
    };

    if (editingClientCard !== null) {
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

const inventoryModal =
document.getElementById("inventoryModal");

const openInventoryModal =
document.getElementById("openInventoryModal");

const closeInventoryModal =
document.getElementById("closeInventoryModal");

openInventoryModal.addEventListener("click", ()=>{

    inventoryModal.classList.remove("hidden");

});

closeInventoryModal.addEventListener("click", ()=>{

    inventoryModal.classList.add("hidden");

});
/* ========================================
   WORKSHOP TASK SYSTEM
======================================== */

const workshopTasks =
document.getElementById("workshopTasks");

const addWorkshopTaskBtn =
document.getElementById("addWorkshopTaskBtn");

const workshopModal =
document.getElementById("workshopModal");

const closeWorkshopModal =
document.getElementById("closeWorkshopModal");

const saveWorkshopTaskBtn =
document.getElementById("saveWorkshopTaskBtn");
/* ========================================
   CUSTOM STATUS SELECT
======================================== */

const taskStatusBtn =
document.getElementById(
    "taskStatusBtn"
);

const taskStatusOptions =
document.getElementById(
    "taskStatusOptions"
);

const taskStatusInput =
document.getElementById(
    "taskStatus"
);

const statusOptions =
document.querySelectorAll(
    ".status-option"
);

/* OPEN MENU */

taskStatusBtn.addEventListener(
    "click",
    ()=>{

        taskStatusOptions.classList.toggle(
            "hidden"
        );

    }
);

/* SELECT OPTION */

statusOptions.forEach(option=>{

    option.addEventListener("click", ()=>{

        const value = option.textContent.trim();

        taskStatusBtn.textContent = value;
        taskStatusInput.value = value;

        taskStatusBtn.classList.remove(
            "active-status",
            "pending-status",
            "completed-status"
        );

        if(value === "En proceso") taskStatusBtn.classList.add("active-status");
        if(value === "Pendiente")  taskStatusBtn.classList.add("pending-status");
        if(value === "Completado") taskStatusBtn.classList.add("completed-status");

        taskStatusOptions.classList.add("hidden");

    });

});

/* CLOSE OUTSIDE */

document.addEventListener(
    "click",
    (e)=>{

        if(
            !e.target.closest(
                ".custom-status-select"
            )
        ){

            taskStatusOptions.classList.add(
                "hidden"
            );

        }

    }
);

/* ========================================
   OPEN MODAL
======================================== */

addWorkshopTaskBtn.addEventListener("click", ()=>{

    document.getElementById(
        "taskTitle"
    ).value = "";

    document.getElementById(
        "taskVehicle"
    ).value = "";

    loadWorkshopVehicles();

    document.getElementById(
        "taskDelivery"
    ).value = "";

    taskStatusInput.value = "En proceso";
    taskStatusBtn.textContent = "En proceso";
    taskStatusBtn.classList.remove("pending-status", "completed-status");
    taskStatusBtn.classList.add("active-status");

    editingTaskEl = null;

    workshopModal.classList.remove(
        "hidden"
    );

});
/* ========================================
   CLOSE MODAL
======================================== */

closeWorkshopModal.addEventListener("click", ()=>{

    workshopModal.classList.add("hidden");
    editingTaskEl = null;

});

/* ========================================
   SAVE TASK
======================================== */

saveWorkshopTaskBtn.addEventListener("click", ()=>{

    const title           = document.getElementById("taskTitle").value;
    const selectedVehicle = document.getElementById("taskVehicleSelect").value;
    const manualVehicle   = document.getElementById("taskVehicle").value;
    const vehicle         = selectedVehicle || manualVehicle;
    const delivery        = document.getElementById("taskDelivery").value;
    const status          = document.getElementById("taskStatus").value;

    if (!title || !vehicle) {
        alert("Completa los datos");
        return;
    }

    if (editingTaskEl !== null) {

        const task = editingTaskEl;

        let displayDate = "Sin fecha";
        if (delivery) {
            const d = new Date(delivery + "T00:00:00");
            displayDate = d.toLocaleDateString("es-MX");
        }

        task.dataset.title    = title;
        task.dataset.vehicle  = vehicle;
        task.dataset.delivery = delivery;
        task.dataset.status   = status;

        task.querySelector("strong").textContent      = title;
        task.querySelectorAll("p")[0].textContent     = vehicle;
        task.querySelectorAll("p")[1].textContent     = `📅 Entrega: ${displayDate}`;

        const sel = task.querySelector(".task-select");
        sel.value = status;
        updateTaskStyle(sel, status);
        updateWorkshopStats();

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

/* ========================================
   CREATE TASK
======================================== */

function createWorkshopTask(
    title,
    vehicle,
    delivery,
    status
){

    const task =
    document.createElement("div");

    task.className        = "workshop-task";
    task.dataset.title    = title;
    task.dataset.vehicle  = vehicle;
    task.dataset.delivery = delivery || "";
    task.dataset.status   = status;

    let displayDate = "Sin fecha";
    if (delivery) {
        const d = new Date(delivery + "T00:00:00");
        displayDate = d.toLocaleDateString("es-MX");
    }
    "workshop-task";

    task.innerHTML = `

        <div>

            <strong>
                ${title}
            </strong>

            <p>
                ${vehicle}
            </p>

            <p>
                📅 Entrega: ${displayDate}
            </p>

        </div>

        <div class="task-actions">

            <select class="task-select">

                <option value="En proceso"
                    ${status === "En proceso" ? "selected" : ""}
                >
                    En proceso
                </option>

                <option value="Pendiente"
                    ${status === "Pendiente" ? "selected" : ""}
                >
                    Pendiente
                </option>

                <option value="Completado"
                    ${status === "Completado" ? "selected" : ""}
                >
                    Completado
                </option>

            </select>

            <button class="task-edit-btn">✏️</button>

            <button class="delete-task">

                ✕

            </button>

        </div>

    `;

    const statusSelect =
    task.querySelector(".task-select");

    updateTaskStyle(
        statusSelect,
        status
    );

    statusSelect.addEventListener(
        "change",
        ()=>{

            updateTaskStyle(
                statusSelect,
                statusSelect.value
            );

            updateWorkshopStats();

        }
    );
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
    task
    .querySelector(".delete-task")
    .addEventListener("click", ()=>{

        task.remove();

        updateWorkshopStats();

    });

    workshopTasks.appendChild(task);

    updateWorkshopStats();

}

/* ========================================
   UPDATE STYLE
======================================== */
function loadWorkshopVehicles(){

    const select =
    document.getElementById(
        "taskVehicleSelect"
    );

    select.innerHTML = `
        <option value="">
            Seleccionar vehículo
        </option>
    `;

    const vehicleCards =
    document.querySelectorAll(
        ".vp-card"
    );

    vehicleCards.forEach(card=>{

        const name =
        card.querySelector(
            ".vp-card-name"
        ).textContent;

        const option =
        document.createElement(
            "option"
        );

        option.value = name;

        option.textContent = name;

        select.appendChild(
            option
        );

    });

}
function updateTaskStyle(
    element,
    status
){

    element.classList.remove(
        "active-status",
        "pending-status",
        "completed-status"
    );

    if(status === "En proceso"){

        element.classList.add(
            "active-status"
        );

    }

    if(status === "Pendiente"){

        element.classList.add(
            "pending-status"
        );

    }

    if(status === "Completado"){

        element.classList.add(
            "completed-status"
        );

    }

}

/* ========================================
   UPDATE STATS
======================================== */

function updateWorkshopStats(){

    const tasks =
    document.querySelectorAll(
        ".workshop-task"
    );

    // VEHICULOS ACTIVOS
    const activeCars =
    document.getElementById(
        "activeCars"
    );

    if(activeCars){

        activeCars.textContent =
        tasks.length;

    }

    // TRABAJOS PENDIENTES
    let pending = 0;

    tasks.forEach(task=>{

        const value =
        task.querySelector(
            ".task-select"
        ).value;

        if(value === "Pendiente"){

            pending++;

        }

    });

    const pendingJobs =
    document.getElementById(
        "pendingJobs"
    );

    if(pendingJobs){

        pendingJobs.textContent =
        pending;

    }

}
/* ========================================
   INVENTORY — SISTEMA COMPLETO
======================================== */

const LOW_STOCK_THRESHOLD = 5;

const categoryIcons = {
    "Filtros"     : "🔧",
    "Aceites"     : "🛢️",
    "Frenos"      : "⚙️",
    "Suspensión"  : "🔩",
    "Eléctrico"   : "⚡",
    "Motor"       : "🔥",
    "Transmisión" : "🔄",
    "Carrocería"  : "🚗",
    "Otro"        : "📦"
};

/* ── Notificación del navegador ── */

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

/* ── Banner rojo en pantalla ── */

function showAlertBanner(productName, stock, alertEmail){
    const existing = document.getElementById("stockAlertBanner");
    if(existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "stockAlertBanner";
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
    setTimeout(()=>{ const b=document.getElementById("stockAlertBanner"); if(b)b.remove(); }, 8000);
}

/* ── Envío de correo vía EmailJS ──
   REQUISITO: crea cuenta gratis en emailjs.com,
   reemplaza los 3 valores de abajo con los tuyos ── */

const EMAILJS_SERVICE_ID  = "TU_SERVICE_ID";   // ← lo obtienes en emailjs.com
const EMAILJS_TEMPLATE_ID = "TU_TEMPLATE_ID";  // ← lo obtienes en emailjs.com
const EMAILJS_PUBLIC_KEY  = "TU_PUBLIC_KEY";   // ← lo obtienes en emailjs.com

function sendAlertEmail(productName, stock, toEmail){

    if(!toEmail){
        alert("Este producto no tiene correo de alerta configurado.");
        return;
    }

    /* Si EmailJS no está cargado, usa mailto como respaldo */
    if(typeof emailjs === "undefined"){
        const subject = encodeURIComponent(`⚠️ Stock bajo: ${productName}`);
        const body    = encodeURIComponent(`El producto "${productName}" tiene solo ${stock} unidades.\n\n— Taller App`);
        window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`);
        return;
    }

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email    : toEmail,
        product_name: productName,
        stock_count : stock
    }, EMAILJS_PUBLIC_KEY)
    .then(()=>{ alert(`✅ Alerta enviada a ${toEmail}`); })
    .catch(()=>{ alert("Error al enviar. Revisa tu configuración de EmailJS."); });
}

/* ── Guardar producto ── */

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

/* ── Crear tarjeta ── */

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
    }

    updateInventoryStats();
}

/* ── Actualizar stock en tarjeta ── */

function refreshCardStock(card, stock){
    const isLow      = stock < LOW_STOCK_THRESHOLD;
    const alertEmail = card.dataset.alertEmail || "";
    const name       = card.querySelector(".inv-name").textContent;

    card.querySelector(".stock-display").textContent = stock;

    const badge = card.querySelector(".inv-badge");
    badge.className   = `inv-badge ${isLow ? "low" : ""}`;
    badge.textContent = `${isLow ? "⚠️" : "✓"} ${stock} uds`;

    if(isLow){ card.classList.add("low-stock-card"); }
    else      { card.classList.remove("low-stock-card"); }

    if(stock === LOW_STOCK_THRESHOLD - 1){
        fireNotification(name, stock);
        showAlertBanner(name, stock, alertEmail);
    }
    if(stock === 0){
        showAlertBanner(`${name} — SIN STOCK`, 0, alertEmail);
        fireNotification(`${name} — SIN STOCK`, 0);
    }

    updateInventoryStats();
}

/* ── Actualizar contadores ── */

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
        if(!dot){ const d=document.createElement("span"); d.className="nav-low-stock-dot"; navInv.appendChild(d); }
    } else {
        navInv.classList.remove("inventory-alert");
        if(dot) dot.remove();
    }
}

/* ── Buscador ── */

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
   SISTEMA DE NOTIFICACIONES Y ACTIVIDAD
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
    if("Notification" in window && Notification.permission === "granted"){
        new Notification("🔔 " + title + " — Taller App", { body: message });
    }
}

function addActivity(iconKey, title, subtitle){
    const list = document.querySelector(".activity-list");
    if(!list) return;
    const ts = Date.now();
    const item = document.createElement("div");
    item.className = "activity-item grouped-item";
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
}

setInterval(()=>{
    document.querySelectorAll(".activity-item[data-time]").forEach(item => {
        const t = item.querySelector(".time");
        if(t) t.textContent = getTimeAgo(parseInt(item.dataset.time));
    });
}, 30000);