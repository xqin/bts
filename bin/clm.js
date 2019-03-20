#!/usr/bin/env node
const Table = require('cli-table-cjk')
const convertBytesToHumanReadable = require('human-readable-bytes').default
const byte2string = (bytes) => convertBytesToHumanReadable(bytes, 1024, 2, true)
const http = require('request').defaults({
  json: true,
  headers: {
    'User-Agent': 'clm cli'
  }
})

const callback = (resolve) => (e, res, body) => resolve(body)
const get = (url, options) => new Promise((resolve) => http.get(url, options, callback(resolve)))

module.exports = (search) => {
  if ((Array.isArray(search) === false) || (search.length < 1)) {
    return console.log('请输入要搜索的关键字!!!')
  }

  let results = []

  const print = () => {
    Promise.resolve((() => {
      if (results.length < 1) {
        return 'Not Found'
      }

      const table = new Table({
        head: ['Title', 'Download Url', 'Size', 'Files'],
        colWidths: [25, 70, 14, 10]
      })

      table.push.apply(table, results)

      return table.toString()
    })())
    .then(console.log.bind(console)).then(process.exit)
  }

  process.on('SIGINT', print)

  ;(function bootstrap (url) {
    console.log('request ', url)
    return get(url).then((body) => {
      if (!body || body.status !== 'ok' || !body.data || !body.data.result || Array.isArray(body.data.result.content) === false) {
        return
      }

      body.data.result.content.forEach((item) => {
        if (typeof item === 'string') {
          return
        }

        const {
          title, // 标题
          infohash, // 磁力
          shorturl, // 百度盘 短连接
          shareid,  // 百度盘 分享id
          uk,
          content_size, // 文件大小
          file_count,  // 文件数
        } = item

        let url = ''

        if (infohash) {
          url = `magnet:?xt=urn:btih:${infohash}`
        } else if (shorturl) {
          url = `https://pan.baidu.com/s/${shorturl}`
        } else if (shareid && uk) {
          url = `https://pan.baidu.com/share/link?uk=${uk}&shareid=${shareid}`
        } else { // 否则 忽略本条结果
          return
        }

        results.push([title, url, byte2string(content_size), file_count])
      })
    })
  })(`https://www.cilimao.cc/api/search?size=10&sortDirections=desc&word=${encodeURIComponent(search.join(' '))}`).then(print)
}


if (require.main === module) {
  module.exports(process.argv.slice(2))
}
