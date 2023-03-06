require("dotenv").config();
const { askChatGPT } = require('./askChatGpt');
const { getInvoice } = require('./getInvoice');
const { Telegraf } = require('telegraf');
const { userCRUD } = require('./UserCRUD');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true))

bot.on('message', async (ctx) => {
  const { text, from, successful_payment } = ctx.update.message
  const { id } = from

  if (text === '/start') {
    await userCRUD.createUserById(id)

    await ctx.reply('Привет! Можешь задавать любой интересующий тебя вопрос!')

    return
  }

  if (successful_payment) {
    const user = await userCRUD.getUserById(id)

    user.updateLastPayment()

    await userCRUD.updateUser(user)
    
    return ctx.reply("Оплата прошла успешно!")
  }

  ctx.sendChatAction('typing')
  const interval = setInterval(() => {
    ctx.sendChatAction('typing')
  }, 5000)

  const user = await userCRUD.getUserById(id)

  if (!user) {
    clearInterval(interval)
    return await ctx.reply('Нужно перезапустить бота, отправьте текст "/start"')
  }

  if (!user.hasAccess()) {
    clearInterval(interval)
    return ctx.replyWithInvoice(getInvoice(ctx.from.id))
  }

  user.trialMessageCount -= 1

  await userCRUD.updateUser(user)

  const response = await askChatGPT(text)

  clearInterval(interval)

  await ctx.reply(response)
})

bot.launch()


// ctx.sendChatAction('typing')
// interval = setInterval(() => {
//   if (isPending) {
//     ctx.sendChatAction('typing')
//   } else {
//     clearInterval(interval)
//   }
// }, 1000)