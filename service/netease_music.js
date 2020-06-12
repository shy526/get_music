const axios = require("axios")
const cheerio = require('cheerio')
const qs = require('qs')
const path = require('path')

let app = {
    sigObject: {
        key_g: "0CoJUm6Qyw8W8jud",
        key_f: "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7",
        key_e: "010001",
    },
    getMusicInfo: (list) => {
        let result = [];
        if (!list) return result;
        list.forEach(item => {
            let singers = []
            item.ar.forEach(ar => {
                singers.push({
                    name: ar.name,
                    id: ar.id
                })
            })
            result.push({
                id: item.id, //id
                name: item.name, //歌曲名称
                albumName: item.al.name, //专辑
                one: false, //是否独占
                vip: item.copyright === 2, //是否需要vip或者无版权
                vid: item.mv === 0 ? null : item.mv, //mvId
                grp: null, //备选方案
                singer: singers,//歌手
                cover:item.al.picUrl, //
                source: path.parse(__filename).name
            })
        })
        return result;
    },
    evalScript: async () => {
        if (!app.__getSign) {
            let html = await axios.get(`https://music.163.com/#/song?id=${186064}`);
            let $ = cheerio.load(html.data);
            let scriptDom = $("script")
            let reg = /s3.music.126.net\/web\/s\/core_/;
            let url = null;
            for (let i = 0; i < scriptDom.length; i++) {
                let item = $(scriptDom[i]);
                let src = item.attr("src");
                if (reg.test(src)) {
                    url = `https:${src}`;
                }
            }
            let data = (await axios.get(url)).data;

            //9162
            let cryptoJS = data.match(/var CryptoJS.*\(Math\);/)[0]
            //9583
            // let AES = data.match(/\(function\(\){.*u.AES=p.lQ8I\(d\)}\)\(\);/)[0];
            let AES = data.match(/\(function\(\).*u.AES.*}\)\(\)/)[0];
            //9635
            let RSAKeyPairSc = data.match(/function RSAKeyPair.*}/)[0]
            //9659
            let setMaxDigitsSc = data.match(/function setMaxDigits.*}/)[0]
            //9899
            let varSet = data.match(/var maxDigits,.*\);/)[0]
            //9903
            let signScript = data.match(/!function\(\).*}\(\);/)[0]
            signScript = signScript.replace(/window/g, "app.__net");
            // + setMaxDigitsSc + varSet + signScript
            eval(cryptoJS + ";" + AES + ";" + RSAKeyPairSc + setMaxDigitsSc + varSet + signScript)
            app.__getSign = app.__net.asrsea
        }
    },
    getSign: async (key_d) => {
        await app.evalScript();
        let sign = app.__getSign(JSON.stringify(key_d), app.sigObject.key_e, app.sigObject.key_f, app.sigObject.key_g);
        return qs.stringify({
            params: sign.encText,
            encSecKey: sign.encSecKey
        })


    },
    getMusicUrl: async (id) => {
        let key_d = {"ids": [], "level": "standard", "encodeType": "aac", "csrf_token": ""}
        key_d.ids.push(id)
        let key = await app.getSign(key_d);
        let req = await axios.post("https://music.163.com/weapi/song/enhance/player/url/v1", key)
        let urls = [];
        req.data.data.forEach(item => {
            urls.push(item.url)
        })
        return urls;
    },
    __getSign: null,
    __net: {},
    selectMusic: async (pageNumber, pageSize, word) => {
        let key_d = {
            "s": "",
            "type": "1",
            "offset": "0",
            "total": "true",
            "limit": "30",
        };
        pageNumber = pageNumber || 1
        pageSize = pageSize || 30
        key_d.s = word;
        key_d.offset = (pageNumber - 1) * pageSize
        key_d.limit = pageSize
        let key = await app.getSign(key_d)
        let rep = await axios.post("https://music.163.com/weapi/cloudsearch/get/web?csrf_token=", key)
        return app.getMusicInfo(rep.data.result.songs)

    },
    getMvUrl: async (id) => {
        let key_d = {"id": null, "r": "480", "csrf_token": ""}
        key_d.id = id
        let key = await app.getSign(key_d);
        let rep = await axios.post("https://music.163.com/weapi/song/enhance/play/mv/url?csrf_token=", key)
        return rep.data.data.url
    },
    getLyric: async (id) => {
        let key_d = {"id": null, "lv": -1, "tv": -1, "csrf_token": ""}
        key_d.id = id
        let key = await app.getSign(key_d);
        try {
            let rep = await axios.post("https://music.163.com/weapi/song/lyric?csrf_token=", key)
            return rep.data.lrc.lyric
        } catch (e) {
            console.log(e)
        }

    }
}
!async function init() {
    try {
        let url = await app.getMusicUrl(186064);
        if (url) {
            console.info(`netease-music=>${url}`)
        } else {
            console.log(`netease-music error`)
        }
    } catch (e) {
        console.log(`netease-music error`)
        console.error(e)
    }


}()

module.exports = app;





