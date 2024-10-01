require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Замените 'YOUR_TELEGRAM_BOT_TOKEN' на токен вашего бота
const token = process.env.token;
const bot = new TelegramBot(token, { polling: true });

// Подключение к базе данных


const db = new sqlite3.Database('bot_database.db');

// Создание таблиц
db.serialize(() => {
    // Создание таблицы пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER UNIQUE,
        user_role TEXT,
        region TEXT,
        area TEXT,
        additional_info TEXT
    )`);

    // Создание таблицы объявлений
    db.run(`CREATE TABLE IF NOT EXISTS advertisements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        cashback TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT,
        photo TEXT NOT NULL,
        visibility TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(chat_id)
    )`);

    // Создание таблицы откликов
    db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER NOT NULL,
        buyer_chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        photo_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (offer_id) REFERENCES advertisements(id),
        FOREIGN KEY (buyer_chat_id) REFERENCES users(chat_id),
        FOREIGN KEY (user_id) REFERENCES users(chat_id)
    )`);
    
    db.run(`
    CREATE TABLE IF NOT EXISTS completed_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id INTEGER,
        orderPhoto TEXT,
        FOREIGN KEY (response_id) REFERENCES responses(id)
    )
`);

});

// if (regions[data]) {
//     users[chatId].region = data;
//     bot.sendMessage(chatId, 'Выберите вашу область:', {
//         reply_markup: {
//             inline_keyboard: regions[data].map(area => [{ text: area, callback_data: area }])
//         }
//     });
//     return;
// }

// else if (user.role === 'seller' && !user.ozon_id) {
//     user.ozon_id = text;
    // bot.sendMessage(chatId, 'Выберите ваш регион:', {
    //     reply_markup: {
    //         inline_keyboard: Object.keys(regions).map(region => [{ text: region, callback_data: region }])
    //     }
    // });
// } else if (user.role === 'buyer' && !user.bank) {
//     user.bank = text;
//     bot.sendMessage(chatId, 'Введите ваш ID Ozon:');
// } else if (user.role === 'buyer' && !user.ozon_id) {
//     user.ozon_id = text;
//     bot.sendMessage(chatId, 'Выберите ваш регион:', {
//         reply_markup: {
//             inline_keyboard: Object.keys(regions).map(region => [{ text: region, callback_data: region }])
//         }
//     });
// }


const regions = {
    'Москва-Запад': ['Запад Москвы и Московской области', 'Брянская область', 'Калужская область', 'Рязанская область', 'Смоленская область', 'Тульская область'],
    'Москва-Восток и Дальние регионы': ['Восток Москвы и Московской области', 'Архангельская область', 'Камчатский край', 'Магаданская область', 'Ненецкий автономный округ', 'Республика Коми', 'Республика Саха (Якутия)', 'Сахалинская область', 'Чукотский автономный округ', 'г. Норильск и Дудинка', 'Владимирская область', 'Ивановская область', 'Костромская область', 'Ярославская область', 'Тверская область', 'г. Салехард'],
    'Санкт-Петербург и СЗО': ['Вологодская область', 'Ленинградская область', 'Мурманская область', 'Новгородская область', 'Псковская область', 'Республика Карелия', 'г. Санкт-Петербург'],
    'Дон': ['Белгородская область', 'Волгоградская область', 'Воронежская область', 'Курская область', 'Липецкая область', 'Орловская область', 'Республика Крым', 'Ростовская область', 'г. Севастополь', 'Тамбовская область'],
    'Юг': ['Краснодарский край', 'Чеченская республика', 'Республика Адыгея', 'Республика Дагестан', 'Республика Ингушетия', 'Кабардино-Балкарская Республика', 'Карачаево-Черкесская Республика', 'Республика Калмыкия', 'Астраханская область', 'Ставропольский край', 'Республика Северная Осетия — Алания'],
    'Поволжье': ['Кировская область', 'Нижегородская область', 'Оренбургская область', 'Пензенская область', 'Республика Марий Эл', 'Республика Мордовия', 'Республика Татарстан', 'Самарская область', 'Саратовская область', 'Удмуртская Республика', 'Ульяновская область', 'Чувашская Республика'],
    'Урал': ['Курганская область', 'Пермский край', 'Свердловская область', 'Тюменская область', 'Ханты-Мансийский автономный округ - Югра', 'Челябинская область', 'Ямало-Ненецкий автономный округ'],
    'Сибирь': ['Алтайский край', 'Кемеровская область', 'Новосибирская область', 'Омская область', 'Красноярский край', 'Республика Алтай', 'Томская область', 'Забайкальский край', 'Иркутская область', 'Республика Хакасия', 'Республика Тыва', 'Республика Бурятия'],
    'Калининград': ['Калининградская область'],
    'Дальний Восток': ['Амурская область', 'Еврейская автономная область', 'Приморский край', 'Хабаровский край'],
    'Беларусь': ['Республика Беларусь'],
    'Казахстан': ['Республика Казахстан']
};

// Категории и регионы
const categories = [
    'Электроника', 'Одежда', 'Обувь', 'Дом и сад', 'Детские товары',
    'Красота и здоровье', 'Бытовая техника', 'Спорт и отдых', 'Строительство и ремонт',
    'Продукты питания', 'Аптека', 'Товары для животных', 'Книги', 'Туризм, рыбалка, охота',
    'Автотовары', 'Мебель', 'Хобби и творчество', 'Ювелирные украшения', 'Аксессуары',
    'Игры и консоли', 'Канцелярские товары', 'Товары для взрослых', 'Антиквариат и коллекционирование',
    'Цифровые товары', 'Бытовая химия и гигиена'
];

// const regions = [
//     'Москва-Запад', 'Москва-Восток', 'СПб-СЗО', 'Дон', 'Юг', 'Поволжье',
//     'Урал', 'Сибирь', 'Калининград', 'ДВосток', 'Беларусь', 'Казахстан'
// ];

const MAX_BUTTONS_PER_PAGE = 6;

function createBackButton(callbackData) {
    return [{ text: 'Назад', callback_data: callbackData }];
}

function createInlineButtons(items, prefix, page = 0, backCallbackData = null) {
    const buttons = items.slice(page * MAX_BUTTONS_PER_PAGE, (page + 1) * MAX_BUTTONS_PER_PAGE).map(item => {
        const callbackData = `${prefix}_${item}`.slice(0, 64); // Ensure callback_data is within the limit
        return [{ text: item, callback_data: callbackData }];
    });
    if ((page + 1) * MAX_BUTTONS_PER_PAGE < items.length) {
        buttons.push([{ text: 'Еще', callback_data: `${prefix}_more_${page + 1}`.slice(0, 64) }]);
    }
    if (backCallbackData) {
        buttons.push(createBackButton(backCallbackData));
    }
    return buttons;
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    db.get('SELECT * FROM users WHERE chat_id = ?', [chatId], (err, row) => {
        if (err) {
          console.error(err.message);
          bot.sendMessage(chatId, 'Произошла ошибка при обращении к базе данных.');
          return;
        }
        try {
            if (row) {
                // Парсим JSON из additional_info
                const additionalInfo = JSON.parse(row.additional_info);
                const role = JSON.parse(row.user_role)
                const buy = 'Покупатель'
                const sell = 'Селлер'
                // Извлекаем fullName из additionalInfo
                const name = additionalInfo.fullName;
                // Если chat_id существует, отправляем приветственное сообщение
                if (additionalInfo == '') {
                  bot.sendMessage(chatId, `К сожалению не получилось внести вас в базу`);
                } else if (additionalInfo != '' && role == '1') {
                 
                  const sellerOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'Разместить', callback_data: `place` },
                                { text: 'Размещенные', callback_data: 'placed' },
                                
                            ],
                            [{ text: 'Отклики', callback_data: 'view_feedbacks' }]
                        ]
                    }
                };
                  bot.sendMessage(chatId, `Добро пожаловать обратно ${name}`, sellerOptions);
                } else if (additionalInfo != '' && role == '2') {
                    db.all("PRAGMA table_info(advertisements)", (err, columns) => {
                        if (err) {
                            console.error("Ошибка при получении информации о таблице:", err.message);
                            return;
                        }
                        console.log("Столбцы таблицы:", columns.map(col => col));
                            if (row && row.region !== undefined) {
                                const offer = (row.region);
                                const buyerOptions = {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                { text: 'Выбрать категорию', callback_data: 'select_category' },
                                                { text: 'Все предложения', callback_data: 'all_offers' }
                                            ],
                                            [
                                                { text: 'Кабинет', callback_data: 'cabinet' }
                                            ]
                                        ]
                                    }
                                };
                                bot.sendMessage(chatId, `Добро пожаловать обратно ${name}\n Ваш регион ${offer}`, buyerOptions);
                            } else {
                              console.log('Строка не содержит поле region или row undefined');
                            }
                          });
                }
              } else {
                // Если chat_id не существует, добавляем его в базу данных и отправляем приветственное сообщение
                db.run('INSERT INTO users (chat_id) VALUES (?)', [chatId], (err) => {
                  if (err) {
                    console.error(err.message);
                    bot.sendMessage(chatId, 'Произошла ошибка при добавлении в базу данных.');
                    return;
                  }
          
                  const options = {
                      reply_markup: {
                          inline_keyboard: [
                              [
                                  { text: 'Селлер', callback_data: 'seller' },
                                  { text: 'Покупатель', callback_data: 'buyer' }
                              ]
                          ]
                      }
                  };
                  db.run(`INSERT OR IGNORE INTO users (chat_id) VALUES (?)`, [chatId], (err) => {
                      if (err) {
                          console.error('Error storing user info in the database', err);
                      } else {
                          bot.sendMessage(chatId, 'Выберите тип пользователя:', options);
                      }
                  });
                });
              }
        }catch(error) {
            console.log(error)
        }
        
      });
    });

    

bot.on('callback_query', (callbackQuery) => {
    // const chatId = message.chat.id;
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    // if (regions[data]) {
        
    // }

    
    if (data === 'seller') {
        bot.sendMessage(msg.chat.id, 'Введите ваши ФИО:');
        bot.once('message', (msg) => {
            const fullName = msg.text;
            bot.sendMessage(msg.chat.id, 'Введите ваш номер телефона:');
            bot.once('message', (msg) => {
                const phoneNumber = msg.text;
                bot.sendMessage(msg.chat.id, 'Введите ваш ID OZON:');
                bot.once('message', (msg) => {
                    const ozonId = msg.text;
                    bot.sendMessage(msg.chat.id, `Регистрация завершена.\nФИО: ${fullName}\nТелефон: ${phoneNumber}\nID OZON: ${ozonId}`);
                    // Сохраняем информацию о селлере в базу данных
                    db.run(`UPDATE users SET user_role = ?, additional_info = json(?) WHERE chat_id = ?`, ['1', JSON.stringify({
                        fullName,
                        phoneNumber,
                        ozonId,
                        advertisements: [],
                        completedOrders: []
                    }), msg.chat.id], (err) => {
                        if (err) {
                            console.error('Error storing seller info in the database', err);
                        } else {
                            const sellerOptions = {
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: 'Разместить', callback_data: 'place' },
                                            { text: 'Размещенные', callback_data: 'placed' }
                                        ]
                                    ]
                                }
                            };
                            bot.sendMessage(msg.chat.id, 'Выберите действие:', sellerOptions);
                        }
                    });
                });
            });
        });
    } else if (data === 'buyer') {
        bot.sendMessage(msg.chat.id, 'Введите ваши ФИО:');
        bot.once('message', (msg) => {
            const fullName = msg.text;
            bot.sendMessage(msg.chat.id, 'Введите ваш номер телефона:');
            bot.once('message', (msg) => {
                const phoneNumber = msg.text;
                bot.sendMessage(msg.chat.id, 'Введите ваш банк:');
                bot.once('message', (msg) => {
                    const bank = msg.text;
                    bot.sendMessage(msg.chat.id, 'Введите ваш ID OZON:');
                    bot.once('message', (msg) => {
                        const regionOptions = {
                            reply_markup: {
                                inline_keyboard: regions[data].map(area => [{ text: area, callback_data: area }])
                            }
                        }
                        const ozonId = msg.text;
                        bot.sendMessage(chatId, 'Выберите вашу область:', regionOptions);
                        
                        
                        // const regionOptions = {
                        //     reply_markup: {
                        //         inline_keyboard: createInlineButtons(regions, 'reg')
                        //     }
                        // };


                        // users[chatId].region = data;
                        bot.sendMessage(chatId, 'Выберите вашу область:', {
                            reply_markup: {
                                inline_keyboard: regions[data].map(area => [{ text: area, callback_data: area }])
                            }
                        });
                        // return;

                        // Сохраняем информацию о покупателе в базу данных
                        db.run(`UPDATE users SET user_role = ?, additional_info = json(?) WHERE chat_id = ?`, ['2', JSON.stringify({
                            fullName,
                            phoneNumber,
                            bank,
                            ozonId
                        }), msg.chat.id], (err) => {
                            if (err) {
                                console.error('Error storing buyer info in the database', err);
                            } else {
                                bot.sendMessage(msg.chat.id, `Регистрация завершена.\nФИО: ${fullName}\nТелефон: ${phoneNumber}\nБанк: ${bank}\nID OZON: ${ozonId}\nВыберите ваш регион:`, {
                                    reply_markup: {
                                        inline_keyboard: Object.keys(regions).map(region => [{ text: region, callback_data: region }])
                                    }
                                });
                            }
                        });
                    });
                });
            });
        });
    } else if (data.startsWith('reg_')) {
        const parts = data.split('_');
        const region = parts[1];
        
        if (region === 'more') {
            const page = parseInt(parts[2]);
            const regionOptions = {
                reply_markup: {
                    inline_keyboard: createInlineButtons(regions, 'reg', page)
                }
            };
            bot.editMessageReplyMarkup(regionOptions.reply_markup, { chat_id: msg.chat.id, message_id: msg.message_id });
        } else {
            db.run(`UPDATE users SET region = ? WHERE chat_id = ?`, [region, msg.chat.id], (err) => {
                if (err) {
                    console.error('Error updating region for user in database', err);
                } else {
                    bot.sendMessage(msg.chat.id, `Регистрация завершена. Вы выбрали регион: ${region}`);
                    const buyerOptions = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Выбрать категорию', callback_data: 'select_category' },
                                    { text: 'Все предложения', callback_data: 'all_offers' }
                                ],
                                [
                                    { text: 'Кабинет', callback_data: 'cabinet' }
                                ]
                            ]
                        }
                    };
                    bot.sendMessage(msg.chat.id, 'Выберите действие:', buyerOptions);
                }
            });
        }
} else if (data === 'select_category') {
const categoryOptions = {
    reply_markup: {
        inline_keyboard: createInlineButtons(categories, 'cat')
    }
};
bot.sendMessage(msg.chat.id, 'Выберите категорию:', categoryOptions);
} if (data.startsWith('cat_')) {
    const parts = data.split('_');
    const category = parts[1];
    
    if (category === 'more') {
        const page = parseInt(parts[2]);
        const categoryOptions = {
            reply_markup: {
                inline_keyboard: createInlineButtons(categories, 'cat', page)
            }
        };
        bot.editMessageReplyMarkup(categoryOptions.reply_markup, { chat_id: msg.chat.id, message_id: msg.message_id });
    } else {
        db.get('SELECT region FROM users WHERE chat_id = ?', [msg.chat.id], (err, row) => {
            if (err) {
                console.error('Error fetching user region from the database', err);
            } else {
                const userRegion = row ? row.region : null;
                db.all('SELECT * FROM advertisements WHERE category = ?', [category], (err, offers) => {
                    if (err) {
                        console.error('Error fetching advertisements from database', err);
                    } else if (offers.length === 0) {
                        bot.sendMessage(msg.chat.id, `Нет предложений в категории: ${category}`);
                    } else {
                        offers.forEach(offer => {
                            if (offer.visibility === 'global' || offer.region === userRegion) {
                                const offerOptions = {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: 'Откликнуться', callback_data: `respond_${offer.id}` }]
                                        ]
                                    }
                                };
                                bot.sendPhoto(msg.chat.id, offer.photo, {
                                    caption: `Категория: ${offer.category}\nРегион: ${offer.region}\nСумма кэшбека: ${offer.cashback}\nОписание: ${offer.description}\nКоличество человек: ${offer.quantity}`,
                                    offerOptions
                                });
                            }
                        });
                    }
                });
            }
        });
    }
} else if (data === 'place') {
const categoryOptions = {
    reply_markup: {
        inline_keyboard: createInlineButtons(categories, 'selcat')
    }
};
bot.sendMessage(msg.chat.id, 'Выберите категорию:', categoryOptions);
} else if (data.startsWith('selcat_')) {
    const parts = data.split('_');
    const category = parts[1];
    if (category === 'more') {
        const page = parseInt(parts[2]);
        const categoryOptions = {
            reply_markup: {
                inline_keyboard: createInlineButtons(categories, 'selcat', page)
            }
        };
        bot.editMessageReplyMarkup(categoryOptions.reply_markup, { chat_id: msg.chat.id, message_id: msg.message_id });
} else {
    const regionOptions = {
        reply_markup: {
            inline_keyboard: createInlineButtons(regions, `selreg_${category}`)
        }
    };
    bot.sendMessage(msg.chat.id, `Вы выбрали категорию: ${category}. Выберите регион:`, regionOptions);
}
} else if (data.startsWith('selreg_')) {
const parts = data.split('_');
const category = parts[1];
const region = parts[2];
if (region === 'more') {
    const page = parseInt(parts[3]);
    const regionOptions = {
        reply_markup: {
            inline_keyboard: createInlineButtons(regions, `selreg_${category}`, page)
        }
    };
    bot.editMessageReplyMarkup(regionOptions.reply_markup, { chat_id: msg.chat.id, message_id: msg.message_id });
} else {
    const visibilityOptions = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Только для вашего региона', callback_data: `local_${category}_${region}` },
                    { text: 'Для всех', callback_data: `global_${category}_${region}` }
                ]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, `Вы выбрали категорию: ${category} и регион: ${region}. Выберите видимость:`, visibilityOptions);
}
} else if (data.startsWith('local_') || data.startsWith('global_')) {
    const parts = data.split('_');
    const visibility = parts[0];
    const category = parts[1];
    const region = parts[2];
    const visibilityText = visibility === 'local' ? 'только для вашего региона' : 'для всех';
    bot.sendMessage(msg.chat.id, `Вы выбрали категорию: ${category}, регион: ${region} и видимость: ${visibilityText}`);
    bot.sendMessage(msg.chat.id, 'Отправьте фото товара:');
    bot.once('photo', (msg) => {
        const photo = msg.photo[msg.photo.length - 1].file_id;
        const sellerData = {
            chat_id: msg.chat.id,
            category: category,
            region: region,
            visibility: visibility,
            photo: photo,
            cashback: '',
            description: '',
            quantity: '',
            status: 'active' // Добавлено свойство статуса
        };
        bot.sendMessage(msg.chat.id, 'Введите сумму кэшбека:');
        bot.once('message', (msg) => {
            const cashback = msg.text;
            sellerData.cashback = cashback;
            bot.sendMessage(msg.chat.id, 'Введите описание товара:');
            bot.once('message', (msg) => {
                const description = msg.text;
                sellerData.description = description;
                bot.sendMessage(msg.chat.id, 'Введите количество человек:');
                bot.once('message', (msg) => {
                    const quantity = msg.text;
                    sellerData.quantity = quantity;
                    
                    // Сохраняем объявление в базу данных
                    db.run(`INSERT INTO advertisements (category, region, visibility, photo, cashback, description, quantity, user_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT chat_id FROM users WHERE chat_id = ?))`,
                            [sellerData.category, sellerData.region, sellerData.visibility, sellerData.photo, sellerData.cashback, sellerData.description, sellerData.quantity, sellerData.chat_id],
                            function(err) {
                                if (err) {
                                    console.error('Error storing advertisement in the database', err);
                                    return;
                                }
                                const adId = this.lastID; // ID только что добавленного объявления
                                // Сохраняем объявление в память
                                const advertisements = {
                                    all: [],
                                    byCategory: {},
                                    byRegion: {}
                                };
                                advertisements.all.push({ ...sellerData, id: adId });
                                if (!advertisements.byCategory[sellerData.category]) advertisements.byCategory[sellerData.category] = [];
                                advertisements.byCategory[sellerData.category].push({ ...sellerData, id: adId });
                                if (visibility === 'local') {
                                    if (!advertisements.byRegion[sellerData.region]) advertisements.byRegion[sellerData.region] = [];
                                    advertisements.byRegion[sellerData.region].push({ ...sellerData, id: adId });
                                }
                                bot.sendPhoto(msg.chat.id, sellerData.photo, {
                                    caption: `Категория: ${sellerData.category}\nРегион: ${sellerData.region}\nСумма кэшбека: ${sellerData.cashback}\nОписание: ${sellerData.description}\nКоличество человек: ${sellerData.quantity}\nВидимость: ${visibilityText}`
                                }).then(() => {
                                    const confirmationOptions = {
                                        reply_markup: {
                                            inline_keyboard: [
                                                [
                                                    { text: 'Опубликовать', callback_data: `publish_${sellerData.category}_${sellerData.region}_${sellerData.visibility}` },
                                                    { text: 'Исправить', callback_data: 'edit' }
                                                ]
                                            ]
                                        }
                                    };
                                    bot.sendMessage(msg.chat.id, 'Все верно?', confirmationOptions);
                                });
                            });
                });
            });
        });
    });
} else if (data.startsWith('publish_')) {
        const parts = data.split('_');
        const category = parts[1];
        const region = parts[2];
        const visibility = parts[3];
        const visibilityText = visibility === 'local' ? 'только для вашего региона' : 'для всех';
        // Обновляем статус объявления в базе данных
        db.run(`UPDATE advertisements SET status = 'published' WHERE category = ? AND region = ? AND visibility = ? AND user_id = (SELECT id FROM users WHERE chat_id = ?)`,
               [category, region, visibility, msg.chat.id], (err) => {
            if (err) {
                console.error('Error publishing advertisement in the database', err);
            } else {
                bot.sendMessage(msg.chat.id, `Ваш товар в категории "${category}" для региона "${region}" с видимостью "${visibilityText}" был успешно опубликован.`);
            }
        });
    } else if (data === 'all_offers') {
        // Получаем регион пользователя из базы данных
        db.get(`SELECT region FROM users WHERE chat_id = ?`, [msg.chat.id], (err, row) => {
            if (err) {
                console.error('Error fetching user region from the database', err);
            } else {
                const userRegion = row ? row.region : null;
                db.all(`SELECT * FROM advertisements WHERE visibility = 'global' OR region = ?`, [userRegion], (err, offers) => {
                    if (err) {
                        console.error('Error fetching offers from the database', err);
                    } else if (offers.length === 0) {
                        bot.sendMessage(msg.chat.id, `Нет предложений.`);
                    } else {
                        offers.forEach(offer => {
                            const offerOptions = {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: 'Откликнуться', callback_data: `respond_${offer.category}_${offer.region}_${offer.visibility}` }]
                                    ]
                                }
                            };
                            bot.sendPhoto(msg.chat.id, offer.photo, {
                                caption: `Категория: ${offer.category}\nРегион: ${offer.region}\nСумма кэшбека: ${offer.cashback}\nОписание: ${offer.description}\nКоличество человек: ${offer.quantity}`,
                                offerOptions
                            });
                        });
                    }
                });
            }
        });
    } else if (data === 'placed') {
        // Получаем объявления, созданные пользователем, из базы данных
        db.all(`SELECT * FROM advertisements WHERE user_id = (SELECT id FROM users WHERE chat_id = ?)`, [msg.chat.id], (err, ads) => {
            if (err) {
                console.error('Error fetching user advertisements from the database', err);
            } else if (ads.length > 0) {
                ads.forEach(ad => {
                    const adOptions = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Отклики', callback_data: `responses_${msg.chat.id}_${ad.category}_${ad.region}_${ad.visibility}` }],
                                [{ text: 'Просмотр', callback_data: `view_${msg.chat.id}_${ad.category}_${ad.region}_${ad.visibility}` }]
                            ]
                        }
                    };
                    bot.sendPhoto(msg.chat.id, ad.photo, {
                        caption: `Категория: ${ad.category}\nРегион: ${ad.region}\nСумма кэшбека: ${ad.cashback}\nОписание: ${ad.description}\nКоличество человек: ${ad.quantity}\nВидимость: ${ad.visibility === 'local' ? 'только для вашего региона' : 'для всех'}`,
                        ...adOptions
                    });
                });
            } else {
                bot.sendMessage(msg.chat.id, 'У вас нет размещенных объявлений.');
            }
        });
    } else if (data.startsWith('responses_')) {
        const parts = data.split('_');
        const sellerChatId = parseInt(parts[1], 10);
        const category = parts[2];
        const region = parts[3];
        const visibility = parts[4];
        const advertisementKey = `${category}_${region}_${visibility}`;
    
        // Получаем отклики на объявление из базы данных
        db.all(`
                SELECT responses.*, users.fullName, users.phoneNumber, users.bank, users.ozonId 
                FROM responses 
                INNER JOIN users ON responses.buyer_id = users.id 
                WHERE advert_id = (SELECT id FROM advertisements 
                                   WHERE category = ? AND region = ? AND visibility = ? AND user_id = (SELECT id FROM users WHERE chat_id = ?))`, 
               [category, region, visibility, sellerChatId], 
               (err, responses) => {
            if (err) {
                console.error('Error fetching responses from the database', err);
            } else {
                let responseMessage = `Отклики на ваше объявление:\n\n`;
                if (responses.length > 0) {
                    responses.forEach((response, index) => {
                        responseMessage += `Отклик ${index + 1}:\nФИО: ${response.fullName}\nТелефон: ${response.phoneNumber}\nБанк: ${response.bank}\nID OZON: ${response.ozonId}\n\n`;
                    });
                } else {
                    responseMessage += 'Откликов пока нет.';
                }
                bot.sendMessage(sellerChatId, responseMessage);
            }
        });
    } else if (data.startsWith('view_')) {
        const parts = data.split('_');
        const sellerChatId = parseInt(parts[1], 10);
        const category = parts[2];
        const region = parts[3];
        const visibility = parts[4];
        const advertisementKey = `${category}_${region}_${visibility}`;
    
        // Получаем отклики и завершенные заказы на объявление из базы данных
        db.all(`SELECT * FROM completed_orders 
                INNER JOIN responses ON completed_orders.response_id = responses.id 
                INNER JOIN users ON responses.buyer_id = users.id 
                WHERE responses.advert_id = (SELECT id FROM advertisements 
                                             WHERE category = ? AND region = ? AND visibility = ? AND user_id = (SELECT id FROM users WHERE chat_id = ?))`, 
               [category, region, visibility, sellerChatId], 
               (err, completedOrders) => {
            if (err) {
                console.error('Error fetching completed orders from the database', err);
            } else {
                let responseMessage = `Просмотр откликов по вашему объявлению:\n\n`;
                if (completedOrders.length > 0) {
                    completedOrders.forEach((order, index) => {
                        responseMessage += `Отклик ${index + 1}:\nФИО: ${order.fullName}\nТелефон: ${order.phoneNumber}\nБанк: ${order.bank}\nID OZON: ${order.ozonId}\n\n`;
                        bot.sendPhoto(sellerChatId, order.orderPhoto);
                    });
                } else {
                    responseMessage += 'Откликов пока нет.';
                }
                bot.sendMessage(sellerChatId, responseMessage);
            }
        });
    } 
    const sellers = {}; // To keep track of which seller to notify when feedback is received

    
bot.on('callback_query', (callbackQuery) => {
    const waitingForPhoto = {}
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data.startsWith('respond_')) {
        const offerId = data.split('_')[1];
        // Get the advertisement details
        db.get('SELECT * FROM advertisements WHERE id = ?', [offerId], (err, offer) => {
            if (err) {
                console.error('Error fetching advertisement from the database', err);
                bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении объявления.');
            } else if (!offer) {
                bot.sendMessage(msg.chat.id, 'Объявление не найдено.');
            } else {
                if (waitingForPhoto[msg.chat.id]) {
                    bot.sendMessage(msg.chat.id, 'Вы уже отправили фотографию. Пожалуйста, подождите.');
                } else {
                    waitingForPhoto[msg.chat.id] = true;
                    bot.sendMessage(msg.chat.id, 'Пришлите фотографию с отзывом1');
                    // Save state for the next photo message
                    bot.once('photo', (photoMsg) => {
                        const photoId = photoMsg.photo[photoMsg.photo.length - 1].file_id;
                        bot.sendMessage(msg.chat.id, 'Отзыв на проверки');
                        db.run('INSERT INTO feedbacks (offer_id, buyer_chat_id, user_id, photo_id, status) VALUES (?, ?, ?, ?, ?)', [offerId, msg.chat.id, offer.user_id, photoId, 'pending'], function(err) {
                            if (err) {
                                console.error('Error inserting feedback into database', err);
                            } else {
                                const feedbackId = this.lastID; // Получаем идентификатор отклика
                                bot.sendPhoto(offer.user_id, photoId, {
                                    caption: `На ваше объявление сделали отклик.`,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: 'Принять', callback_data: `accept_${feedbackId}` }],
                                            [{ text: 'Отклонить', callback_data: `reject_${feedbackId}` }]
                                        ]
                                    }
                                });
                            }
                            waitingForPhoto[msg.chat.id] = false; // Reset the flag after handling the photo
                        });
                    });
                }
            }
        });
    }
    //  else if (data.startsWith('accept_')) {
    //     const feedbackId = data.split('_')[1];
    //     db.get('SELECT * FROM feedbacks WHERE id = ?', [feedbackId], (err, feedback) => {
    //         if (err) {
    //             console.error('Error fetching feedback from database', err);
    //         } else {
    //             db.run('UPDATE advertisements SET quantity = quantity - 1 WHERE id = ? AND quantity > 0', [feedback.offer_id], function(err) {
    //                 if (err) {
    //                     console.error('Error updating advertisement quantity', err);
    //                 } else {
    //                     db.run('UPDATE feedbacks SET status = ? WHERE id = ?', ['accepted', feedbackId], (err) => {
    //                         if (err) {
    //                             console.error('Error updating feedback status', err);
    //                         } else {
    //                             bot.sendMessage(feedback.buyer_chat_id, 'Ваш отклик подтвержден');
    //                             // bot.sendMessage(feedback.)
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     });
    // }  
    else if (data.startsWith('accept_')) {
        const feedbackId = data.split('_')[1];
        db.get('SELECT * FROM feedbacks WHERE id = ?', [feedbackId], (err, feedback) => {
            if (err) {
                console.error('Error fetching feedback from database', err);
            } else {
                db.run('UPDATE advertisements SET quantity = quantity - 1 WHERE id = ? AND quantity > 0', [feedback.offer_id], function(err) {
                    if (err) {
                        console.error('Error updating advertisement quantity', err);
                    } else {
                        db.run('UPDATE feedbacks SET status = ? WHERE id = ?', ['accepted', feedbackId], (err) => {
                            if (err) {
                                console.error('Error updating feedback status', err);
                            } else {
                                bot.sendMessage(feedback.buyer_chat_id, 'Ваш отклик подтвержден');
                                // Get buyer info
                                db.get('SELECT additional_info FROM users WHERE chat_id = ?', [feedback.buyer_chat_id], (err, buyer) => {
                                    if (err) {
                                        console.error('Error fetching buyer information', err);
                                    } else {
                                        const buyerInfo = JSON.parse(buyer.additional_info);
                                        const { fullName, phoneNumber, bank } = buyerInfo;
                                        bot.sendMessage(feedback.user_id, `Информация о покупателе:\n\nИмя: ${fullName}\nТелефон: ${phoneNumber}\nБанк: ${bank}`);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    else if (data.startsWith('reject_')) {
        const feedbackId = data.split('_')[1];
        db.get('SELECT * FROM feedbacks WHERE id = ?', [feedbackId], (err, feedback) => {
            if (err) {
                console.error('Error fetching feedback from database', err);
            } else {
                db.run('UPDATE feedbacks SET status = ? WHERE id = ?', ['rejected', feedbackId], (err) => {
                    if (err) {
                        console.error('Error updating feedback status', err);
                    } else {
                        bot.sendMessage(feedback.buyer_chat_id, 'Ваш отклик отклонен');
                    }
                });
            }
        });
    } else if (data === 'view_feedbacks') {
        db.all('SELECT * FROM feedbacks WHERE user_id = ?', [msg.chat.id], (err, feedbacks) => {
            if (err) {
                console.error('Error fetching feedbacks from database', err);
            } else if (feedbacks.length === 0) {
                bot.sendMessage(msg.chat.id, 'У вас пока нет откликов.');
            } else {
                feedbacks.forEach(feedback => {
                    bot.sendPhoto(msg.chat.id, feedback.photo_id, {
                        caption: `Отклик от покупателя: ${feedback.buyer_chat_id}\nСтатус: ${feedback.status}\nПизда ${feedback.id}`,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Принять', callback_data: `accept_${feedback.id}` }],
                                [{ text: 'Отклонить', callback_data: `reject_${feedback.id}` }]
                            ]
                        }
                    });
                });
            }
        });
    }
    // Close the database connection
});

     if (data === 'cabinet') {
        // Получаем данные пользователя из базы данных
        db.get(`SELECT * FROM users WHERE chat_id = ?`, [msg.chat.id], (err, user) => {
            if (err) {
                console.error('Error fetching user data from the database', err);
            } else if (!user) {
                bot.sendMessage(msg.chat.id, 'Ваш кабинет пуст. Пожалуйста, создайте объявление.');
                return;
            } else {
                // Получаем отклики пользователя
                db.all(`SELECT responses.*, advertisements.category, advertisements.region, advertisements.visibility, advertisements.description, advertisements.photo
                        FROM responses 
                        INNER JOIN advertisements ON responses.advert_id = advertisements.id 
                        WHERE responses.buyer_id = ?`, 
                       [user.id], (err, userResponses) => {
                    if (err) {
                        console.error('Error fetching user responses from the database', err);
                    } else if (userResponses.length === 0) {
                        bot.sendMessage(msg.chat.id, 'У вас нет откликов.');
                    } else {
                        userResponses.forEach((response, index) => {
                            const responseOptions = {
                                reply_markup: {
                                    inline_keyboard: response.status === 'completed' ? [
                                        [{ text: 'Завершено', callback_data: 'completed', callback_game: true }]
                                    ] : [
                                        [{ text: 'Завершить', callback_data: `complete_${response.category}_${response.region}_${response.visibility}_${msg.chat.id}` }]
                                    ]
                                }
                            };
                            bot.sendPhoto(msg.chat.id, response.photo, {
                                caption: `Отклик ${index + 1}:\nКатегория: ${response.category}\nРегион: ${response.region}\nВидимость: ${response.visibility}\nОписание: ${response.description}`,
                                ...responseOptions
                            });
                        });
    
                        let responseMessage = '\nВаши активные объявления:\n\n';
                        db.all(`SELECT * FROM advertisements WHERE user_id = ? AND status != 'Завершено'`, [user.id], (err, activeAds) => {
                            if (err) {
                                console.error('Error fetching active ads from the database', err);
                            } else {
                                activeAds.forEach(ad => {
                                    responseMessage += `Категория: ${ad.category}\nРегион: ${ad.region}\nВидимость: ${ad.visibility}\nСтатус: Активно\n\n`;
                                });
    
                                responseMessage += '\nВаши завершенные объявления:\n\n';
                                db.all(`SELECT * FROM advertisements WHERE user_id = ? AND status = 'Завершено'`, [user.id], (err, completedAds) => {
                                    if (err) {
                                        console.error('Error fetching completed ads from the database', err);
                                    } else {
                                        completedAds.forEach(ad => {
                                            responseMessage += `Категория: ${ad.category}\nРегион: ${ad.region}\nВидимость: ${ad.visibility}\nСтатус: Завершено\n\n`;
                                        });
                                        bot.sendMessage(msg.chat.id, responseMessage);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    
    responseMessage += '\nВаши завершенные объявления:\n\n';
completedAds.forEach(ad => {
    responseMessage += `Категория: ${ad.category}\nРегион: ${ad.region}\nВидимость: ${ad.visibility}\nСтатус: Завершено\n\n`;
});
bot.sendMessage(msg.chat.id, responseMessage);
} else if (data.startsWith('complete_')) {
    const parts = data.split('_');
    const adKey = `${parts[1]}_${parts[2]}_${parts[3]}`;
    const buyerChatId = parseInt(parts[4], 10);
    
    // Получаем ID отклика из базы данных
    db.get(`SELECT responses.id AS responseId, advertisements.id AS adId FROM responses 
            INNER JOIN advertisements ON responses.advert_id = advertisements.id 
            WHERE advertisements.category = ? AND advertisements.region = ? 
            AND advertisements.visibility = ? AND responses.buyer_id = (SELECT id FROM users WHERE chat_id = ?)`, 
           [parts[1], parts[2], parts[3], buyerChatId], (err, row) => {
        if (err) {
            console.error('Error fetching response data from the database', err);
        } else if (row) {
            const responseId = row.responseId;
            const adId = row.adId;
            bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте фото заказа:');
            bot.once('photo', (msg) => {
                const orderPhoto = msg.photo[msg.photo.length - 1].file_id;
                
                // Сохраняем фото завершенного заказа и обновляем статус отклика в базе данных
                db.run(`INSERT INTO completed_orders (response_id, orderPhoto) VALUES (?, ?)`,
                       [responseId, orderPhoto], (err) => {
                    if (err) {
                        console.error('Error storing order photo in the database', err);
                    } else {
                        db.run(`UPDATE responses SET status = 'completed' WHERE id = ?`, [responseId], (err) => {
                            if (err) {
                                console.error('Error updating response status in the database', err);
                            } else {
                                // Уведомляем селлера о завершении заказа
                                db.get(`SELECT chat_id FROM users WHERE id = (SELECT user_id FROM advertisements WHERE id = ?)`, [adId], (err, seller) => {
                                    if (err) {
                                        console.error('Error fetching seller chat id from the database', err);
                                    } else if (seller) {
                                        bot.sendPhoto(seller.chat_id, orderPhoto, {
                                            caption: `Покупатель завершил заказ по вашему объявлению в категории "${parts[1]}" и регионе "${parts[2]}".`
                                        });
                                    }
                                });

                                const responseOptions = {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: 'Завершено', callback_data: `completed_${adKey}_${msg.chat.id}`, callback_game: true }]
                                        ]
                                    }
                                };
                                bot.sendMessage(msg.chat.id, 'Отклик завершен.', responseOptions);
                            }
                        });
                    }
                });
            });
        } else {
            bot.sendMessage(msg.chat.id, 'Отклик не найден.');
        }
    });
}
});


