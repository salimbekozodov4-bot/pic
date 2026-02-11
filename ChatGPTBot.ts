/**
 * Groq Bot Example for Nexus Messenger
 * 
 * Bu bot GROQ API orqali foydalanuvchilar bilan muloqot qiladi.
 * ✅ PULSIZ va TEZKOR! (OpenAI dan bepul)
 * Kontekstni (xabarlar tarixini) saqlash imkoniyatiga ega.
 * 
 * ⚙️ .env fayliga qo'shish:
 * VITE_BOT_TOKEN=h4cHPlTjZpM7m.OEY20Q95IFrUlWyKrko
 * VITE_GROQ_API_KEY=gsk_YOUR_GROQ_KEY_HERE
 * 
 * 📌 GROQ KEY OLING (PULSIZ):
 * https://console.groq.com/keys
 */

// 1. Bot sozlamalari
const BOT_TOKEN =  "h4cHPlTjZpM7m.OEY20Q95IFrUlWyKrko";
const GROQ_API_KEY = "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"; // .env dan almashtiring

// 2. Botni ro'yxatdan o'tkazish
registerBot(BOT_TOKEN, async (message, userId, user) => {
    // Buyruqlarni tekshirish
    if (message.toLowerCase() === '/clear') {
        await storage.delete(`history_${userId}`);
        return { text: "♻️ Suhbat tarixi tozalandi. Yangi suhbatni boshlashingiz mumkin!" };
    }

    if (message.toLowerCase() === '/start') {
        return {
            text: `Salom **${user.name}**! 👋\n\nMen Groq botman (pulsiz AI 🚀). Menga xohlagan savolingizni berishingiz mumkin.\n\n📚 **Buyruqlar:**\n/clear - Suhbat tarixini tozalash\n/help - Yordam`,
            actions: [
                { label: "Savol berish", action: "Qandaysiz?" },
                { label: "Tarixni tozalash", action: "/clear" }
            ]
        };
    }

    try {
        // API Key tekshiruvi
        if (!GROQ_API_KEY || !GROQ_API_KEY.startsWith("gsk_")) {
            return { text: "🔑 Xatolik: Groq API Kaliti noto'g'ri o'rnatilgan.\n\n✅ .env da qo'shish:\nVITE_GROQ_API_KEY=gsk_YOUR_KEY\n\n📌 Pulsiz key: https://console.groq.com/keys" };
        }

        // Suhbat tarixini yuklash (kontekst uchun)
        let history = await storage.get(`history_${userId}`) || [];

        // Yangi xabarni qo'shish
        history.push({ role: "user", content: message });

        // Faqat oxirgi 15 ta xabarni yuboramiz (token tejash va limit uchun)
        const contextMessages = history.slice(-15);

        // GROQ ga so'rov yuborish
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "Siz Nexus Messenger ichidagi aqlli va foydali yordamchisiz. Ismingiz Groq Bot. Foydalanuvchilarga o'zbek tilida, do'stona va aniq javob bering. Qisqa va tushunarli javoblar ber."
                    },
                    ...contextMessages
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Groq API Error:", errorData);
            
            const errorMessage = errorData.error?.message || "Noma'lum xatolik";
            
            // Agar API key xato bo'lsa:
            if (errorMessage.includes("invalid_api_key") || errorMessage.includes("Invalid API key")) {
                return { text: "🔑 Xatolik: Groq API Kaliti noto'g'ri.\n\n✅ Yangi key: https://console.groq.com/keys (PULSIZ!)" };
            }
            
            // Agar quota tugagan bo'lsa:
            if (errorMessage.includes("rate_limit") || errorMessage.includes("quota")) {
                return { text: "⏳ Xatolik: Groq limit tugada. 1 minutni kuting va qayta urinib ko'ring." };
            }
            
            return { text: `❌ Groq Xatolik: ${errorMessage}` };
        }

        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content || "Javob olib kelish imkonsiz bo'ldi.";

        // Javobni tarixga saqlash
        history.push({ role: "assistant", content: aiReply });
        await storage.set(`history_${userId}`, history);

        return {
            text: aiReply,
            actions: [
                { label: "Tarixni tozalash 🗑️", action: "/clear" }
            ]
        };

    } catch (err) {
        console.error("Bot Handler Error:", err);
        return { text: `⚠️ Xatolik: ${err?.message || "Noma'lum xatolik yuz berdi"}` };
    }
});
