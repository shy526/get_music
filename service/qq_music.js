const axios = require("axios")
const path = require("path")

let app = {
    getMusicInfo: async (list) => {
        let result = [];
        if (!list) return result;

        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            let singers = []
            item.singer.forEach(singer => {
                singers.push({
                    name: singer.name,
                    id: singer.mid
                })
            })
            let grp = await app.getMusicInfo(item.grp);
            result.push({
                id: item.songmid,
                name: item.songname,
                albumName: item.albumname,
                one: item.isonly === 1,
                vip: item.msgid === 15,
                vid: item.vid,
                grp: grp,
                singer: singers,
                source: path.parse(__filename).name
            })
        }

        return result
    },
    getSign: async (songId) => {
        if (!this.__getSign) {
            let rep = await axios.get("https://y.qq.com/component/m/qmfe-security-sign/index.umd.js?max_age=2592000");
            eval(rep.data.replace("module.exports=t()", "app.__getSign=t()"));
        }
        let sign = {
            "req_0": {
                "module": "vkey.GetVkeyServer",
                "method": "CgiGetVkey",
                "param": {
                    "guid": "1122",
                    "songmid": [],
                    "songtype": [0],
                    "uin": "0",
                    "loginflag": 1,
                    "platform": "20"
                }
            }, "comm": {"uin": 0, "format": "json", "ct": 24, "cv": 0}
        };
        sign.req_0.param.songmid.push(songId)
        let str = JSON.stringify(sign);
        return {
            signKey: app.__getSign(str),
            signStr: global.encodeURI(str)
        }
    },
    selectMusic: async function (pageNumber, pageSize, word) {
        let url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?aggr=1&cr=1&flag_qc=0&p=${pageNumber}&n=${pageSize}&w=${global.encodeURI(word)}`
        let rep = await axios.get(url);
        rep.data = this.getJsonpData(rep.data);
        let musicList = await this.getMusicInfo(rep.data.data.song.list);
        return musicList;
    },
    getMvUrl: async (mvId) => {
        let data = {"getMvUrl": {"module": "gosrf.Stream.MvUrlProxy", "method": "GetMvUrls", "param": {"vids": []}}}
        data.getMvUrl.param.vids.push(mvId)
        let rep = await axios.post("https://u.y.qq.com/cgi-bin/musicu.fcg", JSON.stringify(data))
        let urls = [];
        rep.data.getMvUrl.data[mvId].mp4.forEach(item => {
            if (item.freeflow_url) {
                item.freeflow_url.forEach(url => {
                    urls.push(url)
                })
            }

        })
        return urls;
    },
    getMusicUrl: async (songId) => {
        let sign = await app.getSign(songId);
        let rep = await axios.get(`https://u.y.qq.com/cgi-bin/musics.fcg?sign=${sign.signKey}&data=${sign.signStr}`);
        let result = [];
        rep.data.req_0.data.sip.forEach(addr => {
            rep.data.req_0.data.midurlinfo.forEach(item => {
                if (item.purl) {
                    result.push(addr + item.purl)
                }
            })
        })
        return result;

    },
    __getSign: null,
    getJsonpData: (jsonp, callbackName) => {
        callbackName = callbackName || "callback"
        let callObj = {};
        jsonp = jsonp.replace(callbackName, `callObj.${callbackName}`)
        callObj[callbackName] = data => {
            return data
        }
        return eval(jsonp);
    },
    getLyric: async (songId) => {
        let rep = await axios.get(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${songId}`, {
            headers: {Host: "c.y.qq.com", Referer: "https://y.qq.com"}
        })
        let data = app.getJsonpData(rep, "MusicJsonCallback");
        return Buffer.from(data.lyric, 'base64').toString()
    }

}
!async function init() {
    try {
        let url = await app.getMusicUrl("004ZH3Qv2qjMhT");
        if (url) {
            console.info(`qq-music=>${url}`)
        } else {
            console.info(`qq-music error`)
        }
    } catch (e) {
        console.info(`qq-music error`)
        console.error(e)

    }


}()

module.exports = app;

