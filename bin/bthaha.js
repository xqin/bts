#!/usr/bin/env node
const Table = require('cli-table-cjk')
const wcwidth = require('wcwidth')
const convertBytesToHumanReadable = require('human-readable-bytes').default
const byte2string = (bytes) => convertBytesToHumanReadable(bytes, 1024, 2, true)
const http = require('request').defaults({
  headers: {
    'User-Agent': 'bts'
  }
})
const callback = (resolve) => (e, res, body) => resolve(body)
const get = (url, options) => new Promise((resolve) => http.get(url, options, callback(resolve)))
const post = (url, options) => new Promise((resolve) => http.post(url, options, callback(resolve)))
const getRegValue = (reg, data) => reg.test(data) && RegExp.$1
const getRegValus = (reg, data) => {
  const results = []

  let ret

  while ((ret = reg.exec(data)) !== null) {
    results.push(ret.slice(1))
  }

  return results
}

module.exports = (search) => {
  if ((Array.isArray(search) === false) || (search.length < 1)) {
    return console.log('请输入要搜索的关键字!!!')
  }

  // 如果参数只有一个, 且是全数字, 则代表要查询指定id所对应的相关数据
  if (search.length === 1 && /^\d+$/.test(search[0])) {
    get(`https://bthaha.men/api/json_info?hashes=${search[0]}`).then((html) => {
      if (!html) {
        return console.log('Not Found')
      }

      try {
        const { result } = JSON.parse(html)

        if (Array.isArray(result) && result.length > 0) {
          const table = new Table({
            head: ['Title', 'Value'],
            colWidths: [20, 100]
          })

          const {
            category, // 种子分类
            create_time, // 创建时间
            name, // 名称
            comment, // 备注?
            source_ip, // 上传者IP?
            info_hash, // 种子 hash
            requests, // 下载数?
            length, // 文件大小
            files, // 种子内文件及数量
            last_seen, // 最后访问时间
          } = result[0]

          table.push(['Category', category])
          table.push(['Creation Time', create_time])
          table.push(['Last Access Time', last_seen])
          table.push(['File Size', byte2string(length)])
          table.push(['Keywords', name])

          if (comment) {
            table.push(['Comment', comment])
          }

          if (source_ip) {
            table.push(['Source IP', source_ip])
          }

          table.push(['Total Requests', requests])
          table.push(['Magnet Link', `magnet:?xt=urn:btih:${info_hash}`])

          const size = (files && files.length) || 0
          table.push(['Total Files', size])
          if (size > 0) {
            files.forEach(({ path, length }) => {
              table.push(['', `${path} (${byte2string(length)})`])
            })
          }

          console.log(table.toString())
        } else {
          console.log('Not Found')
        }
      } catch (e) {
        console.log('Not Found', e)
      }
    })
    return
  }

  let results = []

  const print = () => {
    Promise.resolve((() => {
      if (results.length < 1) {
        return 'Not Found'
      }

      const table = new Table({
        head: ['Id', 'Title', 'Create Time', 'Memo'],
        colWidths: [10, 60, 20, 90]
      })

      table.push.apply(table, results)

      return table.toString()
    })())
    .then(console.log.bind(console)).then(process.exit)
  }

  process.on('SIGINT', print)

  ;(function bootstrap (url) {
    console.log('request ', url)
    return get(url).then((html) => {
      const links = getRegValus(/<td class="x-item">[\s\S]+?title="(.+?)".+?\/wiki\/(\d+)\.html"[\s\S]+?class="ctime">(.+?)<\/span>[\s\S]+?class="tail">\s*(.+?)\s*<\/div>\s+<\/td>/g, html)

      links.forEach(([title, id, ctime, tail]) => {
        results.push([id, title, ctime, tail])
      })

      const nextUrl = getRegValue(/href="\.(\/[^"]+)"> Next/, html)

      if (nextUrl) {
        return bootstrap(url.replace(/\/[^\/]*$/, nextUrl))
      }
    })
  })(`https://bthaha.men/search/${encodeURIComponent(search.join(' '))}/`).then(print)
}


if (require.main === module) {
  module.exports(process.argv.slice(2))
}
