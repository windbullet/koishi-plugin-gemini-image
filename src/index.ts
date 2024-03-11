import { Context, Schema, h } from 'koishi'

export const name = 'gemini-image'

export const usage = '识图功能需要 server.temp 服务  \n官方 server-temp 插件需要公网IP，没有的话可以使用其他提供 server.temp 服务的插件'

export interface Config {
  forbiddenWords: string[]
  prefix: string
}

export const Config: Schema<Config> = Schema.object({
  forbiddenWords: Schema.array(Schema.string())
    .description("违禁词列表，消息包含违禁词时拒绝响应（大小写不敏感）"),
  prefix: Schema.string()
    .description("传递给AI消息时添加的前缀文本")
    .default(""),
})

export const inject  = {optional: ["server.temp"]}

export function apply(ctx: Context, config: Config) {
  ctx.command('gemini <message:text>', '与 gemini 对话')
    .usage('')
    .option('image', '-i <image:image> 传递给AI的图片')
    .action(async ({ session, options }, message, image) => {
      for (let word of config.forbiddenWords) {
        if (message.toLowerCase().includes(word.toLowerCase())) {
          return "消息包含违禁词"
        }
      }

      let url = `https://api.lolimi.cn/API/AI/gemini.php?msg=${config.prefix + message}`

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

      session.send("思考中......")
      let res = await ctx.http.get(url)

      if (res.code === 200) {
        return res.data.output
      } else {
        ctx.logger.warn(`API 请求错误: ${res.code}`)
        return `API 请求错误: ${res.code}`
      }

    })
}
