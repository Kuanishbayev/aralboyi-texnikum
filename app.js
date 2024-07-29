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
    ism: String,
    familiya: String,
    otasiningIsmi: String,
    tugilganSanasi: String,
    telefonRaqami: String,
    qoshimchaRaqam: String,
    pasportSeriyaRaqami: String,
    dtmTestBali: String,
    yonalish: String,
    talimTuri: String
});

const User = mongoose.model('User', UserSchema);

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Assalomu alaykum! Ushbu bot orqali texnikumga hujjat topshirishingiz mumkin. \nЗдравствуйте! Через этот бот вы можете подать документы в техникум.', {
        reply_markup: {
            keyboard: [
                [{ text: '📄 Hujjat topshirish / Подать документы' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
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
    switch (step) {
        case 0:
            userStates[chatId].ism = text;
            break;
        case 1:
            userStates[chatId].familiya = text;
            break;
        case 2:
            userStates[chatId].otasiningIsmi = text;
            break;
        case 3:
            userStates[chatId].tugilganSanasi = text;
            break;
        case 4:
            userStates[chatId].telefonRaqami = text;
            break;
        case 5:
            userStates[chatId].qoshimchaRaqam = text;
            break;
        case 6:
            userStates[chatId].pasportSeriyaRaqami = text;
            break;
        case 7:
            userStates[chatId].dtmTestBali = text;
            break;
        case 8:
            userStates[chatId].yonalish = text;
            break;
        case 9:
            userStates[chatId].talimTuri = text;
            break;
        case 10:
            if (text.toLowerCase() === 'ha' || text.toLowerCase() === 'да') {
                try {
                    const userData = new User(userStates[chatId]);
                    await userData.save();
                    bot.sendMessage(chatId, 'Ma\'lumotlaringiz saqlandi. \nВаши данные сохранены.');
                    showMainMenu(chatId);
                } catch (error) {
                    console.error('Ma\'lumotlarni saqlashda xatolik:', error);
                    bot.sendMessage(chatId, 'Ma\'lumotlaringizni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring. \nОшибка при сохранении данных. Пожалуйста, попробуйте снова.');
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
    bot.sendMessage(chatId, 'Menyu: \nМеню:', {
        reply_markup: {
            keyboard: [
                [{ text: '📄 Hujjat topshirish / Подать документы' }]
                [{ text: "🏫 Texnikum haqida / О техникуме" }],
                [{ text: "📞 Call Center raqami / Номер Call Center" }],
                [{ text: "📍 Joylashgan joy locatsiyasi / Локация" }],
                [{ text: "📊 Qabul kvotalari / Квоты на прием" }],
                [{ text: "📜 Listsenziya / Лицензия" }]
            ],
            resize_keyboard: true
        }
    });
}
bot.onText(/🏫 Texnikum haqida|О техникуме/, (msg) => {
    const chatId = msg.chat.id;
    const aboutInfo = `
Texnikum haqida ma'lumot... 

Информация о техникуме...

Orolbo’yi tibbiyot va transport texnikumi Qoraqalpog'iston Respublikasida birinchilardan bo'lib faoliyat boshlagan eng innovatsion texnukum-nodavlat professional ta'lim muassasasi hisoblanadi. Texnikum 2024-yil 21-iyulidan boshlab O’zbekiston Respublikasi Oliy ta’lim fan va innovatsiyalar vazirligining №325347-litsenziya asosida ish boshladi. Hozirgi kunga kelib 500 ga yaqin talabalar o’qishga qabul qilingan bo’lib, 20 ga yaqin professor–o’qituvchilar va ilmiy salohiyatga ega o’qituvchilar ta’lim-tarbiya berib kelmoqda. Texnikum professional ta’lim muassasasi sifatida litsenziyaga ega bo‘lgan va dunyoning yetakchi institute va universitetlari bilan hamkorlikda faoliyat olib borish, ta’lim jarayoniga xorijiy professor-o‘qituvchilarni jalb qilishni rejalashtirgan. Texnikum ta’lim tizimida o‘z yo‘nalishini yaratib, innovatsion ta’lim asosida zamonaviy bilimga ega yuqori malakali, professional lider kadrlar tayyorlash va ularni jamiyatga implementatsiya qilishni maqsad qilgan. Texnikumda ta’lim jarayonlari eng qulay sharoitlarda, zamonaviy metodlar asosida kunduzgi, kechki, sirtqi va dual shakllarda olib boriladi. Texnikum yosh avlodga g'amxo'rlik qilish, sog'lom, barkamol shaxsni tarbiyalashga intilish kabi Qoraqalpoq xalqining milliy xarakterining xususiyatlaridan kelib chiqib, shu bilan birga ilg’or ta’lim texnologiyalariga asoslangan yuqori sifatli pedagogik kadrlar tayyorlashni o’z oldiga maqsad qilib qo’ygan. Texnikum mehnat jamoasi zamon bilan hamnafas boʼlib, mamlakatimizning taʼlim tizimida olib borilayotgan islohotlar va oʼzgarishlarning barcha talablarga oʼz vaqtida va toʼlaqonli javob berishga harakat qilmoqda. Texnikumda o'quv jarayoni "Ta'lim to'g'risida"gi qonun, ta'lim yo'nalishlariga muvofiq "Davlat ta'lim standarti" va "Malaka talablari" asosida amalga oshiriladi. Hozirgi kunda oʼquv jarayonini yuqori sifatini taʼminlash va ilmiy-tadqiqot ishlarini olib borish uchun maʼruza zallari, oʼquv xonalari eng zamonaviy axborot bazaviy texnologiyalari, multimediya proektorlari, video va audio tizimlari orqali oʼqitish bilan taʼminlangan. Oʼquv jarayoni Texnikumda oʼqitiladigan barcha fanlar boʼyicha elektron oʼquv va uslubiy materiallarni oʼz ichiga qamrab olgan elektron va kredit modulli oʼquv tizimidan foydalangan holda zamonaviy axborot-kommunikatsiya Internet texnologiyalar orqali amalga oshirilmoqda. Yaratilgan shart-sharoitlar oʼquv jarayoni jahon taʼlim standartlariga javob beradigan yuqori darajada olib borishga imkoniyat bermoqda. Texnikumda o‘quv jarayoni ingliz va qoraqalpoq tilida olib boriladi. Ingliz tili bo’yicha texnikum o’quvchilari uchun bepul kurs tashkil etiladi. O’quvchilarning ta’lim olishiga qulaylik yaratish va ularni rag’batlantirish maqsadida kelajakda transport yo’lga qoyiladi va dars jarayonida Kofe brek bilan bepul ta’minlanadi.
    `;
    bot.sendMessage(chatId, aboutInfo);
});

bot.onText(/📞 Call Center raqami|Номер Call Center/, (msg) => {
    const chatId = msg.chat.id;
    const callCenterNumbers = `
Call Center raqami: +998 71 123 45 67 

Номер Call Center: +998 71 123 45 67
    `;
    bot.sendMessage(chatId, callCenterNumbers);
});

bot.onText(/📍 Joylashgan joy locatsiyasi|Локация/, (msg) => {
    const chatId = msg.chat.id;
    const googleMapsLink = 'https://maps.app.goo.gl/p5Z8urZjWeBDMZzJ8';
    const locationMessage = `
Texnikum joylashgan joy: 

Локация техникума: 

[Google Maps](${googleMapsLink})
    `;
    bot.sendMessage(chatId, locationMessage, { parse_mode: 'Markdown' });
});

bot.onText(/📊 Qabul kvotalari|Квоты на прием/, (msg) => {
    const chatId = msg.chat.id;
    const quotaInfo = `
Qabul kvotalari haqida ma'lumot... 

Информация о квотах на прием...
    `;
    bot.sendMessage(chatId, quotaInfo);
});// Sertifikat komandasini yozamiz
bot.onText(/📜 Listsenziya|Лицензия/, (msg) => {
    const chatId = msg.chat.id;
    const photoUrl = encodeURI('https://server3.ahost.uz:2083/cpsess7427038251/viewer/home%2faralboyi/Sertifikat.jpg'); // URL to'g'riligini tekshiring

    const message = `
Texnikumning litsenziyasi...

Лицензия техникума...
    `;

    bot.sendPhoto(chatId, photoUrl, { caption: message }).catch((error) => {
        console.error('Error sending photo:', error);
        bot.sendMessage(chatId, 'Rasmni yuborishda xatolik yuz berdi.');
    });
});




// Additional contact numbers
const additionalContactNumbers = `
77 - 104 -00 - 12, 
77 - 105 -00 - 12, 
77 - 106 -00 - 12
`;
bot.onText(/Additional Contact Numbers/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, additionalContactNumbers);
});

bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === '/admin get_excel') {
        try {
            const users = await User.find({});
            const ws = XLSX.utils.json_to_sheet(users.map(user => user.toObject()));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Users');
            XLSX.writeFile(wb, 'users.xlsx');
            bot.sendDocument(chatId, 'users.xlsx');
        } catch (error) {
            console.error('Excel faylini yaratishda xatolik:', error);
            bot.sendMessage(chatId, 'Excel faylini yaratishda xatolik yuz berdi. \nОшибка при создании файла Excel.');
        }
    }
});

bot.on('polling_error', (error) => {
    console.log(error);
});

console.log('Bot ishga tushdi');
