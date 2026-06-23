const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Se ejecuta todos los días a las 9am (hora Ciudad de México, UTC-6)
// Se ejecuta todos los días a las 9am (hora Ciudad de México, UTC-6)
// Se ejecuta todos los días a las 9am (hora Ciudad de México, UTC-6)
exports.handler = async () => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    // 1. Obtener todos los usuarios con suscripción push activa
    const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("user_id, subscription");

    if (subsError || !subs?.length) return;

    // Agrupar suscripciones por usuario
    const byUser = {};
    subs.forEach(s => {
        if (!byUser[s.user_id]) byUser[s.user_id] = [];
        byUser[s.user_id].push(s.subscription);
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const userId of Object.keys(byUser)) {

        const alertas = [];

        // 2. Tareas vencidas del usuario
        const { data: tasks } = await supabase
            .from("workshop_tasks")
            .select("title, vehicle, delivery, status")
            .eq("user_id", userId)
            .neq("status", "Completado");

        if (tasks?.length) {
            const vencidas = tasks.filter(t => {
                if (!t.delivery) return false;
                const fecha = new Date(t.delivery + "T00:00:00");
                return fecha < hoy;
            });
            if (vencidas.length > 0) {
                alertas.push({
                    title: "⏰ Tareas vencidas",
                    body: `${vencidas.length} tarea${vencidas.length !== 1 ? "s" : ""} sin completar: ${vencidas[0].title}${vencidas.length > 1 ? ` y ${vencidas.length - 1} más` : ""}`
                });
            }
        }

        // 3. Órdenes de compra pendientes
        const { data: orders } = await supabase
            .from("purchase_orders")
            .select("status")
            .eq("user_id", userId)
            .not("status", "in", '("Recibida","Cancelada")');

        if (orders?.length > 0) {
            alertas.push({
                title: "📦 Órdenes pendientes",
                body: `${orders.length} orden${orders.length !== 1 ? "es" : ""} de compra sin recibir`
            });
        }

        // 4. Facturas por cobrar
        const { data: invoices } = await supabase
            .from("invoices")
            .select("id")
            .eq("user_id", userId)
            .not("status", "in", '("Pagada","Cancelada")');

        if (invoices?.length > 0) {
            alertas.push({
                title: "💰 Facturas por cobrar",
                body: `${invoices.length} factura${invoices.length !== 1 ? "s" : ""} pendiente${invoices.length !== 1 ? "s" : ""} de pago`
            });
        }

        if (alertas.length === 0) continue;

        // 5. Enviar una notificación por alerta a cada suscripción del usuario
        for (const alerta of alertas) {
            const payload = JSON.stringify({
                title: alerta.title,
                body:  alerta.body,
                url:   "./"
            });
            await Promise.allSettled(
                byUser[userId].map(sub => webpush.sendNotification(sub, payload))
            );
            await new Promise(r => setTimeout(r, 300));
        }
    }
};