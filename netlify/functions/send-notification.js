const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { userId, title, body } = JSON.parse(event.body);

        // Supabase con Service Role Key para leer suscripciones de cualquier usuario
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        const { data: subs, error } = await supabase
            .from("push_subscriptions")
            .select("subscription")
            .eq("user_id", userId);

        if (error || !subs?.length) {
            return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
        }

        const payload = JSON.stringify({ title, body, url: "./" });

        const results = await Promise.allSettled(
            subs.map(row => webpush.sendNotification(row.subscription, payload))
        );

        const sent = results.filter(r => r.status === "fulfilled").length;
        return { statusCode: 200, body: JSON.stringify({ sent }) };

    } catch(e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};