const axios = require("axios")
const crypto = require("crypto")
const URL = require("url")
const fs = require("fs")
const cheerio = require("cheerio")
const path = require("path")
let agentKey = "User-Agent";
let agentValue = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36"
axios.defaults.headers.common[agentKey] = agentValue

let app = {
    refreshSign: (dateTime) => {
        let refreshTime = dateTime - new Date().getTime();
        if (refreshTime <= 0) {
            return false;
        }
        //console.log(`距离下次刷新=>>${(refreshTime / 1000 / 60).toFixed(2)}分钟`)
        //刷新sig
        setTimeout(() => {
            app.initSign().then(sign => {
                //console.log(`刷新=>>${sign}`)
            });

        }, refreshTime);
        return true;
    },
    __getSign: null,
    __minTime: null,
    __signPath: path.join(path.join(path.resolve(__dirname,".."),"sign"),"xiami.sign"),
    getCookie: function (rep) {

        let setCookies = rep.headers["set-cookie"];
        if (!setCookies){
            return;
        }
        let cookieX = ""
        setCookies.forEach(cookie => {
            let split = cookie.split(";");
            cookieX += split[0] + ";"
        })
        return cookieX;
    },
    initSign: async () => {
        let nowTime = new Date().getTime();
        if (app.__minTime && app.__minTime > nowTime) {
            //console.log(`sign有效=>>${app.__getSign}`)
            return
        }

        if (fs.existsSync(app.__signPath)) {
            let sigObj = JSON.parse(fs.readFileSync(app.__signPath).toString());
            if (app.refreshSign(sigObj.min)) {
                app.__minTime = sigObj.min
                app.__getSign = sigObj.sig
                //console.log(`读取成功=>>${app.__getSign}`)
                return;
            }
        }
        let rep = await axios.get("https://www.xiami.com");
        // let reg = /^xm_sg_tk.*/
        //最小刷新时间
        let cookieX = app.getCookie(rep);
        if (fs.existsSync(app.__signPath)) {
            fs.unlinkSync(app.__signPath);
        }
        app.__minTime = nowTime + 60 * 1000 * 20
        fs.appendFileSync(app.__signPath, JSON.stringify({sig: cookieX, min: app.__minTime}))
        app.__getSign = cookieX
        //console.log(`设置成功=>>${app.__getSign}`)
        app.refreshSign(app.__minTime)
        return app.__getSign
    },
    getSign: async (urlObj) => {
        if (!app.__getSign) {
            await app.initSign();
        }
        let q = "";
        try {
            q = urlObj.query._q;
        } catch (e) {

        }

        let key = `${app.__getSign.match(/(?:^|;\s*)xm_sg_tk=([^;]*)/)[1].split("_")[0]}_xmMain_${urlObj.pathname}_${q}`;
        //console.log(key)
        return crypto.createHash('md5').update(key).digest("hex");

    },
    getMusicUrl: async (id) => {
        let _q = {"songIds": [id]}
        let urlObj = URL.parse(`https://www.xiami.com/api/song/getPlayInfo?_q=${JSON.stringify(_q)}`, true)
        let _s = await app.getSign(urlObj)
        let rep = await axios.get(`${URL.format(urlObj)}&_s=${_s}`, {
            headers: {cookie: app.__getSign, Host: urlObj.host}
        });
        let url = [];
        rep.data.result.data.songPlayInfos.forEach(item => {
            item.playInfos.forEach(playInfo => {
                if (playInfo.listenFile) {
                    url.push(playInfo.listenFile)
                }
            })
        })
        return url;
    },
    selectMusic2: async (pageNumber, pageSize, word) => {
        let _q = {"key": word, "pagingVO": {"page": pageNumber, "pageSize": pageSize}};
        let _qStr = JSON.stringify(_q);
        let urlObj = URL.parse(`https://www.xiami.com/api/search/searchSongs?_q=${_qStr}`, true);
        let _s = await app.getSign(urlObj)
        urlObj.query = null;
        urlObj.search = null;
        let url=`${URL.format(urlObj)}?_q=${global.encodeURI(_qStr)}&_s=${_s}`;
        let rep = await axios.get(url, {
                headers: {
                    cookie: app.__getSign
                    , Host: urlObj.host,
                }
            }
        );
        try {
            return app.getMusicInfo(rep.data.result.data.songs)
        } catch (e) {
            console.error("虾米---------ip-------------限制")
            console.error(url)
        }
    },
    selectMusic: async (pageNumber,pageSize, word) => {
        let query = {"searchKey": word}
        let url = `https://www.xiami.com/list?scene=search&type=song&query=${global.encodeURI(JSON.stringify(query))}&page=${pageNumber}`
        let rep = await axios.get(url);
        let cookie = app.getCookie(rep);
        if (cookie===undefined){
            console.error("cookie is null")
            console.error(url)
        }
        let $ = cheerio.load(rep.data);
        let reg = /window.__PRELOADED_STATE__="(.*)"/
        let result=null;
        $("script").each((index, el) => {
            let html = $(el).html();
            if (html){
                html = html.replace(/ /g, '');
                let match = html.match(reg);
                if (match){
                    result=  Buffer.from(match[1], 'base64').toString()
                    return false
                }
            }
        })
        if (!result){
            console.error("虾米---------ip-------------限制")
            console.error(url)
            return [];
        }
        let songIds = JSON.parse(result).listData.dataList.map(item=>item.songId);
        let urlObj = URL.parse("https://www.xiami.com/api/song/getSongs")
        let _s = await app.getSign(urlObj);
        let _xm_cf_ = app.__getSign.match(`(?:^|;\\s*)_xm_cf_=([^;]*)`)[0];
        let songs = await axios.post(`${URL.format(urlObj)}?_s=${_s}&${_xm_cf_}`, {"songIds": songIds},
            {headers: {host: urlObj.host, cookie: cookie}
            })
          return app.getMusicInfo(songs.data.result.data.songs);

    },
    getMusicInfo: (list) => {
        let result = [];
        if (!list) return result;
        list.forEach(item => {
            let singers = []
            item.singerVOs.forEach(ar => {
                singers.push({
                    name: ar.artistName,
                    id: ar.artistId
                })
            })
            result.push({
                id: item.songId, //id
                name: item.songName, //歌曲名称
                albumName: item.albumName, //专辑
                one: false, //是否独占
                vip: item.songStatus===7, //是否需要vip或者无版权
                vid: item.mvId?item.mvId:null,//mvId
                grp: null, //备选方案
                singer: singers, //歌手
                source: path.parse(__filename).name
            })
        })
        return result;
    },
    getLyric: async (id) => {
        let _q = {"songId": id}
        let urlObj = URL.parse(`https://www.xiami.com/api/lyric/getSongLyrics?_q=${JSON.stringify(_q)}`, true);
        let _s = await app.getSign(urlObj);
        let rep = await axios.get(`${URL.format(urlObj)}&_s=${_s}`, {
            headers: {
                cookie: app.__getSign
                , Host: urlObj.host
            }
        });
        return rep.data.result.data.lyrics[1].content;
    },
    getMvUrl: async (vId) => {
        let _q = {"mvId": vId}
        let urlObj = URL.parse(`https://www.xiami.com/api/mv/initialize?_q=${JSON.stringify(_q)}`, true);
        let _s = await app.getSign(urlObj);
        let rep = await axios.get(`${URL.format(urlObj)}&_s=${_s}`, {
            headers: {
                cookie: app.__getSign
                , Host: urlObj.host,

            }
        });
        let url = [];
        let mvDetailVO = rep.data.result.data.detail.mvDetailVO;
        url.push(mvDetailVO.mp4Url)
        url.push(mvDetailVO.url)
        return url;
    },
}
!async function init() {
    try {
        let url = await app.getMusicUrl(3414394);
        if (url) {
            console.info(`xiami-music=>${url}`)
        } else {
            console.info(`xiami-music error`)
        }
    } catch (e) {
        console.info(`xiami-music error`)
        console.error(e)

    }
}()
module.exports = app;


