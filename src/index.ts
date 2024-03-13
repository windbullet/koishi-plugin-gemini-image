import { Context, Schema, h } from 'koishi'

export const name = 'gemini-image'

export const usage = '识图功能需要 server.temp 服务  \n官方 server-temp 插件需要公网IP，没有的话可以使用其他提供 server.temp 服务的插件'

export interface Custom {
  commandName: string
  prefix: string
}

export const Custom: Schema<Custom> = Schema.object({
  commandName: Schema.string()
    .description("指令名")
    .required(),
  prefix: Schema.string()
    .description("传递给AI消息时添加的前缀文本")
    .required()
})

export interface Config {
  forbiddenWords: string[]
  thinkingMessage: string
  custom: Custom[]
}

export const Config: Schema<Config> = Schema.object({
  forbiddenWords: Schema.array(Schema.string())
    .description("违禁词列表，消息包含违禁词时拒绝响应（大小写不敏感）"),
  custom: Schema.array(Custom)
    .description("自定义指令，可设置通过该指令传递给AI消息时添加的前缀文本"),
  thinkingMessage: Schema.string()
    .description("等待AI回复时发送的提示消息，留空则关闭提示")
    .default("思考中......")
})

export const inject  = {optional: ["server.temp"]}

export function apply(ctx: Context, config: Config) {
  ctx.command('geminichat <message:text>', '与 gemini 对话')
    .usage('选项请写在最前面，不然会被当成文本消息的一部分')
    .option('image', '-i <image:image> 传递给AI的图片')
    .action(async ({ session, options }, message) => {
      for (let word of config.forbiddenWords) {
        if (message.toLowerCase().includes(word.toLowerCase())) {
          return "消息包含违禁词"
        }
      }

      let url = `https://api.lolimi.cn/API/AI/gemini.php?msg=${message}`

      if (options.image) {
        let temp = ctx.get('server.temp')
        if (!temp) {
          ctx.logger.warn('server.temp 服务未加载，无法使用图片识别')
          return "server.temp 服务未加载，无法使用图片识别"
        }
        let entry = await temp.create(options.image.src)
        url += `&img=${entry.url}`
        entry?.dispose?.()
      }


      if (config.thinkingMessage) {
        session.send(config.thinkingMessage)
      }
      let res = await ctx.http.get(url)

      if (res.code === 200) {
        return res.data.output
      } else {
        ctx.logger.warn(`API 请求错误: ${res.code}`)
        return `API 请求错误: ${res.code}`
      }

    })

  for (let custom of config.custom) {
    ctx.command(`${custom.commandName} <message:text>`, "与 gemini 对话")
      .usage('选项请写在最前面，不然会被当成文本消息的一部分')
      .option('image', '-i <image:image> 传递给AI的图片')
      .action(async ({ session, options }, message) => {
        for (let word of config.forbiddenWords) {
          if (message.toLowerCase().includes(word.toLowerCase())) {
            return "消息包含违禁词"
          }
        }
  
        let url = `https://api.lolimi.cn/API/AI/gemini.php?msg=${custom.prefix + message}`
  
        if (options.image) {
          let temp = ctx.get('server.temp')
          if (!temp) {
            ctx.logger.warn('server.temp 服务未加载，无法使用图片识别')
            return "server.temp 服务未加载，无法使用图片识别"
          }
          let entry = await temp.create(options.image.src)
          url += `&img=${entry.url}`
          entry?.dispose?.()
        }
  
  
        if (config.thinkingMessage) {
          session.send(config.thinkingMessage)
        }
        let res = await ctx.http.get(url)
  
        if (res.code === 200) {
          return res.data.output
        } else {
          ctx.logger.warn(`API 请求错误: ${res.code}`)
          return `API 请求错误: ${res.code}`
        }
      })
  }
}
