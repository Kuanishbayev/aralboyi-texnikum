const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

const token = '7487276376:AAHf1nLPI-Z03e9NoY8RVVAHtJNq4oZPhig';
const bot = new TelegramBot(token, { polling: true });

mongoose.connect('mongodb://localhost:27017/telegram_bot')
    .then(() => {
        console.log('MongoDBga muvaffaqiyatli ulandik');
    })
    .catch(err => {
        console.error('MongoDBga ulanishda xatolik:', err);
    });

const UserSchema = new mongoose.Schema({
    ism: { type: String, required: true },
    familiya: { type: String, required: true },
    otasiningIsmi: { type: String, required: true },
    tugilganSanasi: { type: String, required: true },
    telefonRaqami: { type: String, required: true },
    qoshimchaRaqam: { type: String, required: true },
    pasportSeriyaRaqami: { type: String, required: true },
    dtmTestBali: { type: String, required: true },
    yonalish: { type: String, required: true },
    talimTuri: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📄 Hujjat topshirish / Подать документы' }],
            [{ text: "🏫 Texnikum haqida / О техникуме" }],
            [{ text: "📞 Call Center raqami / Номер Call Center" }],
            [{ text: "📍 Joylashgan joy locatsiyasi / Локация" }],
            [{ text: "📊 Qabul kvotalari / Квоты на прием" }],
            [{ text: "📜 Listsenziya / Лицензия" }]
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Assalomu alaykum! Ushbu bot orqali texnikumga hujjat topshirishingiz mumkin. \nЗдравствуйте! Через этот бот вы можете подать документы в техникум.', mainMenuKeyboard);
});

let userStates = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === '📄 Hujjat topshirish / Подать документы') {
        userStates[chatId] = { step: 0 };
        bot.sendMessage(chatId, 'Ismingizni kiriting: \nВведите ваше имя:');
    } else if (userStates[chatId]) {
        handleUserResponse(chatId, msg.text);
    }
});

const steps = [
    'Ismingizni kiriting: (Masalan: Ali) \nВведите ваше имя: (Например: Али)',
    'Familiyangizni kiriting: (Masalan: Valiyev) \nВведите вашу фамилию: (Например: Вальев)',
    'Otasining ismini kiriting: (Masalan: Aliyevich) \nВведите отчество: (Например: Алиевич)',
    'Tug\'ilgan sanangizni kiriting (dd/mm/yyyy): (Masalan: 01/01/2000) \nВведите дату рождения (дд/мм/гггг): (Например: 01/01/2000)',
    'Telefon raqamingizni kiriting (+9989): (Masalan: +998901234567) \nВведите ваш номер телефона (+9989): (Например: +998901234567)',
    'Qo\'shimcha raqamni kiriting (+9989): (Masalan: +998901234567) \nВведите дополнительный номер (+9989): (Например: +998901234567)',
    'Pasport seriya va raqamini kiriting: (Masalan: AB1234567) \nВведите серию и номер паспорта: (Например: AB1234567)',
    'DTM Test bali (mavjud bo\'lsa): (Masalan: 189) \nВведите баллы теста ДТМ (если есть): (Например: 189)',
    'Yo\'nalishni tanlang: \nВыберите направление:',
    'Ta\'lim turini tanlang: \nВыберите форму обучения:',
    'Ma\'lumotlaringizni tasdiqlang va saqlang: \nПодтвердите и сохраните ваши данные:'
];

const yonalishlar = [
    'Hamshiralik ishi / Сестринское дело',
    'Stomatologiya ishi / Стоматология',
    'Markazlashtirish post operatori (temir yo\'l transporti) / Централизованный пост оператор (железнодорожный транспорт)'
];

const talimTurlari = [
    'Kunduzgi / Дневное',
    'Kechki / Вечернее',
    'Sirtqi (faqat Markazlashtirish post operatori uchun) / Заочное (только для Централизованный пост оператор)',
    'Dual (ishlab yurgan odamlar uchun) / Дуальная (для работающих людей)'
];

async function handleUserResponse(chatId, text) {
    const step = userStates[chatId].step;
    const fields = ['ism', 'familiya', 'otasiningIsmi', 'tugilganSanasi', 'telefonRaqami', 'qoshimchaRaqam', 'pasportSeriyaRaqami', 'dtmTestBali', 'yonalish', 'talimTuri'];

    if (step < 10) {
        userStates[chatId][fields[step]] = text;
    }

    if (step === 10) {
        console.log('Foydalanuvchi javobi:', text);
        if (text === 'Ha / Да' || text.toLowerCase() === 'да' || text.toLowerCase() === 'ha') {
            try {
                console.log('Saqlanayotgan ma\'lumotlar:', userStates[chatId]);

                const missingFields = fields.filter(field => !userStates[chatId][field]);
                if (missingFields.length > 0) {
                    console.log('Yetishmayotgan maydonlar:', missingFields);
                    throw new Error(`Quyidagi ma'lumotlar yetishmayapti: ${missingFields.join(', ')}`);
                }

                const userData = new User(userStates[chatId]);
                const savedUser = await userData.save();
                console.log('Saqlangan foydalanuvchi:', savedUser);
                bot.sendMessage(chatId, 'Ma\'lumotlaringiz saqlandi. \nВаши данные сохранены.');
                showMainMenu(chatId);
            } catch (error) {
                console.error('Ma\'lumotlarni saqlashda xatolik:', error);
                bot.sendMessage(chatId, `Ma\'lumotlaringizni saqlashda xatolik yuz berdi: ${error.message}. Iltimos, qayta urinib ko\'ring. \nОшибка при сохранении данных: ${error.message}. Пожалуйста, попробуйте снова.`);
            }
        } else {
            bot.sendMessage(chatId, 'Ma\'lumotlaringiz saqlanmadi. \nВаши данные не были сохранены.');
            showMainMenu(chatId);
        }
        delete userStates[chatId];
        return;
    }

    userStates[chatId].step++;

    if (step === 7) {
        bot.sendMessage(chatId, steps[userStates[chatId].step], {
            reply_markup: {
                keyboard: yonalishlar.map(y => [{ text: y }]),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (step === 8) {
        bot.sendMessage(chatId, steps[userStates[chatId].step], {
            reply_markup: {
                keyboard: talimTurlari.map(t => [{ text: t }]),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (step === 9) {
        bot.sendMessage(chatId, steps[userStates[chatId].step], {
            reply_markup: {
                keyboard: [
                    [{ text: 'Ha / Да' }],
                    [{ text: 'Yo\'q / Нет' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else {
        bot.sendMessage(chatId, steps[userStates[chatId].step]);
    }
}

function showMainMenu(chatId) {
    bot.sendMessage(chatId, 'Menyu: \nМеню:', mainMenuKeyboard);
}

bot.onText(/🏫 Texnikum haqida|О техникуме/, (msg) => {
    const chatId = msg.chat.id;
    const aboutInfo = `
Texnikum haqida ma'lumot... 
    `;
    bot.sendMessage(chatId, aboutInfo);
});

bot.onText(/📞 Call Center raqami|Номер Call Center/, (msg) => {
    const chatId = msg.chat.id;
    const callCenterInfo = `Texnikum Call Center raqami: +998901234567`;
    bot.sendMessage(chatId, callCenterInfo);
});

bot.onText(/📍 Joylashgan joy locatsiyasi|Локация/, (msg) => {
    const chatId = msg.chat.id;
    const locationInfo = `Texnikum joylashgan joy: Toshkent, O'zbekiston.`;
    bot.sendMessage(chatId, locationInfo);
});

bot.onText(/📊 Qabul kvotalari|Квоты на прием/, (msg) => {
    const chatId = msg.chat.id;
    const quotaInfo = `Texnikum qabul kvotalari haqida ma'lumot...`;
    bot.sendMessage(chatId, quotaInfo);
});

bot.onText(/📜 Listsenziya|Лицензия/, (msg) => {
    const chatId = msg.chat.id;
    const licenseInfo = `Texnikum litsenziyasi haqida ma'lumot...`;
    bot.sendMessage(chatId, licenseInfo);
});
